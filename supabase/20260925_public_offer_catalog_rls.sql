drop policy if exists "Active packages are public" on public.service_packages;
create policy "Anon sees active packages" on public.service_packages
  for select to anon using (is_active);
create policy "Authenticated sees available packages" on public.service_packages
  for select to authenticated using (
    is_active or public.get_user_role() = 'superadmin'::public.user_role
  );

drop policy if exists "Current promotions are public" on public.promotions;
create policy "Anon sees current promotions" on public.promotions
  for select to anon using (
    is_active
    and (valid_from is null or valid_from <= (now() at time zone 'Asia/Jakarta')::date)
    and (valid_until is null or valid_until >= (now() at time zone 'Asia/Jakarta')::date)
    and (package_id is null or exists (
      select 1 from public.service_packages p where p.id = package_id and p.is_active
    ))
  );
create policy "Authenticated sees available promotions" on public.promotions
  for select to authenticated using (
    public.get_user_role() = 'superadmin'::public.user_role
    or (is_active
      and (valid_from is null or valid_from <= (now() at time zone 'Asia/Jakarta')::date)
      and (valid_until is null or valid_until >= (now() at time zone 'Asia/Jakarta')::date)
      and (package_id is null or exists (
        select 1 from public.service_packages p where p.id = package_id and p.is_active
      )))
  );
