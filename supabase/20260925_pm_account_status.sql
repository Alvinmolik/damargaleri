-- Revoke PM access without removing their audit history or losing related leads.
alter table public.profiles add column is_active boolean not null default true;

create or replace function public.get_user_role()
returns public.user_role
language sql stable security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

-- Status can be changed only by the server's service role through manage-access.
revoke insert (is_active), update (is_active) on public.profiles from authenticated, anon;
