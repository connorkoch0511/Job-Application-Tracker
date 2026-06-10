import os
import psycopg
from dotenv import load_dotenv

from remoteok import fetch_jobs as fetch_remoteok
from remotive import fetch_jobs as fetch_remotive
from themuse import fetch_jobs as fetch_themuse
from linkedin_public import fetch_jobs as fetch_linkedin

load_dotenv(override=True)

DATABASE_URL = os.environ["DATABASE_URL"]

# Columns the scrapers provide; mirrors the jobs table (scraped_at is set to now()).
JOB_COLS = ["source", "external_id", "title", "company", "location", "description", "url", "posted_at"]

# Broad sources — no search terms needed, fetch everything
BROAD_SOURCES = [
    ("RemoteOK", fetch_remoteok),
    ("Remotive", fetch_remotive),
    ("The Muse", fetch_themuse),
]


def get_search_combos(conn) -> list[tuple[str, str]]:
    """
    Build unique (keyword, location) pairs from all users' preferences.
    Falls back to env vars if no preferences are set.
    """
    rows = conn.execute("select keywords, location from user_preferences").fetchall()

    combos: set[tuple[str, str]] = set()
    for keywords_raw, location_raw in rows:
        keywords = [k.strip() for k in (keywords_raw or "").split(",") if k.strip()]
        locations = [l.strip() for l in (location_raw or "").split(",") if l.strip()]
        if not locations:
            locations = [""]
        for kw in keywords:
            for loc in locations:
                combos.add((kw, loc))

    if not combos:
        # No preferences saved yet — fall back to GitHub secrets
        fallback_keywords = [k.strip() for k in os.getenv("JOB_KEYWORDS", "software engineer").split(",") if k.strip()]
        fallback_location = os.getenv("JOB_LOCATION", "")
        for kw in fallback_keywords:
            combos.add((kw, fallback_location))

    return list(combos)


INSERT_SQL = (
    f"insert into jobs ({', '.join(JOB_COLS)}, scraped_at) "
    f"values ({', '.join(['%s'] * len(JOB_COLS))}, now()) "
    "on conflict (source, external_id) do nothing returning id"
)


def upsert_jobs(conn, jobs: list[dict], source_name: str) -> int:
    new = 0
    for job in jobs:
        if not job.get("external_id") or not job.get("title") or not job.get("url"):
            continue
        try:
            row = conn.execute(INSERT_SQL, [job.get(c) for c in JOB_COLS]).fetchone()
            if row:
                new += 1
        except Exception as e:
            conn.rollback()
            print(f"  Error upserting '{job.get('title')}': {e}")
        else:
            conn.commit()
    return new


def run():
    with psycopg.connect(DATABASE_URL) as conn:
        # Broad sources
        for name, fetch_fn in BROAD_SOURCES:
            print(f"\nScraping {name}...")
            try:
                jobs = fetch_fn()
                print(f"  Fetched {len(jobs)} jobs")
                new = upsert_jobs(conn, jobs, name)
                print(f"  {new} new jobs added")
            except Exception as e:
                print(f"  Failed: {e}")

        # LinkedIn — per user preferences
        print("\nBuilding search parameters from user preferences...")
        combos = get_search_combos(conn)
        print(f"  {len(combos)} unique keyword/location combo(s): {combos}")

        print("\nScraping LinkedIn (public)...")
        try:
            jobs = fetch_linkedin(combos)
            print(f"  Fetched {len(jobs)} jobs")
            new = upsert_jobs(conn, jobs, "LinkedIn")
            print(f"  {new} new jobs added")
        except Exception as e:
            print(f"  Failed: {e}")



if __name__ == "__main__":
    run()
