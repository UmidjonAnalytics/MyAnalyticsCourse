-- 0009: learning paths and portfolio projects. Run after 0008. Safe to run again.

-- ============================================================
-- Learning paths: an ordered list of courses ("Data Analyst yo'li")
-- ============================================================

create table if not exists public.learning_paths (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null default '',
  description       text not null default '',     -- Markdown
  cover_url         text,
  level             text check (level in ('beginner', 'intermediate', 'advanced')),
  outcomes          text[] not null default '{}',
  bundle_id         uuid references public.bundles (id) on delete set null,  -- "buy the whole path"
  is_published      boolean not null default false,
  position          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz
);
drop trigger if exists learning_paths_updated_at on public.learning_paths;
create trigger learning_paths_updated_at before update on public.learning_paths for each row execute function public.set_updated_at();

create table if not exists public.learning_path_courses (
  path_id   uuid not null references public.learning_paths (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  position  integer not null default 0,
  primary key (path_id, course_id)
);

alter table public.learning_paths        enable row level security;
alter table public.learning_path_courses enable row level security;
grant select on public.learning_paths, public.learning_path_courses to anon, authenticated;
grant insert, update, delete on public.learning_paths, public.learning_path_courses to authenticated;

drop policy if exists learning_paths_select on public.learning_paths;
create policy learning_paths_select on public.learning_paths for select to anon, authenticated
  using ((is_published and archived_at is null) or public.is_admin());
drop policy if exists learning_paths_admin on public.learning_paths;
create policy learning_paths_admin on public.learning_paths for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists learning_path_courses_select on public.learning_path_courses;
create policy learning_path_courses_select on public.learning_path_courses for select to anon, authenticated
  using (exists (select 1 from public.learning_paths p where p.id = path_id and ((p.is_published and p.archived_at is null) or public.is_admin())));
drop policy if exists learning_path_courses_admin on public.learning_path_courses;
create policy learning_path_courses_admin on public.learning_path_courses for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Portfolio projects: a real business case at the end of a course
-- ============================================================

create table if not exists public.projects (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid not null references public.courses (id) on delete cascade,
  title             text not null,
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null default '',
  brief_md          text not null default '',     -- the business scenario (public)
  steps_md          text not null default '',     -- what to do (students with access)
  deliverable_md    text not null default '',     -- what to submit (students with access)
  cover_url         text,
  level             text check (level in ('beginner', 'intermediate', 'advanced')),
  hours             integer check (hours between 0 and 200),
  skills            text[] not null default '{}',
  is_published      boolean not null default false,
  position          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz
);
create index if not exists projects_course_idx on public.projects (course_id, position);
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;
-- The brief is public (marketing); steps/files/questions need course access (checked below and in the app).
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to anon, authenticated
  using ((is_published and archived_at is null) or public.is_admin());
drop policy if exists projects_admin on public.projects;
create policy projects_admin on public.projects for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.can_view_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.projects p
    join public.courses c on c.id = p.course_id
    where p.id = p_project_id and p.is_published and p.archived_at is null
      and c.is_published and c.archived_at is null
      and public.has_course_access(p.course_id));
$$;

-- Project materials reuse lesson_resources; checkpoint questions reuse Excel assignments.
alter table public.lesson_resources alter column lesson_id drop not null;
alter table public.lesson_resources add column if not exists project_id uuid references public.projects (id) on delete cascade;
alter table public.lesson_resources drop constraint if exists lesson_resources_owner_check;
alter table public.lesson_resources add constraint lesson_resources_owner_check check ((lesson_id is null) <> (project_id is null));
create index if not exists lesson_resources_project_idx on public.lesson_resources (project_id, position);
drop policy if exists lesson_resources_select on public.lesson_resources;
create policy lesson_resources_select on public.lesson_resources for select to authenticated
  using ((lesson_id is not null and public.can_view_lesson(lesson_id)) or (project_id is not null and public.can_view_project(project_id)));

alter table public.assignments alter column lesson_id drop not null;
alter table public.assignments add column if not exists project_id uuid references public.projects (id) on delete cascade;
alter table public.assignments drop constraint if exists assignments_owner_check;
alter table public.assignments add constraint assignments_owner_check check ((lesson_id is null) <> (project_id is null));
create index if not exists assignments_project_idx on public.assignments (project_id, position);

create or replace function public.can_view_assignment(p_assignment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.assignments a
    where a.id = p_assignment_id and a.is_published and a.archived_at is null
      and ((a.lesson_id is not null and public.can_view_lesson(a.lesson_id))
        or (a.project_id is not null and public.can_view_project(a.project_id))));
$$;

-- ============================================================
-- Project submissions: a link to the student's deliverable, reviewed by the instructor
-- ============================================================

create table if not exists public.project_submissions (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  link_url     text not null check (link_url ~ '^https://' and length(link_url) <= 1000),
  summary      text not null default '' check (length(summary) <= 4000),
  is_public    boolean not null default true,     -- show in the project's showcase once approved
  status       text not null default 'submitted' check (status in ('submitted', 'approved', 'needs_work')),
  feedback     text not null default '' check (length(feedback) <= 4000),
  submitted_at timestamptz not null default now(),
  reviewed_at  timestamptz,
  unique (project_id, user_id)
);
create index if not exists project_submissions_status_idx on public.project_submissions (status, submitted_at desc);

alter table public.project_submissions enable row level security;
grant select, insert on public.project_submissions to authenticated;
revoke update on public.project_submissions from authenticated;
grant update (link_url, summary, is_public, status, feedback, reviewed_at, submitted_at) on public.project_submissions to authenticated;

drop policy if exists project_submissions_select on public.project_submissions;
create policy project_submissions_select on public.project_submissions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists project_submissions_insert on public.project_submissions;
create policy project_submissions_insert on public.project_submissions for insert to authenticated
  with check (user_id = auth.uid() and status = 'submitted' and feedback = '' and reviewed_at is null
              and public.can_view_project(project_id));
drop policy if exists project_submissions_update on public.project_submissions;
create policy project_submissions_update on public.project_submissions for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Students cannot review themselves; a resubmission goes back to "submitted".
create or replace function public.project_submissions_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
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
drop trigger if exists project_submissions_guard on public.project_submissions;
create trigger project_submissions_guard before update on public.project_submissions for each row execute function public.project_submissions_guard();

-- Public showcase: approved + public submissions, first name + last initial.
create or replace function public.project_showcase(p_project_id uuid)
returns table (id uuid, link_url text, summary text, reviewed_at timestamptz, author text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.link_url, s.summary, s.reviewed_at,
    coalesce(nullif(
      trim(split_part(trim(p.full_name), ' ', 1) || ' ' ||
           coalesce(left(nullif(split_part(trim(p.full_name), ' ', 2), ''), 1) || '.', '')), ''), 'Talaba')
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
