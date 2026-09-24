-- Sample data: 4 categories, 3 courses (Excel, Power BI, Python) x 2 modules x 3 lessons,
-- 1 bundle, 1 promo code. Safe to run more than once (existing rows are skipped).
-- Run after all migrations: SQL Editor -> New query -> paste -> Run.

insert into public.categories (name, slug, position) values
  ('Excel', 'excel', 1),
  ('Power BI', 'power-bi', 2),
  ('SQL', 'sql', 3),
  ('Python', 'python', 4)
on conflict (slug) do nothing;

insert into public.courses (category_id, title, slug, short_description, description, price, is_published, position)
select c.id, v.title, v.slug, v.short_description, v.description, v.price, true, v.position
from (values
  ('excel', 'Excel: biznes tahlil', 'excel-biznes-tahlil',
   'Formulalar, pivot jadvallar va savdo hisobotlari real ma''lumotlarda.',
   'Kursda chakana savdo kompaniyasining haqiqiy ko''rinishdagi ma''lumotlari bilan ishlaysiz: tozalash, formulalar, pivot jadvallar va rahbariyat uchun hisobot.',
   890000, 1),
  ('power-bi', 'Power BI: dashboardlar', 'power-bi-dashboardlar',
   'Ma''lumot modeli, DAX va rahbariyat uchun interaktiv dashboardlar.',
   'Power Query bilan ma''lumotlarni tayyorlash, yulduz sxemasi, DAX o''lchovlari va sotuv dashboardini noldan qurish.',
   890000, 2),
  ('python', 'Python: tahlilchilar uchun', 'python-tahlilchilar-uchun',
   'pandas bilan ma''lumotlarni tozalash, guruhlash va vizualizatsiya.',
   'Python asoslari, pandas, ma''lumotlarni tozalash va biznes savollariga javob beruvchi tahlil.',
   890000, 3)
) as v(category_slug, title, slug, short_description, description, price, position)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

-- 2 modules per course (only for courses that have no modules yet).
insert into public.modules (course_id, title, position)
select c.id, m.title, m.position
from public.courses c
cross join (values ('1-modul: Asoslar', 1), ('2-modul: Amaliy tahlil', 2)) as m(title, position)
where c.slug in ('excel-biznes-tahlil', 'power-bi-dashboardlar', 'python-tahlilchilar-uchun')
  and not exists (select 1 from public.modules x where x.course_id = c.id);

-- 3 lessons per module. The first lesson of each course is a free preview.
insert into public.lessons (module_id, course_id, title, slug, position, is_free_preview)
select m.id, m.course_id,
       format('%s-dars: %s', (m.position - 1) * 3 + l.n, l.title),
       format('dars-%s', (m.position - 1) * 3 + l.n),
       l.n,
       (m.position = 1 and l.n = 1)
from public.modules m
join public.courses c on c.id = m.course_id
cross join (values (1, 'Kirish va vazifa'), (2, 'Asosiy usullar'), (3, 'Amaliy topshiriq')) as l(n, title)
where c.slug in ('excel-biznes-tahlil', 'power-bi-dashboardlar', 'python-tahlilchilar-uchun')
  and not exists (select 1 from public.lessons x where x.module_id = m.id);

-- Placeholder video + text for every lesson.
insert into public.lesson_contents (lesson_id, youtube_url, content_md, task_md)
select l.id,
       'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
       format(E'## %s\n\nBu darsning matni. Bu yerga video bo''yicha izoh va qadamlar yoziladi.\n\n- Birinchi qadam\n- Ikkinchi qadam', l.title),
       E'**Biznes vazifa:** Toshkentdagi 12 ta do''kon uchun oylik savdo hisobotini tayyorlang.\n\nJadvallar: `sales`, `stores`.'
from public.lessons l
where not exists (select 1 from public.lesson_contents x where x.lesson_id = l.id);

-- Bundle with all three courses.
insert into public.bundles (title, slug, short_description, description, price, allow_upgrade_pricing, is_published, position)
values ('To''liq Data Analyst', 'toliq-data-analyst',
        'Excel, Power BI va Python — bitta to''plamda.',
        'Uchala kursni birga oling va alohida sotib olgandan arzonroq to''lang.',
        1990000, true, true, 1)
on conflict (slug) do nothing;

insert into public.bundle_courses (bundle_id, course_id, position)
select b.id, c.id, c.position
from public.bundles b
join public.courses c on c.slug in ('excel-biznes-tahlil', 'power-bi-dashboardlar', 'python-tahlilchilar-uchun')
where b.slug = 'toliq-data-analyst'
on conflict do nothing;

-- 10% off everything, 100 uses.
insert into public.promo_codes (code, discount_type, discount_value, valid_from, valid_to, usage_limit, applies_to)
values ('BOSHLASH10', 'percent', 10, now(), now() + interval '1 year', 100, '{"all": true}')
on conflict (code) do nothing;
