-- Drop old source constraint so we can add more sources freely
alter table jobs drop constraint if exists jobs_source_check;

-- Rename existing source values to match real provider names
update jobs set source = 'remoteok' where source = 'linkedin';
update jobs set source = 'remotive' where source = 'indeed';

-- Per-user search preferences
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keywords text not null default '',
  location text not null default '',
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table user_preferences enable row level security;

create policy "users manage own preferences" on user_preferences
  for all using (auth.uid() = user_id);
