-- PulseOps Database Schema (PostgreSQL DDL)
-- Production-grade normalized schema with audit trails, foreign keys, and indexes.

-- 1. Data Sources Provenance Catalog
CREATE TABLE IF NOT EXISTS data_sources (
    source_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(512) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    data_type VARCHAR(128) NOT NULL,
    update_frequency VARCHAR(64) NOT NULL,
    last_successful_fetch TIMESTAMPTZ,
    records_count INTEGER DEFAULT 0,
    data_period_start TIMESTAMPTZ,
    data_period_end TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'OPERATIONAL' CHECK (status IN ('OPERATIONAL', 'DEGRADED', 'FAILED'))
);

-- 2. Pipeline Execution Runs Log
CREATE TABLE IF NOT EXISTS pipeline_runs (
    run_id VARCHAR(64) PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    records_received INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_rejected INTEGER DEFAULT 0,
    status VARCHAR(32) NOT NULL CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILED')),
    error_message TEXT
);

-- 3. Raw Ingested Records (Traceability & Audit)
CREATE TABLE IF NOT EXISTS raw_records (
    raw_id VARCHAR(128) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES data_sources(source_id),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL,
    ingestion_run_id VARCHAR(64) NOT NULL REFERENCES pipeline_runs(run_id),
    validation_status VARCHAR(32) NOT NULL CHECK (validation_status IN ('VALID', 'REJECTED')),
    rejection_reason VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_raw_source_fetched ON raw_records(source_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_validation_status ON raw_records(validation_status);

-- 4. Clean Validated Records (Analytics Operational Store)
CREATE TABLE IF NOT EXISTS clean_records (
    id VARCHAR(128) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES data_sources(source_id),
    timestamp TIMESTAMPTZ NOT NULL,
    period_from TIMESTAMPTZ NOT NULL,
    period_to TIMESTAMPTZ NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    entity_name VARCHAR(128) NOT NULL,
    region VARCHAR(128) NOT NULL,
    metric_name VARCHAR(128) NOT NULL,
    metric_value NUMERIC(10, 2) NOT NULL CHECK (metric_value >= 0),
    unit VARCHAR(32) NOT NULL,
    forecast_value NUMERIC(10, 2),
    intensity_index VARCHAR(32) NOT NULL,
    generation_gas NUMERIC(5, 2) DEFAULT 0,
    generation_wind NUMERIC(5, 2) DEFAULT 0,
    generation_solar NUMERIC(5, 2) DEFAULT 0,
    generation_nuclear NUMERIC(5, 2) DEFAULT 0,
    generation_biomass NUMERIC(5, 2) DEFAULT 0,
    generation_hydro NUMERIC(5, 2) DEFAULT 0,
    generation_imports NUMERIC(5, 2) DEFAULT 0,
    renewable_share NUMERIC(5, 2) DEFAULT 0,
    raw_record_id VARCHAR(128) NOT NULL REFERENCES raw_records(raw_id),
    CONSTRAINT uq_clean_source_entity_period UNIQUE (source_id, entity_id, period_from)
);

CREATE INDEX IF NOT EXISTS idx_clean_timestamp_region ON clean_records(timestamp DESC, region);
CREATE INDEX IF NOT EXISTS idx_clean_metric_value ON clean_records(metric_value);

-- 5. Defined Metrics Catalog
CREATE TABLE IF NOT EXISTS metrics (
    metric_id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    calculation_definition TEXT NOT NULL,
    formula TEXT NOT NULL,
    source_name VARCHAR(255) NOT NULL
);

-- 6. Daily Aggregated Metrics
CREATE TABLE IF NOT EXISTS daily_metrics (
    day DATE NOT NULL,
    entity_name VARCHAR(128) NOT NULL,
    region VARCHAR(128) NOT NULL,
    avg_intensity NUMERIC(10, 2) NOT NULL,
    min_intensity NUMERIC(10, 2) NOT NULL,
    max_intensity NUMERIC(10, 2) NOT NULL,
    stddev_intensity NUMERIC(10, 2) NOT NULL,
    avg_renewable_share NUMERIC(5, 2) NOT NULL,
    records_count INTEGER NOT NULL,
    PRIMARY KEY (day, region)
);

-- 7. Statistical Anomalies
CREATE TABLE IF NOT EXISTS anomalies (
    anomaly_id VARCHAR(128) PRIMARY KEY,
    record_id VARCHAR(128) NOT NULL REFERENCES clean_records(id),
    timestamp TIMESTAMPTZ NOT NULL,
    entity_name VARCHAR(128) NOT NULL,
    region VARCHAR(128) NOT NULL,
    metric_name VARCHAR(128) NOT NULL,
    observed_value NUMERIC(10, 2) NOT NULL,
    expected_baseline NUMERIC(10, 2) NOT NULL,
    deviation_pct NUMERIC(6, 2) NOT NULL,
    z_score NUMERIC(5, 2) NOT NULL,
    iqr_distance NUMERIC(10, 2) NOT NULL,
    detection_method VARCHAR(128) NOT NULL,
    severity VARCHAR(32) NOT NULL CHECK (severity IN ('MODERATE', 'HIGH', 'CRITICAL')),
    rule_explanation TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_zscore ON anomalies(z_score);

-- 8. Data Quality Dimension Audits
CREATE TABLE IF NOT EXISTS data_quality_checks (
    check_id VARCHAR(64) PRIMARY KEY,
    check_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dimension VARCHAR(32) NOT NULL CHECK (dimension IN ('Completeness', 'Validity', 'Uniqueness', 'Consistency', 'Freshness')),
    score_pct NUMERIC(5, 2) NOT NULL,
    passed_records INTEGER NOT NULL,
    failed_records INTEGER NOT NULL,
    total_evaluated INTEGER NOT NULL,
    details TEXT
);
