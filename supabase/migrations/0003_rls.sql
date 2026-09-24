-- 0003: Row Level Security (who can read/write what)
-- Run after 0002.

alter table public.profiles             enable row level security;
alter table public.courses              enable row level security;
alter table public.modules              enable row level security;
alter table public.lessons              enable row level security;
alter table public.lesson_content       enable row level security;
alter table public.enrollments          enable row level security;
alter table public.lesson_progress      enable row level security;
alter table public.device_sessions      enable row level security;
alter table public.datasets             enable row level security;
alter table public.exercises            enable row level security;
alter table public.exercise_keys        enable row level security;
alter table public.exercise_submissions enable row level security;
alter table public.audit_log            enable row level security;

-- Visitors who are not logged in get nothing from any table.
revoke all on all tables in schema public from anon;

-- ---------- profiles ----------
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());
create policy "profiles: admin delete" on public.profiles
  for delete to authenticated using (public.is_admin());
-- Profiles are created by the server during Telegram login (service role), so no insert policy.

-- ---------- courses / modules / lessons (metadata) ----------
create policy "courses: read published" on public.courses
  for select to authenticated
  using ((is_published and archived_at is null) or public.is_admin());
create policy "courses: admin write" on public.courses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "modules: read published" on public.modules
  for select to authenticated
  using (
    public.is_admin() or (
      is_published and archived_at is null
      and exists (select 1 from public.courses c
                  where c.id = course_id and c.is_published and c.archived_at is null)
    )
  );
create policy "modules: admin write" on public.modules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "lessons: read published" on public.lessons
  for select to authenticated using (public.is_admin() or public.lesson_is_visible(id));
create policy "lessons: admin write" on public.lessons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- lesson_content (video + text): free preview OR active enrollment ----------
create policy "lesson_content: read with access" on public.lesson_content
  for select to authenticated using (public.can_view_lesson_content(lesson_id));
create policy "lesson_content: admin write" on public.lesson_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- enrollments: students read their own; only admins change ----------
create policy "enrollments: read own" on public.enrollments
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "enrollments: admin write" on public.enrollments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- lesson_progress: own rows, only for lessons the student may open ----------
create policy "progress: read own" on public.lesson_progress
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "progress: insert own" on public.lesson_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_lesson_content(lesson_id));
create policy "progress: update own" on public.lesson_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_view_lesson_content(lesson_id));
create policy "progress: admin all" on public.lesson_progress
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- device_sessions: students only READ their own. Changes go through the server. ----------
create policy "devices: read own" on public.device_sessions
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- ---------- datasets: admin only (students get data through short-lived signed URLs from the server) ----------
create policy "datasets: admin all" on public.datasets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- exercises (task text only, no answers) ----------
create policy "exercises: read with access" on public.exercises
  for select to authenticated using (public.can_view_lesson_content(lesson_id));
create policy "exercises: admin write" on public.exercises
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- exercise_keys: admins only ----------
create policy "exercise_keys: admin all" on public.exercise_keys
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- submissions: students read their own; the server inserts after checking ----------
create policy "submissions: read own" on public.exercise_submissions
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- ---------- audit_log: admins read; the server writes ----------
create policy "audit_log: admin read" on public.audit_log
  for select to authenticated using (public.is_admin());
create policy "audit_log: admin insert" on public.audit_log
  for insert to authenticated with check (public.is_admin() and actor_id = (select auth.uid()));
