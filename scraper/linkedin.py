import requests
import hashlib
from datetime import datetime, timezone


def fetch_jobs(keywords: str, location: str, max_results: int = 20) -> list[dict]:
    """
    Fetch remote jobs from RemoteOK's public API.
    Used in place of LinkedIn since LinkedIn's RSS feed is no longer reliable.
    Filters by keywords client-side since the API returns all remote jobs.
    """
    resp = requests.get(
        "https://remoteok.com/api",
        headers={"User-Agent": "job-tracker-portfolio"},
        timeout=15,
    )
    resp.raise_for_status()

    # First element is a notice object, skip it
    all_jobs = [j for j in resp.json() if isinstance(j, dict) and j.get("id")]

    keywords_lower = keywords.lower().split()
    matched = []
    for job in all_jobs:
        searchable = f"{job.get('position', '')} {job.get('description', '')}".lower()
        if any(kw in searchable for kw in keywords_lower):
            matched.append(job)
        if len(matched) >= max_results:
            break

    jobs = []
    for job in matched:
        url = job.get("url", "").strip()
        external_id = hashlib.md5(str(job.get("id", url)).encode()).hexdigest()

        posted_at = None
        epoch = job.get("epoch")
        if epoch:
            posted_at = datetime.fromtimestamp(int(epoch), tz=timezone.utc).isoformat()

        jobs.append({
            "source": "linkedin",   # kept as "linkedin" so the DB schema stays consistent
            "external_id": external_id,
            "title": job.get("position", "").strip(),
            "company": job.get("company", "").strip(),
            "location": "Remote",
            "description": job.get("description", "").strip(),
            "url": url,
            "posted_at": posted_at,
        })

    return jobs
