-- 0003: Row Level Security
-- Run after 0002. RLS is ON for every table. Server code that uses the secret (service role)
-- key bypasses RLS; it is used only for payments, enrollments and rate limiting.

-- Table permissions. RLS policies below decide WHICH rows; these grants decide which
-- operations are possible at all. (Explicit, so it works the same on any Postgres setup.)
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
revoke all on public.rate_limits from anon, authenticated;

alter table public.profiles        enable row level security;
alter table public.device_sessions enable row level security;
alter table public.categories      enable row level security;
alter table public.courses         enable row level security;
alter table public.modules         enable row level security;
alter table public.lessons         enable row level security;
alter table public.lesson_contents enable row level security;
alter table public.bundles         enable row level security;
alter table public.bundle_courses  enable row level security;
alter table public.promo_codes     enable row level security;
alter table public.orders          enable row level security;
alter table public.payments        enable row level security;
alter table public.payment_events  enable row level security;
alter table public.enrollments     enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.audit_log       enable row level security;
alter table public.rate_limits     enable row level security;  -- no policies: server only

-- ============================================================
-- Profiles: students see/edit only their own; "role" can never be changed by students.
-- ============================================================

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Column-level protection: logged-in users may only change these columns directly.
-- (role, phone, email etc. are changed by triggers or by server code.)
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- ============================================================
-- Device sessions: read own; changes only through functions in 0002.
-- ============================================================

create policy device_sessions_select on public.device_sessions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- Catalog: published content is public; admins see and edit everything.
-- ============================================================

create policy categories_select on public.categories for select
  using (true);
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy courses_select on public.courses for select
  using ((is_published and archived_at is null) or public.is_admin());
create policy courses_admin on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy modules_select on public.modules for select
  using (
    public.is_admin() or (
      is_published and archived_at is null and exists (
        select 1 from public.courses c where c.id = course_id and c.is_published and c.archived_at is null)));
create policy modules_admin on public.modules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Lesson titles are visible in the syllabus (locked lessons too).
create policy lessons_select on public.lessons for select
  using (
    public.is_admin() or (
      is_published and archived_at is null and exists (
        select 1 from public.modules m join public.courses c on c.id = m.course_id
        where m.id = module_id and m.is_published and m.archived_at is null
          and c.is_published and c.archived_at is null)));
create policy lessons_admin on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Video + text: only free preview lessons, or with an active enrollment.
create policy lesson_contents_select on public.lesson_contents for select
  using (public.can_view_lesson(lesson_id));
create policy lesson_contents_admin on public.lesson_contents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy bundles_select on public.bundles for select
  using ((is_published and archived_at is null) or public.is_admin());
create policy bundles_admin on public.bundles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy bundle_courses_select on public.bundle_courses for select
  using (
    public.is_admin() or exists (
      select 1 from public.bundles b where b.id = bundle_id and b.is_published and b.archived_at is null));
create policy bundle_courses_admin on public.bundle_courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Sales: students read only their own rows. Only server code (secret key) writes
-- paid status, payments and enrollments. Promo codes are checked on the server.
-- ============================================================

create policy promo_codes_admin on public.promo_codes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy orders_select on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy orders_admin on public.orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy payments_select on public.payments for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy payments_admin on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy payment_events_admin_select on public.payment_events for select to authenticated
  using (public.is_admin());

create policy enrollments_select on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy enrollments_admin on public.enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Learning progress: own rows only, and only for lessons the student can open.
-- ============================================================

create policy lesson_progress_select on public.lesson_progress for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy lesson_progress_insert on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_lesson(lesson_id));
create policy lesson_progress_update on public.lesson_progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_view_lesson(lesson_id));

-- ============================================================
-- Audit log: admins read; admins write rows as themselves.
-- ============================================================

create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_admin());
create policy audit_log_insert on public.audit_log for insert to authenticated
  with check (public.is_admin() and actor_id = auth.uid());
