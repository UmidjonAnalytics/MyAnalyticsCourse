# [PLATFORMA NOMI]: data analytics learning platform (Uzbek)

A paid learning platform: courses (Excel, Power BI, SQL, Python...) with lessons, progress,
payments (Payme / Click / Paynet) and a separate admin panel on `admin.<your-domain>`.

- **Tech:** Next.js 16 (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres, Auth, Storage, RLS).
- **Hosting now:** Netlify free plan + Supabase free plan (no credit card).
- **Hosting later:** any Ubuntu VPS with Docker. See [MIGRATION_TO_VPS.md](MIGRATION_TO_VPS.md).

## Where things are

| What | Where |
| --- | --- |
| All Uzbek UI text (edit wording here) | `src/lib/i18n/uz.ts` |
| Platform name, support link | `src/lib/i18n/uz.ts` → `brand` |
| Colours (design tokens) | `src/app/globals.css` |
| Database tables, security rules | `supabase/migrations/0001…0004*.sql` |
| Sample data | `supabase/seed.sql` |
| Host routing, login checks, device limit | `src/proxy.ts` |
| SMS providers (Eskiz) | `src/lib/sms/` |
| Student pages | `src/app/(site)/` |
| Admin pages | `src/app/admin/` |

---

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> → sign up (GitHub login is easiest) → **New project**.
2. Name: anything. Database password: click **Generate**, save it in a password manager.
   Region: **Central EU (Frankfurt)** (closest to Uzbekistan). Plan: **Free**.
3. Wait ~2 minutes until the project is ready.

> The free plan pauses a project after 7 days without any visits. Open the dashboard and click
> **Restore** if that happens. Upgrade to Pro before real students use it.

### 1a. Run the SQL files (creates all tables)

In the Supabase dashboard: **SQL Editor** (left menu) → **New query**. Then, for each file below
**in this order**: open the file on GitHub → click **Raw** → select all (Ctrl+A) → copy (Ctrl+C) →
paste into the SQL editor → click **Run** → you should see "Success. No rows returned".

1. `supabase/migrations/0001_tables.sql`
2. `supabase/migrations/0002_functions.sql`
3. `supabase/migrations/0003_rls.sql`
4. `supabase/migrations/0004_admin_content.sql` (covers storage, admin helpers)
5. `supabase/migrations/0005_practice.sql` (datasets, SQL exercises, private datasets bucket)
6. `supabase/migrations/0006_payments.sql` (payments, promo usage, revenue stats)
7. `supabase/migrations/0007_discussions_assignments.sql` (lesson length, discussions, Excel assignments)
8. `supabase/migrations/0008_quizzes_resources_certificates.sql` (quizzes, lesson materials, certificates, instructors, reviews)
9. `supabase/migrations/0009_paths_projects.sql` (learning paths, portfolio projects)
10. `supabase/migrations/0010_public_profiles.sql` (opt-in public student profiles)
11. `supabase/migrations/0011_site_settings_legal.sql` (contacts, legal details, oferta/privacy/refund pages)
12. `supabase/migrations/0012_uzum_provider.sql` (allows "uzum" as a payment provider)
13. `supabase/seed.sql` (sample courses; optional, safe to run twice)

Check it worked: **Table Editor** → you should see `courses` with 3 rows.

> If `SUPABASE_ACCESS_TOKEN` is set in the Claude Code environment, Claude runs new migrations
> for you and tells you when. (Already done: 0001–0012 on the current project, plus the practice seed below.)
>
> Run each migration only **once**. Running 0001–0003 a second time gives "already exists" errors
> (nothing breaks). New changes will always come as new numbered files (0004, 0005, ...).

### 1b. Copy the keys

**Project Settings** (gear icon) → **API Keys**:

- **Publishable key** (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Secret key** (`sb_secret_...`, click "Reveal") → `SUPABASE_SECRET_KEY`. **Never share this one.**

**Project Settings** → **Data API** → **Project URL** (`https://xxxx.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`.

(Older projects show "anon" and "service_role" keys instead. They work too: anon = publishable, service_role = secret.)

---

## 2. Hosting

**Current host: Vercel** (project `myanalyticsplatform`, Hobby plan, deploys automatically on every
push to `claude/affectionate-cori-zfh711`).

- Student site: <https://myanalyticsplatform.vercel.app>
- Admin panel: <https://myanalyticsplatform-admin.vercel.app> (same project, second address;
  `ADMIN_HOSTNAMES=myanalyticsplatform-admin.vercel.app`). One build serves both.
- Environment variables: Vercel → project → **Settings → Environment Variables** (same names as the
  table below). After changing one, redeploy (Deployments → ⋯ → Redeploy).
- The Hobby plan is for non-commercial use: move to Vercel Pro or the VPS (Docker) before selling.
- With a real domain later: add `example.uz` and `admin.example.uz` under **Settings → Domains**;
  any `admin.` host is the admin panel automatically.

The Netlify instructions below are kept in case you switch back (paused: build credits ran out).

### Netlify (previous host)

1. Go to <https://app.netlify.com> → sign up with GitHub (free plan, no card).
2. **Add new project** → **Import an existing project** → **GitHub** → allow access → choose
   `MyAnalyticsCourse`.
3. **Branch to deploy:** `claude/affectionate-cori-zfh711` (the branch with the code for now).
   Build settings are read from `netlify.toml`, so leave them as they are.
4. Click **Add environment variables** (or later: **Project configuration → Environment variables**)
   and add these (values from step 1b; see `.env.example` for the full list):

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
   | `SUPABASE_SECRET_KEY` | `sb_secret_...` |
   | `DEV_LOGIN_CODE` | `123456` (test mode, see below) |

5. Click **Deploy**. After 2–4 minutes you get a URL like `https://something.netlify.app`.
   You can rename it: **Project configuration → General → Change project name**.

**Test mode (while we build):** with `DEV_LOGIN_CODE=123456`, any phone number logs in with code
`123456`. No SMS is sent, and steps 3b, 3c and 4 are not needed yet. The login page shows a
"Test rejimi" note. **Before launch:** delete `DEV_LOGIN_CODE`, do steps 3b, 3c and 4, and delete the test
accounts (Supabase **Authentication → Users**).

Whenever you change an environment variable: **Deploys → Trigger deploy → Deploy project** so it takes effect.

---

## 3. Supabase Auth settings

### 3a. URLs

**Authentication → URL Configuration**:

- **Site URL:** your Netlify URL (later: `https://<your-domain>`).
- **Redirect URLs:** add all of these (use your real names):
  ```
  http://localhost:3000/**
  http://admin.localhost:3000/**
  https://something.netlify.app/**
  https://<your-domain>/**
  https://www.<your-domain>/**
  https://admin.<your-domain>/**
  ```

> While `DEV_LOGIN_CODE` is set you only need **3a** (and **3e** if you want to try Google now).
> Sections 3b, 3c and 4 are for launch, when real SMS codes are turned on.

### 3b. Phone login

**Authentication → Sign In / Providers → Phone** → turn **Enable Phone provider** on.
If it asks for an SMS provider, pick any (e.g. Twilio) and type placeholder values. Our SMS hook
(3c) replaces it. Set **SMS OTP Expiry** to `300` seconds and **SMS OTP Length** to `6`. Save.

**Test numbers (no real SMS, free):** on the same page, **Test Phone Numbers and OTPs**, add
`998901234567=123456`. Logging in with `90 123 45 67` and code `123456` then always works.

### 3c. SMS hook (sends the code through Eskiz)

**Authentication → Auth Hooks** (may be called just "Hooks") → **Add hook** → **Send SMS hook** →
type **HTTPS** →
- URL: `https://something.netlify.app/api/hooks/send-sms`
- Click **Generate secret** → copy it (looks like `v1,whsec_...`) → put it in Netlify as
  `SEND_SMS_HOOK_SECRET` → redeploy.
- Save / enable the hook.

Until Eskiz is ready, keep `SMS_PROVIDER=console`: the code is then written to the Netlify log
(**Logs → Functions**) instead of being sent. Handy for testing, but **never** leave it that way
with real students.

### 3d. Account linking

**Authentication → Sign In / Providers** → **User Signups** section → turn on
**Allow manual linking**. (Needed for "Google'ni bog'lash" / linking a phone in the profile.)
Keep **Confirm email** on.

### 3e. Google login

1. <https://console.cloud.google.com> → create a project (top bar → **New project**).
2. **APIs & Services → OAuth consent screen** (or **Google Auth Platform → Branding**) →
   External → app name, support email → add authorized domain `supabase.co` (later also your domain) → save.
3. **Clients** (or **Credentials → Create credentials → OAuth client ID**) → **Web application**:
   - Authorized JavaScript origins: `https://something.netlify.app`, `http://localhost:3000`
   - Authorized redirect URIs: `https://xxxx.supabase.co/auth/v1/callback`
     (Supabase shows this exact URL on its Google provider page)
4. Copy **Client ID** and **Client secret** → Supabase **Authentication → Sign In / Providers → Google** →
   enable → paste → Save.
5. In Google, **Audience / Publish app** → **In production**, so anyone can log in (not only test users).

### 3f. Apple and Facebook (later, optional)

Both buttons are hidden until you set `ENABLE_APPLE_LOGIN=true` / `ENABLE_FACEBOOK_LOGIN=true` in Netlify.

- **Apple** needs an Apple Developer account ($99/year): <https://developer.apple.com>. Follow
  <https://supabase.com/docs/guides/auth/social-login/auth-apple>, then enable **Apple** in Supabase.
- **Facebook**: <https://developers.facebook.com> → My Apps → Create app → "Authenticate and request
  data from users with Facebook Login". Valid OAuth redirect URI: `https://xxxx.supabase.co/auth/v1/callback`.
  The app needs a privacy policy URL and must be switched to **Live**. Then enable **Facebook** in Supabase.

**Why not Instagram?** Instagram's login for ordinary (personal) accounts was shut down by Meta in
December 2024 (Instagram Basic Display API). The remaining Instagram API works only for
Business/Creator accounts and is for managing a business's own posts, not for "log in with
Instagram". Supabase has no Instagram provider either. Facebook login (same company) is the substitute.

---

## 4. Eskiz.uz (real SMS)

1. Register at <https://my.eskiz.uz>, sign the contract, top up the balance.
2. **Submit the SMS template for approval.** Eskiz only delivers approved texts. Our text is
   (from `src/lib/i18n/uz.ts` → `sms.otp`):
   ```
   [PLATFORMA NOMI]: tasdiqlash kodi 123456. Kodni hech kimga bermang.
   ```
   Replace `[PLATFORMA NOMI]` with your real name **before** submitting, and keep the file and the
   template identical.
3. In Netlify set `SMS_PROVIDER=eskiz`, `ESKIZ_EMAIL`, `ESKIZ_PASSWORD` (your Eskiz login) and
   `ESKIZ_FROM` (sender, `4546` by default, or your approved sender name) → redeploy.

To use another SMS company later, add one file in `src/lib/sms/` (see `eskiz.ts`) and one line in
`src/lib/sms/index.ts`.

---

## 5. Make yourself admin

1. Log in on the website once (phone or Google).
2. Supabase **SQL Editor** → run (use your phone as digits, or your email):
   ```sql
   update public.profiles set role = 'admin' where phone = '998901234567';
   -- or: update public.profiles set role = 'admin' where email = 'you@gmail.com';
   ```
3. Open the admin panel (see step 6). Admins are not limited to 2 devices.

---

## 6. The admin subdomain

The same app answers on two hosts: every host that starts with `admin.` shows the admin panel;
all others show the student site (`/admin` there is a 404).

- **With your domain:** Netlify → **Domain management** → add `<your-domain>` and the alias
  `admin.<your-domain>`. Then at your `.uz` domain registrar's DNS page add:

  | Type | Name | Value |
  | --- | --- | --- |
  | A | `@` | `75.2.60.5` |
  | CNAME | `www` | `something.netlify.app` |
  | CNAME | `admin` | `something.netlify.app` |

  Netlify issues HTTPS certificates automatically (can take up to an hour after DNS changes).

- **Before you have a domain:** `netlify.app` addresses can't have an `admin.` part, so there is a
  second Netlify project built from the same repository and branch:
  **<https://myanalyticsplatform-admin.netlify.app>** (same env vars plus
  `ADMIN_HOSTNAMES=myanalyticsplatform-admin.netlify.app`). Every push updates both sites.
  Delete that project once `admin.<your-domain>` works.

- **Locally on Windows:** open <http://admin.localhost:3000>. Chrome, Edge and Firefox send
  `*.localhost` to your own computer automatically. No hosts-file changes needed.

---

## 7. Running on your own computer (optional)

1. Install **Node.js 22 LTS** from <https://nodejs.org> and **Git** from <https://git-scm.com>.
2. In PowerShell:
   ```powershell
   git clone https://github.com/UmidjonAnalytics/MyAnalyticsCourse.git   # downloads the code
   cd MyAnalyticsCourse                                                     # goes into the folder
   git checkout claude/affectionate-cori-zfh711                            # switches to the working branch
   npm install                                                              # installs libraries (~1 min)
   copy .env.example .env.local                                             # makes your private settings file
   notepad .env.local                                                       # fill in the values, save
   npm run dev                                                              # starts the site
   ```
3. Open <http://localhost:3000> (students) and <http://admin.localhost:3000> (admin).

Locally use test mode (`DEV_LOGIN_CODE=123456` in `.env.local`).

Other commands: `npm run build` (checks everything compiles), `npm run lint`, `npm run typecheck`.

---

## Environment variables

| Variable | Needed | What it is |
| --- | --- | --- |
| `NEXT_PUBLIC_BRAND_NAME` | at launch | Platform name everywhere (header, certificates, SMS). Redeploy after changing |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Publishable (anon) key, safe in the browser |
| `SUPABASE_SECRET_KEY` | yes | Secret (service role) key, server only |
| `DEV_LOGIN_CODE` | test only | Fixed login code for any phone; no SMS. Remove before launch |
| `SEND_SMS_HOOK_SECRET` | at launch | From Supabase Send SMS hook (`v1,whsec_...`) |
| `SMS_PROVIDER` | at launch | `eskiz` or `console` (testing) |
| `ESKIZ_EMAIL`, `ESKIZ_PASSWORD` | with Eskiz | Eskiz login |
| `ESKIZ_FROM` | no | Sender, default `4546` |
| `ENABLE_APPLE_LOGIN` | no | `true` shows the Apple button |
| `ENABLE_FACEBOOK_LOGIN` | no | `true` shows the Facebook button |
| `ADMIN_HOSTNAMES` | no | Extra admin hostnames, comma-separated |
| `PUBLIC_SITE_URL` | no | Student site address, for "Darsni ochish" links in the admin panel (not needed on `admin.<domain>`) |
| `ENABLE_TEST_PAYMENTS` | test only | `true` shows "Sinov to'lovi" at checkout. Remove before launch |
| `PAYME_MERCHANT_ID`, `PAYME_KEY` | for Payme | Cashbox ID and key (test key in sandbox) |
| `PAYME_TEST` | for Payme | `true` = sandbox (test.paycom.uz) |
| `PAYME_CARD_FORM` | no | `true` = on-site card form with SMS code (Subscribe API) |
| `PAYME_IKPU_CODE`, `PAYME_PACKAGE_CODE` | if required | Fiscal receipt codes |
| `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY` | for Click | From the Click cabinet |
| `DOMAIN`, `ACME_EMAIL` | VPS only | For `docker-compose.yml` + HTTPS |

Secrets live only in Netlify's settings or in `.env.local` (never committed to Git).

---

## How login and security work

- **Phone login:** the browser calls `/api/auth/otp/send` → Supabase creates a code → Supabase calls
  our `/api/hooks/send-sms` (signed; the signature is checked) → Eskiz sends the SMS. The code is
  checked by `/api/auth/otp/verify`. Limits: 1 SMS per 60 s and 5 per hour per number, 20 per hour
  per IP, 5 wrong codes per 15 minutes.
- **One account per person:** Supabase links the same verified email automatically (e.g. Google +
  Apple). A phone and a Google account are linked from the profile page. If a phone already belongs
  to another account, the student gets an Uzbek message explaining what to do.
- **A verified phone is required before the first purchase** (enforced in Phase 3 checkout).
- **Max 2 devices:** each login records the device (random id in an httpOnly cookie). A 3rd login
  logs out the oldest device; that device sees an Uzbek explanation. Students remove devices in the
  profile; admins can reset them (Phase 2 UI). To change the limit, edit `max_devices()` in
  `0002_functions.sql` (run the changed function in the SQL editor).
- **Row Level Security** is on for every table: students only see their own data; lesson video/text
  only with access; only server code (secret key) marks orders paid and grants access.

## Using the admin panel (short guide)

- **Kurslar:** create a course (the slug is filled from the title), set price, category, cover
  image and "E'lon qilingan". Drag rows by the dotted handle to change the catalog order
  (keyboard: Tab to the handle, Space, arrow keys, Space).
- **Modullar va darslar:** open a course → add modules → "Dars qo'shish" → the lesson editor opens:
  YouTube link (checked and previewed), lesson text and business task in Markdown with live preview,
  "Bepul ko'rish" (free preview) and "E'lon qilingan". New lessons start as drafts.
- **To'plamlar:** tick the courses, set the bundle price; "arzonroq narx" lets owners of some
  courses pay the bundle price minus the courses they already have.
- **Talabalar:** search by name/phone/email → open a student → give access to a course or bundle
  with a note ("Oldindan to'lagan"), cancel access, log them out of all devices, make admin.
- **Arxiv:** archived items are hidden from students. "Qaytarish" restores; "Butunlay o'chirish"
  asks twice and refuses content that someone bought or was given.
- **Jurnal:** the last 200 admin actions.
- **Datasetlar:** "Dataset yuklash" → pick a CSV (first row = column names). It is read and turned
  into Parquet **in your browser**, you see the columns and first 20 rows, then it is stored in the
  private `datasets` bucket. The "SQL dagi jadval nomi" (e.g. `sales`) is what students write in SQL.
- **Mashqlar:** open a lesson (Modullar va darslar → lesson) → "Mashq qo'shish". In the exercise:
  task text, points, tick the tables, write the **reference SQL** → "Namunani ishga tushirish" →
  "Kutilgan natija sifatida saqlash" (this result is the hidden answer key). Choose the check rules
  (column names, row count, all values with or without order, column totals) and write a hint for
  each. Tick "E'lon qilingan" and save.

## Practice: how SQL checking works

- The student's SQL runs **in their browser** (DuckDB-WASM, files in `public/duckdb`, prepared by
  `scripts/copy-duckdb.mjs` before every dev/build; the Parquet extension is downloaded once at build
  time and then served from our own site).
- Dataset files live in a **private** bucket. The browser gets a 2-minute signed link from
  `/api/datasets/<id>/url`, only if the student can open a lesson that uses the dataset.
- "Tekshirish" sends the result rows to `/api/exercises/<id>/check`. The server compares them with the
  stored expected result (never sent to the browser) and returns pass/fail per rule with hints.
  Every attempt is saved in `exercise_submissions` and shown under "Oldingi urinishlar".
- Sample data + demo course: `python scripts/generate_sample_datasets.py sample-datasets` then
  `SUPABASE_URL=... SUPABASE_SECRET_KEY=... python scripts/seed_practice.py sample-datasets`
  (needs `pip install duckdb`; safe to run again).
- Upgrading `@duckdb/duckdb-wasm`: update `version` in `src/lib/practice/duckdb-extensions.json`
  (the browser console warns if it does not match).

## Excel assignments and discussions

- **Excel topshiriq** (admin → lesson page → "Excel topshiriq qo'shish"): the student sees the workbook
  right in the lesson ("Amaliyot" tab) and types answers into input boxes under it.
  - Workbook: paste an OneDrive / Excel Online **embed code** (OneDrive → File → Share → Embed; tick
    "Let people type in cells" so students can work in it; their changes are not saved to your file),
    or a Google Sheets "Publish to web" link, **or** upload an `.xlsx` (up to 20 MB). Uploaded files
    live in the private `assignment-files` bucket and are shown through Microsoft's free Office viewer
    with a 3-hour signed link (read-only; tick "yuklab olishi mumkin" so students can download it).
  - Questions: number or text answers. Several correct answers = one per line. Numbers accept
    `1 250 000`, `1,250,000`, `12,5`, `so'm`; "Ruxsat etilgan farq" allows rounding. The correct
    answers stay on the server; the student sees right/wrong per question and your hint.
  - Every attempt is saved (`assignment_submissions`).
- **Muhokama** tab under each lesson: students who can open the lesson post questions, reply (one
  level), and delete their own. Admin replies show an "O'qituvchi" badge. Admin → "Muhokamalar" lists
  the latest 100 comments for moderation.
- Top bar on every lesson: breadcrumb, "Oldingi · 3 / 28 · Keyingi" (a lock if the next lesson
  needs a purchase). Lesson length ("Davomiyligi") is set in the lesson editor and shown in the path.

## Quizzes, materials, certificates, course page

- **Test (quiz)**: admin → lesson → "Test savollari". Multiple-choice (one or several correct
  answers), explanation per question, pass mark (default 70%). Put it on the last lesson of a module.
  Students get a "Test" tab; a lesson with a test is completed only by passing it. Before passing,
  students only see which questions are wrong (and explanations for the right ones); correct answers
  are revealed after they pass. Answer keys never leave the server.
- **Dars materiallari**: admin → lesson → upload files (up to 50 MB, private `lesson-resources`
  bucket, 3-hour download links) or add https links. Shown under the lesson text.
- **Sertifikat**: when every lesson is completed **and** every test passed, the student gets
  "Sertifikatni olish" (course page, last lesson, Mening kurslarim). The database function
  `issue_certificate` checks this itself, so it cannot be faked from the browser. The student's
  full name must be filled in the profile. The certificate lives at `/sertifikat/<code>` (public
  verification page), prints as one A4 landscape page ("PDF sifatida saqlash"), and has LinkedIn /
  Telegram share buttons. Admin → "Sertifikatlar" can revoke one (e.g. after a refund).
- **Kurs sahifasi**: admin → course → level, instructor, "Nimani o'rganasiz", "Kimlar uchun",
  "Talablar" (one per line). "Kursga kiradi" (lessons, length, tasks, tests, materials) is counted
  automatically. Admin → "O'qituvchilar" for the instructor card.
- **Sharhlar**: only students who own the course can rate it (1–5 stars + text), one review each,
  shown as "Ism F.". Admin → "Sharhlar" can hide one.

## Learning paths and portfolio projects

- **O'quv yo'llari** (admin → "O'quv yo'llari"): an ordered list of courses, e.g. Excel → Power BI →
  Python. Public pages `/yollar` and `/yol/<slug>` show the steps as a timeline with each student's
  progress, certificates and a "Davom etish" button. Link a bundle to show "Butun yo'lni sotib olish"
  with the price compared to buying separately.
- **Portfolio loyihalar** (admin → "Portfolio loyihalar"): a real business case attached to a course.
  - The **brief** is public (good for marketing); steps, files, checkpoint questions and submitting
    need the course.
  - Files reuse lesson materials; checkpoint questions reuse Excel assignments.
  - Students submit an https link (Drive, OneDrive, Power BI, Tableau Public, GitHub) and their key
    findings. You approve or return it with feedback on the project's admin page; a changed
    submission goes back to "Tekshirilmoqda" automatically. Students cannot approve themselves
    (checked in the database).
  - Approved work whose author allowed it appears under "Talabalar ishlari" (name shown as "Ism F.").
- Both appear on the home page, in the top menu, and projects on their course page.

## Public student profile (portfolio)

- Students turn it on in **Profil → "Ommaviy profil (portfolio)"**: username, short headline, city,
  about, LinkedIn / GitHub / website links. It is **off by default**.
- The page `/u/<username>` shows their certificates, approved public projects and skills (from the
  projects). It never shows phone number or email; the database function `public_profile` returns
  only these fields and only for profiles that are public.
- Certificate pages link to the owner's profile, and project showcases link authors' names, when
  the profile is public. Turning it off makes the page "not found" right away.

## Launch checklist

Admin → **"Ishga tushirish"** checks everything automatically (env settings, contacts, content) and
says what is left. The dashboard shows a red warning while test login or test payments are on.

- **Name**: **Data Expert** (`NEXT_PUBLIC_BRAND_NAME` in Vercel; change it there and Redeploy).
- **Domain: dataexpert.uz** — already added to the Vercel project (with `admin.dataexpert.uz`, and
  `www.dataexpert.uz` redirecting to the main address). At the .uz registrar set these DNS records:

  | Type | Name / Host | Value |
  | --- | --- | --- |
  | A | `@` (dataexpert.uz) | `76.76.21.21` |
  | CNAME | `admin` | `cname.vercel-dns.com` |
  | CNAME | `www` | `cname.vercel-dns.com` |

  When Vercel shows them as "Valid": set `PUBLIC_SITE_URL=https://dataexpert.uz` and
  `ADMIN_HOSTNAMES` can be cleared (any `admin.` host is the admin panel); in Supabase → Auth set
  Site URL to `https://dataexpert.uz` (the allow list already contains the new addresses).
- **Contacts + legal details**: admin → **"Sayt sozlamalari"** (company, STIR, address, phone, e-mail,
  Telegram, hours). They appear in the footer, on `/aloqa` and inside the legal texts.
- **Legal pages**: `/oferta`, `/maxfiylik`, `/qaytarish` — Uzbek draft texts, editable in "Sayt
  sozlamalari". Placeholders like `{{kompaniya}}` are filled from the contacts. **Have a lawyer check
  them.** Payme/Click ask for these pages and the contacts when approving a merchant. The checkout
  shows a consent line with links to all three.
- **Domain**: add `example.uz` and `admin.example.uz` in Vercel → Domains, set `PUBLIC_SITE_URL`
  (also used for the sitemap at `/sitemap.xml` and share previews), and update Supabase → Auth → URL
  configuration.
- **Turn off test mode**: remove `DEV_LOGIN_CODE` and `ENABLE_TEST_PAYMENTS` once real SMS and payments work.

## Payments (Payme, Click, Paynet)

How it works:

1. The student clicks "Sotib olish" → **checkout** (`/tolov/kurs/<slug>` or `/tolov/toplam/<slug>`):
   price, bundle upgrade discount, promo code, payment method. A **verified phone is required**.
2. We create an `order` (status `pending`) and send the browser to the provider's page.
3. The provider calls **our server** (webhook). Only that call marks the order `paid` and creates the
   enrollments (inside one database transaction). Coming back to `/tolov/natija/<order>` only
   *shows* the status; it never grants access.
4. Refunds: Payme `CancelTransaction` after payment, or the admin's "Qaytarish" button, mark the order
   `refunded` and revoke its courses. (Money itself is returned in the provider's cabinet.)

Every callback is stored in `payment_events` and shown on the admin order page.

### Test mode (now)

`ENABLE_TEST_PAYMENTS=true` adds "Sinov to'lovi (test rejimi)" at checkout: a fake payment page with
"To'lash (sinov)" / "Bekor qilish". No money moves. **Delete this variable before launch.**

### Payme

1. Get a merchant account at <https://merchant.payme.uz> (business contract). In the cashbox settings:
   - **Endpoint URL:** `https://<your-domain>/api/payments/payme`
   - Account field: `order_id`
2. Netlify environment variables: `PAYME_MERCHANT_ID` (cashbox ID), `PAYME_KEY` (the **test key** while
   testing, the real key later), `PAYME_TEST=true` while testing.
3. Sandbox: <https://test.paycom.uz> → enter the endpoint URL, merchant ID and test key → run all the
   sandbox scenarios (Payme checks error codes and repeated calls; the implementation follows them).
4. On-site card form with SMS code (optional): `PAYME_CARD_FORM=true`. Needs the **Subscribe API**
   enabled for your cashbox (ask Payme support). Card data goes from the browser straight to Payme.
5. Fiscal receipts (if Payme asks for "detail"/IKPU): `PAYME_IKPU_CODE` and `PAYME_PACKAGE_CODE`
   (educational services code from <https://tasnif.soliq.uz>).
6. Launch: remove `PAYME_TEST`, put the real `PAYME_KEY`.

### Click

1. Merchant account at <https://merchant.click.uz>. In the service settings:
   - **Prepare URL:** `https://<your-domain>/api/payments/click/prepare`
   - **Complete URL:** `https://<your-domain>/api/payments/click/complete`
2. Netlify: `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`.
3. Click's test tool (in the merchant cabinet) sends Prepare/Complete requests; signatures are checked.
4. On-site card form for Click: not built yet (Click's card-token API sends the card number through our
   server; we will decide together once you have Click credentials).

### Paynet

Shown as "Tez orada" at checkout. Send Claude the Paynet merchant documentation; the protocol is not
guessed.

### Uzum

Same as Paynet: listed as "Tez orada" at checkout until Uzum's merchant documentation (API and test
keys) arrives. The database already accepts `uzum` as a provider.

## Phases

- Phase 1, Foundation (done): setup, database, phone + Google login, linking, device limit, admin subdomain, Docker.
- Phase 2, Student experience + admin content (done): catalog with filters, course/bundle pages (upgrade
   price), My courses, lesson layout (collapsible path panel, profile panel, mobile drawers),
   YouTube + Markdown lessons, progress, locked lessons. Admin: courses, categories, modules and
   lessons (drag to reorder), bundles, publish toggles, archive/restore/permanent delete, students
   (grant/revoke access, reset devices, make admin), audit log.
- Phase 4, Practice (done, built before payments): datasets (CSV upload → Parquet, private storage),
   SQL exercises with reference answers and check rules, in-browser SQL editor (DuckDB-WASM),
   server-side checking with hints, submission history, sample "messy" retail data + demo SQL course.
- Phase 3, Payments (done, waiting for merchant credentials): orders, promo codes, checkout, Payme
  (hosted + on-site card form) and Click webhooks, Paynet slot, test mode, receipts, admin orders/refunds,
  promo codes, revenue dashboard.
- Lesson page upgrade (done): top Prev/Next bar, Tavsif / Amaliyot / Muhokama tabs, discussions,
  Excel assignments with answer boxes, lesson length.
- Learning + sales upgrade (done): quizzes, lesson materials, certificates with public verification,
  richer course page (outcomes, audience, requirements, level, instructor, "includes"), reviews.
- Paths + projects (done): learning paths with progress, portfolio projects with checkpoints,
  instructor review and a public showcase.
- Public profiles (done): opt-in portfolio page with certificates, projects and links.
- Launch preparation (in progress): launch checklist, contacts + legal pages, footer, checkout consent,
  sitemap, brand name setting. Waiting for: name, domain, Eskiz, Payme/Click keys, Paynet documents.
