# Moving to your own server (Contabo VPS)

The app has no Netlify-specific code: it is a standard Next.js server. On a VPS it runs in Docker
behind **Caddy** (a web server that gets HTTPS certificates automatically). Supabase can stay where
it is; moving the database is a separate, optional step.

## Part A: move the app (about 1 hour)

### 1. Buy and prepare the server

1. Contabo → **Cloud VPS** (the smallest one with 4+ GB RAM is enough to start), image **Ubuntu 24.04**,
   region **Europe (Germany)**. Save the root password and the server IP.
2. On Windows, open PowerShell and connect (this logs you into the server):
   ```powershell
   ssh root@YOUR_SERVER_IP
   ```
3. On the server, install Docker (downloads and runs Docker's official installer):
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
4. Turn on the firewall, allowing only SSH and web traffic:
   ```bash
   ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
   ```

### 2. Get the code and settings onto the server

```bash
git clone https://github.com/UmidjonAnalytics/MyAnalyticsCourse.git app   # download the code
cd app
cp .env.example .env      # create the settings file
nano .env                 # fill in the same values as on Netlify, plus DOMAIN and ACME_EMAIL
```
(In nano: Ctrl+O, Enter saves; Ctrl+X exits.)

### 3. Point the domain to the server

At your domain's DNS settings replace the Netlify records with:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `YOUR_SERVER_IP` |
| A | `www` | `YOUR_SERVER_IP` |
| A | `admin` | `YOUR_SERVER_IP` |

Wait until `ping <your-domain>` shows the new IP (minutes to a few hours).

### 4. Start

```bash
docker compose up -d --build     # builds the app image and starts app + Caddy in the background
docker compose logs -f           # shows live logs (Ctrl+C to stop watching)
```

Caddy fetches HTTPS certificates for `<domain>`, `www.<domain>` (redirects to the root) and
`admin.<domain>` on the first visit.

### 5. After moving

- Supabase **Authentication → Hooks**: change the Send SMS hook URL to `https://<domain>/api/hooks/send-sms`.
- Payment providers (Phase 3): update callback URLs to the new domain if they changed.
- Updating to a new version later:
  ```bash
  cd app && git pull && docker compose up -d --build
  ```
- Delete the Netlify project only after everything works on the VPS.

## Part B (optional): move the database off Supabase

Only worth it when the Supabase bill becomes large. Two options:

1. **Self-hosted Supabase** (same features, same code, no app changes): follow
   <https://supabase.com/docs/guides/self-hosting/docker>. It runs as several Docker containers
   (Postgres, Auth, REST API, Storage, Studio). Needs a bigger server (8+ GB RAM).
2. **Plain Postgres**: cheapest, but Supabase Auth, Storage and the REST API would have to be
   replaced in the code (a larger project; do it together with the developer).

### Moving the data (either option)

1. Supabase dashboard → **Project Settings → Database → Connection string** (use the "Session pooler" URI).
2. On the server, export everything (users, courses, orders):
   ```bash
   docker run --rm -v "$PWD:/out" postgres:17 pg_dump "SUPABASE_CONNECTION_STRING" \
     --no-owner --no-privileges --schema=public --schema=auth --schema=storage -f /out/backup.sql
   ```
3. Import into the new database with `psql -f backup.sql`, point `NEXT_PUBLIC_SUPABASE_URL` and the
   keys to the new Supabase, rebuild (`docker compose up -d --build`).
4. Storage files (course covers, datasets) are copied separately with the Supabase CLI or the
   Storage API.

**Always** do a test run on a copy first and keep the old project for a few weeks.
