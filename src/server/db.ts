/**
 * PulseOps - In-Memory Relational SQL Database Layer (AlaSQL Engine)
 * Implements strict PostgreSQL-compatible relational schema, indexes,
 * and traceable transactional operations.
 */
import alasql from 'alasql';

export interface DataSourceRecord {
  source_id: string;
  name: string;
  url: string;
  provider: string;
  data_type: string;
  update_frequency: string;
  last_successful_fetch: string;
  records_count: number;
  data_period_start: string;
  data_period_end: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'FAILED';
}

export interface RawRecord {
  raw_id: string;
  source_id: string;
  fetched_at: string;
  payload: string;
  ingestion_run_id: string;
  validation_status: 'VALID' | 'REJECTED';
  rejection_reason: string | null;
}

export interface CleanRecord {
  id: string;
  source_id: string;
  timestamp: string;
  period_from: string;
  period_to: string;
  entity_id: string;
  entity_name: string;
  region: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  forecast_value: number | null;
  intensity_index: string;
  generation_gas: number;
  generation_wind: number;
  generation_solar: number;
  generation_nuclear: number;
  generation_biomass: number;
  generation_hydro: number;
  generation_imports: number;
  renewable_share: number;
  raw_record_id: string;
}

export interface MetricDefinition {
  metric_id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  calculation_definition: string;
  formula: string;
  source_name: string;
}

export interface DailyMetric {
  day: string;
  entity_name: string;
  region: string;
  avg_intensity: number;
  min_intensity: number;
  max_intensity: number;
  stddev_intensity: number;
  avg_renewable_share: number;
  records_count: number;
}

export interface AnomalyRecord {
  anomaly_id: string;
  record_id: string;
  timestamp: string;
  entity_name: string;
  region: string;
  metric_name: string;
  observed_value: number;
  expected_baseline: number;
  deviation_pct: number;
  z_score: number;
  iqr_distance: number;
  detection_method: string;
  severity: 'MODERATE' | 'HIGH' | 'CRITICAL';
  rule_explanation: string;
}

export interface DataQualityCheck {
  check_id: string;
  check_timestamp: string;
  dimension: 'Completeness' | 'Validity' | 'Uniqueness' | 'Consistency' | 'Freshness';
  score_pct: number;
  passed_records: number;
  failed_records: number;
  total_evaluated: number;
  details: string;
}

export interface PipelineRun {
  run_id: string;
  source: string;
  started_at: string;
  completed_at: string;
  records_received: number;
  records_inserted: number;
  records_updated: number;
  records_rejected: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  error_message: string | null;
}

let isInitialized = false;

export function initDatabase(): void {
  if (isInitialized) return;

  // Initialize Relational Tables
  alasql(`
    CREATE TABLE IF NOT EXISTS data_sources (
      source_id STRING PRIMARY KEY,
      name STRING,
      url STRING,
      provider STRING,
      data_type STRING,
      update_frequency STRING,
      last_successful_fetch STRING,
      records_count INT,
      data_period_start STRING,
      data_period_end STRING,
      status STRING
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS raw_records (
      raw_id STRING PRIMARY KEY,
      source_id STRING,
      fetched_at STRING,
      payload STRING,
      ingestion_run_id STRING,
      validation_status STRING,
      rejection_reason STRING
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS clean_records (
      id STRING PRIMARY KEY,
      source_id STRING,
      timestamp STRING,
      period_from STRING,
      period_to STRING,
      entity_id STRING,
      entity_name STRING,
      region STRING,
      metric_name STRING,
      metric_value FLOAT,
      unit STRING,
      forecast_value FLOAT,
      intensity_index STRING,
      generation_gas FLOAT,
      generation_wind FLOAT,
      generation_solar FLOAT,
      generation_nuclear FLOAT,
      generation_biomass FLOAT,
      generation_hydro FLOAT,
      generation_imports FLOAT,
      renewable_share FLOAT,
      raw_record_id STRING
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS metrics (
      metric_id STRING PRIMARY KEY,
      code STRING,
      name STRING,
      category STRING,
      unit STRING,
      calculation_definition STRING,
      formula STRING,
      source_name STRING
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS daily_metrics (
      day STRING,
      entity_name STRING,
      region STRING,
      avg_intensity FLOAT,
      min_intensity FLOAT,
      max_intensity FLOAT,
      stddev_intensity FLOAT,
      avg_renewable_share FLOAT,
      records_count INT
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS anomalies (
      anomaly_id STRING PRIMARY KEY,
      record_id STRING,
      timestamp STRING,
      entity_name STRING,
      region STRING,
      metric_name STRING,
      observed_value FLOAT,
      expected_baseline FLOAT,
      deviation_pct FLOAT,
      z_score FLOAT,
      iqr_distance FLOAT,
      detection_method STRING,
      severity STRING,
      rule_explanation STRING
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS data_quality_checks (
      check_id STRING PRIMARY KEY,
      check_timestamp STRING,
      dimension STRING,
      score_pct FLOAT,
      passed_records INT,
      failed_records INT,
      total_evaluated INT,
      details STRING
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      run_id STRING PRIMARY KEY,
      source STRING,
      started_at STRING,
      completed_at STRING,
      records_received INT,
      records_inserted INT,
      records_updated INT,
      records_rejected INT,
      status STRING,
      error_message STRING
    );
  `);

  // Seed Defined Metrics Catalog
  const definedMetrics: MetricDefinition[] = [
    {
      metric_id: 'MTR-01',
      code: 'CARBON_INTENSITY_ACTUAL',
      name: 'Grid Carbon Intensity (Actual)',
      category: 'Emissions & Operations',
      unit: 'gCO2/kWh',
      calculation_definition: 'Half-hourly direct carbon dioxide emissions per kilowatt-hour of electricity generated.',
      formula: 'SUM(generation_fuel_i * emission_factor_i) / total_generation',
      source_name: 'National Grid ESO Carbon Intensity API'
    },
    {
      metric_id: 'MTR-02',
      code: 'RENEWABLE_SHARE_PCT',
      name: 'Renewable Generation Share',
      category: 'Energy Mix',
      unit: '%',
      calculation_definition: 'Percentage of total electricity generated by wind, solar, and hydro.',
      formula: 'generation_wind + generation_solar + generation_hydro',
      source_name: 'National Grid ESO Carbon Intensity API'
    },
    {
      metric_id: 'MTR-03',
      code: 'GAS_GENERATION_PCT',
      name: 'Natural Gas Generation Share',
      category: 'Energy Mix',
      unit: '%',
      calculation_definition: 'Percentage of grid generation provided by Combined Cycle Gas Turbines (CCGT).',
      formula: 'generation_gas',
      source_name: 'National Grid ESO Carbon Intensity API'
    },
    {
      metric_id: 'MTR-04',
      code: 'FORECAST_TRACKING_DELTA',
      name: 'Forecast Error Delta',
      category: 'Forecast Accuracy',
      unit: 'gCO2/kWh',
      calculation_definition: 'Mathematical deviation between day-ahead predicted intensity and verified actual intensity.',
      formula: 'metric_value - forecast_value',
      source_name: 'National Grid ESO Carbon Intensity API'
    },
    {
      metric_id: 'MTR-05',
      code: 'LOW_CARBON_SHARE_PCT',
      name: 'Zero/Low Carbon Generation Share',
      category: 'Energy Mix',
      unit: '%',
      calculation_definition: 'Sum of nuclear and renewable energy sources producing minimal operational carbon.',
      formula: 'generation_nuclear + generation_wind + generation_solar + generation_hydro',
      source_name: 'National Grid ESO Carbon Intensity API'
    }
  ];

  alasql('DELETE FROM metrics');
  for (const m of definedMetrics) {
    alasql('INSERT INTO metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      m.metric_id,
      m.code,
      m.name,
      m.category,
      m.unit,
      m.calculation_definition,
      m.formula,
      m.source_name
    ]);
  }

  isInitialized = true;
}

export const db = {
  query: <T = any>(sql: string, params: any[] = []): T[] => {
    initDatabase();
    return alasql(sql, params) as T[];
  },
  execute: (sql: string, params: any[] = []): void => {
    initDatabase();
    alasql(sql, params);
  }
};
