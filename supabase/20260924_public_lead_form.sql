-- Public inquiry form configuration. Only published question metadata is readable anonymously.
create table public.lead_form_settings (
  id smallint primary key default 1 check (id = 1),
  title text not null default 'Ceritakan rencana pernikahanmu',
  description text not null default 'Isi data singkat berikut agar tim Damargaleri bisa menghubungimu.',
  fields jsonb not null,
  updated_at timestamptz not null default now(),
  constraint lead_form_fields_array check (jsonb_typeof(fields) = 'array' and jsonb_array_length(fields) between 1 and 25)
);

insert into public.lead_form_settings (id, fields) values (1, '[
  {"key":"contact_name","label":"Nama yang bisa dihubungi","type":"text","required":true},
  {"key":"phone","label":"Nomor WhatsApp","type":"tel","required":true},
  {"key":"email","label":"Email","type":"email","required":false},
  {"key":"bride_name","label":"Nama calon pengantin wanita","type":"text","required":false},
  {"key":"groom_name","label":"Nama calon pengantin pria","type":"text","required":false},
  {"key":"event_date","label":"Perkiraan tanggal acara","type":"date","required":false},
  {"key":"location","label":"Kota acara","type":"text","required":false},
  {"key":"estimated_budget","label":"Perkiraan budget (Rp)","type":"number","required":false},
  {"key":"interested_package","label":"Paket yang diminati","type":"text","required":false},
  {"key":"source_detail","label":"Dari mana tahu Damargaleri?","type":"text","required":false}
]'::jsonb);

alter table public.leads add column form_answers jsonb not null default '{}'::jsonb;

alter table public.lead_form_settings enable row level security;
create policy "Published lead form is readable" on public.lead_form_settings
  for select to anon, authenticated using (true);
create policy "Only superadmin edits lead form" on public.lead_form_settings
  for update to authenticated
  using (public.get_user_role() = 'superadmin'::public.user_role)
  with check (public.get_user_role() = 'superadmin'::public.user_role);

grant select on public.lead_form_settings to anon, authenticated;
grant update (title, description, fields, updated_at) on public.lead_form_settings to authenticated;
-- Older Data API grants can leave table permissions on anon despite RLS denying rows.
-- Remove them as defense in depth; authenticated access keeps its existing explicit grant.
revoke select, insert, update, delete on public.leads from anon, public;
-- Public submissions use the Edge Function; direct anonymous access to leads is denied.
