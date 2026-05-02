import requests
import hashlib
from datetime import datetime, timezone


def fetch_jobs(keywords: str, location: str, max_results: int = 20) -> list[dict]:
    """
    Fetch remote jobs from Remotive's public API.
    Used in place of Indeed since Indeed's RSS is geo-restricted.
    """
    resp = requests.get(
        "https://remotive.com/api/remote-jobs",
        params={"category": "software-dev", "limit": 50},
        headers={"User-Agent": "job-tracker-portfolio"},
        timeout=15,
    )
    resp.raise_for_status()

    all_jobs = resp.json().get("jobs", [])

    keywords_lower = keywords.lower().split()
    matched = []
    for job in all_jobs:
        searchable = f"{job.get('title', '')} {job.get('description', '')}".lower()
        if any(kw in searchable for kw in keywords_lower):
            matched.append(job)
        if len(matched) >= max_results:
            break

    jobs = []
    for job in matched:
        url = job.get("url", "").strip()
        external_id = hashlib.md5(str(job.get("id", url)).encode()).hexdigest()

        posted_at = None
        pub = job.get("publication_date")
        if pub:
            try:
                posted_at = datetime.fromisoformat(pub.replace("Z", "+00:00")).isoformat()
            except Exception:
                pass

        jobs.append({
            "source": "indeed",   # kept as "indeed" so the DB schema stays consistent
            "external_id": external_id,
            "title": job.get("title", "").strip(),
            "company": job.get("company_name", "").strip(),
            "location": job.get("candidate_required_location", "Remote").strip(),
            "description": job.get("description", "").strip(),
            "url": url,
            "posted_at": posted_at,
        })

    return jobs
