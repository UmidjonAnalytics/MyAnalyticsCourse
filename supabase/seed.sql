-- Sample content for testing: 1 course, 2 modules (weeks), 4 lessons.
-- Safe to run more than once. Run AFTER the 3 migration files.
-- Lesson 1 is a free preview (visible without payment).

insert into public.courses (id, title, slug, description, position, is_published) values
  ('00000000-0000-0000-0000-000000000001',
   'Ma''lumotlar tahlili: noldan ishgacha',
   'malumotlar-tahlili',
   'Excel, SQL va vizualizatsiya bo''yicha real biznes vazifalari bilan amaliy kurs.',
   0, true)
on conflict (id) do nothing;

insert into public.modules (id, course_id, title, position, is_published) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '1-hafta: Tahlilchi kasbi va ma''lumotlar', 0, true),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '2-hafta: SQL asoslari', 1, true)
on conflict (id) do nothing;

insert into public.lessons (id, module_id, title, slug, position, is_free_preview, is_published) values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000101', 'Ma''lumotlar tahlilchisi nima qiladi?', 'tahlilchi-nima-qiladi', 0, true,  true),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000101', 'Biznes savolini to''g''ri qo''yish', 'biznes-savoli', 1, false, true),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000102', 'SELECT va WHERE', 'select-va-where', 0, false, true),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000102', 'GROUP BY va agregatsiya', 'group-by', 1, false, true)
on conflict (id) do nothing;

-- Placeholder video (YouTube's own sample video). Replace from the admin panel later.
insert into public.lesson_content (lesson_id, youtube_url, content_md) values
  ('00000000-0000-0000-0000-000000001001', 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
   E'## Dars haqida\n\nBu darsda tahlilchi kundalik ishda nima qilishini ko''rib chiqamiz.\n\n- Savol qabul qilish\n- Ma''lumot yig''ish va tozalash\n- Xulosa va tavsiya berish'),
  ('00000000-0000-0000-0000-000000001002', 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
   E'## Biznes savoli\n\nYaxshi savol aniq, o''lchanadigan va qarorga bog''liq bo''ladi.'),
  ('00000000-0000-0000-0000-000000001003', 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
   E'## SELECT va WHERE\n\n```sql\nSELECT order_id, amount\nFROM orders\nWHERE city = ''Toshkent'';\n```'),
  ('00000000-0000-0000-0000-000000001004', 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
   E'## GROUP BY\n\nSotuvlarni filiallar bo''yicha jamlaymiz.')
on conflict (lesson_id) do nothing;
