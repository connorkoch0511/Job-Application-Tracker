import os
import psycopg
from dotenv import load_dotenv

load_dotenv(override=True)

DATABASE_URL = os.environ["DATABASE_URL"]
STALE_DAYS = 30


def run():
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        cutoff_clause = f"scraped_at < now() - interval '{STALE_DAYS} days'"

        total_old = conn.execute(f"select count(*) from jobs where {cutoff_clause}").fetchone()[0]
        if not total_old:
            print(f"No jobs older than {STALE_DAYS} days. Nothing to clean up.")
            return

        print(f"Found {total_old} jobs older than {STALE_DAYS} days.")

        # Delete only stale jobs that no user has applied to or scored.
        deleted = conn.execute(
            f"""
            delete from jobs j
            where {cutoff_clause.replace('scraped_at', 'j.scraped_at')}
              and not exists (select 1 from applications a where a.job_id = j.id)
              and not exists (select 1 from user_job_scores s where s.job_id = j.id)
            returning j.id
            """
        ).fetchall()

        kept = total_old - len(deleted)
        if not deleted:
            print(f"All {total_old} stale jobs have applications or scores — nothing deleted.")
            return

        print(f"Deleted {len(deleted)} stale jobs. Kept {kept} with scores or applications.")


if __name__ == "__main__":
    run()
