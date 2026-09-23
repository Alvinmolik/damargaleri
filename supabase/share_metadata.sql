create or replace function public.get_project_share_metadata(p_slug text)
returns table (
  slug text,
  bride_name text,
  groom_name text,
  cover_image_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.slug, p.bride_name, p.groom_name, p.cover_image_url
  from public.projects as p
  where p.slug = p_slug
  limit 1;
$$;

revoke execute on function public.get_project_share_metadata(text) from public;
revoke execute on function public.get_project_share_metadata(text) from anon, authenticated;
grant execute on function public.get_project_share_metadata(text) to anon, authenticated;
