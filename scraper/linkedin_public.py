import os
import time
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone

SOURCE = "linkedin"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.linkedin.com/",
}


def _parse_cards(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    jobs = []
    for card in soup.find_all("div", class_="base-card"):
        try:
            job_id = card.get("data-entity-urn", "").split(":")[-1]
            if not job_id:
                continue

            title_el = card.find("h3", class_="base-search-card__title")
            company_el = card.find("h4", class_="base-search-card__subtitle")
            location_el = card.find("span", class_="job-search-card__location")
            link_el = card.find("a", class_="base-card__full-link")
            time_el = card.find("time")

            title = title_el.get_text(strip=True) if title_el else ""
            company = company_el.get_text(strip=True) if company_el else ""
            location = location_el.get_text(strip=True) if location_el else ""
            url = link_el["href"].split("?")[0] if link_el else ""

            posted_at = None
            if time_el and time_el.get("datetime"):
                try:
                    posted_at = datetime.fromisoformat(time_el["datetime"]).replace(
                        tzinfo=timezone.utc
                    ).isoformat()
                except Exception:
                    pass

            if title and url:
                jobs.append({
                    "source": SOURCE,
                    "external_id": job_id,
                    "title": title,
                    "company": company,
                    "location": location,
                    "description": "",
                    "url": url,
                    "posted_at": posted_at,
                })
        except Exception:
            continue
    return jobs


def fetch_jobs() -> list[dict]:
    keywords_raw = os.getenv("JOB_KEYWORDS", "software engineer")
    search_terms = [k.strip() for k in keywords_raw.split(",") if k.strip()]

    seen_ids: set = set()
    jobs = []

    for term in search_terms:
        for start in range(0, 75, 25):  # 3 pages × 25 = 75 results per keyword
            try:
                resp = requests.get(
                    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search",
                    params={
                        "keywords": term,
                        "location": os.getenv("JOB_LOCATION", ""),
                        "start": start,
                        "f_TPR": "r604800",  # posted in last 7 days
                    },
                    headers=HEADERS,
                    timeout=15,
                )
                if resp.status_code != 200:
                    print(f"  LinkedIn blocked ({resp.status_code}) for '{term}'")
                    break

                cards = _parse_cards(resp.text)
                for job in cards:
                    if job["external_id"] not in seen_ids:
                        seen_ids.add(job["external_id"])
                        jobs.append(job)

                if len(cards) < 25:
                    break
                time.sleep(1)
            except Exception as e:
                print(f"  LinkedIn error for '{term}': {e}")
                break

    return jobs
