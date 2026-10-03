-- 0010: opt-in public student profiles (portfolio page /u/<username>). Run after 0009. Safe to run again.

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists headline text not null default '';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists location text not null default '';
alter table public.profiles add column if not exists linkedin_url text;
alter table public.profiles add column if not exists github_url text;
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists is_public boolean not null default false;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,30}$');
alter table public.profiles drop constraint if exists profiles_public_text_lengths;
alter table public.profiles add constraint profiles_public_text_lengths
  check (length(headline) <= 120 and length(bio) <= 1000 and length(location) <= 80);
alter table public.profiles drop constraint if exists profiles_links_https;
alter table public.profiles add constraint profiles_links_https check (
  (linkedin_url is null or (linkedin_url ~ '^https://' and length(linkedin_url) <= 300)) and
  (github_url is null or (github_url ~ '^https://' and length(github_url) <= 300)) and
  (website_url is null or (website_url ~ '^https://' and length(website_url) <= 300)));
create unique index if not exists profiles_username_key on public.profiles (username);

-- Students edit these themselves (RLS profiles_update_own already limits rows to their own).
grant update (username, headline, bio, location, linkedin_url, github_url, website_url, is_public) on public.profiles to authenticated;

-- Public portfolio: only for profiles that opted in. Never returns phone, email or role.
create or replace function public.public_profile(p_username text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'username', p.username,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'headline', p.headline,
    'bio', p.bio,
    'location', p.location,
    'linkedin_url', p.linkedin_url,
    'github_url', p.github_url,
    'website_url', p.website_url,
    'member_since', p.created_at,
    'certificates', coalesce((
      select jsonb_agg(jsonb_build_object('code', c.code, 'course_title', c.course_title, 'hours', c.hours, 'issued_at', c.issued_at)
                       order by c.issued_at desc)
      from public.certificates c where c.user_id = p.id and c.revoked_at is null), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
               'title', pr.title, 'slug', pr.slug, 'course_title', co.title, 'skills', to_jsonb(pr.skills),
               'link_url', s.link_url, 'summary', s.summary, 'reviewed_at', s.reviewed_at)
             order by s.reviewed_at desc nulls last)
      from public.project_submissions s
      join public.projects pr on pr.id = s.project_id
      join public.courses co on co.id = pr.course_id
      where s.user_id = p.id and s.status = 'approved' and s.is_public
        and pr.is_published and pr.archived_at is null), '[]'::jsonb)
  )
  from public.profiles p
  where p.username = lower(trim(p_username)) and p.is_public and coalesce(trim(p.full_name), '') <> '';
$$;
revoke execute on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to anon, authenticated;

-- Certificate and showcase pages link to the owner's profile when it is public.
drop function if exists public.certificate_public(text);
create function public.certificate_public(p_code text)
returns table (code text, full_name text, course_title text, course_slug text, hours numeric, issued_at timestamptz,
               instructor_name text, instructor_title text, owner_username text)
language sql stable security definer set search_path = '' as $$
  select c.code, c.full_name, c.course_title, co.slug, c.hours, c.issued_at, i.name, i.title,
         case when pf.is_public then pf.username end
  from public.certificates c
  join public.courses co on co.id = c.course_id
  join public.profiles pf on pf.id = c.user_id
  left join public.instructors i on i.id = co.instructor_id
  where c.code = upper(trim(p_code)) and c.revoked_at is null;
$$;
revoke execute on function public.certificate_public(text) from public;
grant execute on function public.certificate_public(text) to anon, authenticated;

drop function if exists public.project_showcase(uuid);
create function public.project_showcase(p_project_id uuid)
returns table (id uuid, link_url text, summary text, reviewed_at timestamptz, author text, username text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.link_url, s.summary, s.reviewed_at,
    coalesce(nullif(
      trim(split_part(trim(p.full_name), ' ', 1) || ' ' ||
           coalesce(left(nullif(split_part(trim(p.full_name), ' ', 2), ''), 1) || '.', '')), ''), 'Talaba'),
    case when p.is_public then p.username end
  from public.project_submissions s
  join public.profiles p on p.id = s.user_id
  join public.projects pr on pr.id = s.project_id
  where s.project_id = p_project_id and s.status = 'approved' and s.is_public
    and pr.is_published and pr.archived_at is null
  order by s.reviewed_at desc nulls last
  limit 60;
$$;
revoke execute on function public.project_showcase(uuid) from public;
grant execute on function public.project_showcase(uuid) to anon, authenticated;

-- Guards apply to logged-in non-admins only; server-side jobs (service role, no auth.uid()) may update.
create or replace function public.project_submissions_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.feedback is distinct from old.feedback or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'forbidden';
    end if;
    if new.link_url is distinct from old.link_url or new.summary is distinct from old.summary then
      new.status := 'submitted';
      new.submitted_at := now();
    elsif new.status is distinct from old.status then
      raise exception 'forbidden';
    end if;
  end if;
  return new;
end $$;

create or replace function public.course_reviews_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() and new.hidden_at is distinct from old.hidden_at then
    raise exception 'forbidden';
  end if;
  return new;
end $$;
