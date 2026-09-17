begin;

create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_template_phases (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  module text not null check (module in ('timeline', 'keperluan', 'kua')),
  label text not null,
  default_offset_days integer,
  sort_order integer not null default 0,
  unique (template_id, module, label)
);

create table if not exists public.checklist_template_tasks (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.checklist_template_phases(id) on delete cascade,
  text text not null,
  details text,
  category text,
  pic text,
  location text,
  default_offset_days integer,
  visible_to_client boolean not null default true,
  client_can_edit boolean not null default true,
  sort_order integer not null default 0
);

create index if not exists checklist_template_phases_template_id_idx
  on public.checklist_template_phases(template_id);
create index if not exists checklist_template_tasks_phase_id_idx
  on public.checklist_template_tasks(phase_id);

alter table public.checklist_phases
  add column if not exists module text not null default 'timeline',
  add column if not exists template_phase_id uuid references public.checklist_template_phases(id) on delete set null;

alter table public.checklist_tasks
  add column if not exists status text not null default 'belum_dimulai',
  add column if not exists details text,
  add column if not exists responsibility text,
  add column if not exists visible_to_client boolean not null default true,
  add column if not exists client_can_edit boolean not null default true,
  add column if not exists source_template_task_id uuid references public.checklist_template_tasks(id) on delete set null;

alter table public.projects
  add column if not exists checklist_template_slug text;

create index if not exists checklist_phases_project_module_idx
  on public.checklist_phases(project_id, module, sort_order);
create index if not exists checklist_tasks_project_phase_idx
  on public.checklist_tasks(project_id, phase_id, sort_order);
create index if not exists checklist_phases_template_phase_id_idx
  on public.checklist_phases(template_phase_id);
create index if not exists checklist_tasks_phase_id_idx
  on public.checklist_tasks(phase_id);
create index if not exists checklist_tasks_source_template_task_id_idx
  on public.checklist_tasks(source_template_task_id);

alter function public.get_user_role() set search_path = '';
alter function public.is_project_admin(uuid) set search_path = '';
alter function public.is_project_member(uuid) set search_path = '';
revoke all on function public.get_user_role() from public, anon;
revoke all on function public.is_project_admin(uuid) from public, anon;
revoke all on function public.is_project_member(uuid) from public, anon;
grant execute on function public.get_user_role() to authenticated;
grant execute on function public.is_project_admin(uuid) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;

alter table public.checklist_templates enable row level security;
alter table public.checklist_template_phases enable row level security;
alter table public.checklist_template_tasks enable row level security;

grant select, insert, update, delete on public.checklist_templates to authenticated;
grant select, insert, update, delete on public.checklist_template_phases to authenticated;
grant select, insert, update, delete on public.checklist_template_tasks to authenticated;

drop policy if exists "Authenticated users can read checklist templates" on public.checklist_templates;
create policy "Authenticated users can read checklist templates"
  on public.checklist_templates for select to authenticated
  using ((select auth.uid()) is not null);
drop policy if exists "Superadmin manages checklist templates" on public.checklist_templates;
create policy "Superadmin manages checklist templates"
  on public.checklist_templates for all to authenticated
  using (public.get_user_role() = 'superadmin'::public.user_role)
  with check (public.get_user_role() = 'superadmin'::public.user_role);

drop policy if exists "Authenticated users can read checklist template phases" on public.checklist_template_phases;
create policy "Authenticated users can read checklist template phases"
  on public.checklist_template_phases for select to authenticated
  using ((select auth.uid()) is not null);
drop policy if exists "Superadmin manages checklist template phases" on public.checklist_template_phases;
create policy "Superadmin manages checklist template phases"
  on public.checklist_template_phases for all to authenticated
  using (public.get_user_role() = 'superadmin'::public.user_role)
  with check (public.get_user_role() = 'superadmin'::public.user_role);

drop policy if exists "Authenticated users can read checklist template tasks" on public.checklist_template_tasks;
create policy "Authenticated users can read checklist template tasks"
  on public.checklist_template_tasks for select to authenticated
  using ((select auth.uid()) is not null);
drop policy if exists "Superadmin manages checklist template tasks" on public.checklist_template_tasks;
create policy "Superadmin manages checklist template tasks"
  on public.checklist_template_tasks for all to authenticated
  using (public.get_user_role() = 'superadmin'::public.user_role)
  with check (public.get_user_role() = 'superadmin'::public.user_role);

drop policy if exists "Client access on checklist_tasks" on public.checklist_tasks;
drop policy if exists "Client can view visible checklist tasks" on public.checklist_tasks;
create policy "Client can view visible checklist tasks"
  on public.checklist_tasks for select to authenticated
  using (
    public.get_user_role() = 'client'::public.user_role
    and public.is_project_member(project_id)
    and visible_to_client
  );
drop policy if exists "Client can add editable checklist tasks" on public.checklist_tasks;
create policy "Client can add editable checklist tasks"
  on public.checklist_tasks for insert to authenticated
  with check (
    public.get_user_role() = 'client'::public.user_role
    and public.is_project_member(project_id)
    and visible_to_client
    and client_can_edit
  );
drop policy if exists "Client can update editable checklist tasks" on public.checklist_tasks;
create policy "Client can update editable checklist tasks"
  on public.checklist_tasks for update to authenticated
  using (
    public.get_user_role() = 'client'::public.user_role
    and public.is_project_member(project_id)
    and visible_to_client
    and client_can_edit
  )
  with check (
    public.get_user_role() = 'client'::public.user_role
    and public.is_project_member(project_id)
    and visible_to_client
    and client_can_edit
  );
drop policy if exists "Client can delete editable checklist tasks" on public.checklist_tasks;
create policy "Client can delete editable checklist tasks"
  on public.checklist_tasks for delete to authenticated
  using (
    public.get_user_role() = 'client'::public.user_role
    and public.is_project_member(project_id)
    and visible_to_client
    and client_can_edit
  );

drop policy if exists "Client access on checklist_phases" on public.checklist_phases;
drop policy if exists "Client can view checklist phases" on public.checklist_phases;
create policy "Client can view checklist phases"
  on public.checklist_phases for select to authenticated
  using (
    public.get_user_role() = 'client'::public.user_role
    and public.is_project_member(project_id)
  );

insert into public.checklist_templates (slug, name, description, version, is_active)
values (
  'damargaleri-standard-v1',
  'Checklist Standar Damargaleri',
  'Timeline dan checklist standar hasil kurasi SOP Damargaleri serta workbook operasional.',
  1,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  version = excluded.version,
  is_active = excluded.is_active,
  updated_at = now();

with template as (
  select id from public.checklist_templates where slug = 'damargaleri-standard-v1'
)
insert into public.checklist_template_phases
  (template_id, module, label, default_offset_days, sort_order)
select template.id, phase.module, phase.label, phase.offset_days, phase.sort_order
from template
cross join (values
  ('timeline', 'H-6 sampai H-3 bulan', -150, 10),
  ('timeline', 'H-3 bulan', -90, 20),
  ('timeline', 'H-2 bulan', -60, 30),
  ('timeline', 'H-1 bulan', -30, 40),
  ('timeline', 'H-3 minggu', -21, 50),
  ('timeline', 'H-2 minggu', -14, 60),
  ('timeline', 'H-1 minggu', -7, 70),
  ('timeline', 'Hari H', 0, 80),
  ('keperluan', 'Keperluan Prewedding', -90, 110),
  ('keperluan', 'Keperluan Akad', -30, 120),
  ('keperluan', 'Keperluan Resepsi', -30, 130),
  ('kua', 'Dokumen & Administrasi KUA', -90, 210)
) as phase(module, label, offset_days, sort_order)
on conflict (template_id, module, label) do update set
  default_offset_days = excluded.default_offset_days,
  sort_order = excluded.sort_order;

delete from public.checklist_template_tasks
where phase_id in (
  select p.id
  from public.checklist_template_phases p
  join public.checklist_templates t on t.id = p.template_id
  where t.slug = 'damargaleri-standard-v1'
);

with phases as (
  select p.id, p.module, p.label
  from public.checklist_template_phases p
  join public.checklist_templates t on t.id = p.template_id
  where t.slug = 'damargaleri-standard-v1'
),
tasks(module, phase_label, text, details, category, pic, location, offset_days, sort_order) as (
  values
  ('timeline','H-6 sampai H-3 bulan','Tentukan konsep dan tema wedding','Modern, tradisional, muslim, syar''i, internasional, atau konsep lain.','Konsep','Pasangan + WO','Kantor WO',-150,10),
  ('timeline','H-6 sampai H-3 bulan','Tentukan estimasi budget pernikahan',null,'Budget','Pasangan + WO','—',-150,20),
  ('timeline','H-6 sampai H-3 bulan','Tentukan estimasi jumlah tamu',null,'Tamu','Pasangan','—',-150,30),
  ('timeline','H-6 sampai H-3 bulan','Pilih dan booking venue',null,'Vendor','Pasangan + WO','Venue',-150,40),
  ('timeline','H-6 sampai H-3 bulan','Pilih dan booking MUA serta attire',null,'Vendor','Pasangan + WO','—',-150,50),
  ('timeline','H-6 sampai H-3 bulan','Pilih dan booking dekorasi, MC, dokumentasi, catering dan entertainment','Sesuaikan dengan paket layanan project.','Vendor','WO','—',-150,60),
  ('timeline','H-3 bulan','Perkenalan Project Manager dan membuat grup koordinasi',null,'Koordinasi','WO','Online',-90,10),
  ('timeline','H-3 bulan','Meeting I bersama kedua mempelai','Pembahasan konsep, tema, rundown guidebook, jam ijab kabul, komposisi venue, panitia, wali, saksi, qori, among tamu dan pembawa nampan.','Meeting','Pasangan + WO','Kantor WO',-90,20),
  ('timeline','H-3 bulan','Fitting I','Jadwal tentatif antara H-6 sampai H-3 bulan sesuai vendor dan jadwal client.','Busana','Pasangan','Vendor busana',-90,30),
  ('timeline','H-3 bulan','Mulai pemberkasan pendaftaran KUA','Mulai dari RT/RW, kelurahan sampai KUA kecamatan.','KUA','Pasangan','KUA',-90,40),
  ('timeline','H-3 bulan','Tentukan kebutuhan tamu VIP dan tambahan crew',null,'Tamu','Pasangan + WO','—',-90,50),
  ('timeline','H-3 bulan','Laksanakan persiapan prewedding','Konsep, referensi, lokasi, MUA, kostum, dekorasi, konsumsi dan transportasi.','Prewedding','Pasangan + WO','Lokasi prewedding',-90,60),
  ('timeline','H-2 bulan','Meeting II dan finalisasi guidebook','Cek venue, meeting konsep dekorasi dan catering untuk layout.','Meeting','Pasangan + WO','Venue',-60,10),
  ('timeline','H-2 bulan','Daftar KUA secara online',null,'KUA','Pasangan','Online',-60,20),
  ('timeline','H-2 bulan','Pilih menu catering',null,'Catering','Pasangan + WO','Vendor catering',-60,30),
  ('timeline','H-2 bulan','Finalisasi desain dan cetak undangan',null,'Undangan','Pasangan','—',-60,40),
  ('timeline','H-2 bulan','Pesan mahar dummy atau replika',null,'Mahar','Pasangan','—',-60,50),
  ('timeline','H-1 bulan','Fitting II atau final fitting',null,'Busana','Pasangan','Vendor busana',-30,10),
  ('timeline','H-1 bulan','Tes food catering','Dilakukan apabila vendor menyediakan layanan test food.','Catering','Pasangan + WO','Vendor catering',-30,20),
  ('timeline','H-1 bulan','Finalisasi daftar nama tamu',null,'Tamu','Pasangan','—',-30,30),
  ('timeline','H-1 bulan','Finalisasi kebutuhan dan penempatan tamu VIP',null,'Tamu','Pasangan + WO','Venue',-30,40),
  ('timeline','H-3 minggu','Pastikan undangan fisik diterima dan mulai didistribusikan',null,'Undangan','Pasangan','—',-21,10),
  ('timeline','H-3 minggu','Finalisasi layout dan desain dekorasi serta catering',null,'Dekorasi','Pasangan + WO','Venue',-21,20),
  ('timeline','H-3 minggu','Pastikan souvenir selesai dan jumlahnya sesuai',null,'Souvenir','Pasangan','—',-21,30),
  ('timeline','H-3 minggu','Tentukan jumlah souvenir untuk keluarga, tamu, dan VIP',null,'Souvenir','Pasangan','—',-21,40),
  ('timeline','H-3 minggu','Serahkan barang seserahan ke vendor hantaran',null,'Seserahan','Pasangan','Vendor hantaran',-21,50),
  ('timeline','H-3 minggu','Finalisasi jenis dan jumlah mahar',null,'Mahar','Pasangan','—',-21,60),
  ('timeline','H-3 minggu','Pastikan wali nikah dan jadwal rafak KUA',null,'KUA','Pasangan','KUA',-21,70),
  ('timeline','H-2 minggu','Final meeting seluruh vendor','Disarankan weekday agar seluruh vendor dapat hadir.','Meeting','WO + Semua Vendor','Venue',-14,10),
  ('timeline','H-2 minggu','Tentukan lokasi technical meeting dan jumlah peserta',null,'Meeting','WO','Venue',-14,20),
  ('timeline','H-2 minggu','Paparkan hasil meeting dan mempelajari rundown bersama',null,'Rundown','WO + Pasangan','Venue',-14,30),
  ('timeline','H-2 minggu','Selesaikan pelunasan vendor',null,'Pembayaran','Pasangan','—',-14,40),
  ('timeline','H-1 minggu','Final fitting terakhir jika diperlukan',null,'Busana','Pasangan','Vendor busana',-7,10),
  ('timeline','H-1 minggu','Briefing akhir keluarga dan panitia',null,'Koordinasi','WO + Pasangan','—',-7,20),
  ('timeline','H-1 minggu','Jaga kesehatan dan siapkan kebutuhan darurat',null,'Personal','Pasangan','—',-7,30),
  ('timeline','Hari H','Briefing tim WO dan seluruh vendor',null,'Operasional','WO','Venue',0,10),
  ('timeline','Hari H','Persiapan makeup dan busana pengantin',null,'Operasional','MUA + Pasangan','Ruang rias',0,20),
  ('timeline','Hari H','Pelaksanaan akad atau pemberkatan',null,'Operasional','Semua','Venue',0,30),
  ('timeline','Hari H','Pelaksanaan resepsi dan penerimaan tamu',null,'Operasional','Semua','Venue',0,40),

  ('keperluan','Keperluan Prewedding','Konfirmasi MUA prewedding',null,'Vendor','Pasangan + WO','—',-90,10),
  ('keperluan','Keperluan Prewedding','Konfirmasi foto dan video prewedding',null,'Vendor','WO','—',-90,20),
  ('keperluan','Keperluan Prewedding','Siapkan properti, dekorasi dan kostum',null,'Properti','Pasangan + WO','—',-90,30),
  ('keperluan','Keperluan Prewedding','Konfirmasi lokasi dan izin lokasi',null,'Lokasi','WO','Lokasi prewedding',-90,40),
  ('keperluan','Keperluan Prewedding','Siapkan konsumsi, transportasi dan tiket masuk',null,'Logistik','WO','—',-90,50),
  ('keperluan','Keperluan Akad','Siapkan cincin dan kotak cincin',null,'Mahar','Pasangan','—',-30,10),
  ('keperluan','Keperluan Akad','Siapkan mahar asli serta mahar hias atau replika',null,'Mahar','Pasangan','—',-30,20),
  ('keperluan','Keperluan Akad','Siapkan box dan isi seserahan',null,'Seserahan','Pasangan','—',-30,30),
  ('keperluan','Keperluan Akad','Konfirmasi makeup, attire, sepatu dan melati pengantin',null,'Busana','Pasangan + WO','—',-30,40),
  ('keperluan','Keperluan Akad','Konfirmasi makeup dan attire orang tua, besan dan saudara',null,'Busana','Pasangan + WO','—',-30,50),
  ('keperluan','Keperluan Akad','Konfirmasi vendor akad','WO, MUA, dokumentasi, MC, dekorasi, venue, henna dan catering.','Vendor','WO','—',-30,60),
  ('keperluan','Keperluan Resepsi','Pastikan souvenir dan kartu souvenir siap',null,'Souvenir','Pasangan + WO','—',-30,10),
  ('keperluan','Keperluan Resepsi','Siapkan digital guestbook dan daftar VIP',null,'Tamu','Pasangan + WO','—',-30,20),
  ('keperluan','Keperluan Resepsi','Konfirmasi sound system, entertainment, MC dan photobooth',null,'Vendor','WO','Venue',-30,30),
  ('keperluan','Keperluan Resepsi','Konfirmasi dokumentasi, dekorasi, catering dan lighting',null,'Vendor','WO','Venue',-30,40),
  ('keperluan','Keperluan Resepsi','Konfirmasi transportasi keluarga dan pengantin',null,'Transportasi','Pasangan + WO','—',-30,50),
  ('keperluan','Keperluan Resepsi','Konfirmasi makeup, attire, sepatu dan aksesori keluarga',null,'Busana','Pasangan + WO','—',-30,60),

  ('kua','Dokumen & Administrasi KUA','Siapkan fotokopi KTP CPP dan CPW','Sesuaikan jumlah lembar dengan KUA tujuan.','Dokumen','CPP + CPW','—',-90,10),
  ('kua','Dokumen & Administrasi KUA','Siapkan fotokopi KK CPP dan CPW',null,'Dokumen','CPP + CPW','—',-90,20),
  ('kua','Dokumen & Administrasi KUA','Siapkan fotokopi akta kelahiran CPP dan CPW',null,'Dokumen','CPP + CPW','—',-90,30),
  ('kua','Dokumen & Administrasi KUA','Siapkan fotokopi ijazah terakhir CPP dan CPW',null,'Dokumen','CPP + CPW','—',-90,40),
  ('kua','Dokumen & Administrasi KUA','Siapkan fotokopi KTP wali nikah dan saksi',null,'Dokumen','Pasangan','—',-90,50),
  ('kua','Dokumen & Administrasi KUA','Siapkan pas foto sesuai ketentuan KUA','Konfirmasi ukuran, jumlah dan warna latar langsung ke KUA tujuan.','Dokumen','CPP + CPW','Studio foto',-90,60),
  ('kua','Dokumen & Administrasi KUA','Urus surat pengantar RT/RW dan kelurahan',null,'Administrasi','CPP + CPW','RT/RW dan Kelurahan',-90,70),
  ('kua','Dokumen & Administrasi KUA','Lengkapi formulir N1, N2, N3, N4 dan formulir tambahan',null,'Administrasi','CPP + CPW','Kelurahan',-75,80),
  ('kua','Dokumen & Administrasi KUA','Lakukan pemeriksaan kesehatan dan kelas calon pengantin',null,'Kesehatan','CPP + CPW','Puskesmas',-75,90),
  ('kua','Dokumen & Administrasi KUA','Daftar nikah melalui SIMKAH atau prosedur KUA setempat','Persyaratan dapat berbeda antar daerah; verifikasi langsung dengan KUA tujuan.','Administrasi','CPP + CPW','Online / KUA',-60,100),
  ('kua','Dokumen & Administrasi KUA','Urus rekomendasi atau numpang nikah jika berbeda wilayah',null,'Administrasi','CPP + CPW','KUA asal dan tujuan',-60,110),
  ('kua','Dokumen & Administrasi KUA','Jadwalkan dan hadiri rafak KUA',null,'Administrasi','CPP + CPW','KUA',-21,120)
)
insert into public.checklist_template_tasks
  (phase_id, text, details, category, pic, location, default_offset_days, sort_order)
select phases.id, tasks.text, tasks.details, tasks.category, tasks.pic, tasks.location,
       tasks.offset_days, tasks.sort_order
from tasks
join phases on phases.module = tasks.module and phases.label = tasks.phase_label;

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
  if public.get_user_role() not in (
    'superadmin'::public.user_role,
    'admin'::public.user_role
  ) then
    raise exception 'Hanya Super Admin atau Project Manager yang dapat menerapkan template';
  end if;

  select wedding_date
  into target_wedding_date
  from public.projects
  where id = target_project_id;

  if not found then
    raise exception 'Project tidak ditemukan atau tidak dapat diakses';
  end if;

  select id, slug
  into template_record
  from public.checklist_templates
  where slug = target_template_slug and is_active = true;

  if not found then
    raise exception 'Template checklist aktif tidak ditemukan';
  end if;

  if replace_existing then
    delete from public.checklist_phases where project_id = target_project_id;
  elsif exists (
    select 1 from public.checklist_phases where project_id = target_project_id
  ) then
    raise exception 'Project sudah memiliki checklist';
  end if;

  for phase_record in
    select id, module, label, default_offset_days, sort_order
    from public.checklist_template_phases
    where template_id = template_record.id
    order by sort_order
  loop
    insert into public.checklist_phases
      (project_id, module, label, sort_order, template_phase_id)
    values
      (target_project_id, phase_record.module, phase_record.label,
       phase_record.sort_order, phase_record.id)
    returning id into new_phase_id;

    insert into public.checklist_tasks (
      phase_id, project_id, text, details, pic, responsibility, location,
      due_date, sort_order, done, status, visible_to_client,
      client_can_edit, source_template_task_id
    )
    select
      new_phase_id,
      target_project_id,
      task.text,
      task.details,
      task.pic,
      task.pic,
      task.location,
      case
        when target_wedding_date is null then null
        else target_wedding_date + coalesce(task.default_offset_days, phase_record.default_offset_days, 0)
      end,
      task.sort_order,
      false,
      'belum_dimulai',
      task.visible_to_client,
      task.client_can_edit,
      task.id
    from public.checklist_template_tasks task
    where task.phase_id = phase_record.id
    order by task.sort_order;

    get diagnostics phase_task_count = row_count;
    inserted_tasks := inserted_tasks + phase_task_count;
  end loop;

  update public.projects
  set checklist_template_slug = template_record.slug
  where id = target_project_id;

  return inserted_tasks;
end;
$$;

revoke all on function public.apply_checklist_template(uuid, text, boolean) from public;
grant execute on function public.apply_checklist_template(uuid, text, boolean) to authenticated;

commit;
