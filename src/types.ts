export interface KPISummary {
  currentIntensity: number;
  intensityUnit: string;
  intensityPeriodOverPeriodDeltaPct: number;
  currentRenewableShare: number;
  renewablePeriodOverPeriodDeltaPct: number;
  gasFossilShare: number;
  forecastTrackingError: number;
  operationalVolatility: number;
  highestCarbonRegion: { name: string; value: number };
  lowestCarbonRegion: { name: string; value: number };
  totalCleanRecords: number;
  totalAnomaliesDetected: number;
  dataQualityScore: number;
  lastUpdated: string;
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

export interface DataSource {
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

export interface TrendPoint {
  timestamp: string;
  timeLabel: string;
  intensity: number;
  forecast: number | null;
  renewableShare: number;
  gasShare: number;
  windShare: number;
  solarShare: number;
}

export interface RegionComparison {
  region: string;
  avg_intensity: number;
  min_intensity: number;
  max_intensity: number;
  avg_renewable_share: number;
  avg_gas_share: number;
  avg_wind_share: number;
  total_records: number;
}

export interface PredefinedQuery {
  id: string;
  name: string;
  category: 'Ranking' | 'Time Series' | 'Anomalies' | 'Data Quality' | 'Energy Mix';
  description: string;
  sql: string;
}

export interface RootCauseDecomposition {
  overallChangePct: number;
  currentAvg: number;
  previousAvg: number;
  periodLabel: string;
  metric: string;
  contributors: {
    region: string;
    currentAvg: number;
    previousAvg: number;
    deltaValue: number;
    contributionPercentagePoints: number;
    percentageShareOfChange: number;
    isPrimaryDriver: boolean;
  }[];
  explanation: string;
}

export interface GroundedInsight {
  question: string;
  dataUsed: string;
  analysisPeriod: string;
  metricsUsed: string[];
  evidenceData: Record<string, any>;
  explanation: string;
  recommendations: string[];
  isAiGenerated: boolean;
}

export type HealthGrade = 'GREEN' | 'YELLOW' | 'RED';

export interface EndpointMetric {
  id: string;
  name: string;
  url: string;
  provider: string;
  category: 'INGESTION_PRIMARY' | 'INGESTION_SECONDARY' | 'INTERNAL_DATABASE';
  method: string;
  statusCode: number;
  statusText: string;
  latencyMs: number;
  lastChecked: string;
  healthGrade: HealthGrade;
  healthDescription: string;
  uptimePct: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  avgLatencyMs: number;
  totalChecks: number;
  failedChecks: number;
  errorMessage?: string | null;
  history: {
    timestamp: string;
    statusCode: number;
    latencyMs: number;
    grade: HealthGrade;
  }[];
}

export interface SystemHealthReport {
  overallGrade: HealthGrade;
  overallStatus: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE';
  lastEvaluatedAt: string;
  endpoints: EndpointMetric[];
  summary: {
    totalEndpoints: number;
    healthyCount: number;
    degradedCount: number;
    downCount: number;
    avgSystemLatencyMs: number;
    systemUptimePct: number;
  };
}
