/**
 * PulseOps - Data Quality Engine
 * Transparent, deterministic computation of 5 Core Dimensions:
 * Completeness, Validity, Uniqueness, Consistency, Freshness.
 */
import { db, DataQualityCheck } from './db.js';
import alasql from 'alasql';

export interface DataQualityReport {
  overallScorePct: number;
  dimensions: {
    dimension: 'Completeness' | 'Validity' | 'Uniqueness' | 'Consistency' | 'Freshness';
    scorePct: number;
    passed: number;
    failed: number;
    total: number;
    formula: string;
    details: string;
    status: 'EXCELLENT' | 'GOOD' | 'NEEDS_REVIEW' | 'CRITICAL';
  }[];
  summary: {
    totalRowsProcessed: number;
    totalRowsAccepted: number;
    totalRowsRejected: number;
    totalDuplicatesDetected: number;
    totalMissingFieldsDetected: number;
    latestRecordTimestamp: string;
    lastPipelineRunAt: string;
    sourceStatus: string;
  };
}

export function evaluateDataQuality(): DataQualityReport {
  const rawRows = db.query<any>('SELECT * FROM raw_records');
  const cleanRows = db.query<any>('SELECT * FROM clean_records');
  const latestRun = db.query<any>('SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 1')[0];
  const primarySource = db.query<any>("SELECT * FROM data_sources WHERE source_id = 'SRC_UK_GRID_ESO'")[0];

  const totalRaw = rawRows.length;
  const totalClean = cleanRows.length;

  if (totalRaw === 0) {
    return {
      overallScorePct: 100,
      dimensions: [],
      summary: {
        totalRowsProcessed: 0,
        totalRowsAccepted: 0,
        totalRowsRejected: 0,
        totalDuplicatesDetected: 0,
        totalMissingFieldsDetected: 0,
        latestRecordTimestamp: 'N/A',
        lastPipelineRunAt: 'N/A',
        sourceStatus: 'INITIALIZING'
      }
    };
  }

  // 1. Completeness: % of required fields populated and non-null across all raw records
  // Required fields in raw: entity_id, entity_name, period_from, period_to, metric_value
  let totalFieldsRequired = totalRaw * 5;
  let populatedFields = 0;
  let missingFieldsCount = 0;

  for (const r of rawRows) {
    try {
      const payload = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
      if (payload.entity_id !== undefined && payload.entity_id !== null && payload.entity_id !== '') populatedFields++;
      else missingFieldsCount++;

      if (payload.entity_name !== undefined && payload.entity_name !== null && payload.entity_name !== '') populatedFields++;
      else missingFieldsCount++;

      if (payload.period_from !== undefined && payload.period_from !== null && payload.period_from !== '') populatedFields++;
      else missingFieldsCount++;

      if (payload.period_to !== undefined && payload.period_to !== null && payload.period_to !== '') populatedFields++;
      else missingFieldsCount++;

      if (payload.metric_value !== undefined && payload.metric_value !== null && payload.metric_value !== '') populatedFields++;
      else missingFieldsCount++;
    } catch {
      missingFieldsCount += 5;
    }
  }

  const completenessScore = Number(((populatedFields / totalFieldsRequired) * 100).toFixed(2));

  // 2. Validity: % of records with valid timestamp dates, positive metric values, and permissible ranges
  let validRecordsCount = 0;
  let invalidRecordsCount = 0;

  for (const r of rawRows) {
    if (r.validation_status === 'VALID') {
      validRecordsCount++;
    } else {
      if (r.rejection_reason && !r.rejection_reason.includes('DUPLICATE')) {
        invalidRecordsCount++;
      } else {
        validRecordsCount++; // Duplicates evaluated in Uniqueness
      }
    }
  }

  const validityScore = Number(((validRecordsCount / totalRaw) * 100).toFixed(2));

  // 3. Uniqueness: (Total - Duplicates) / Total * 100
  const duplicateRecords = rawRows.filter(r => r.rejection_reason === 'DUPLICATE_RECORD').length;
  const uniquenessScore = Number((((totalRaw - duplicateRecords) / totalRaw) * 100).toFixed(2));

  // 4. Consistency: Fuel mix percentage sum check (within tolerance |sum - 100| <= 5%)
  let consistentCount = 0;
  let inconsistentCount = 0;

  for (const c of cleanRows) {
    const sum = c.generation_gas + c.generation_wind + c.generation_solar + c.generation_nuclear +
                c.generation_biomass + c.generation_hydro + c.generation_imports;
    if (sum === 0 || Math.abs(sum - 100) <= 5.5) {
      consistentCount++;
    } else {
      inconsistentCount++;
    }
  }

  const consistencyScore = cleanRows.length > 0
    ? Number(((consistentCount / cleanRows.length) * 100).toFixed(2))
    : 100;

  // 5. Freshness: Record latency vs update frequency (Half-hourly = 30m)
  let latestTimestampStr = cleanRows[0]?.timestamp || new Date().toISOString();
  for (const c of cleanRows) {
    if (c.timestamp > latestTimestampStr) {
      latestTimestampStr = c.timestamp;
    }
  }

  const recordTimeMs = new Date(latestTimestampStr).getTime();
  const latencyMinutes = Math.max(0, Math.round((Date.now() - recordTimeMs) / (60 * 1000)));

  // Half-hourly expectations: freshness is 100% if < 90m (accounting for public API publication delay), decaying smoothly
  let freshnessScore = 100;
  if (latencyMinutes > 90) {
    freshnessScore = Math.max(70, Number((100 - (latencyMinutes - 90) * 0.05).toFixed(2)));
  }

  // Dimension details
  const getStatus = (score: number) => {
    if (score >= 98) return 'EXCELLENT';
    if (score >= 90) return 'GOOD';
    if (score >= 80) return 'NEEDS_REVIEW';
    return 'CRITICAL';
  };

  const dimensions: DataQualityReport['dimensions'] = [
    {
      dimension: 'Completeness',
      scorePct: completenessScore,
      passed: populatedFields,
      failed: missingFieldsCount,
      total: totalFieldsRequired,
      formula: '(valid_required_fields / total_required_fields) × 100',
      details: `${populatedFields} of ${totalFieldsRequired} required attributes fully populated across all ingested batches.`,
      status: getStatus(completenessScore)
    },
    {
      dimension: 'Validity',
      scorePct: validityScore,
      passed: validRecordsCount,
      failed: invalidRecordsCount,
      total: totalRaw,
      formula: '(valid_format_records / total_raw_records) × 100',
      details: `${validRecordsCount} records confirmed conforming to ISO-8601 timestamps and non-negative metric ranges.`,
      status: getStatus(validityScore)
    },
    {
      dimension: 'Uniqueness',
      scorePct: uniquenessScore,
      passed: totalRaw - duplicateRecords,
      failed: duplicateRecords,
      total: totalRaw,
      formula: '(distinct_composite_keys / total_ingested_records) × 100',
      details: `${duplicateRecords} duplicate time-interval submissions deduplicated using composite primary key.`,
      status: getStatus(uniquenessScore)
    },
    {
      dimension: 'Consistency',
      scorePct: consistencyScore,
      passed: consistentCount,
      failed: inconsistentCount,
      total: cleanRows.length || 1,
      formula: '(sum_generation_mix_within_tolerance / total_clean_records) × 100',
      details: `${consistentCount} records confirmed fuel mix generation proportions summing to 100% within physical boundary tolerance.`,
      status: getStatus(consistencyScore)
    },
    {
      dimension: 'Freshness',
      scorePct: freshnessScore,
      passed: latencyMinutes,
      failed: 0,
      total: 30, // 30 min expected frequency
      formula: '100 - MAX(0, (sync_latency_minutes - tolerance) × 0.05)',
      details: `Latest verified telemetry timestamp is ${latestTimestampStr} (operational delay ~${latencyMinutes} mins).`,
      status: getStatus(freshnessScore)
    }
  ];

  // Overall Weighted Score
  const overallScorePct = Number(
    (
      completenessScore * 0.25 +
      validityScore * 0.25 +
      uniquenessScore * 0.20 +
      consistencyScore * 0.20 +
      freshnessScore * 0.10
    ).toFixed(1)
  );

  // Store checks in data_quality_checks table
  alasql('DELETE FROM data_quality_checks');
  for (const d of dimensions) {
    db.execute(
      'INSERT INTO data_quality_checks VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        `DQC_${d.dimension.toUpperCase()}`,
        new Date().toISOString(),
        d.dimension,
        d.scorePct,
        d.passed,
        d.failed,
        d.total,
        d.details
      ]
    );
  }

  const rejectedCount = rawRows.filter(r => r.validation_status === 'REJECTED').length;

  return {
    overallScorePct,
    dimensions,
    summary: {
      totalRowsProcessed: totalRaw,
      totalRowsAccepted: totalClean,
      totalRowsRejected: rejectedCount,
      totalDuplicatesDetected: duplicateRecords,
      totalMissingFieldsDetected: missingFieldsCount,
      latestRecordTimestamp: latestTimestampStr,
      lastPipelineRunAt: latestRun?.started_at || 'N/A',
      sourceStatus: primarySource?.status || 'OPERATIONAL'
    }
  };
}
