import html as html_module
import requests
from datetime import datetime, timezone
from bs4 import BeautifulSoup

SOURCE = "arbeitnow"


def _strip_html(html: str) -> str:
    return BeautifulSoup(html, "html.parser").get_text(separator=" ", strip=True)


def fetch_jobs() -> list[dict]:
    jobs = []
    page = 1

    while page <= 5:  # cap at 5 pages (~100 jobs)
        try:
            resp = requests.get(
                "https://www.arbeitnow.com/api/job-board-api",
                params={"page": page, "remote": "true"},
                headers={"User-Agent": "job-tracker-portfolio"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            break

        items = data.get("data", [])
        if not items:
            break

        for item in items:
            slug = item.get("slug", "")
            if not slug:
                continue

            posted_at = None
            created = item.get("created_at")
            if created:
                try:
                    posted_at = datetime.fromtimestamp(int(created), tz=timezone.utc).isoformat()
                except Exception:
                    pass

            description = _strip_html(item.get("description") or "")

            jobs.append({
                "source": SOURCE,
                "external_id": slug,
                "title": html_module.unescape((item.get("title") or "").strip()),
                "company": html_module.unescape((item.get("company_name") or "").strip()),
                "location": (item.get("location") or "Remote").strip(),
                "description": description,
                "url": (item.get("url") or "").strip(),
                "posted_at": posted_at,
            })

        # Stop if there's no next page
        if not data.get("links", {}).get("next"):
            break
        page += 1

    return jobs
