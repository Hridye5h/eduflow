# EduFlow — Documentation

EduFlow is a compliance-native, agent-augmented operating system for Indian
coaching centers (multi-tenant SaaS on NestJS + Prisma + PostgreSQL + Next.js +
Expo).

## Documents

| Doc | What it is |
| --- | --- |
| [EduFlow-Architecture-Plan.md](./EduFlow-Architecture-Plan.md) · [PDF](./EduFlow-Architecture-Plan.pdf) | **v1.2** — the full software architecture plan (12 sections): multi-tenancy/RLS, agent orchestration, model layer, integrations, DPDPA/IT-Rules compliance, deployment, observability, build sequence, risk register. Reconciled against external Gemini review. |
| [EduFlow-Business-Plan.md](./EduFlow-Business-Plan.md) · [PDF](./EduFlow-Business-Plan.pdf) | Business + product plan: market, positioning, pricing, unit economics, XPRIZE submission strategy, 90-day plan. |
| [../apps/api/docs/RLS.md](../apps/api/docs/RLS.md) | Row-Level Security: the tenant-isolation pattern, the no-transaction-during-network rule, and the module cutover guide. |

## What's built (backend, `apps/api/src/`)

- **RLS multi-tenancy spine** — `set_config`-per-op tenant client, `FORCE ROW
  LEVEL SECURITY`, fails-closed, cross-tenant leak test.
- **DPDPA** — verifiable parental-consent state machine (`consent/`) + AI
  provenance ledger (`provenance/`, IT Rules 2026 watermark/takedown).
- **WhatsApp** — Cloud API webhook + transactional outbox (`whatsapp/`, BullMQ,
  idempotent dispatch, swappable sender port).
- **Smart Dunning** — 5-stage fee-recovery state machine (`dunning/`) with
  quiet-hours, frequency-cap, stop-word, and HITL guardrails.

See the architecture plan for the full picture and the roadmap.
