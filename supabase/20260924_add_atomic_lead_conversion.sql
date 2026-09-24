create or replace function public.convert_lead_to_project(
  p_lead_id uuid,
  p_actor_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  l public.leads%rowtype;
  v_project_id uuid;
  v_slug_base text;
  v_slug text;
begin
  select * into l
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Calon client tidak ditemukan';
  end if;

  if l.converted_project_id is not null then
    return l.converted_project_id;
  end if;

  if nullif(trim(l.bride_name), '') is null or nullif(trim(l.groom_name), '') is null then
    raise exception 'Nama kedua calon pengantin wajib dilengkapi sebelum konversi';
  end if;

  v_slug_base := trim(both '-' from regexp_replace(
    lower(trim(l.bride_name) || '-' || trim(l.groom_name)),
    '[^a-z0-9]+', '-', 'g'
  ));
  if v_slug_base = '' then
    v_slug_base := 'client';
  end if;
  v_slug := v_slug_base;

  if exists (select 1 from public.projects where slug = v_slug) then
    v_slug := v_slug_base || '-' || left(replace(p_lead_id::text, '-', ''), 6);
  end if;

  insert into public.projects (
    slug, bride_name, groom_name, wedding_date, venue, location,
    budget_total, package_name, assigned_admin, created_by, lead_id, project_status
  ) values (
    v_slug, trim(l.bride_name), trim(l.groom_name), l.event_date, l.venue, l.location,
    l.estimated_budget, l.interested_package, coalesce(l.owner_admin, p_actor_id),
    p_actor_id, l.id, 'active'
  )
  returning id into v_project_id;

  perform public.apply_checklist_template(
    v_project_id,
    'damargaleri-standard-v1',
    false
  );

  insert into public.budget_categories(project_id, name, icon, allocated, spent, sort_order)
  values
    (v_project_id, 'Venue & gedung', '🏛️', 0, 0, 1),
    (v_project_id, 'Katering & konsumsi', '🍽️', 0, 0, 2),
    (v_project_id, 'Dokumentasi', '📷', 0, 0, 3),
    (v_project_id, 'Dekorasi & bunga', '💐', 0, 0, 4),
    (v_project_id, 'Busana pengantin', '👗', 0, 0, 5),
    (v_project_id, 'Rias pengantin', '💄', 0, 0, 6),
    (v_project_id, 'Hiburan & MC', '🎵', 0, 0, 7),
    (v_project_id, 'Undangan & souvenir', '💌', 0, 0, 8);

  update public.leads
  set status = 'booked',
      converted_project_id = v_project_id,
      converted_at = now(),
      updated_at = now()
  where id = l.id;

  insert into public.lead_activities(lead_id, activity_type, description, created_by)
  values (l.id, 'status_change', 'Dikonversi menjadi project', p_actor_id);

  return v_project_id;
end;
$$;

revoke execute on function public.convert_lead_to_project(uuid, uuid) from public;
revoke execute on function public.convert_lead_to_project(uuid, uuid) from anon;
revoke execute on function public.convert_lead_to_project(uuid, uuid) from authenticated;
grant execute on function public.convert_lead_to_project(uuid, uuid) to service_role;