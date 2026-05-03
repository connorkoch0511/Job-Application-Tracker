import requests
from datetime import datetime, timezone

SOURCE = "remotive"

# Fetch across all major categories for broad coverage
CATEGORIES = [
    "software-dev",
    "data",
    "devops-sysadmin",
    "product",
    "design",
    "customer-support",
    "sales",
    "marketing",
    "business",
]


def fetch_jobs() -> list[dict]:
    seen_ids: set = set()
    jobs = []

    for category in CATEGORIES:
        try:
            resp = requests.get(
                "https://remotive.com/api/remote-jobs",
                params={"category": category, "limit": 50},
                headers={"User-Agent": "job-tracker-portfolio"},
                timeout=15,
            )
            resp.raise_for_status()
        except Exception:
            continue

        for item in resp.json().get("jobs", []):
            job_id = str(item.get("id", ""))
            if not job_id or job_id in seen_ids:
                continue
            seen_ids.add(job_id)

            posted_at = None
            pub = item.get("publication_date")
            if pub:
                try:
                    posted_at = datetime.fromisoformat(pub.replace("Z", "+00:00")).isoformat()
                except Exception:
                    pass

            jobs.append({
                "source": SOURCE,
                "external_id": job_id,
                "title": (item.get("title") or "").strip(),
                "company": (item.get("company_name") or "").strip(),
                "location": (item.get("candidate_required_location") or "Remote").strip(),
                "description": (item.get("description") or "").strip(),
                "url": (item.get("url") or "").strip(),
                "posted_at": posted_at,
            })

    return jobs
