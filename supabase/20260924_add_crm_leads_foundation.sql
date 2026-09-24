-- Fondasi CRM Damargaleri.
-- Additive migration: seluruh fitur project yang sudah ada tetap berjalan.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  bride_name text,
  groom_name text,
  contact_name text not null,
  phone text,
  email text,
  event_date date,
  event_type text not null default 'wedding'
    check (event_type in ('wedding', 'engagement', 'prewedding', 'other')),
  location text,
  venue text,
  estimated_budget bigint not null default 0 check (estimated_budget >= 0),
  interested_package text,
  source text not null default 'manual',
  source_detail text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'meeting', 'proposal', 'follow_up', 'booked', 'lost')),
  lost_reason text,
  owner_admin uuid references public.profiles(id) on delete set null,
  next_follow_up_at timestamptz,
  notes text,
  converted_project_id uuid references public.projects(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  converted_at timestamptz,
  constraint leads_email_format check (email is null or position('@' in email) > 1)
);

create index leads_status_idx on public.leads(status);
create index leads_owner_admin_idx on public.leads(owner_admin);
create index leads_created_at_idx on public.leads(created_at desc);
create index leads_event_date_idx on public.leads(event_date);
create index leads_email_lower_idx on public.leads(lower(email)) where email is not null;
create index leads_phone_idx on public.leads(phone) where phone is not null;

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  activity_type text not null
    check (activity_type in ('note', 'call', 'whatsapp', 'email', 'meeting', 'status_change', 'follow_up')),
  description text not null,
  happened_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index lead_activities_lead_time_idx
  on public.lead_activities(lead_id, happened_at desc);

alter table public.projects
  add column lead_id uuid references public.leads(id) on delete set null,
  add column project_status text not null default 'active'
    check (project_status in ('active', 'on_hold', 'completed', 'cancelled'));

create unique index projects_lead_id_unique
  on public.projects(lead_id) where lead_id is not null;
create index projects_project_status_idx on public.projects(project_status);

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

create policy "Superadmin manages all leads"
on public.leads for all
to authenticated
using (public.get_user_role() = 'superadmin'::public.user_role)
with check (public.get_user_role() = 'superadmin'::public.user_role);

create policy "Admin views assigned leads"
on public.leads for select
to authenticated
using (
  public.get_user_role() = 'admin'::public.user_role
  and owner_admin = (select auth.uid())
);

create policy "Admin creates own assigned leads"
on public.leads for insert
to authenticated
with check (
  public.get_user_role() = 'admin'::public.user_role
  and owner_admin = (select auth.uid())
);

create policy "Admin updates assigned leads"
on public.leads for update
to authenticated
using (
  public.get_user_role() = 'admin'::public.user_role
  and owner_admin = (select auth.uid())
)
with check (
  public.get_user_role() = 'admin'::public.user_role
  and owner_admin = (select auth.uid())
);

create policy "Superadmin manages all lead activities"
on public.lead_activities for all
to authenticated
using (public.get_user_role() = 'superadmin'::public.user_role)
with check (public.get_user_role() = 'superadmin'::public.user_role);

create policy "Admin views activities for assigned leads"
on public.lead_activities for select
to authenticated
using (
  public.get_user_role() = 'admin'::public.user_role
  and exists (
    select 1 from public.leads l
    where l.id = lead_activities.lead_id
      and l.owner_admin = (select auth.uid())
  )
);

create policy "Admin creates activities for assigned leads"
on public.lead_activities for insert
to authenticated
with check (
  public.get_user_role() = 'admin'::public.user_role
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.leads l
    where l.id = lead_activities.lead_id
      and l.owner_admin = (select auth.uid())
  )
);

grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.lead_activities to authenticated;
