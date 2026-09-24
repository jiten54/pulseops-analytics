"""
PulseOps Data Validation & Cleaning Engine (Python)
Evaluates field presence, ISO dates, range constraints, and fuel percentage sums.
"""
from datetime import datetime
from typing import Dict, Any, Tuple, Optional

class PythonDataCleaner:
    def __init__(self, existing_keys: Optional[set] = None):
        self.existing_keys = existing_keys or set()

    def validate_and_clean(self, raw: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        # 1. Missing required fields
        if not raw.get('period_from') or not raw.get('period_to'):
            return False, 'MISSING_REQUIRED_TIMESTAMP_FIELD', None

        if not raw.get('entity_id') or not raw.get('entity_name'):
            return False, 'MISSING_REQUIRED_ENTITY_IDENTIFIER', None

        # 2. Timestamp validity
        try:
            from_dt = datetime.fromisoformat(raw['period_from'].replace('Z', '+00:00'))
            to_dt = datetime.fromisoformat(raw['period_to'].replace('Z', '+00:00'))
        except Exception:
            return False, 'INVALID_TIMESTAMP_FORMAT', None

        if from_dt >= to_dt:
            return False, 'INVALID_INTERVAL_RANGE_START_GE_END', None

        # 3. Duplicate check
        composite_key = f"{raw.get('source_id')}_{raw.get('entity_id')}_{raw.get('period_from')}"
        if composite_key in self.existing_keys:
            return False, 'DUPLICATE_RECORD', None

        # 4. Numeric validation
        try:
            val = float(raw.get('metric_value'))
            if val < 0:
                return False, 'INVALID_OR_NEGATIVE_NUMERIC_VALUE', None
        except (ValueError, TypeError):
            return False, 'INVALID_OR_NEGATIVE_NUMERIC_VALUE', None

        forecast = None
        if raw.get('forecast_value') is not None:
            try:
                forecast = float(raw['forecast_value'])
                if forecast < 0:
                    return False, 'INVALID_FORECAST_NUMERIC_VALUE', None
            except (ValueError, TypeError):
                return False, 'INVALID_FORECAST_NUMERIC_VALUE', None

        # 5. Generation mix verification
        gas = max(0.0, float(raw.get('generation_gas') or 0.0))
        wind = max(0.0, float(raw.get('generation_wind') or 0.0))
        solar = max(0.0, float(raw.get('generation_solar') or 0.0))
        nuclear = max(0.0, float(raw.get('generation_nuclear') or 0.0))
        biomass = max(0.0, float(raw.get('generation_biomass') or 0.0))
        hydro = max(0.0, float(raw.get('generation_hydro') or 0.0))
        imports = max(0.0, float(raw.get('generation_imports') or 0.0))

        sum_perc = gas + wind + solar + nuclear + biomass + hydro + imports
        if sum_perc > 0 and abs(sum_perc - 100.0) > 6.0 and sum_perc > 106.0:
            return False, 'GENERATION_PERCENTAGE_SUM_EXCEEDS_TOLERANCE', None

        self.existing_keys.add(composite_key)
        cleaned_id = f"REC_{raw.get('source_id')}_{raw.get('entity_id')}_{raw['period_from'].replace(':', '').replace('-', '')}"

        cleaned = {
            'id': cleaned_id,
            'source_id': raw.get('source_id'),
            'timestamp': raw['period_from'],
            'period_from': raw['period_from'],
            'period_to': raw['period_to'],
            'entity_id': str(raw['entity_id']),
            'entity_name': str(raw['entity_name']).strip(),
            'region': str(raw.get('region') or raw['entity_name']).strip(),
            'metric_name': raw.get('metric_name', 'Carbon Intensity'),
            'metric_value': round(val, 2),
            'unit': raw.get('unit', 'gCO2/kWh'),
            'forecast_value': round(forecast, 2) if forecast is not None else None,
            'intensity_index': str(raw.get('intensity_index', 'moderate')).lower(),
            'generation_gas': round(gas, 1),
            'generation_wind': round(wind, 1),
            'generation_solar': round(solar, 1),
            'generation_nuclear': round(nuclear, 1),
            'generation_biomass': round(biomass, 1),
            'generation_hydro': round(hydro, 1),
            'generation_imports': round(imports, 1),
            'renewable_share': round(wind + solar + hydro, 1)
        }
        return True, None, cleaned
