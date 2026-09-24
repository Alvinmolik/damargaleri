-- Operational data foundation for dashboard, Project 360, calendar, and finance.
-- Additive migration: existing project/client flows remain compatible.

alter table public.project_members
  add column if not exists member_role text not null default 'client',
  add column if not exists member_status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.project_members
  drop constraint if exists project_members_member_role_check,
  add constraint project_members_member_role_check
    check (member_role in ('client', 'collaborator')),
  drop constraint if exists project_members_member_status_check,
  add constraint project_members_member_status_check
    check (member_status in ('invited', 'active', 'inactive', 'revoked'));

create index if not exists project_members_status_idx
  on public.project_members(project_id, member_status);

create table if not exists public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  event_type text not null default 'other'
    check (event_type in (
      'wedding', 'prewedding', 'akad', 'reception', 'engagement',
      'meeting', 'fitting', 'food_tasting', 'technical_meeting', 'other'
    )),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  google_event_id text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_events_time_order check (ends_at is null or ends_at >= starts_at)
);

create index if not exists project_events_project_time_idx
  on public.project_events(project_id, starts_at);
create index if not exists project_events_upcoming_idx
  on public.project_events(starts_at) where status = 'scheduled';
create unique index if not exists project_events_google_event_unique
  on public.project_events(google_event_id) where google_event_id is not null;

-- Preserve current wedding dates as initial calendar events. They can later be
-- split into Akad and Resepsi from Project 360.
insert into public.project_events (project_id, title, event_type, starts_at, location, created_by)
select p.id,
       'Pernikahan ' || p.bride_name || ' & ' || p.groom_name,
       'wedding',
       p.wedding_date::timestamp at time zone 'Asia/Jakarta',
       coalesce(p.venue, p.location),
       p.created_by
from public.projects p
where p.wedding_date is not null
  and p.slug <> 'demo'
  and not exists (
    select 1 from public.project_events e
    where e.project_id = p.id and e.event_type = 'wedding'
  );

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null,
  entity_id uuid,
  project_id uuid references public.projects(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_project_time_idx
  on public.audit_logs(project_id, created_at desc);
create index if not exists audit_logs_entity_idx
  on public.audit_logs(entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_time_idx
  on public.audit_logs(actor_id, created_at desc);

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_members_set_updated_at on public.project_members;
create trigger project_members_set_updated_at
before update on public.project_members
for each row execute function public.set_row_updated_at();

drop trigger if exists project_events_set_updated_at on public.project_events;
create trigger project_events_set_updated_at
before update on public.project_events
for each row execute function public.set_row_updated_at();

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_row_updated_at();

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb;
  new_row jsonb;
  row_id uuid;
  related_project_id uuid;
begin
  if tg_op <> 'INSERT' then old_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_row := to_jsonb(new); end if;

  row_id := coalesce((new_row ->> 'id')::uuid, (old_row ->> 'id')::uuid);
  related_project_id := coalesce(
    (new_row ->> 'project_id')::uuid,
    (old_row ->> 'project_id')::uuid,
    case when tg_table_name = 'projects' then row_id else null end,
    (new_row ->> 'converted_project_id')::uuid,
    (old_row ->> 'converted_project_id')::uuid
  );

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, project_id, before_data, after_data
  ) values (
    auth.uid(), lower(tg_op), tg_table_name, row_id, related_project_id, old_row, new_row
  );

  return coalesce(new, old);
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'leads', 'projects', 'project_members', 'project_invitations', 'project_events'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'audit_' || target_table, target_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.write_audit_log()',
      'audit_' || target_table,
      target_table
    );
  end loop;
end;
$$;

alter table public.project_events enable row level security;
alter table public.audit_logs enable row level security;

create policy "Superadmin manages all project events"
on public.project_events for all to authenticated
using (public.get_user_role() = 'superadmin'::public.user_role)
with check (public.get_user_role() = 'superadmin'::public.user_role);

create policy "Admin manages assigned project events"
on public.project_events for all to authenticated
using (
  public.get_user_role() = 'admin'::public.user_role
  and public.is_project_admin(project_id)
)
with check (
  public.get_user_role() = 'admin'::public.user_role
  and public.is_project_admin(project_id)
);

create policy "Client views own project events"
on public.project_events for select to authenticated
using (
  public.get_user_role() = 'client'::public.user_role
  and public.is_project_member(project_id)
);

create policy "Superadmin views all audit logs"
on public.audit_logs for select to authenticated
using (public.get_user_role() = 'superadmin'::public.user_role);

create policy "Admin views assigned project audit logs"
on public.audit_logs for select to authenticated
using (
  public.get_user_role() = 'admin'::public.user_role
  and project_id is not null
  and public.is_project_admin(project_id)
);

grant select, insert, update, delete on public.project_events to authenticated;
grant select on public.audit_logs to authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;

