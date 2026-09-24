-- Security and index follow-up after validating the operational foundation.

revoke all on function public.write_audit_log() from public, anon, authenticated;

create index if not exists project_events_created_by_idx
  on public.project_events(created_by) where created_by is not null;

-- This constraint duplicates project_members_project_id_user_id_key.
alter table public.project_members
  drop constraint if exists project_members_project_user_key;

