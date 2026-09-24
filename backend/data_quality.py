"""
PulseOps Data Quality Auditing Engine (Python)
Calculates Completeness, Validity, Uniqueness, Consistency, and Freshness.
"""
from typing import List, Dict, Any

def calculate_data_quality_metrics(
    raw_records: List[Dict[str, Any]],
    clean_records: List[Dict[str, Any]],
    duplicate_count: int,
    sync_latency_minutes: int
) -> Dict[str, Any]:
    total_raw = len(raw_records)
    total_clean = len(clean_records)

    if total_raw == 0:
        return {"overall_score_pct": 100.0, "dimensions": {}}

    # 1. Completeness: ratio of required non-null fields
    required_keys = ['period_from', 'period_to', 'entity_id', 'entity_name', 'metric_value']
    total_required = total_raw * len(required_keys)
    populated = 0
    for r in raw_records:
        for k in required_keys:
            if r.get(k) is not None and str(r.get(k)).strip() != '':
                populated += 1
    completeness_pct = round((populated / total_required) * 100.0, 2)

    # 2. Validity: valid formatted & non-negative records / total
    validity_pct = round(((total_raw - (total_raw - total_clean - duplicate_count)) / total_raw) * 100.0, 2)

    # 3. Uniqueness: (total - duplicates) / total
    uniqueness_pct = round(((total_raw - duplicate_count) / total_raw) * 100.0, 2)

    # 4. Consistency: records adhering to generation fuel percentage bounds
    consistent = sum(
        1 for c in clean_records
        if abs((c.get('generation_gas', 0) + c.get('generation_wind', 0) + c.get('generation_solar', 0) +
                c.get('generation_nuclear', 0) + c.get('generation_biomass', 0) + c.get('generation_hydro', 0) +
                c.get('generation_imports', 0)) - 100.0) <= 5.5
        or (c.get('generation_gas', 0) == 0 and c.get('generation_wind', 0) == 0)
    )
    consistency_pct = round((consistent / max(1, total_clean)) * 100.0, 2)

    # 5. Freshness score
    freshness_pct = 100.0
    if sync_latency_minutes > 90:
        freshness_pct = max(70.0, round(100.0 - (sync_latency_minutes - 90) * 0.05, 2))

    overall = round(
        completeness_pct * 0.25 +
        validity_pct * 0.25 +
        uniqueness_pct * 0.20 +
        consistency_pct * 0.20 +
        freshness_pct * 0.10,
        1
    )

    return {
        "overall_score_pct": overall,
        "completeness_pct": completeness_pct,
        "validity_pct": validity_pct,
        "uniqueness_pct": uniqueness_pct,
        "consistency_pct": consistency_pct,
        "freshness_pct": freshness_pct
    }
