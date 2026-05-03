import os
import time
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone, timedelta
import re

SOURCE = "indeed"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.indeed.com/",
}


def _parse_age(age_str: str) -> str | None:
    """Convert relative age like '3 days ago' to ISO timestamp."""
    now = datetime.now(timezone.utc)
    match = re.search(r"(\d+)\s+(minute|hour|day|week|month)", age_str.lower())
    if not match:
        return None
    n, unit = int(match.group(1)), match.group(2)
    delta = {
        "minute": timedelta(minutes=n),
        "hour": timedelta(hours=n),
        "day": timedelta(days=n),
        "week": timedelta(weeks=n),
        "month": timedelta(days=n * 30),
    }.get(unit)
    return (now - delta).isoformat() if delta else None


def fetch_jobs() -> list[dict]:
    keywords_raw = os.getenv("JOB_KEYWORDS", "software engineer")
    search_terms = [k.strip() for k in keywords_raw.split(",") if k.strip()]
    location = os.getenv("JOB_LOCATION", "remote")

    seen_ids: set = set()
    jobs = []

    for term in search_terms:
        for start in range(0, 50, 10):  # 5 pages × 10 = 50 results per keyword
            try:
                resp = requests.get(
                    "https://www.indeed.com/jobs",
                    params={
                        "q": term,
                        "l": location,
                        "start": start,
                        "fromage": "7",  # last 7 days
                    },
                    headers=HEADERS,
                    timeout=15,
                )
                if resp.status_code != 200:
                    print(f"  Indeed blocked ({resp.status_code}) for '{term}'")
                    break

                soup = BeautifulSoup(resp.text, "html.parser")
                cards = soup.find_all("div", class_=re.compile(r"job_seen_beacon|jobsearch-ResultsList"))
                if not cards:
                    # Try alternate card selector
                    cards = soup.find_all("td", class_="resultContent")

                if not cards:
                    print(f"  Indeed: no cards found for '{term}' (page structure may have changed)")
                    break

                found = 0
                for card in cards:
                    try:
                        link = card.find("a", id=re.compile(r"job_"))
                        if not link:
                            link = card.find("a", href=re.compile(r"/rc/clk|/pagead/clk"))
                        if not link:
                            continue

                        href = link.get("href", "")
                        jk_match = re.search(r"jk=([a-f0-9]+)", href)
                        job_id = jk_match.group(1) if jk_match else ""
                        if not job_id or job_id in seen_ids:
                            continue

                        title_el = card.find("span", id=re.compile(r"jobTitle"))
                        company_el = card.find("span", {"data-testid": "company-name"})
                        location_el = card.find("div", {"data-testid": "text-location"})
                        age_el = card.find("span", {"data-testid": "myJobsStateDate"})

                        title = title_el.get_text(strip=True) if title_el else ""
                        company = company_el.get_text(strip=True) if company_el else ""
                        loc = location_el.get_text(strip=True) if location_el else ""
                        age_text = age_el.get_text(strip=True) if age_el else ""
                        posted_at = _parse_age(age_text)
                        url = f"https://www.indeed.com/viewjob?jk={job_id}"

                        if title:
                            seen_ids.add(job_id)
                            jobs.append({
                                "source": SOURCE,
                                "external_id": job_id,
                                "title": title,
                                "company": company,
                                "location": loc,
                                "description": "",
                                "url": url,
                                "posted_at": posted_at,
                            })
                            found += 1
                    except Exception:
                        continue

                if found == 0:
                    break
                time.sleep(1.5)
            except Exception as e:
                print(f"  Indeed error for '{term}': {e}")
                break

    return jobs
