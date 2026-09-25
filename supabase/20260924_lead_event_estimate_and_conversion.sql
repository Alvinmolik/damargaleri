-- A tentative month is distinct from a confirmed event date.
alter table public.leads add column estimated_event_month text
  check (estimated_event_month is null or estimated_event_month ~ '^(20[0-9]{2}|21[0-9]{2})-(0[1-9]|1[0-2])$');
alter table public.projects add column estimated_wedding_month text
  check (estimated_wedding_month is null or estimated_wedding_month ~ '^(20[0-9]{2}|21[0-9]{2})-(0[1-9]|1[0-2])$');

-- Service-role calls originate from the access Edge Function. Keep the existing
-- profile check for calls made by authenticated users.
create or replace function public.apply_checklist_template(
  target_project_id uuid,
  target_template_slug text default 'damargaleri-standard-v1',
  replace_existing boolean default false
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_wedding_date date;
  template_record record;
  phase_record record;
  new_phase_id uuid;
  inserted_tasks integer := 0;
  phase_task_count integer := 0;
begin
  if current_user <> 'service_role' and public.get_user_role() not in (
    'superadmin'::public.user_role,
    'admin'::public.user_role
  ) then
    raise exception 'Hanya Super Admin atau Project Manager yang dapat menerapkan template';
  end if;

  select wedding_date into target_wedding_date from public.projects where id = target_project_id;
  if not found then raise exception 'Project tidak ditemukan atau tidak dapat diakses'; end if;
  select id, slug into template_record from public.checklist_templates
    where slug = target_template_slug and is_active = true;
  if not found then raise exception 'Template checklist aktif tidak ditemukan'; end if;

  if replace_existing then
    delete from public.checklist_phases where project_id = target_project_id;
  elsif exists (select 1 from public.checklist_phases where project_id = target_project_id) then
    raise exception 'Project sudah memiliki checklist';
  end if;

  for phase_record in
    select id, module, label, default_offset_days, sort_order
    from public.checklist_template_phases
    where template_id = template_record.id order by sort_order
  loop
    insert into public.checklist_phases(project_id, module, label, sort_order, template_phase_id)
    values(target_project_id, phase_record.module, phase_record.label, phase_record.sort_order, phase_record.id)
    returning id into new_phase_id;

    insert into public.checklist_tasks(
      phase_id, project_id, text, details, pic, responsibility, location,
      due_date, sort_order, done, status, visible_to_client,
      client_can_edit, source_template_task_id
    )
    select new_phase_id, target_project_id, task.text, task.details, task.pic,
      task.pic, task.location,
      case when target_wedding_date is null then null
        else target_wedding_date + coalesce(task.default_offset_days, phase_record.default_offset_days, 0) end,
      task.sort_order, false, 'belum_dimulai', task.visible_to_client,
      task.client_can_edit, task.id
    from public.checklist_template_tasks task
    where task.phase_id = phase_record.id order by task.sort_order;

    get diagnostics phase_task_count = row_count;
    inserted_tasks := inserted_tasks + phase_task_count;
  end loop;

  update public.projects set checklist_template_slug = template_record.slug where id = target_project_id;
  return inserted_tasks;
end;
$$;

-- The Edge Function checks the caller's role and lead ownership before invoking
-- this service-role-only function. All writes run in one database transaction.
create function public.convert_lead_to_project_with_details(
  p_lead_id uuid, p_actor_id uuid, p_details jsonb
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
  v_bride text;
  v_groom text;
  v_date date;
  v_month text;
  v_budget bigint;
  v_pm uuid;
begin
  select * into l from public.leads where id = p_lead_id for update;
  if not found then raise exception 'Calon client tidak ditemukan'; end if;
  if l.converted_project_id is not null then return l.converted_project_id; end if;

  v_bride := nullif(trim(p_details->>'bride_name'), '');
  v_groom := nullif(trim(p_details->>'groom_name'), '');
  if v_bride is null or v_groom is null or length(v_bride) > 100 or length(v_groom) > 100 then
    raise exception 'Nama kedua calon pengantin wajib diisi (maksimal 100 karakter)';
  end if;
  v_month := nullif(p_details->>'estimated_event_month', '');
  if v_month is not null and v_month !~ '^(20[0-9]{2}|21[0-9]{2})-(0[1-9]|1[0-2])$' then
    raise exception 'Bulan acara tidak valid';
  end if;
  if nullif(p_details->>'event_date', '') is not null then
    v_date := (p_details->>'event_date')::date;
  end if;
  if v_date is not null and v_month is not null then
    raise exception 'Pilih tanggal pasti atau perkiraan bulan';
  end if;
  v_budget := (p_details->>'estimated_budget')::bigint;
  if v_budget is null or v_budget < 0 then raise exception 'Budget tidak valid'; end if;
  v_pm := nullif(p_details->>'assigned_admin', '')::uuid;

  update public.leads set
    bride_name = v_bride, groom_name = v_groom,
    event_date = v_date, estimated_event_month = v_month,
    venue = nullif(trim(p_details->>'venue'), ''),
    location = nullif(trim(p_details->>'location'), ''),
    interested_package = nullif(trim(p_details->>'interested_package'), ''),
    estimated_budget = v_budget, owner_admin = v_pm, updated_at = now()
  where id = l.id returning * into l;

  v_slug_base := trim(both '-' from regexp_replace(
    lower(v_bride || '-' || v_groom), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then v_slug_base := 'client'; end if;
  v_slug := v_slug_base;
  if exists (select 1 from public.projects where slug = v_slug) then
    v_slug := v_slug_base || '-' || left(replace(p_lead_id::text, '-', ''), 8);
  end if;

  insert into public.projects(
    slug, bride_name, groom_name, wedding_date, estimated_wedding_month,
    venue, location, budget_total, package_name, assigned_admin,
    created_by, lead_id, project_status
  ) values (
    v_slug, v_bride, v_groom, v_date, v_month, l.venue, l.location,
    v_budget, l.interested_package, v_pm, p_actor_id, l.id, 'active'
  ) returning id into v_project_id;

  perform public.apply_checklist_template(v_project_id, 'damargaleri-standard-v1', false);
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

  update public.leads set status = 'booked', converted_project_id = v_project_id,
    converted_at = now(), updated_at = now() where id = l.id;
  insert into public.lead_activities(lead_id, activity_type, description, created_by)
  values(l.id, 'status_change', 'Dikonversi menjadi project', p_actor_id);
  return v_project_id;
end;
$$;

revoke all on function public.convert_lead_to_project_with_details(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.convert_lead_to_project_with_details(uuid,uuid,jsonb) to service_role;

-- Update only template dates that still match the prior automatic schedule.
-- Manually adjusted deadlines remain untouched when the wedding date changes.
create function public.refresh_template_dates_on_wedding_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.checklist_tasks as ct
  set due_date = case when new.wedding_date is null then null
    else new.wedding_date + coalesce(tt.default_offset_days, tp.default_offset_days, 0) end
  from public.checklist_template_tasks as tt
  join public.checklist_template_phases as tp on tp.id = tt.phase_id
  where ct.project_id = new.id
    and ct.source_template_task_id = tt.id
    and (
      (old.wedding_date is null and ct.due_date is null)
      or (old.wedding_date is not null and ct.due_date =
        old.wedding_date + coalesce(tt.default_offset_days, tp.default_offset_days, 0))
    );
  return new;
end;
$$;
revoke all on function public.refresh_template_dates_on_wedding_change() from public, anon, authenticated;
create trigger refresh_template_dates_on_wedding_change
after update of wedding_date on public.projects
for each row when (old.wedding_date is distinct from new.wedding_date)
execute function public.refresh_template_dates_on_wedding_change();
