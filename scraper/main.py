import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client

from remoteok import fetch_jobs as fetch_remoteok
from remotive import fetch_jobs as fetch_remotive
from themuse import fetch_jobs as fetch_themuse
from linkedin_public import fetch_jobs as fetch_linkedin

load_dotenv(override=True)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# Broad sources — no search terms needed, fetch everything
BROAD_SOURCES = [
    ("RemoteOK", fetch_remoteok),
    ("Remotive", fetch_remotive),
    ("The Muse", fetch_themuse),
]


def get_search_combos(client) -> list[tuple[str, str]]:
    """
    Build unique (keyword, location) pairs from all users' preferences.
    Falls back to env vars if no preferences are set.
    """
    prefs = (
        client.table("user_preferences")
        .select("keywords, location")
        .execute()
        .data
    )

    combos: set[tuple[str, str]] = set()
    for pref in prefs:
        keywords = [k.strip() for k in (pref.get("keywords") or "").split(",") if k.strip()]
        locations = [l.strip() for l in (pref.get("location") or "").split(",") if l.strip()]
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


def upsert_jobs(client, jobs: list[dict], source_name: str) -> int:
    new = 0
    for job in jobs:
        if not job.get("external_id") or not job.get("title") or not job.get("url"):
            continue
        try:
            result = (
                client.table("jobs")
                .upsert(
                    {**job, "scraped_at": datetime.now(timezone.utc).isoformat()},
                    on_conflict="source,external_id",
                    ignore_duplicates=True,
                )
                .execute()
            )
            if result.data:
                new += 1
        except Exception as e:
            print(f"  Error upserting '{job.get('title')}': {e}")
    return new


def run():
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Broad sources
    for name, fetch_fn in BROAD_SOURCES:
        print(f"\nScraping {name}...")
        try:
            jobs = fetch_fn()
            print(f"  Fetched {len(jobs)} jobs")
            new = upsert_jobs(client, jobs, name)
            print(f"  {new} new jobs added")
        except Exception as e:
            print(f"  Failed: {e}")

    # LinkedIn — per user preferences
    print("\nBuilding search parameters from user preferences...")
    combos = get_search_combos(client)
    print(f"  {len(combos)} unique keyword/location combo(s): {combos}")

    print("\nScraping LinkedIn (public)...")
    try:
        jobs = fetch_linkedin(combos)
        print(f"  Fetched {len(jobs)} jobs")
        new = upsert_jobs(client, jobs, "LinkedIn")
        print(f"  {new} new jobs added")
    except Exception as e:
        print(f"  Failed: {e}")



if __name__ == "__main__":
    run()
