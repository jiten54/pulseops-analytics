/**
 * PulseOps - SQL Lab Execution Engine
 * Safe Read-Only SQL runner with syntax verification, destructive command guards,
 * execution timing, and pre-built analytical query catalog.
 */
import { db } from './db.js';

export interface PredefinedQuery {
  id: string;
  name: string;
  category: 'Ranking' | 'Time Series' | 'Anomalies' | 'Data Quality' | 'Energy Mix';
  description: string;
  sql: string;
}

export const PREDEFINED_QUERIES: PredefinedQuery[] = [
  {
    id: 'pq_top_regions',
    name: 'Top Carbon Intensive Regions',
    category: 'Ranking',
    description: 'Ranks UK regions by average carbon intensity with min and max boundaries over all ingested periods.',
    sql: `SELECT 
  region,
  ROUND(AVG(metric_value), 1) AS avg_intensity_gco2,
  ROUND(MIN(metric_value), 1) AS min_intensity,
  ROUND(MAX(metric_value), 1) AS max_intensity,
  ROUND(AVG(renewable_share), 1) AS avg_renewable_pct,
  COUNT(*) AS total_intervals
FROM clean_records
WHERE source_id = 'SRC_UK_GRID_ESO'
GROUP BY region
ORDER BY avg_intensity_gco2 DESC`
  },
  {
    id: 'pq_hourly_trend',
    name: 'Grid Emissions by Hour of Day',
    category: 'Time Series',
    description: 'Analyzes diurnal variation in national grid emissions by isolating the hour component of half-hourly timestamps.',
    sql: `SELECT 
  SUBSTR(timestamp, 12, 2) AS hour_of_day,
  ROUND(AVG(metric_value), 1) AS avg_carbon_intensity,
  ROUND(AVG(renewable_share), 1) AS avg_renewable_pct,
  ROUND(AVG(generation_gas), 1) AS avg_gas_pct,
  ROUND(AVG(generation_wind), 1) AS avg_wind_pct,
  COUNT(*) AS sample_count
FROM clean_records
WHERE source_id = 'SRC_UK_GRID_ESO'
GROUP BY hour_of_day
ORDER BY hour_of_day ASC`
  },
  {
    id: 'pq_renewable_vs_fossil',
    name: 'Renewable vs Gas Correlation by Region',
    category: 'Energy Mix',
    description: 'Compares average renewable generation percentage against natural gas CCGT generation across all regions.',
    sql: `SELECT 
  region,
  ROUND(AVG(renewable_share), 1) AS renewable_share_pct,
  ROUND(AVG(generation_gas), 1) AS gas_fossil_share_pct,
  ROUND(AVG(generation_nuclear), 1) AS nuclear_share_pct,
  ROUND(AVG(metric_value), 1) AS avg_intensity
FROM clean_records
WHERE source_id = 'SRC_UK_GRID_ESO'
GROUP BY region
ORDER BY renewable_share_pct DESC`
  },
  {
    id: 'pq_anomaly_candidates',
    name: 'Severe Statistical Anomalies Detected',
    category: 'Anomalies',
    description: 'Retrieves all detected statistical anomalies sorted by absolute Z-score deviation and severity.',
    sql: `SELECT 
  anomaly_id,
  timestamp,
  region,
  observed_value,
  expected_baseline,
  deviation_pct,
  z_score,
  severity,
  detection_method
FROM anomalies
ORDER BY ABS(z_score) DESC
LIMIT 50`
  },
  {
    id: 'pq_forecast_error',
    name: 'Day-Ahead Forecast Error Analysis',
    category: 'Time Series',
    description: 'Computes forecast tracking error delta (Actual minus Forecast) to identify prediction variance.',
    sql: `SELECT 
  region,
  ROUND(AVG(ABS(metric_value - forecast_value)), 2) AS mean_absolute_error,
  ROUND(AVG(metric_value - forecast_value), 2) AS mean_bias_error,
  ROUND(MAX(ABS(metric_value - forecast_value)), 1) AS max_forecast_error,
  COUNT(*) AS verified_records
FROM clean_records
WHERE forecast_value IS NOT NULL AND source_id = 'SRC_UK_GRID_ESO'
GROUP BY region
ORDER BY mean_absolute_error DESC`
  },
  {
    id: 'pq_data_quality_rejected',
    name: 'Data Ingestion Audit & Rejected Records',
    category: 'Data Quality',
    description: 'Inspects raw records that were flagged or rejected during the data cleaning pipeline.',
    sql: `SELECT 
  raw_id,
  fetched_at,
  source_id,
  validation_status,
  rejection_reason
FROM raw_records
WHERE validation_status = 'REJECTED'
ORDER BY fetched_at DESC
LIMIT 50`
  },
  {
    id: 'pq_daily_rollups',
    name: 'Daily Operational Rollup Summary',
    category: 'Time Series',
    description: 'Summarizes operational daily metrics including standard deviation volatility across observation days.',
    sql: `SELECT 
  day,
  ROUND(AVG(avg_intensity), 1) AS daily_avg_intensity,
  ROUND(MIN(min_intensity), 1) AS daily_min_intensity,
  ROUND(MAX(max_intensity), 1) AS daily_max_intensity,
  ROUND(AVG(stddev_intensity), 2) AS daily_avg_volatility,
  ROUND(AVG(avg_renewable_share), 1) AS daily_renewable_share
FROM daily_metrics
GROUP BY day
ORDER BY day DESC`
  },
  {
    id: 'pq_data_sources_status',
    name: 'Data Source Provenance and Latency',
    category: 'Data Quality',
    description: 'Verifies operational status, record count, and telemetry periods across all connected sources.',
    sql: `SELECT 
  source_id,
  name,
  provider,
  update_frequency,
  last_successful_fetch,
  records_count,
  status
FROM data_sources`
  }
];

export interface SQLQueryResult {
  success: boolean;
  query: string;
  executionTimeMs: number;
  rowCount: number;
  columns: string[];
  rows: any[];
  error?: string;
}

const FORBIDDEN_SQL_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
  'CREATE', 'GRANT', 'REVOKE', 'REPLACE', 'EXEC', 'EXECUTE',
  'COMMIT', 'ROLLBACK', 'PRAGMA', 'ATTACH', 'DETACH', 'SHUTDOWN'
];

export function executeSafeReadOnlySQL(rawSql: string): SQLQueryResult {
  const startTime = performance.now();
  const trimmed = rawSql.trim();

  if (!trimmed) {
    return {
      success: false,
      query: rawSql,
      executionTimeMs: 0,
      rowCount: 0,
      columns: [],
      rows: [],
      error: 'Query cannot be empty.'
    };
  }

  // Semicolon chaining check
  const statements = trimmed.split(';').map(s => s.trim()).filter(Boolean);
  if (statements.length > 1) {
    return {
      success: false,
      query: rawSql,
      executionTimeMs: 0,
      rowCount: 0,
      columns: [],
      rows: [],
      error: 'Security Error: Multiple chained SQL statements are not permitted in read-only sandbox.'
    };
  }

  // Tokenize and check forbidden keywords
  const uppercaseSql = trimmed.toUpperCase();
  for (const keyword of FORBIDDEN_SQL_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(uppercaseSql)) {
      return {
        success: false,
        query: rawSql,
        executionTimeMs: 0,
        rowCount: 0,
        columns: [],
        rows: [],
        error: `Security Error: Command '${keyword}' is prohibited in read-only SQL Lab. Only SELECT queries are permitted.`
      };
    }
  }

  if (!uppercaseSql.startsWith('SELECT') && !uppercaseSql.startsWith('WITH')) {
    return {
      success: false,
      query: rawSql,
      executionTimeMs: 0,
      rowCount: 0,
      columns: [],
      rows: [],
      error: 'Security Error: Only SELECT queries are permitted.'
    };
  }

  try {
    const rows = db.query<any>(trimmed);
    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      success: true,
      query: rawSql,
      executionTimeMs,
      rowCount: rows.length,
      columns,
      rows: rows.slice(0, 500) // limit frontend rendering to 500 rows
    };
  } catch (err: any) {
    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
    return {
      success: false,
      query: rawSql,
      executionTimeMs,
      rowCount: 0,
      columns: [],
      rows: [],
      error: err?.message || 'SQL Execution Syntax Error'
    };
  }
}
