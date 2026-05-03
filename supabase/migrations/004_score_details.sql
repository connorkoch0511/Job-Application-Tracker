alter table user_job_scores add column if not exists keyword_matches text default '';
alter table user_job_scores add column if not exists keyword_gaps text default '';
alter table user_job_scores add column if not exists experience_fit text default '';
alter table user_job_scores add column if not exists title_match text default '';
