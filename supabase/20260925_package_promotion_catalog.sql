-- Keep commercial offers separate from client budgets and signed contract prices.
create table public.service_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 2 and 100),
  description text not null default '',
  base_price bigint check (base_price is null or base_price >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 100),
  description text not null default '',
  code text,
  package_id uuid references public.service_packages(id) on delete restrict,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value bigint not null check (discount_value > 0),
  valid_from date,
  valid_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_period check (valid_until is null or valid_from is null or valid_until >= valid_from),
  constraint promotion_percentage check (discount_type <> 'percent' or discount_value <= 100)
);
create unique index promotions_code_unique on public.promotions(lower(code)) where code is not null;
create index promotions_package_idx on public.promotions(package_id, is_active);

insert into public.service_packages(name, sort_order)
values ('Full Service Premium',1),('Full Service Standard',2),('One Day Coordinator',3),('Essential',4);

alter table public.leads
  add column package_id uuid references public.service_packages(id) on delete restrict,
  add column promotion_id uuid references public.promotions(id) on delete restrict;

alter table public.service_packages enable row level security;
alter table public.promotions enable row level security;

create policy "Active packages are public" on public.service_packages
  for select to anon, authenticated
  using (is_active or public.get_user_role() = 'superadmin'::public.user_role);
create policy "Superadmin manages packages" on public.service_packages
  for insert to authenticated
  with check (public.get_user_role() = 'superadmin'::public.user_role);
create policy "Superadmin edits packages" on public.service_packages
  for update to authenticated
  using (public.get_user_role() = 'superadmin'::public.user_role)
  with check (public.get_user_role() = 'superadmin'::public.user_role);

create policy "Current promotions are public" on public.promotions
  for select to anon, authenticated using (
    public.get_user_role() = 'superadmin'::public.user_role
    or (is_active
      and (valid_from is null or valid_from <= (now() at time zone 'Asia/Jakarta')::date)
      and (valid_until is null or valid_until >= (now() at time zone 'Asia/Jakarta')::date)
      and (package_id is null or exists (
        select 1 from public.service_packages p where p.id = package_id and p.is_active
      )))
  );
create policy "Superadmin manages promotions" on public.promotions
  for insert to authenticated
  with check (public.get_user_role() = 'superadmin'::public.user_role);
create policy "Superadmin edits promotions" on public.promotions
  for update to authenticated
  using (public.get_user_role() = 'superadmin'::public.user_role)
  with check (public.get_user_role() = 'superadmin'::public.user_role);

grant select on public.service_packages, public.promotions to anon, authenticated;
grant insert, update on public.service_packages, public.promotions to authenticated;
-- Archiving preserves the offer named in old leads and contracts.
revoke delete on public.service_packages, public.promotions from public, anon, authenticated;
