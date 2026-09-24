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
| Database tables, security rules | `supabase/migrations/0001…0003*.sql` |
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
4. `supabase/seed.sql` (sample courses; optional, safe to run twice)

Check it worked: **Table Editor** → you should see `courses` with 3 rows.

> Run each migration only **once**. Running 0001–0003 a second time gives "already exists" errors
> (nothing breaks). New changes will always come as new numbered files (0004, 0005, ...).

### 1b. Copy the keys

**Project Settings** (gear icon) → **API Keys**:

- **Publishable key** (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Secret key** (`sb_secret_...`, click "Reveal") → `SUPABASE_SECRET_KEY`. **Never share this one.**

**Project Settings** → **Data API** → **Project URL** (`https://xxxx.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`.

(Older projects show "anon" and "service_role" keys instead. They work too: anon = publishable, service_role = secret.)

---

## 2. Deploy to Netlify (gives you a live URL)

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
   | `SMS_PROVIDER` | `console` for now, `eskiz` once Eskiz is set up (step 4) |
   | `SEND_SMS_HOOK_SECRET` | from step 3c (add it after you create the hook) |

5. Click **Deploy**. After 2–4 minutes you get a URL like `https://something.netlify.app`.
   You can rename it: **Project configuration → General → Change project name**.

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

- **Before you have a domain:** `netlify.app` addresses can't have an `admin.` part. Either test
  locally (below), or create a *second* Netlify project from the same repository (same env vars plus
  `ADMIN_HOSTNAMES=myplatform-admin.netlify.app`), named e.g. `myplatform-admin`.

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

Supabase can't call the SMS hook on your computer, so locally use a **test phone number** (3b).

Other commands: `npm run build` (checks everything compiles), `npm run lint`, `npm run typecheck`.

---

## Environment variables

| Variable | Needed | What it is |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Publishable (anon) key, safe in the browser |
| `SUPABASE_SECRET_KEY` | yes | Secret (service role) key, server only |
| `SEND_SMS_HOOK_SECRET` | yes | From Supabase Send SMS hook (`v1,whsec_...`) |
| `SMS_PROVIDER` | yes | `eskiz` or `console` (testing) |
| `ESKIZ_EMAIL`, `ESKIZ_PASSWORD` | with Eskiz | Eskiz login |
| `ESKIZ_FROM` | no | Sender, default `4546` |
| `ENABLE_APPLE_LOGIN` | no | `true` shows the Apple button |
| `ENABLE_FACEBOOK_LOGIN` | no | `true` shows the Facebook button |
| `ADMIN_HOSTNAMES` | no | Extra admin hostnames, comma-separated |
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

## Testing payments in sandbox

Comes in Phase 3 (Payme / Click / Paynet sandbox steps will be added here).

## Phases

1. Foundation (done): setup, database, phone + Google login, linking, device limit, admin subdomain, Docker.
2. Catalog, course/bundle pages, lesson layout with side panels, progress, admin content CRUD.
3. Payments: orders, promo codes, Payme / Click / Paynet, receipts, revenue dashboard.
4. Practice: datasets, SQL exercises (DuckDB in the browser), automatic checking.
