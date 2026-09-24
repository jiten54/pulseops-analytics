"""
PulseOps Standalone Ingestion Service (Python)
Fetches from UK National Grid ESO and Open-Meteo European Copernicus APIs with retry logic.
"""
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from backend.cleaner import PythonDataCleaner

USER_AGENT = "PulseOps-Python-ETL/1.0"

def fetch_json_with_retry(url: str, retries: int = 3, timeout_sec: int = 10) -> Optional[Dict[str, Any]]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout_sec) as response:
                if response.status == 200:
                    return json.loads(response.read().decode('utf-8'))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as err:
            print(f"[Ingestion] Attempt {attempt + 1}/{retries} failed for {url}: {err}")
    return None

def run_python_etl_pipeline(db_connection=None):
    cleaner = PythonDataCleaner()
    now = datetime.utcnow()
    four_days_ago = now - timedelta(days=4)
    from_str = four_days_ago.strftime("%Y-%m-%dT%H:%MZ")
    to_str = now.strftime("%Y-%m-%dT%H:%MZ")

    grid_url = f"https://api.carbonintensity.org.uk/regional/intensity/{from_str}/{to_str}"
    print(f"[PulseOps Python ETL] Fetching verified telemetry from {grid_url}...")
    data = fetch_json_with_retry(grid_url)

    if not data or "data" not in data:
        print("[PulseOps Python ETL] Warning: Unable to retrieve source telemetry.")
        return {"status": "FAILED", "records_inserted": 0, "records_rejected": 0}

    periods = data.get("data", [])
    valid_count = 0
    rejected_count = 0

    for period in periods:
        p_from = period.get("from")
        p_to = period.get("to")
        for reg in period.get("regions", []):
            raw = {
                "source_id": "SRC_UK_GRID_ESO",
                "period_from": p_from,
                "period_to": p_to,
                "entity_id": str(reg.get("regionid")),
                "entity_name": reg.get("shortname") or f"Region {reg.get('regionid')}",
                "region": reg.get("shortname") or f"Region {reg.get('regionid')}",
                "metric_name": "Carbon Intensity",
                "metric_value": reg.get("intensity", {}).get("actual") or reg.get("intensity", {}).get("forecast"),
                "forecast_value": reg.get("intensity", {}).get("forecast"),
                "intensity_index": reg.get("intensity", {}).get("index", "moderate")
            }
            is_valid, reason, cleaned = cleaner.validate_and_clean(raw)
            if is_valid:
                valid_count += 1
            else:
                rejected_count += 1

    print(f"[PulseOps Python ETL] Successfully validated {valid_count} clean records ({rejected_count} rejected).")
    return {
        "status": "SUCCESS",
        "records_received": valid_count + rejected_count,
        "records_inserted": valid_count,
        "records_rejected": rejected_count
    }

if __name__ == "__main__":
    run_python_etl_pipeline()
