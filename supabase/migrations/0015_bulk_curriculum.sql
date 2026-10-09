-- ============================================================
-- Bulk course building (admin only):
--   admin_import_outline  — create many modules + lessons from a pasted outline, in one step
--   admin_update_lessons  — save video links, minutes, free/published flags for many lessons at once
-- Both run as one transaction: either everything is saved, or nothing.
-- ============================================================

-- p_modules: [{ "title": "...", "lessons": [{ "title": "...", "slug": "...", "youtube": "..." | null, "minutes": 12 | null }] }]
-- New lessons are drafts (not published). The first p_free_count new lessons become free previews.
create or replace function public.admin_import_outline(p_course_id uuid, p_modules jsonb, p_free_count integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  m jsonb;
  l jsonb;
  v_module uuid;
  v_lesson uuid;
  v_mpos integer;
  v_lpos integer;
  v_base text;
  v_slug text;
  v_n integer;
  v_free integer := greatest(coalesce(p_free_count, 0), 0);
  v_modules integer := 0;
  v_lessons integer := 0;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.courses where id = p_course_id) then raise exception 'course_not_found'; end if;
  if jsonb_typeof(p_modules) is distinct from 'array' or jsonb_array_length(p_modules) = 0 then raise exception 'empty_outline'; end if;

  select coalesce(max(position), 0) into v_mpos from public.modules where course_id = p_course_id;

  for m in select value from jsonb_array_elements(p_modules) loop
    v_mpos := v_mpos + 1;
    insert into public.modules (course_id, title, position)
    values (p_course_id, left(btrim(m->>'title'), 200), v_mpos)
    returning id into v_module;
    v_modules := v_modules + 1;
    v_lpos := 0;

    for l in select value from jsonb_array_elements(coalesce(m->'lessons', '[]'::jsonb)) loop
      v_lpos := v_lpos + 1;
      v_base := coalesce(nullif(l->>'slug', ''), 'dars');
      if v_base !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then v_base := 'dars'; end if;
      v_slug := v_base;
      v_n := 1;
      while exists (select 1 from public.lessons where course_id = p_course_id and slug = v_slug) loop
        v_n := v_n + 1;
        v_slug := v_base || '-' || v_n;
      end loop;

      insert into public.lessons (module_id, course_id, title, slug, position, is_published, is_free_preview, duration_minutes)
      values (v_module, p_course_id, left(btrim(l->>'title'), 200), v_slug, v_lpos, false, v_lessons < v_free,
              nullif(l->>'minutes', '')::integer)
      returning id into v_lesson;
      insert into public.lesson_contents (lesson_id, youtube_url) values (v_lesson, nullif(l->>'youtube', ''));
      v_lessons := v_lessons + 1;
    end loop;
  end loop;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'import', 'course', p_course_id::text, jsonb_build_object('modules', v_modules, 'lessons', v_lessons));
  return jsonb_build_object('modules', v_modules, 'lessons', v_lessons);
end $$;

-- p_rows: [{ "id": "...", "youtube": "..." | null, "minutes": 12 | null, "free": true, "published": false }]
-- Only lessons of p_course_id are touched; lesson text and tasks are left as they are.
create or replace function public.admin_update_lessons(p_course_id uuid, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  v_count integer := 0;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'bad_rows'; end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    update public.lessons
       set duration_minutes = nullif(r->>'minutes', '')::integer,
           is_free_preview  = coalesce((r->>'free')::boolean, false),
           is_published     = coalesce((r->>'published')::boolean, false)
     where id = (r->>'id')::uuid and course_id = p_course_id;
    if found then
      insert into public.lesson_contents (lesson_id, youtube_url)
      values ((r->>'id')::uuid, nullif(r->>'youtube', ''))
      on conflict (lesson_id) do update set youtube_url = excluded.youtube_url;
      v_count := v_count + 1;
    end if;
  end loop;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'update_lessons', 'course', p_course_id::text, jsonb_build_object('lessons', v_count));
  return v_count;
end $$;

revoke execute on function public.admin_import_outline(uuid, jsonb, integer) from public, anon;
revoke execute on function public.admin_update_lessons(uuid, jsonb) from public, anon;
grant execute on function public.admin_import_outline(uuid, jsonb, integer) to authenticated;
grant execute on function public.admin_update_lessons(uuid, jsonb) to authenticated;
