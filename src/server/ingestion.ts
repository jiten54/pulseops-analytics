/**
 * PulseOps - Real Data Ingestion Engine
 * Ingests from official UK National Grid ESO and Open-Meteo European Copernicus APIs.
 * Enforces provenance, transaction logging, error handling, and pipeline audit runs.
 */
import alasql from 'alasql';
import { db } from './db.js';
import { DataCleaner, RawInputRecord } from './cleaner.js';

const USER_AGENT = 'PulseOps-Analytics-Engine/1.0 (Business Operations Intelligence)';

export async function runIngestionPipeline(): Promise<{
  runId: string;
  source: string;
  recordsReceived: number;
  recordsInserted: number;
  recordsRejected: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  errorMessage: string | null;
}> {
  const runId = `RUN_${Date.now()}`;
  const startedAt = new Date().toISOString();
  let recordsReceived = 0;
  let recordsInserted = 0;
  let recordsUpdated = 0;
  let recordsRejected = 0;
  let pipelineStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' = 'SUCCESS';
  let errorMessage: string | null = null;

  try {
    // 1. Gather existing composite keys to prevent duplicate ingestion
    const existing = db.query<{ source_id: string; entity_id: string; period_from: string }>(
      'SELECT source_id, entity_id, period_from FROM clean_records'
    );
    const existingKeys = existing.map(e => `${e.source_id}_${e.entity_id}_${e.period_from}`);
    const cleaner = new DataCleaner(existingKeys);

    // 2. Register / Update Primary Data Source
    const sourceId = 'SRC_UK_GRID_ESO';
    const sourceName = 'National Grid ESO - Carbon & Generation Telemetry';
    const sourceUrl = 'https://api.carbonintensity.org.uk';
    const sourceProvider = 'Electricity System Operator (ESO) & Univ. of Oxford';
    const updateFreq = 'Half-Hourly';

    // Calculate time window: past 4 days to current hour
    const now = new Date();
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 3600 * 1000);
    const fromStr = fourDaysAgo.toISOString().replace(/\.\d{3}Z$/, 'Z');
    const toStr = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

    // Fetch regional snapshot for current generation mix distribution
    const regionalMixMap = new Map<number, any>();
    try {
      const snapRes = await fetch(`${sourceUrl}/regional`, {
        headers: { 'User-Agent': USER_AGENT }
      });
      if (snapRes.ok) {
        const snapData = await snapRes.json();
        if (snapData?.data?.[0]?.regions) {
          for (const reg of snapData.data[0].regions) {
            regionalMixMap.set(reg.regionid, reg.generationmix || []);
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch regional snapshot:', e);
    }

    // Fetch time-series historical regional intensity
    const historyUrl = `${sourceUrl}/regional/intensity/${fromStr}/${toStr}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(historyUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`National Grid ESO API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const periods = json?.data || [];

    let periodStart: string | null = null;
    let periodEnd: string | null = null;

    for (const period of periods) {
      const periodFrom = period.from;
      const periodTo = period.to;
      if (!periodStart) periodStart = periodFrom;
      periodEnd = periodTo;

      const regions = period.regions || [];
      for (const reg of regions) {
        recordsReceived++;

        // Get generation mix from snapshot or region details
        const genMix = reg.generationmix || regionalMixMap.get(reg.regionid) || [];
        const mixObj: Record<string, number> = {};
        for (const item of genMix) {
          if (item?.fuel && item?.perc !== undefined) {
            mixObj[item.fuel] = item.perc;
          }
        }

        const rawRecord: RawInputRecord = {
          source_id: sourceId,
          period_from: periodFrom,
          period_to: periodTo,
          entity_id: String(reg.regionid),
          entity_name: reg.shortname || reg.dnoregion || `Region ${reg.regionid}`,
          region: reg.shortname || `Region ${reg.regionid}`,
          metric_name: 'Carbon Intensity',
          metric_value: reg.intensity?.actual !== undefined && reg.intensity?.actual !== null
            ? reg.intensity.actual
            : reg.intensity?.forecast,
          unit: 'gCO2/kWh',
          forecast_value: reg.intensity?.forecast,
          intensity_index: reg.intensity?.index || 'moderate',
          generation_gas: mixObj['gas'] ?? 0,
          generation_wind: mixObj['wind'] ?? 0,
          generation_solar: mixObj['solar'] ?? 0,
          generation_nuclear: mixObj['nuclear'] ?? 0,
          generation_biomass: mixObj['biomass'] ?? 0,
          generation_hydro: mixObj['hydro'] ?? 0,
          generation_imports: mixObj['imports'] ?? 0,
          raw_payload: reg
        };

        const rawId = `RAW_${runId}_${recordsReceived}`;
        const validation = cleaner.validateAndClean(rawRecord);

        // Store in raw_records
        db.execute(
          'INSERT INTO raw_records VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            rawId,
            sourceId,
            startedAt,
            JSON.stringify(rawRecord),
            runId,
            validation.isValid ? 'VALID' : 'REJECTED',
            validation.rejectionReason
          ]
        );

        if (validation.isValid && validation.cleanedRecord) {
          const c = validation.cleanedRecord;
          db.execute(
            'INSERT INTO clean_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              c.id,
              c.source_id,
              c.timestamp,
              c.period_from,
              c.period_to,
              c.entity_id,
              c.entity_name,
              c.region,
              c.metric_name,
              c.metric_value,
              c.unit,
              c.forecast_value,
              c.intensity_index,
              c.generation_gas,
              c.generation_wind,
              c.generation_solar,
              c.generation_nuclear,
              c.generation_biomass,
              c.generation_hydro,
              c.generation_imports,
              c.renewable_share,
              rawId
            ]
          );
          recordsInserted++;
        } else {
          recordsRejected++;
        }
      }
    }

    // 3. Ingest Secondary Source: Open-Meteo European Copernicus Logistics & Environmental Telemetry
    const secondarySourceId = 'SRC_OPEN_METEO_HUB';
    try {
      const hubsUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=51.5085,53.4808,55.9533&longitude=-0.1257,-2.2426,-3.1883&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide&past_days=3';
      const hubRes = await fetch(hubsUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (hubRes.ok) {
        const hubData = await hubRes.json();
        const hubList = Array.isArray(hubData) ? hubData : [hubData];
        const hubNames = ['London Operations Hub', 'Manchester Logistics Port', 'Scotland Regional Center'];

        hubList.forEach((hub, idx) => {
          const entityName = hubNames[idx] || `Hub ${idx + 1}`;
          const times = hub.hourly?.time || [];
          const pm25 = hub.hourly?.pm2_5 || [];
          const no2 = hub.hourly?.nitrogen_dioxide || [];

          for (let i = 0; i < Math.min(times.length, 48); i++) {
            recordsReceived++;
            const t = times[i];
            const pFrom = new Date(t + ':00Z').toISOString();
            const pTo = new Date(new Date(pFrom).getTime() + 3600000).toISOString();

            const rawRecord: RawInputRecord = {
              source_id: secondarySourceId,
              period_from: pFrom,
              period_to: pTo,
              entity_id: `HUB_${idx + 1}`,
              entity_name: entityName,
              region: entityName,
              metric_name: 'PM2.5 Telemetry',
              metric_value: pm25[i] ?? 10,
              unit: 'µg/m³',
              forecast_value: null,
              intensity_index: (pm25[i] > 25 ? 'high' : pm25[i] > 15 ? 'moderate' : 'low'),
              generation_gas: 0,
              generation_wind: 0,
              generation_solar: 0,
              generation_nuclear: 0,
              generation_biomass: 0,
              generation_hydro: 0,
              generation_imports: 0,
              raw_payload: { time: t, pm2_5: pm25[i], no2: no2[i] }
            };

            const rawId = `RAW_${runId}_HUB_${idx}_${i}`;
            const validation = cleaner.validateAndClean(rawRecord);

            db.execute(
              'INSERT INTO raw_records VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                rawId,
                secondarySourceId,
                startedAt,
                JSON.stringify(rawRecord),
                runId,
                validation.isValid ? 'VALID' : 'REJECTED',
                validation.rejectionReason
              ]
            );

            if (validation.isValid && validation.cleanedRecord) {
              const c = validation.cleanedRecord;
              db.execute(
                'INSERT INTO clean_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  c.id,
                  c.source_id,
                  c.timestamp,
                  c.period_from,
                  c.period_to,
                  c.entity_id,
                  c.entity_name,
                  c.region,
                  c.metric_name,
                  c.metric_value,
                  c.unit,
                  c.forecast_value,
                  c.intensity_index,
                  c.generation_gas,
                  c.generation_wind,
                  c.generation_solar,
                  c.generation_nuclear,
                  c.generation_biomass,
                  c.generation_hydro,
                  c.generation_imports,
                  c.renewable_share,
                  rawId
                ]
              );
              recordsInserted++;
            } else {
              recordsRejected++;
            }
          }
        });

        // Register secondary data source
        const secCounts = db.query<{ total_cnt: number }>(
          'SELECT COUNT(*) as total_cnt FROM clean_records WHERE source_id = ?',
          [secondarySourceId]
        )[0]?.total_cnt || 0;

        alasql('DELETE FROM data_sources WHERE source_id = ?', [secondarySourceId]);
        db.execute(
          'INSERT INTO data_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            secondarySourceId,
            'Open-Meteo European Environmental & Logistics Hubs',
            'https://air-quality-api.open-meteo.com',
            'Copernicus Atmosphere Monitoring Service (CAMS)',
            'Air Quality & Regional Particulates (PM2.5, NO2)',
            'Hourly',
            new Date().toISOString(),
            secCounts,
            fourDaysAgo.toISOString(),
            now.toISOString(),
            'OPERATIONAL'
          ]
        );
      }
    } catch (e) {
      console.warn('Secondary source fetch error:', e);
    }

    // 4. Update Primary Data Source status
    const primaryCount = db.query<{ total_cnt: number }>(
      'SELECT COUNT(*) as total_cnt FROM clean_records WHERE source_id = ?',
      [sourceId]
    )[0]?.total_cnt || 0;

    alasql('DELETE FROM data_sources WHERE source_id = ?', [sourceId]);
    db.execute(
      'INSERT INTO data_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        sourceId,
        sourceName,
        sourceUrl,
        sourceProvider,
        'Grid Carbon Intensity (gCO2/kWh) & Generation Fuel Mix (%)',
        updateFreq,
        new Date().toISOString(),
        primaryCount,
        periodStart || fourDaysAgo.toISOString(),
        periodEnd || now.toISOString(),
        'OPERATIONAL'
      ]
    );

    if (recordsRejected > 0 && recordsInserted === 0) {
      pipelineStatus = 'FAILED';
    } else if (recordsRejected > 0) {
      pipelineStatus = 'PARTIAL';
    } else {
      pipelineStatus = 'SUCCESS';
    }

  } catch (err: any) {
    pipelineStatus = 'FAILED';
    errorMessage = err?.message || 'Ingestion network error';
    console.error('Ingestion pipeline failed:', err);

    alasql("UPDATE data_sources SET status = 'DEGRADED' WHERE source_id = 'SRC_UK_GRID_ESO'");
  }

  const completedAt = new Date().toISOString();

  // Record pipeline run
  db.execute(
    'INSERT INTO pipeline_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      runId,
      'National Grid ESO & Open-Meteo Pipelines',
      startedAt,
      completedAt,
      recordsReceived,
      recordsInserted,
      recordsUpdated,
      recordsRejected,
      pipelineStatus,
      errorMessage
    ]
  );

  return {
    runId,
    source: 'National Grid ESO & Open-Meteo Pipelines',
    recordsReceived,
    recordsInserted,
    recordsRejected,
    status: pipelineStatus,
    errorMessage
  };
}
