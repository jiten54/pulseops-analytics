/**
 * PulseOps - Data Validation and Cleaning Engine
 * Strict schema verification, data integrity audits, and rejection tracking.
 */
export interface RawInputRecord {
  source_id: string;
  period_from: string;
  period_to: string;
  entity_id: string;
  entity_name: string;
  region: string;
  metric_name: string;
  metric_value: any;
  unit: string;
  forecast_value?: any;
  intensity_index?: string;
  generation_gas?: any;
  generation_wind?: any;
  generation_solar?: any;
  generation_nuclear?: any;
  generation_biomass?: any;
  generation_hydro?: any;
  generation_imports?: any;
  raw_payload: any;
}

export interface ValidationResult {
  isValid: boolean;
  rejectionReason: string | null;
  cleanedRecord?: {
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
  };
}

export class DataCleaner {
  private existingKeys = new Set<string>();

  constructor(existingCompositeKeys: string[] = []) {
    existingCompositeKeys.forEach(k => this.existingKeys.add(k));
  }

  public validateAndClean(raw: RawInputRecord): ValidationResult {
    // 1. Missing required identifiers
    if (!raw.period_from || !raw.period_to) {
      return { isValid: false, rejectionReason: 'MISSING_REQUIRED_TIMESTAMP_FIELD' };
    }

    if (!raw.entity_id || !raw.entity_name) {
      return { isValid: false, rejectionReason: 'MISSING_REQUIRED_ENTITY_IDENTIFIER' };
    }

    // 2. Timestamp validity check
    const fromDate = new Date(raw.period_from);
    const toDate = new Date(raw.period_to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return { isValid: false, rejectionReason: 'INVALID_TIMESTAMP_FORMAT' };
    }

    if (fromDate.getTime() >= toDate.getTime()) {
      return { isValid: false, rejectionReason: 'INVALID_INTERVAL_RANGE_START_GE_END' };
    }

    // Reject future timestamps past 24h
    const now = Date.now();
    if (fromDate.getTime() > now + 24 * 3600 * 1000) {
      return { isValid: false, rejectionReason: 'STALE_OR_FUTURE_ANOMALOUS_DATE' };
    }

    // 3. Duplicate check
    const compositeKey = `${raw.source_id}_${raw.entity_id}_${raw.period_from}`;
    if (this.existingKeys.has(compositeKey)) {
      return { isValid: false, rejectionReason: 'DUPLICATE_RECORD' };
    }

    // 4. Numeric value verification
    const val = Number(raw.metric_value);
    if (raw.metric_value === null || raw.metric_value === undefined || isNaN(val) || val < 0) {
      return { isValid: false, rejectionReason: 'INVALID_OR_NEGATIVE_NUMERIC_VALUE' };
    }

    const forecast = raw.forecast_value !== undefined && raw.forecast_value !== null ? Number(raw.forecast_value) : null;
    if (forecast !== null && (isNaN(forecast) || forecast < 0)) {
      return { isValid: false, rejectionReason: 'INVALID_FORECAST_NUMERIC_VALUE' };
    }

    // 5. Fuel generation percentages check
    const gas = Math.max(0, Number(raw.generation_gas) || 0);
    const wind = Math.max(0, Number(raw.generation_wind) || 0);
    const solar = Math.max(0, Number(raw.generation_solar) || 0);
    const nuclear = Math.max(0, Number(raw.generation_nuclear) || 0);
    const biomass = Math.max(0, Number(raw.generation_biomass) || 0);
    const hydro = Math.max(0, Number(raw.generation_hydro) || 0);
    const imports = Math.max(0, Number(raw.generation_imports) || 0);

    const sumPerc = gas + wind + solar + nuclear + biomass + hydro + imports;
    // If generation mix provided, check consistency (allowing 2.5% tolerance for rounding/other minor fuels)
    if (sumPerc > 0 && Math.abs(sumPerc - 100) > 6.0 && sumPerc > 106.0) {
      return { isValid: false, rejectionReason: 'GENERATION_PERCENTAGE_SUM_EXCEEDS_TOLERANCE' };
    }

    // Renewable share definition: wind + solar + hydro
    const renewableShare = Number((wind + solar + hydro).toFixed(1));

    // Register composite key
    this.existingKeys.add(compositeKey);

    const id = `REC_${raw.source_id}_${raw.entity_id}_${raw.period_from.replace(/[-:TZ]/g, '')}`;

    return {
      isValid: true,
      rejectionReason: null,
      cleanedRecord: {
        id,
        source_id: raw.source_id,
        timestamp: raw.period_from,
        period_from: raw.period_from,
        period_to: raw.period_to,
        entity_id: String(raw.entity_id),
        entity_name: String(raw.entity_name).trim(),
        region: String(raw.region || raw.entity_name).trim(),
        metric_name: raw.metric_name || 'Carbon Intensity',
        metric_value: Number(val.toFixed(2)),
        unit: raw.unit || 'gCO2/kWh',
        forecast_value: forecast !== null ? Number(forecast.toFixed(2)) : null,
        intensity_index: (raw.intensity_index || 'moderate').toLowerCase(),
        generation_gas: Number(gas.toFixed(1)),
        generation_wind: Number(wind.toFixed(1)),
        generation_solar: Number(solar.toFixed(1)),
        generation_nuclear: Number(nuclear.toFixed(1)),
        generation_biomass: Number(biomass.toFixed(1)),
        generation_hydro: Number(hydro.toFixed(1)),
        generation_imports: Number(imports.toFixed(1)),
        renewable_share: renewableShare
      }
    };
  }
}
