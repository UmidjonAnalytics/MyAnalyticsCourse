# [PLATFORMA NOMI]: Uzbek data analytics learning platform

A paid learning platform (Uzbek, Latin script) built with Next.js, Supabase, and Telegram login.

- **Stack:** Next.js 16 (App Router), TypeScript (strict), Tailwind CSS 4, Supabase (Postgres, Auth, RLS), zod, Lucide icons.
- **Student UI text:** everything is in `src/lib/i18n/uz.ts`. Edit wording there.
- **Status:** Phase 1 (foundation) is done. See "Phases" at the bottom.

---

## 1. One-time setup (accounts and keys)

You need three free accounts. None of them asks for a credit card.

### 1.1 Supabase (database and login)

1. Go to <https://supabase.com>, then **Start your project**, and sign in with GitHub.
2. Click **New project**. Name: anything (for example `platforma`). Set a strong **Database password** and save it somewhere safe. Region: **Central EU (Frankfurt)** is closest to Tashkent. Click **Create new project** and wait about 2 minutes.
3. Create the database tables. In the left menu, open **SQL Editor** and click **New query**. Then, for each file below **in this order**:
   open the file on GitHub, copy all of its text, paste it into the editor, and click **Run**. You should see "Success. No rows returned".
   1. `supabase/migrations/0001_tables.sql`
   2. `supabase/migrations/0002_functions.sql`
   3. `supabase/migrations/0003_rls.sql`
   4. `supabase/seed.sql` (sample course: 2 weeks, 4 lessons)

   Run each migration file **only once**. The seed file is safe to run again.
4. Copy your keys. Go to **Project Settings** (gear icon), then **API Keys**:
   - **Project URL**, for `NEXT_PUBLIC_SUPABASE_URL` (looks like `https://abcd.supabase.co`). It is also on the project's home page under **Connect**.
   - **Publishable key** (`sb_publishable_...`), or the legacy **anon** key, for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Secret key** (`sb_secret_...`), or the legacy **service_role** key, for `SUPABASE_SERVICE_ROLE_KEY`. **This is secret.** Never share it and never paste it into chats or code.

   Either kind of key works. Just don't mix them: use both new keys or both legacy keys.
5. Turn off public sign-ups: go to **Authentication**, then **Sign In / Providers**, switch off **Allow new users to sign up**, and save. Students still log in through Telegram, because our server creates their accounts.

### 1.2 Telegram bot (login button)

1. In Telegram, open **@BotFather** and send `/newbot`. Choose a name (for example "Platforma Login") and a username that ends in `bot` (for example `platforma_login_bot`).
2. BotFather sends you a **token** like `1234567890:AA...`. That is `TELEGRAM_BOT_TOKEN`, and **it is secret**.
3. The bot username without `@` is `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`.
4. After deploying (section 2), send `/setdomain` to BotFather, choose your bot, and send your site domain **without** `https://` (for example `platforma.netlify.app`).
   The Telegram button **only appears on that domain**. It does not work on `localhost`.

### 1.3 Your Telegram contact link

In `src/lib/i18n/uz.ts`, replace `https://t.me/USERNAME` (the `contactUrl` field) with your Telegram link.

---

## 2. Deploy (live URL)

**Recommended: Netlify.** Its free plan allows commercial sites. Vercel's free Hobby plan is for non-commercial use only.

1. Go to <https://app.netlify.com> and sign up with GitHub.
2. Click **Add new project**, then **Import an existing project**, then **GitHub**, and pick `MyAnalyticsCourse`.
3. Settings:
   - **Branch to deploy:** `claude/sleepy-edison-ns3sxx` (or `main` later, once merged)
   - **Base directory:** leave empty
   - Build command and publish directory are read from `netlify.toml`, so leave them as they are.
4. Click **Add environment variables** (or later: **Site configuration**, then **Environment variables**) and add:

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (secret) |
   | `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | bot username, without `@` |
   | `TELEGRAM_BOT_TOKEN` | bot token (secret) |
   | `NEXT_PUBLIC_SITE_URL` | your site address, for example `https://platforma.netlify.app` |

   Do **not** add `ALLOW_DEV_LOGIN` on Netlify.
5. Click **Deploy**. When it finishes, Netlify shows your URL. You can rename it under **Site configuration**, then **Change site name**.
6. Go back to BotFather and run `/setdomain` with that domain (section 1.2, step 4).
7. If you change environment variables later, go to **Deploys**, then **Trigger deploy**, then **Deploy site**.

---

## 3. Make yourself admin

1. Log in on the live site with Telegram once, so your profile is created.
2. In Supabase, open **SQL Editor**, click **New query**, paste this (use your own Telegram username, without `@`), and click **Run**:

   ```sql
   update public.profiles set role = 'admin' where username = 'your_telegram_username';
   ```
3. Reload the site and open `/admin`.

To give a student full access before the admin panel exists (Phase 2), run:

```sql
insert into public.enrollments (user_id, course_id, access_type, note)
select p.id, c.id, 'manual', 'Oldindan to''lagan'
from public.profiles p, public.courses c
where p.username = 'student_username' and c.slug = 'malumotlar-tahlili';
```

---

## 4. Run on your computer (optional)

Needs Node.js 20.9 or newer (<https://nodejs.org>, LTS version). In PowerShell:

```powershell
cd MyAnalyticsCourse
npm install
copy .env.example .env.local
notepad .env.local
npm run dev
```

In order, these commands: open the project folder, download the libraries, create your private settings file, open it so you can fill in the values, and start the site at <http://localhost:3000>.

Telegram login does not work on localhost. For local testing, put `ALLOW_DEV_LOGIN=true` in `.env.local`. A "Test foydalanuvchi" button then appears on the login page. It never works on the live site.

Before each release, `npm run build` must succeed. `npm run lint` and `npm run typecheck` should show no errors.

---

## 5. Environment variables

| Name | Where it is used | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser and server | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser and server (protected by RLS) | no |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (bypasses RLS) | **yes** |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | login button | no |
| `TELEGRAM_BOT_TOKEN` | server: checks Telegram login signatures | **yes** |
| `NEXT_PUBLIC_SITE_URL` | links | no |
| `ALLOW_DEV_LOGIN` | local test login (`true`); ignored in production | no |

Secrets live only in `.env.local` (git ignores it) and in Netlify's settings. `.env.example` lists the names with empty values.

---

## 6. How it works

### Login with Telegram (`src/app/api/auth/telegram/route.ts`, `src/lib/auth/`)
1. The Telegram widget gives the browser a signed object (id, name, username, photo, auth_date, hash).
2. The server re-computes the signature with the bot token (HMAC-SHA256) and rejects it if it does not match or is older than 24 hours.
3. The server finds or creates the Supabase user (internal address `tg<telegram_id>@telegram.local`, never emailed) and the `profiles` row, then starts a Supabase session (auth cookies).
4. The device is registered (see below).

### Device limit (max 2)
- Each browser gets a random `dv_id` cookie (httpOnly, one year).
- On login, `register_device_session()` saves the device (user agent, last seen). If there are now more than 2 active devices, the least recently used one is revoked **and its Supabase login is deleted**.
- On every page and API request, `src/proxy.ts` calls `touch_device_session()`. If this device was revoked, the user is signed out and sent to `/?sabab=device`, which shows an Uzbek explanation.
- Students see their devices and can log any of them out (Phase 1: on `/learn`; Phase 2: in the profile panel). Admin reset comes in Phase 2.

### Admin protection
Checked three times: in `src/proxy.ts`, in `src/app/admin/layout.tsx`, and in the database (RLS policies use `is_admin()`).

---

## 7. Database

Files: `supabase/migrations/0001_tables.sql`, `0002_functions.sql`, `0003_rls.sql`, and `supabase/seed.sql`. TypeScript types for these tables are in `src/lib/database.types.ts`. Update them when the schema changes.

**Changes from the original plan, and why:**

| Change | Why |
| --- | --- |
| Lesson video and text moved from `lessons` to a separate `lesson_content` table | RLS works per row, not per column. Now everyone logged in sees lesson titles (for the learning path), but only enrolled students, or anyone for free-preview lessons, can read the video and text. |
| Answer key (`reference_sql`, `expected_result`, `check_rules`, `hints`) moved from `exercises` to `exercise_keys` | Students have no policy on `exercise_keys`, so the answer key can never reach the browser. Hints are there too, so they are only sent for failed checks. |
| `device_sessions.auth_session_id` and `revoked_reason` added | Lets us actually end the Supabase login of a revoked device, and record why it was revoked. |
| `profiles.last_seen_at` added | For "last seen" in the admin student list. |
| `courses.position`, `updated_at` columns, `enrollments.revoked_by` added | Ordering, change tracking, and a record of who revoked access. |
| `datasets` readable by admins only | Students get data only through short-lived signed URLs from the server (Phase 3). |

**Security rules (RLS), enabled on every table:**
- Logged-out visitors cannot read any table.
- Students read published, non-archived courses, modules, and lessons. They read lesson content only for free-preview lessons or with an active enrollment.
- Students read and write only their own progress. They read their own profile, enrollments, devices, and submissions, and can edit their own name and phone but **never** their role (a trigger blocks it).
- Device sessions, submissions, and the audit log are written only by the server.
- Admins can do everything.

These rules were tested against Postgres 16: a student cannot promote themselves, cannot grant themselves access, and cannot see other students' data. Locked lesson content stays hidden, and a 3rd login revokes the oldest device.

---

## 8. Troubleshooting

| Problem | Fix |
| --- | --- |
| No Telegram button on the site | `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` is missing, or `/setdomain` was not set to this exact domain. Redeploy after changing environment variables. |
| "Bot domain invalid" inside the button | Run `/setdomain` in BotFather with the domain only (no `https://`, no `/` at the end). |
| "Kirish amalga oshmadi" after clicking Telegram | Netlify: go to **Logs**, then **Functions**, and look for `[telegram login]`. Usually a wrong `SUPABASE_SERVICE_ROLE_KEY` or `TELEGRAM_BOT_TOKEN`, or the SQL files were not run. |
| Page says an error occurred right after deploying | An environment variable is missing or misspelled. |

---

## Phases

- [x] **Phase 1: Foundation.** Project setup, design tokens and fonts, Supabase schema, RLS, and seed, Telegram login, profiles, proxy (auth, device check, admin check), device limit, landing, no-access, and 404 pages, deploy config.
- [ ] **Phase 2: Student experience and admin content.** Three-column lesson layout, progress, courses/modules/lessons CRUD, reordering, archive, students and access, audit log.
- [ ] **Phase 3: Practice.** Datasets, exercises, DuckDB-WASM SQL editor, server-side checking, dashboard stats.
- [ ] **Phase 4: Payments.** Payme and Click.
