-- 0008: quizzes, lesson resources, certificates, richer course page (instructors, reviews).
-- Run after 0007. Safe to run again.

-- ============================================================
-- Quizzes: multiple-choice questions on a lesson (usually the last lesson of a module)
-- ============================================================

alter table public.lessons add column if not exists quiz_pass_percent integer not null default 70
  check (quiz_pass_percent between 0 and 100);

create table if not exists public.quiz_questions (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  position   integer not null default 0,
  prompt     text not null check (length(trim(prompt)) between 1 and 2000),
  options    text[] not null check (cardinality(options) between 2 and 8),
  multiple   boolean not null default false,   -- "select all that apply"
  created_at timestamptz not null default now()
);
create index if not exists quiz_questions_lesson_idx on public.quiz_questions (lesson_id, position);

-- Correct options (0-based) + explanation: admins only, checked on the server.
create table if not exists public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions (id) on delete cascade,
  correct     integer[] not null check (cardinality(correct) >= 1),
  explanation text not null default ''
);

create table if not exists public.quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  answers    jsonb not null,
  correct    integer not null,
  total      integer not null,
  passed     boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts (user_id, lesson_id, created_at desc);

alter table public.quiz_questions   enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.quiz_attempts    enable row level security;

grant select, insert, update, delete on public.quiz_questions, public.quiz_answer_keys to authenticated;
grant select on public.quiz_attempts to authenticated;

drop policy if exists quiz_questions_select on public.quiz_questions;
create policy quiz_questions_select on public.quiz_questions for select to authenticated using (public.can_view_lesson(lesson_id));
drop policy if exists quiz_questions_admin on public.quiz_questions;
create policy quiz_questions_admin on public.quiz_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists quiz_answer_keys_admin on public.quiz_answer_keys;
create policy quiz_answer_keys_admin on public.quiz_answer_keys for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists quiz_attempts_select on public.quiz_attempts;
create policy quiz_attempts_select on public.quiz_attempts for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- Lesson resources: downloadable files (private bucket) or links
-- ============================================================

create table if not exists public.lesson_resources (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  title      text not null check (length(trim(title)) between 1 and 200),
  file_path  text,
  url        text check (url is null or url ~ '^https://'),
  size_bytes bigint,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  check ((file_path is null) <> (url is null))
);
create index if not exists lesson_resources_lesson_idx on public.lesson_resources (lesson_id, position);

alter table public.lesson_resources enable row level security;
grant select, insert, update, delete on public.lesson_resources to authenticated;
drop policy if exists lesson_resources_select on public.lesson_resources;
create policy lesson_resources_select on public.lesson_resources for select to authenticated using (public.can_view_lesson(lesson_id));
drop policy if exists lesson_resources_admin on public.lesson_resources;
create policy lesson_resources_admin on public.lesson_resources for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-resources', 'lesson-resources', false, 50 * 1024 * 1024)
on conflict (id) do nothing;

drop policy if exists lesson_resources_admin_read on storage.objects;
create policy lesson_resources_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'lesson-resources' and public.is_admin());
drop policy if exists lesson_resources_admin_insert on storage.objects;
create policy lesson_resources_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-resources' and public.is_admin());
drop policy if exists lesson_resources_admin_delete on storage.objects;
create policy lesson_resources_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-resources' and public.is_admin());

-- ============================================================
-- Instructors + course sales-page fields
-- ============================================================

create table if not exists public.instructors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 120),
  title      text not null default '',     -- e.g. "Data analyst, 8 yillik tajriba"
  bio_md     text not null default '',
  photo_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists instructors_updated_at on public.instructors;
create trigger instructors_updated_at before update on public.instructors for each row execute function public.set_updated_at();

alter table public.instructors enable row level security;
grant select on public.instructors to anon, authenticated;
grant insert, update, delete on public.instructors to authenticated;
drop policy if exists instructors_select on public.instructors;
create policy instructors_select on public.instructors for select to anon, authenticated using (true);
drop policy if exists instructors_admin on public.instructors;
create policy instructors_admin on public.instructors for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.courses add column if not exists instructor_id uuid references public.instructors (id) on delete set null;
alter table public.courses add column if not exists level text check (level in ('beginner', 'intermediate', 'advanced'));
alter table public.courses add column if not exists outcomes text[] not null default '{}';
alter table public.courses add column if not exists audience text[] not null default '{}';
alter table public.courses add column if not exists requirements text[] not null default '{}';

-- What each lesson contains (for the public syllabus and "Kursga kiradi" box).
-- Counts only; content itself stays behind can_view_lesson.
create or replace function public.course_lesson_features(p_course_id uuid)
returns table (lesson_id uuid, quiz_questions integer, exercises integer, assignments integer, resources integer)
language sql stable security definer set search_path = '' as $$
  select l.id,
    (select count(*)::int from public.quiz_questions q where q.lesson_id = l.id),
    (select count(*)::int from public.exercises x where x.lesson_id = l.id and x.is_published and x.archived_at is null),
    (select count(*)::int from public.assignments a where a.lesson_id = l.id and a.is_published and a.archived_at is null),
    (select count(*)::int from public.lesson_resources r where r.lesson_id = l.id)
  from public.lessons l
  join public.courses c on c.id = l.course_id
  where l.course_id = p_course_id and l.is_published and l.archived_at is null
    and c.is_published and c.archived_at is null;
$$;
revoke execute on function public.course_lesson_features(uuid) from public;
grant execute on function public.course_lesson_features(uuid) to anon, authenticated;

-- ============================================================
-- Reviews: only students who own the course can write one
-- ============================================================

create table if not exists public.course_reviews (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  rating     integer not null check (rating between 1 and 5),
  body       text not null default '' check (length(body) <= 2000),
  hidden_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, user_id)
);
drop trigger if exists course_reviews_updated_at on public.course_reviews;
create trigger course_reviews_updated_at before update on public.course_reviews for each row execute function public.set_updated_at();

alter table public.course_reviews enable row level security;
grant select, insert on public.course_reviews to authenticated;
revoke update on public.course_reviews from authenticated;
grant update (rating, body, hidden_at) on public.course_reviews to authenticated;

drop policy if exists course_reviews_select on public.course_reviews;
create policy course_reviews_select on public.course_reviews for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists course_reviews_insert on public.course_reviews;
create policy course_reviews_insert on public.course_reviews for insert to authenticated
  with check (user_id = auth.uid() and hidden_at is null and public.has_course_access(course_id));
-- Students edit their own (cannot un-hide: hidden_at must stay as it was, checked by the trigger).
drop policy if exists course_reviews_update on public.course_reviews;
create policy course_reviews_update on public.course_reviews for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create or replace function public.course_reviews_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() and new.hidden_at is distinct from old.hidden_at then
    raise exception 'forbidden';
  end if;
  return new;
end $$;
drop trigger if exists course_reviews_guard on public.course_reviews;
create trigger course_reviews_guard before update on public.course_reviews for each row execute function public.course_reviews_guard();

-- Public list: first name + last initial only.
create or replace function public.course_reviews_public(p_course_id uuid)
returns table (id uuid, rating integer, body text, created_at timestamptz, author text)
language sql stable security definer set search_path = '' as $$
  select r.id, r.rating, r.body, r.created_at,
    coalesce(nullif(
      trim(split_part(trim(p.full_name), ' ', 1) || ' ' ||
           coalesce(left(nullif(split_part(trim(p.full_name), ' ', 2), ''), 1) || '.', '')), ''), 'Talaba')
  from public.course_reviews r
  join public.profiles p on p.id = r.user_id
  join public.courses c on c.id = r.course_id
  where r.course_id = p_course_id and r.hidden_at is null and c.is_published and c.archived_at is null
  order by r.created_at desc
  limit 200;
$$;
revoke execute on function public.course_reviews_public(uuid) from public;
grant execute on function public.course_reviews_public(uuid) to anon, authenticated;

-- ============================================================
-- Certificates
-- ============================================================

create table if not exists public.certificates (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  course_id    uuid not null references public.courses (id) on delete cascade,
  full_name    text not null,          -- snapshot at issue time
  course_title text not null,
  hours        numeric(6, 1) not null default 0,
  issued_at    timestamptz not null default now(),
  revoked_at   timestamptz,
  unique (user_id, course_id)
);

alter table public.certificates enable row level security;
grant select on public.certificates to authenticated;
grant update (revoked_at) on public.certificates to authenticated;
drop policy if exists certificates_select on public.certificates;
create policy certificates_select on public.certificates for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists certificates_admin_update on public.certificates;
create policy certificates_admin_update on public.certificates for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Issues the certificate when every published lesson is completed and every quiz passed.
-- Returns the code; raises 'no_access', 'not_finished', 'quiz_not_passed' or 'name_required'.
create or replace function public.issue_certificate(p_course_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_name text;
  v_title text;
  v_total int;
  v_done int;
  v_minutes int;
begin
  if v_uid is null then raise exception 'not_logged_in'; end if;

  select code into v_code from public.certificates where user_id = v_uid and course_id = p_course_id and revoked_at is null;
  if v_code is not null then return v_code; end if;

  if not public.has_course_access(p_course_id) then raise exception 'no_access'; end if;

  select count(*), count(lp.lesson_id), coalesce(sum(l.duration_minutes), 0)
    into v_total, v_done, v_minutes
  from public.lessons l
  join public.modules m on m.id = l.module_id
  left join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = v_uid and lp.status = 'completed'
  where l.course_id = p_course_id
    and l.is_published and l.archived_at is null and m.is_published and m.archived_at is null;
  if v_total = 0 or v_done < v_total then raise exception 'not_finished'; end if;

  if exists (
    select 1 from public.lessons l
    join public.modules m on m.id = l.module_id
    where l.course_id = p_course_id
      and l.is_published and l.archived_at is null and m.is_published and m.archived_at is null
      and exists (select 1 from public.quiz_questions q where q.lesson_id = l.id)
      and not exists (select 1 from public.quiz_attempts a where a.lesson_id = l.id and a.user_id = v_uid and a.passed)
  ) then raise exception 'quiz_not_passed'; end if;

  select trim(full_name) into v_name from public.profiles where id = v_uid;
  if coalesce(v_name, '') = '' then raise exception 'name_required'; end if;
  select title into v_title from public.courses where id = p_course_id;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.certificates (code, user_id, course_id, full_name, course_title, hours)
  values (v_code, v_uid, p_course_id, v_name, v_title, round(v_minutes / 60.0, 1))
  on conflict (user_id, course_id) do update set
    code = excluded.code, full_name = excluded.full_name, course_title = excluded.course_title,
    hours = excluded.hours, issued_at = now(), revoked_at = null
  returning code into v_code;
  return v_code;
end $$;
revoke execute on function public.issue_certificate(uuid) from public, anon;
grant execute on function public.issue_certificate(uuid) to authenticated;

-- Public verification page: anyone with the code can check it.
create or replace function public.certificate_public(p_code text)
returns table (code text, full_name text, course_title text, course_slug text, hours numeric, issued_at timestamptz,
               instructor_name text, instructor_title text)
language sql stable security definer set search_path = '' as $$
  select c.code, c.full_name, c.course_title, co.slug, c.hours, c.issued_at, i.name, i.title
  from public.certificates c
  join public.courses co on co.id = c.course_id
  left join public.instructors i on i.id = co.instructor_id
  where c.code = upper(trim(p_code)) and c.revoked_at is null;
$$;
revoke execute on function public.certificate_public(text) from public;
grant execute on function public.certificate_public(text) to anon, authenticated;
