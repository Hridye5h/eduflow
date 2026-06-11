# EduFlow

**AI-native, compliance-first school & coaching-center operations for India.** Multi-tenant SaaS where each institute gets an isolated portal — attendance, marks, fees, class wall, timetable — plus **guardrailed AI agents** that recover overdue fees and turn raw scores into parent-ready report cards, on WhatsApp.

**Live:** [web app](https://eduflow-ka75.vercel.app) · [API + Swagger](https://eduflow-api-7ywu.onrender.com/docs) — *(free-tier hosting; first request after idle cold-starts in ~30–60s.)*

Built for the Google **Build with Gemini** XPRIZE. Stack: NestJS 11 · Prisma 5 · PostgreSQL · Next.js 16 · React 19 · Tailwind v4 · Gemini 2.5 Flash.

---

## Why it's different — the trust architecture

Most school apps bolt "AI" on top of a single shared database. EduFlow is built the other way around: every guarantee a parent, principal, or regulator would ask for is enforced in code, not in a pitch deck.

| Guarantee | How it's enforced | In code |
|---|---|---|
| **Tenant isolation** | Postgres **Row-Level Security** with `FORCE ROW LEVEL SECURITY`. The app connects as a **non-`BYPASSRLS` role**, and every query runs inside a transaction that sets the `app.current_tenant_id` GUC from the request's JWT — so a forgotten `WHERE schoolId=…` can't leak across schools. A no-context query returns **zero rows** (fails closed). | [`prisma/rls.sql`](apps/api/prisma/rls.sql), [`prisma.service.ts`](apps/api/src/prisma/prisma.service.ts), [`tenant-context.ts`](apps/api/src/common/tenant-context.ts) |
| **AI never invents grades** | Scores are **deterministic compute** (`scoreSheet`). The LLM only *phrases* the narrative around numbers it is handed; a teacher approves before anything reaches a parent (**human-in-the-loop**). | [`grading/scoring.ts`](apps/api/src/grading/scoring.ts), [`grading.service.ts`](apps/api/src/grading/grading.service.ts) |
| **Provenance (IT Rules 2026)** | Every AI artefact is **sha-256 hashed into an append-only ledger** and carries a visible "AI-generated" watermark — O(1) reverse-lookup for takedown. | [`provenance.service.ts`](apps/api/src/provenance/provenance.service.ts) |
| **Verifiable consent (DPDPA)** | Parental consent is an **append-only state machine** that only a verifiable method (DigiLocker / phone-OTP) can move to GRANTED; paper is supplementary, never a verifier. AI report delivery is consent-gated. | [`consent/consent.service.ts`](apps/api/src/consent/consent.service.ts) |
| **Guardrailed collections** | Smart Dunning is a state machine with **quiet hours, frequency caps, stop-word handling, and HITL approval from stage 4** — it never auto-escalates to a lawyer-tone message. | [`dunning/dunning.service.ts`](apps/api/src/dunning/dunning.service.ts) |
| **Graceful AI degradation** | A model **router** (Gemini-first, Sarvam for Hinglish) with a **deterministic template fallback**, and Gemini "thinking" disabled for short generations so outputs aren't silently truncated. | [`llm/llm.service.ts`](apps/api/src/llm/llm.service.ts), [`llm/gemini.adapter.ts`](apps/api/src/llm/gemini.adapter.ts) |

> Cross-tenant isolation is proven by a test, not just asserted — see [`rls.spec.ts`](apps/api/src/prisma/rls.spec.ts).

---

## The AI agents (Gemini-powered)

- **Smart Dunning** — overdue fee → Gemini drafts a warm Hinglish WhatsApp reminder → provenance-stamped → delivered via a transactional outbox → Razorpay webhook closes the loop on payment. Quiet-hours + HITL guardrails throughout.
- **AI Test & Grading** — deterministic scoring → consent gate → Gemini phrases the parent note (numbers untouched) → teacher approves → sent.

Both degrade to deterministic templates when no API key is set, so the app runs end-to-end offline.

---

## Architecture

```mermaid
flowchart LR
  Web["Web · Next.js (Vercel)"] -- "JWT + x-school-subdomain" --> API["API · NestJS (Render)"]
  API -- "set app.current_tenant_id per query" --> DB[("PostgreSQL · RLS FORCE\nrole: eduflow_app (NOBYPASSRLS)")]
  API -- "router + template fallback" --> G["Gemini 2.5 Flash"]
  API -- "transactional outbox" --> WA["WhatsApp Cloud API"]
  API -- "HMAC-verified webhooks" --> RZ["Razorpay / Meta"]
```

The trust boundary is the database: the API holds **no privileged DB role**, so even a buggy query is contained by RLS.

---

## Modules

Attendance · Marks & printable report cards · Class wall (homework/notices/events) · Real-time chat · Timetable (conflict detection) · Assignments · Fees · Notifications · Reports & at-risk analytics · Admin (users/subjects/audit) — across four role portals (principal / teacher / student / parent).

---

## Local development

Requires **Node 20**, **pnpm 9**, and **PostgreSQL**. The setup mirrors production's two-role RLS design so isolation is genuinely exercised locally.

```bash
# 1. Postgres + a NON-bypass runtime role (fresh roles are NOSUPERUSER + NOBYPASSRLS)
createdb eduflow
psql eduflow -c "CREATE ROLE eduflow_app LOGIN PASSWORD 'app';"

# 2. apps/api/.env  (gitignored — never commit real secrets)
#   DATABASE_URL="postgresql://eduflow_app:app@127.0.0.1:5432/eduflow?schema=public"   # runtime → RLS enforced
#   DIRECT_URL="postgresql://postgres:<pw>@127.0.0.1:5432/eduflow?schema=public"        # migrations → owner
#   JWT_SECRET="dev-only"  ENABLE_TEST_HELPERS=true  REDIS_URL=""
#   (all provider keys optional — adapters degrade to templates/stubs)

# 3. schema → grants → RLS policies
pnpm install
pnpm --filter api exec prisma db push     # DDL via DIRECT_URL (owner)
psql eduflow -c "GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO eduflow_app; \
                 GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO eduflow_app;"
pnpm --filter api run db:rls              # applies prisma/rls.sql as owner

# 4. run
pnpm --filter api start:dev               # http://localhost:4001  (Swagger at /docs)
pnpm --filter web dev                     # http://localhost:3001
```

## Tests

```bash
pnpm --filter api exec jest               # offline suite (no network/keys needed)
```

Includes [`rls.spec.ts`](apps/api/src/prisma/rls.spec.ts) — the cross-tenant isolation proof, run under the non-bypass `eduflow_app` role — and [`scoring.spec.ts`](apps/api/src/grading/scoring.spec.ts) (deterministic grading). The `*.live-demo.spec.ts` files are opt-in (`RUN_LIVE_DEMO=1` + a real `GEMINI_API_KEY`).

## Deploy

See **[DEPLOY.md](DEPLOY.md)** — Render (API) + Neon (Postgres) + Vercel (web), with the RLS-enforced two-role setup.

## License

No license is set yet (`apps/api/package.json` marks it `UNLICENSED`). Until the author adds one, treat the code as **all rights reserved**.
