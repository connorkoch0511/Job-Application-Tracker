import os
from dotenv import load_dotenv
from supabase import create_client
from linkedin import fetch_jobs as linkedin_jobs
from indeed import fetch_jobs as indeed_jobs

load_dotenv(override=True)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# Configure your search here
KEYWORDS = os.getenv("JOB_KEYWORDS", "software engineer")
LOCATION = os.getenv("JOB_LOCATION", "Remote")


def run():
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print(f"Scraping LinkedIn for '{KEYWORDS}' in '{LOCATION}'...")
    li_jobs = linkedin_jobs(KEYWORDS, LOCATION)
    print(f"  Found {len(li_jobs)} LinkedIn jobs")

    print(f"Scraping Indeed for '{KEYWORDS}' in '{LOCATION}'...")
    in_jobs = indeed_jobs(KEYWORDS, LOCATION)
    print(f"  Found {len(in_jobs)} Indeed jobs")

    all_jobs = li_jobs + in_jobs

    inserted = 0
    skipped = 0
    for job in all_jobs:
        result = (
            client.table("jobs")
            .upsert(job, on_conflict="source,external_id", ignore_duplicates=True)
            .execute()
        )
        if result.data:
            inserted += 1
        else:
            skipped += 1

    print(f"Done. {inserted} new jobs inserted, {skipped} duplicates skipped.")


if __name__ == "__main__":
    run()
