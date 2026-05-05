import os
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(override=True)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
STALE_DAYS = 30


def run():
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=STALE_DAYS)).isoformat()

    old_result = client.table("jobs").select("id").lt("scraped_at", cutoff).execute()
    old_ids = [r["id"] for r in old_result.data]

    if not old_ids:
        print(f"No jobs older than {STALE_DAYS} days. Nothing to clean up.")
        return

    print(f"Found {len(old_ids)} jobs older than {STALE_DAYS} days.")

    # Protect jobs that have applications OR scores — only delete truly untouched jobs
    apps_result = (
        client.table("applications")
        .select("job_id")
        .in_("job_id", old_ids)
        .execute()
    )
    scores_result = (
        client.table("user_job_scores")
        .select("job_id")
        .in_("job_id", old_ids)
        .execute()
    )
    protected = (
        {r["job_id"] for r in apps_result.data}
        | {r["job_id"] for r in scores_result.data}
    )
    to_delete = [id_ for id_ in old_ids if id_ not in protected]

    if not to_delete:
        print(f"All {len(old_ids)} stale jobs have applications — nothing deleted.")
        return

    deleted = 0
    for i in range(0, len(to_delete), 100):
        batch = to_delete[i : i + 100]
        client.table("jobs").delete().in_("id", batch).execute()
        deleted += len(batch)

    print(f"Deleted {deleted} stale jobs. Kept {len(protected)} with scores or applications.")


if __name__ == "__main__":
    run()
