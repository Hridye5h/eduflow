# Deploying EduFlow

Three pieces: **GitHub** (source), **Render** (API + Postgres), **Vercel** (web). Mobile builds locally via Expo.

> 📋 **Cloud-only workflow (no local install).** This guide is written for the case where you can't run `pnpm install` locally. You push to GitHub, CI proves the build & tests pass, then Render + Vercel deploy from the same commit. See [§ 8](#8-cloud-only-workflow-no-local-install) for what to watch out for.

---

## 0. What you need to sign up for

| Service | Why | Free tier |
|---|---|---|
| GitHub | Source of truth | Free |
| Render | API + Postgres | Free (services sleep after 15 min idle) |
| Vercel | Next.js frontend | Free hobby |
| **Email provider** (pick one) | OTP, marks-published, absence alerts | All have free tiers |
| Cloudinary | File uploads (feed/assignments) | 25 GB free |

### Email — pick exactly one and get these values

Whichever you pick, you'll end up with `SMTP_HOST / PORT / USER / PASS / FROM`. They drop straight into Render env vars.

| Provider | Sign-up steps | SMTP credentials |
|---|---|---|
| **Resend** (easiest) | 1. Sign up at resend.com<br>2. Verify your email<br>3. *(optional)* Add and verify a domain — without one you can only send to your own email<br>4. Settings → API Keys → create | `HOST=smtp.resend.com` · `PORT=587` · `USER=resend` · `PASS=<api_key>` |
| **Gmail** | 1. Enable 2-Step Verification on your Google account<br>2. https://myaccount.google.com/apppasswords → create app password<br>3. Use that 16-char password as SMTP_PASS | `HOST=smtp.gmail.com` · `PORT=587` · `USER=you@gmail.com` · `PASS=<16-char app password>` |
| **SendGrid** | 1. Sign up at sendgrid.com<br>2. Verify a Single Sender (no domain needed)<br>3. Settings → API Keys → Full Access | `HOST=smtp.sendgrid.net` · `PORT=587` · `USER=apikey` (literal word) · `PASS=<api_key>` |
| **Brevo** | 1. Sign up at brevo.com<br>2. SMTP & API → SMTP → generate key | `HOST=smtp-relay.brevo.com` · `PORT=587` · `USER=<login email>` · `PASS=<smtp_key>` |

`SMTP_FROM` should be something like `EduFlow <noreply@yourdomain.com>` — must be from a verified sender/domain or the email will bounce.

### Cloudinary (file uploads)

1. Sign up at cloudinary.com (free).
2. Dashboard shows `Cloud name`, `API Key`, `API Secret`. Copy all three.

### SMS (optional, can skip for pilot)

For the pilot, the OTP flow uses email for both staff and parents. SMS path exists in code but only `console.log`s the code. If you want real SMS later, drop in Twilio or MSG91 in [auth.service.ts](apps/api/src/auth/auth.service.ts) where it currently logs the SMS OTP.

---

## 1. Push to GitHub

```bash
cd d:\Downloads\eduflow
git init
git add .
git commit -m "Initial: EduFlow pilot scaffold"
git branch -M main
git remote add origin https://github.com/<you>/eduflow.git
git push -u origin main
```

> **Important** — before pushing, double-check `.env` files are git-ignored (they are, per [.gitignore](.gitignore)). Never commit real SMTP / Cloudinary / JWT secrets.

---

## 2. Deploy the API to Render

### Easiest — use the Blueprint

1. Render dashboard → **New +** → **Blueprint**.
2. Connect GitHub, pick the `eduflow` repo.
3. Render reads [render.yaml](render.yaml) and provisions:
   - A free Postgres DB (`eduflow-db`)
   - The API web service (`eduflow-api`)
4. After it boots, open the service → **Environment** and fill in (these have `sync: false` in the blueprint, meaning Render won't auto-populate them):
   ```
   CORS_ORIGINS = https://<your-vercel-app>.vercel.app
   SMTP_HOST    = smtp.resend.com    # or whichever you picked
   SMTP_PORT    = 587
   SMTP_USER    = resend
   SMTP_PASS    = <api key>
   SMTP_FROM    = EduFlow <noreply@yourdomain.com>
   CLOUDINARY_CLOUD_NAME = …
   CLOUDINARY_API_KEY    = …
   CLOUDINARY_API_SECRET = …
   ```
5. Trigger a **Manual Deploy** so the env vars apply. The build runs `prisma migrate deploy`, so the DB schema will be created automatically.
6. Once green, your API is at `https://eduflow-api.onrender.com`. Visit `https://eduflow-api.onrender.com/docs` only if you set `ENABLE_SWAGGER=true`.

> ⚠️ **Never set `ENABLE_TEST_HELPERS=true` on Render.** That flag mounts `/_test/last-otp` which returns plaintext OTPs and exists only for CI and local dev.

> **Free tier caveat**: Render free web services sleep after 15 min of inactivity. First request after sleep takes 30–60 s. Upgrade to Starter ($7/mo) for always-on.

---

## 3. Deploy the web to Vercel

1. Vercel dashboard → **Add New** → **Project** → pick the same GitHub repo.
2. **Root directory**: `apps/web`
3. **Framework preset**: Next.js (auto-detected)
4. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_BASE = https://eduflow-api.onrender.com
   NEXT_PUBLIC_ROOT_DOMAIN = eduflow.app   # only matters if you have a custom domain
   ```
5. Deploy. Your URL will be `https://eduflow-<hash>.vercel.app`.
6. Go back to Render and add that URL to `CORS_ORIGINS`. (The API already auto-allows any `*.vercel.app` host, but exact-match is cleaner.)

---

## 4. Custom domain & subdomain multi-tenancy (optional)

The app supports `springfield.eduflow.app` style isolation, but it needs DNS work:

- Buy `eduflow.app` (or any domain).
- In Vercel: add domain `eduflow.app` AND a wildcard `*.eduflow.app`. Both must point to your project.
- Vercel auto-issues wildcard SSL.
- Set `NEXT_PUBLIC_ROOT_DOMAIN=eduflow.app` on Vercel.
- The middleware in [apps/web/src/middleware.ts](apps/web/src/middleware.ts) extracts the subdomain and forwards it to the API.

**Without a custom domain**: the pilot still works. The web stores the school's subdomain in localStorage at login and sends it via header — same effect, just less elegant URLs.

---

## 5. Mobile (Expo + EAS)

Mobile is not deployed to Render/Vercel. Three ways to run it, in order of effort:

### Option A — Local with Expo Go (fastest)

```powershell
cd apps/mobile
pnpm install
$env:EXPO_PUBLIC_API_BASE = "https://eduflow-api.onrender.com"
pnpm start
```

Scan the QR with Expo Go on your phone. Both phone and laptop need to be on the same network.

### Option B — Build an Android APK with EAS (recommended for pilot)

EAS Build runs in Expo's cloud and gives you a downloadable `.apk` you can sideload onto Android. Free tier gives ~30 builds/month.

**One-time setup:**

1. Create an Expo account at https://expo.dev (free).
2. Install the CLI globally:
   ```powershell
   npm install -g eas-cli
   eas login
   ```
3. From the mobile app dir, link this project to your Expo account:
   ```powershell
   cd apps/mobile
   eas init
   ```
   This will:
   - Ask which Expo account/org to use → pick your account
   - Create a project in Expo's dashboard
   - **Update [apps/mobile/app.json](apps/mobile/app.json) automatically** with the real `projectId`, `owner`, and `updates.url` (replacing the `REPLACE_AFTER_EAS_INIT` placeholders)
   - Commit those changes to git when you're ready

4. Open [apps/mobile/eas.json](apps/mobile/eas.json) and confirm `EXPO_PUBLIC_API_BASE` under each profile points at your Render URL.

**Build the APK:**

```powershell
cd apps/mobile
pnpm build:android        # uses the "preview" profile → APK
# OR
eas build -p android --profile preview
```

EAS uploads your code, builds in the cloud (~5–15 min), and gives you a download link. Sideload the APK on the principal's / teachers' / pilot parents' phones.

### Option C — Play Store release

```powershell
pnpm build:android:prod   # uses the "production" profile → AAB
eas submit -p android --latest
```

You'll need a Google Play Console developer account ($25 one-time).

### Why the placeholders matter

[apps/mobile/app.json](apps/mobile/app.json) ships with `REPLACE_AFTER_EAS_INIT` strings in three places. `eas init` overwrites all of them. **Do not run a build before running `eas init`** — it will fail because the project isn't linked yet.

### iOS (optional)

Same flow with `-p ios`. You'll need an Apple Developer account ($99/yr) and either macOS for local builds or EAS cloud builds. Skip until pilot is proven.

---

## 6. Sanity-check after deploy

```bash
# 1. Register a school (the API is the source of truth)
curl -X POST https://eduflow-api.onrender.com/auth/register-school \
  -H 'Content-Type: application/json' \
  -d '{
    "schoolName": "Pilot School",
    "subdomain": "pilot",
    "adminName": "Principal",
    "adminEmail": "you@yourdomain.com",
    "adminPassword": "ChangeMe123!"
  }'

# 2. Open Vercel URL, sign in with email/password above. You should land on /dashboard.
```

If sign-in fails with CORS error → fix `CORS_ORIGINS` on Render.
If "Unknown school" → the subdomain header isn't reaching the API; check that `NEXT_PUBLIC_API_BASE` is set on Vercel.

---

## 7. CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs:
- API e2e tests against an ephemeral Postgres in CI (with `ENABLE_TEST_HELPERS=true` so OTP flows can be verified end-to-end)
- `next build` for the web

Pushes to `main` trigger both. Failures block merges if you enable branch protection.

The full OTP loop is exercised in [apps/api/test/auth.e2e-spec.ts](apps/api/test/auth.e2e-spec.ts):
request → fetch plaintext via `/_test/last-otp` → verify → confirm token issued → confirm the code can't be reused.

---

## 8. Cloud-only workflow (no local install)

If you can't `pnpm install` locally, your safety net is the CI workflow. Treat **every green CI run as proof** that the build, schema, and core flows work.

### Deploy order (matters)

1. **Push to GitHub first.** This kicks off [CI](.github/workflows/ci.yml) — it spins up an ephemeral Postgres, runs `prisma db push`, runs all e2e tests. If CI fails, **don't deploy yet** — fix and re-push.
2. **Deploy API to Render** via the Blueprint. The build does this in order:
   1. Install pnpm via corepack (so we don't depend on a global)
   2. `pnpm install --no-frozen-lockfile` (generates `pnpm-lock.yaml` in Render's filesystem)
   3. `prisma generate` (builds the typed client)
   4. `prisma db push --accept-data-loss` (creates schema; safe on empty DB)
   5. `pnpm build` (compiles NestJS)
3. **Wait for Render's health check to go green** at `/health`. Until it does, the Vercel app will have nothing to talk to.
4. **Deploy Vercel** with `NEXT_PUBLIC_API_BASE` pointing at the Render URL. Set this env var **before** the first build, not after.

### Why we use `prisma db push` instead of `prisma migrate deploy`

`migrate deploy` only applies committed migration files in `apps/api/prisma/migrations/`. We don't have any — generating them needs a local Prisma install. `db push` reads `schema.prisma` directly and syncs the DB. For a pilot on a fresh DB this is identical in effect. Once you have real pilot data and want a structured schema-change history, run `prisma migrate dev --name initial` locally (when you have disk space again) to bootstrap the migration folder.

### Post-deploy smoke test (no local tools needed)

You can do all of this from any browser + the Render shell tab.

#### 1. API is up

Open `https://eduflow-api.onrender.com/health` in a browser. You should see:
```json
{"status":"ok","db":"ok","uptime":42,"now":"..."}
```
`db:"down"` means `DATABASE_URL` is wrong or Postgres isn't reachable.

#### 2. Register the pilot school

In Render dashboard → your API service → **Shell** tab, paste:
```sh
curl -X POST http://localhost:10000/auth/register-school \
  -H 'Content-Type: application/json' \
  -d '{
    "schoolName": "Pilot School",
    "subdomain": "pilot",
    "adminName": "Principal",
    "adminEmail": "you@yourdomain.com",
    "adminPassword": "ChangeMe123!"
  }'
```
You should get back `{ "school": {...}, "accessToken": "..." }`.

#### 3. Confirm web → API connection

Open your Vercel URL. The `/login` page should load (no fonts/styles missing). Sign in with the credentials above. If you land on `/dashboard`, the whole stack is wired.

### What can still go wrong (and what the error looks like)

| Symptom | Most likely cause | Fix |
|---|---|---|
| Render build fails: `bcrypt` native build error | Rare on Linux but possible on Alpine images | Swap `bcrypt` → `bcryptjs` in [apps/api/package.json](apps/api/package.json) and update import in [common/hash.ts](apps/api/src/common/hash.ts). One-line change, no API impact. |
| `/health` returns `db:"down"` | `DATABASE_URL` env var missing or wrong | Check Render → your service → Environment. The Blueprint should auto-inject it from the DB. If not, copy the External Database URL into the var. |
| Web login → `CORS error: ...` | Render's `CORS_ORIGINS` doesn't include your Vercel URL | Add the Vercel URL (incl. `https://`) to `CORS_ORIGINS` on Render → Manual deploy. The code also auto-allows any `*.vercel.app` host, but `CORS_ORIGINS` is checked first. |
| Web login → 401 *Unknown school* | The browser isn't sending `x-school-subdomain` | Verify your `NEXT_PUBLIC_API_BASE` on Vercel is set correctly and includes the protocol. The header is set automatically from `localStorage` after registration. |
| OTP emails never arrive | SMTP env vars missing on Render | Check Render logs for `SMTP not configured — emails will be logged, not sent.` Fix env vars and redeploy. Use Resend's "Logs" page to confirm delivery attempts. |
| File upload returns 400 *File storage not configured* | Cloudinary env vars missing | Set the three `CLOUDINARY_*` vars on Render. Redeploy. |
| Vercel build fails with `Cannot find module '@prisma/client'` | Web tries to import from the api workspace at build time | Shouldn't happen with current code — the web has its own deps. If it does, add the api workspace to `transpilePackages` in `next.config.ts` or vendor the type. |
| `/_test/last-otp` accessible in production | You set `ENABLE_TEST_HELPERS=true` on Render by accident | Set it to `false` immediately. Revoke the JWT secret (Render → Environment → rotate `JWT_SECRET`) — anyone could have grabbed OTPs. |

### Iterating without local install

For small fixes you can edit files directly in GitHub's web UI → commit → push. CI runs, deploys auto-trigger. Slow loop (~5–10 min per cycle) but works.

For bigger work, consider a free dev environment in the cloud:
- **GitHub Codespaces** — 60 free hours/month, full VS Code in browser with the repo cloned and `pnpm install` already runnable.
- **Gitpod** — 50 free hours/month, similar.
- **Replit** — free tier, less polished for monorepos.

Any of these gives you the disk space + tooling to run `pnpm install`, `pnpm dev`, and the test suite without committing to GitHub each iteration.

### Going to production checklist (later, when pilot is proven)

- [ ] Switch from `prisma db push` to real migrations (`prisma migrate dev --name initial` locally → commit → change render.yaml build command to `prisma migrate deploy`)
- [ ] Upgrade Render free → Starter ($7/mo) so the API doesn't sleep
- [ ] Buy a domain and wire wildcard DNS (`*.eduflow.app` → Vercel)
- [ ] Set `ENABLE_SWAGGER=false` on Render (already the default in `render.yaml`)
- [ ] Rotate `JWT_SECRET` on first real users (Render generates a fresh one if you delete the env var and redeploy)
- [ ] Move SMTP off a personal Gmail (low daily quota) to Resend / SendGrid with a verified domain
- [ ] Enable branch protection on `main`: require CI green before merging
- [ ] Backup strategy: Render free Postgres has no automated backups — schedule `pg_dump` weekly via a cron job or upgrade to Starter for daily snapshots
