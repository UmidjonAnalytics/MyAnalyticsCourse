-- 0011: site contacts / legal details and editable legal pages (oferta, privacy, refunds).
-- Run after 0010. Safe to run again (existing texts are never overwritten).

create table if not exists public.site_settings (
  id            integer primary key default 1 check (id = 1),   -- exactly one row
  company_name  text not null default '',   -- "MChJ ..." or "YaTT ..."
  stir          text not null default '',   -- STIR (INN)
  address       text not null default '',
  phone         text not null default '',
  email         text not null default '',
  telegram_url  text not null default '',
  instagram_url text not null default '',
  support_hours text not null default '',
  updated_at    timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.site_pages (
  slug       text primary key check (slug ~ '^[a-z0-9-]{1,40}$'),
  title      text not null,
  body_md    text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();
drop trigger if exists site_pages_updated_at on public.site_pages;
create trigger site_pages_updated_at before update on public.site_pages for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;
alter table public.site_pages    enable row level security;
grant select on public.site_settings, public.site_pages to anon, authenticated;
grant update on public.site_settings, public.site_pages to authenticated;

drop policy if exists site_settings_select on public.site_settings;
create policy site_settings_select on public.site_settings for select to anon, authenticated using (true);
drop policy if exists site_settings_admin on public.site_settings;
create policy site_settings_admin on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists site_pages_select on public.site_pages;
create policy site_pages_select on public.site_pages for select to anon, authenticated using (true);
drop policy if exists site_pages_admin on public.site_pages;
create policy site_pages_admin on public.site_pages for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Draft texts. {{kompaniya}}, {{stir}}, {{manzil}}, {{telefon}}, {{email}}, {{sayt}}, {{brend}} are filled
-- from the settings above when the page is shown. Have a lawyer check the final wording.
insert into public.site_pages (slug, title, body_md) values
('oferta', 'Ommaviy oferta', $md$
**{{kompaniya}}** (STIR: {{stir}}, manzil: {{manzil}}), keyingi o'rinlarda "Ijrochi", ushbu ommaviy oferta orqali **{{sayt}}** saytida ("Platforma") joylashtirilgan onlayn kurslardan foydalanish xizmatini taklif qiladi.

## 1. Umumiy qoidalar
1. Ushbu hujjat O'zbekiston Respublikasi Fuqarolik kodeksining 367–370-moddalariga muvofiq ommaviy oferta hisoblanadi.
2. Platformada ro'yxatdan o'tish va to'lovni amalga oshirish oferta shartlarini to'liq qabul qilish (aktsept) hisoblanadi.
3. Ijrochi oferta shartlarini o'zgartirishi mumkin. Yangi tahrir saytga joylangan kundan kuchga kiradi; to'lov qilingan kurslarga kirish huquqi saqlanib qoladi.

## 2. Xizmat
1. Ijrochi to'lov qilgan foydalanuvchiga ("Talaba") tanlangan kurs yoki to'plam materiallariga (video darslar, matnlar, amaliy topshiriqlar, testlar) onlayn kirish huquqini beradi.
2. Kirish muddati kurs sahifasida ko'rsatiladi. Agar boshqacha ko'rsatilmagan bo'lsa, kirish muddatsiz beriladi (Platforma faoliyat yuritgan davr mobaynida).
3. Kurs materiallari faqat shaxsiy o'qish uchun. Ularni nusxalash, tarqatish, sotish yoki boshqa shaxslarga berish taqiqlanadi.
4. Bitta hisobdan bir vaqtning o'zida ko'pi bilan 2 ta qurilmada foydalanish mumkin. Hisobni boshqalar bilan bo'lishish aniqlansa, Ijrochi kirishni cheklash huquqiga ega.

## 3. Narx va to'lov
1. Kurs narxi kurs sahifasida so'mda ko'rsatiladi.
2. To'lov Payme, Click yoki Paynet orqali amalga oshiriladi. Platforma karta ma'lumotlarini saqlamaydi.
3. Kirish huquqi to'lov tizimi to'lovni tasdiqlagandan so'ng avtomatik beriladi.

## 4. Pulni qaytarish
Pulni qaytarish shartlari [Qaytarish siyosati](/qaytarish) sahifasida keltirilgan.

## 5. Tomonlarning javobgarligi
1. Ijrochi Platformaning uzluksiz ishlashi uchun oqilona choralarni ko'radi, ammo internet provayderi yoki talabaning qurilmasi bilan bog'liq uzilishlar uchun javob bermaydi.
2. Kurs natijalari (masalan, ishga joylashish) talabaning mehnatiga bog'liq va kafolatlanmaydi.

## 6. Shaxsiy ma'lumotlar
Shaxsiy ma'lumotlar [Maxfiylik siyosati](/maxfiylik) asosida qayta ishlanadi.

## 7. Nizolarni hal qilish
Nizolar muzokara yo'li bilan, kelishilmasa O'zbekiston Respublikasi qonunchiligiga muvofiq sudda hal qilinadi.

## 8. Ijrochi rekvizitlari
{{kompaniya}}
STIR: {{stir}}
Manzil: {{manzil}}
Telefon: {{telefon}}
E-mail: {{email}}
$md$),
('maxfiylik', 'Maxfiylik siyosati', $md$
Ushbu siyosat **{{brend}}** ({{sayt}}) platformasi foydalanuvchilarning shaxsiy ma'lumotlarini qanday yig'ishi, saqlashi va himoya qilishini tushuntiradi. Ma'lumotlar operatori: **{{kompaniya}}** (STIR: {{stir}}).

## 1. Qanday ma'lumotlarni yig'amiz
- Telefon raqami (kirish uchun), ism-familiya, ixtiyoriy ravishda e-mail va profil rasmi (Google orqali kirganda).
- O'qish jarayoni: tugatilgan darslar, test va topshiriq natijalari, izohlar, sertifikatlar.
- Qurilma ma'lumotlari: brauzer turi va oxirgi faollik vaqti (bir hisobdan 2 tadan ortiq qurilmada foydalanishni cheklash uchun).
- To'lovlar: buyurtma summasi va holati. **Karta raqamlari bizda saqlanmaydi** — ular to'g'ridan-to'g'ri to'lov tizimida (Payme, Click, Paynet) kiritiladi.

## 2. Ma'lumotlardan foydalanish maqsadi
- Hisobingizga kirish va kurslarga ruxsat berish;
- o'qish natijalarini saqlash va sertifikat berish;
- to'lovlarni tasdiqlash va qaytarish;
- xizmat sifatini yaxshilash va suiiste'molning oldini olish.

## 3. Ma'lumotlarni uchinchi shaxslarga berish
Ma'lumotlar sotilmaydi. Ular faqat xizmat ko'rsatish uchun zarur hamkorlarga beriladi: SMS-xizmat (tasdiqlash kodi uchun), to'lov tizimlari, server/hosting provayderlari. Qonunda nazarda tutilgan hollarda vakolatli organlarga taqdim etilishi mumkin.

## 4. Ommaviy profil
Ommaviy profil faqat siz yoqsangiz ko'rinadi. Unda ismingiz, siz kiritgan ma'lumotlar, sertifikatlar va ruxsat bergan loyihalaringiz ko'rsatiladi. Telefon raqami va e-mail hech qachon ko'rsatilmaydi.

## 5. Saqlash va himoya
Ma'lumotlar himoyalangan serverlarda saqlanadi, ularga kirish cheklangan. Hisobingizni o'chirishni so'rasangiz, qonun talab qiladigan to'lov yozuvlaridan tashqari ma'lumotlaringiz o'chiriladi.

## 6. Sizning huquqlaringiz
Ma'lumotlaringizni ko'rish, tuzatish yoki o'chirishni so'rash uchun murojaat qiling: {{email}}, {{telefon}}.

## 7. O'zgarishlar
Siyosat yangilansa, yangi tahrir shu sahifada e'lon qilinadi.
$md$),
('qaytarish', 'Qaytarish siyosati', $md$
**{{brend}}** platformasida sotib olingan kurslar uchun pulni qaytarish shartlari.

## 1. Qachon pul qaytariladi
1. To'lovdan keyin **7 kun ichida** va kursning **20% dan kam** qismi o'tilgan bo'lsa — to'liq summa qaytariladi.
2. Texnik sabablarga ko'ra kursga kira olmasangiz va muammoni 3 ish kunida hal qila olmasak — to'liq summa qaytariladi.
3. Bir xil kurs uchun xato bilan ikki marta to'lov qilingan bo'lsa — ortiqcha to'lov qaytariladi.

## 2. Qachon qaytarilmaydi
1. To'lovdan 7 kundan ko'p vaqt o'tgan bo'lsa.
2. Kursning 20% yoki undan ko'p qismi o'tilgan yoki sertifikat olingan bo'lsa.
3. Oferta shartlari buzilgan bo'lsa (hisobni boshqalarga berish, materiallarni tarqatish).

## 3. Qanday so'rash mumkin
{{email}} yoki {{telefon}} orqali buyurtma raqamini va sababni yozing. Murojaat 3 ish kunida ko'rib chiqiladi.

## 4. Pul qanday qaytariladi
Pul to'lov qilingan usulga (Payme, Click yoki Paynet orqali o'sha kartaga) qaytariladi. Bank va to'lov tizimiga qarab 1–10 ish kuni ichida kartangizga tushadi. Qaytarilgandan so'ng kursga kirish yopiladi va berilgan sertifikat bekor qilinadi.
$md$)
on conflict (slug) do nothing;
