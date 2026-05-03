import requests
from datetime import datetime, timezone

SOURCE = "remoteok"


def fetch_jobs() -> list[dict]:
    resp = requests.get(
        "https://remoteok.com/api",
        headers={"User-Agent": "job-tracker-portfolio"},
        timeout=15,
    )
    resp.raise_for_status()

    jobs = []
    for item in resp.json():
        if not isinstance(item, dict) or not item.get("id"):
            continue

        posted_at = None
        if item.get("epoch"):
            posted_at = datetime.fromtimestamp(int(item["epoch"]), tz=timezone.utc).isoformat()

        jobs.append({
            "source": SOURCE,
            "external_id": str(item["id"]),
            "title": (item.get("position") or "").strip(),
            "company": (item.get("company") or "").strip(),
            "location": "Remote",
            "description": (item.get("description") or "").strip(),
            "url": (item.get("url") or "").strip(),
            "posted_at": posted_at,
        })

    return jobs
