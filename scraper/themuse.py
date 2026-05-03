import requests
from bs4 import BeautifulSoup

SOURCE = "themuse"


def _strip_html(html: str) -> str:
    return BeautifulSoup(html, "html.parser").get_text(separator=" ", strip=True)


def fetch_jobs() -> list[dict]:
    jobs = []

    for page in range(10):  # up to 10 pages × 20 jobs = 200 jobs
        try:
            resp = requests.get(
                "https://www.themuse.com/api/public/jobs",
                params={"page": page, "descending": "true"},
                headers={"User-Agent": "job-tracker-portfolio"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            break

        results = data.get("results", [])
        if not results:
            break

        for item in results:
            job_id = str(item.get("id", ""))
            if not job_id:
                continue

            locations = item.get("locations", [])
            location = locations[0].get("name", "Remote") if locations else "Remote"

            url = item.get("refs", {}).get("landing_page", "")
            description = _strip_html(item.get("contents") or "")

            jobs.append({
                "source": SOURCE,
                "external_id": job_id,
                "title": (item.get("name") or "").strip(),
                "company": (item.get("company", {}).get("name") or "").strip(),
                "location": location.strip(),
                "description": description,
                "url": url.strip(),
                "posted_at": item.get("publication_date"),
            })

        if page >= data.get("page_count", 1) - 1:
            break

    return jobs
