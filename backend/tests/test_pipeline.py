"""
PulseOps Pipeline & Analytics Unit Tests
Covers data validation, cleaning, statistical anomaly algorithms,
decomposition mathematics, and edge cases (zero denominator, invalid dates, duplicates).
"""
import unittest
import math
from backend.cleaner import PythonDataCleaner
from backend.analytics import compute_z_scores, compute_iqr_thresholds, decompose_contributions

class TestPulseOpsDataCleaner(unittest.TestCase):
    def setUp(self):
        self.cleaner = PythonDataCleaner()

    def test_valid_record(self):
        record = {
            'source_id': 'SRC_TEST',
            'period_from': '2026-09-21T12:00:00Z',
            'period_to': '2026-09-21T12:30:00Z',
            'entity_id': 'REG_1',
            'entity_name': 'London',
            'metric_value': 145.5,
            'forecast_value': 140.0,
            'generation_wind': 35.0,
            'generation_gas': 40.0,
            'generation_solar': 15.0,
            'generation_nuclear': 10.0
        }
        valid, reason, cleaned = self.cleaner.validate_and_clean(record)
        self.assertTrue(valid)
        self.assertIsNone(reason)
        self.assertIsNotNone(cleaned)
        self.assertEqual(cleaned['renewable_share'], 50.0) # wind + solar

    def test_missing_timestamp_edge_case(self):
        record = {
            'source_id': 'SRC_TEST',
            'period_from': '',
            'period_to': '2026-09-21T12:30:00Z',
            'entity_id': 'REG_1',
            'entity_name': 'London',
            'metric_value': 100.0
        }
        valid, reason, _ = self.cleaner.validate_and_clean(record)
        self.assertFalse(valid)
        self.assertEqual(reason, 'MISSING_REQUIRED_TIMESTAMP_FIELD')

    def test_invalid_date_ordering(self):
        record = {
            'source_id': 'SRC_TEST',
            'period_from': '2026-09-21T14:00:00Z',
            'period_to': '2026-09-21T12:00:00Z', # end before start
            'entity_id': 'REG_1',
            'entity_name': 'London',
            'metric_value': 100.0
        }
        valid, reason, _ = self.cleaner.validate_and_clean(record)
        self.assertFalse(valid)
        self.assertEqual(reason, 'INVALID_INTERVAL_RANGE_START_GE_END')

    def test_duplicate_rejection(self):
        record = {
            'source_id': 'SRC_TEST',
            'period_from': '2026-09-21T12:00:00Z',
            'period_to': '2026-09-21T12:30:00Z',
            'entity_id': 'REG_1',
            'entity_name': 'London',
            'metric_value': 100.0
        }
        valid1, _, _ = self.cleaner.validate_and_clean(record)
        self.assertTrue(valid1)
        # Second attempt with same composite key
        valid2, reason2, _ = self.cleaner.validate_and_clean(record)
        self.assertFalse(valid2)
        self.assertEqual(reason2, 'DUPLICATE_RECORD')

    def test_negative_numeric_value(self):
        record = {
            'source_id': 'SRC_TEST',
            'period_from': '2026-09-21T12:00:00Z',
            'period_to': '2026-09-21T12:30:00Z',
            'entity_id': 'REG_1',
            'entity_name': 'London',
            'metric_value': -45.0
        }
        valid, reason, _ = self.cleaner.validate_and_clean(record)
        self.assertFalse(valid)
        self.assertEqual(reason, 'INVALID_OR_NEGATIVE_NUMERIC_VALUE')

class TestPulseOpsAnalytics(unittest.TestCase):
    def test_z_score_empty_and_single(self):
        mean, std, zs = compute_z_scores([])
        self.assertEqual(mean, 0.0)
        self.assertEqual(zs, [])

        mean, std, zs = compute_z_scores([100.0])
        self.assertEqual(mean, 0.0)
        self.assertEqual(zs, [0.0])

    def test_z_score_computation(self):
        data = [10.0, 10.0, 10.0, 10.0, 50.0]
        mean, std, zs = compute_z_scores(data)
        self.assertGreater(std, 0)
        self.assertGreater(zs[-1], 1.5) # 50 is outlier

    def test_iqr_thresholds(self):
        data = [10, 12, 14, 15, 16, 18, 19, 21, 22, 25, 95]
        q1, q3, iqr, upper = compute_iqr_thresholds(data)
        self.assertGreater(upper, q3)
        self.assertGreater(95, upper) # 95 exceeds upper fence

    def test_contribution_decomposition_zero_denominator(self):
        # Edge case: previous total average is zero
        res = decompose_contributions({'London': 100}, {'London': 50}, prev_total_avg=0.0)
        self.assertEqual(res, [])

    def test_contribution_decomposition_math(self):
        # 2 regions: London moved +20, Wales moved -10. Prev total avg = 100
        current = {'London': 120.0, 'Wales': 90.0}
        previous = {'London': 100.0, 'Wales': 100.0}
        prev_total = 100.0
        contributors = decompose_contributions(current, previous, prev_total)

        self.assertEqual(len(contributors), 2)
        # London: delta +20 -> contribution (20 / 100) * (1/2) * 100 = +10.0 pp
        # Wales: delta -10 -> contribution (-10 / 100) * (1/2) * 100 = -5.0 pp
        # Total change = +5.0%
        london = next(c for c in contributors if c['region'] == 'London')
        wales = next(c for c in contributors if c['region'] == 'Wales')
        self.assertEqual(london['contribution_pp'], 10.0)
        self.assertEqual(wales['contribution_pp'], -5.0)
        self.assertEqual(london['contribution_pp'] + wales['contribution_pp'], 5.0)

if __name__ == '__main__':
    unittest.main()
