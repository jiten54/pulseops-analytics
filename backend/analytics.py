"""
PulseOps Statistical Analytics & Contribution Decomposition (Python)
Implements Z-score, IQR, and mathematical regional contribution in percentage points.
"""
import math
from typing import List, Dict, Any, Tuple

def compute_z_scores(values: List[float]) -> Tuple[float, float, List[float]]:
    """Calculates mean, sample standard deviation, and Z-scores for a dataset."""
    n = len(values)
    if n < 2:
        return 0.0, 0.0, [0.0] * n
    mean = sum(values) / n
    variance = sum((x - mean) ** 2 for x in values) / (n - 1)
    stddev = math.sqrt(variance)
    if stddev == 0:
        return mean, 0.0, [0.0] * n
    z_scores = [round((x - mean) / stddev, 2) for x in values]
    return round(mean, 2), round(stddev, 2), z_scores

def compute_iqr_thresholds(values: List[float], multiplier: float = 1.5) -> Tuple[float, float, float, float]:
    """Calculates Q1, Q3, IQR, and Tukey fences."""
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    if n == 0:
        return 0.0, 0.0, 0.0, 0.0
    q1 = sorted_vals[int(n * 0.25)]
    q3 = sorted_vals[int(n * 0.75)]
    iqr = q3 - q1
    lower_bound = max(0.0, q1 - multiplier * iqr)
    upper_bound = q3 + multiplier * iqr
    return round(q1, 2), round(q3, 2), round(iqr, 2), round(upper_bound, 2)

def decompose_contributions(
    current_regional_averages: Dict[str, float],
    previous_regional_averages: Dict[str, float],
    prev_total_avg: float
) -> List[Dict[str, Any]]:
    """
    Decomposes aggregate percentage change into exact regional percentage points contribution:
    Contribution_i = ((Avg_current,i - Avg_prev,i) / Avg_prev_total) * (1 / N) * 100
    The sum of all regional contributions equals the total percentage shift.
    """
    all_regions = list(set(list(current_regional_averages.keys()) + list(previous_regional_averages.keys())))
    num_regions = len(all_regions)
    if num_regions == 0 or prev_total_avg <= 0:
        return []

    contributors = []
    for region in all_regions:
        c_val = current_regional_averages.get(region, 0.0)
        p_val = previous_regional_averages.get(region, 0.0)
        delta = c_val - p_val
        contribution_pp = round((delta / prev_total_avg) * (1.0 / num_regions) * 100.0, 2)

        contributors.append({
            'region': region,
            'current_avg': round(c_val, 1),
            'previous_avg': round(p_val, 1),
            'delta_value': round(delta, 2),
            'contribution_pp': contribution_pp,
            'is_primary_driver': abs(contribution_pp) >= 1.5
        })

    contributors.sort(key=lambda x: abs(x['contribution_pp']), reverse=True)
    return contributors
