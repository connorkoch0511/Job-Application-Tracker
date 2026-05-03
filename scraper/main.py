import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client

from remoteok import fetch_jobs as fetch_remoteok
from remotive import fetch_jobs as fetch_remotive
from arbeitnow import fetch_jobs as fetch_arbeitnow
from themuse import fetch_jobs as fetch_themuse

load_dotenv(override=True)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

SOURCES = [
    ("RemoteOK", fetch_remoteok),
    ("Remotive", fetch_remotive),
    ("Arbeitnow", fetch_arbeitnow),
    ("The Muse", fetch_themuse),
]


def run():
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    total_new = 0
    for name, fetch_fn in SOURCES:
        print(f"\nScraping {name}...")
        try:
            jobs = fetch_fn()
        except Exception as e:
            print(f"  Failed to fetch: {e}")
            continue

        print(f"  Fetched {len(jobs)} jobs")
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

        print(f"  {new} new jobs added")
        total_new += new

    print(f"\nDone. {total_new} total new jobs added across all sources.")


if __name__ == "__main__":
    run()
