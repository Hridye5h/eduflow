# EduFlow

## A Compliance-Native, Agent-Augmented Operating System for Indian Coaching Centers

**Version 1.0 — May 2026**
**Authors: IIIT Allahabad Founding Team**
**Submission target: Google XPRIZE — Build with Gemini (Aug 17, 2026)**

---

## Table of Contents

1. Executive Summary
2. Problem Statement & Market Context
3. Product Positioning & Wedge
4. System Architecture
5. AI Agent Specifications
6. Data Model & Multi-Tenancy
7. DPDPA + IT Rules 2026 Compliance Architecture
8. Indic Language Stack
9. Observability & Evaluation
10. Implementation Plan (90-day shipping)
11. Team Allocation & Operating Model
12. Unit Economics
13. XPRIZE Submission Strategy
14. Risk Register
15. Open Questions for Peer Review
16. Research Bibliography

---

# 1. Executive Summary

EduFlow is a **multi-tenant SaaS operating system for Indian coaching centers (10–500 students)** that bundles fee collection, attendance, exams, parent communication, and — critically — **regulatory compliance** (Rajasthan Coaching Act 2025, Central MoE 2024, CCPA, DPDPA 2023, IT Rules 2026).

The product is **agent-augmented**: four production LLM agents (Onboarding, Test Report, Fee Collection / Smart Dunning, Compliance Watch) handle high-leverage operational work. Most flows are deterministic workflows per Anthropic's December 2024 taxonomy; only open-ended parent/student interactions use autonomous-agent loops.

**The wedge is compliance.** Competitors (Classplus, Teachmint, Proctur) sell commodity LMS+CRM at ₹8K–50K/year. None ship Rajasthan-Act-ready registration tracking, refund pro-rata enforcement, CCPA-safe ad lint, or DPDPA verifiable parental consent. With the CCPA already imposing ₹1.39 Cr in penalties on 31 coaching institutes (PIB Nov 2024) and Rajasthan's ₹2–5 lakh per-violation regime live since September 2025, this is a defensible, recurring, insurance-style sale.

**Pricing**: ₹999 / ₹2,499 / ₹4,999 per month (Starter / Pro / Compliance+), targeting ₹50L–1 Cr ARR ceiling over 24 months.

**Bootstrap stance**: ₹5L of family/student capital, no VC, founders self-allocate full-time, AI COGS funded by Sarvam + Anthropic startup-program credits in year 1.

This document combines findings from five parallel research streams (educational AI agents, multi-tenant SaaS + LangGraph orchestration, Indian AI vendors, DPDPA/regulatory, real coaching-center operations) into a single, peer-reviewable architecture and execution plan.

---

# 2. Problem Statement & Market Context

## 2.1 Market size and segmentation

- **Total Indian coaching market**: USD 7.2B in 2025 → USD 17.8B by 2034, 10.29% CAGR (IMARC).
- **NSS 2025 data**: 27% of all Indian students take private coaching (30.7% urban, 25.5% rural). Urban higher-secondary spend is ₹9,950/student/year.
- **Target segment**: small/mid coaching centers (10–500 students) in tier-2/3 cities (Prayagraj, Agra, Kota, Lucknow, Jaipur, Bhopal, Indore, Patna, Ranchi, Bhubaneswar).
- **Estimated SAM**: ~120,000–180,000 such centers nationally; capture target = 1,000 paying customers within 24 months (~0.6% penetration).

## 2.2 The day-in-the-life of a coaching owner

A 100–300 student coaching owner works ~12 hours/day. Time allocation:

| Activity | Hours/day |
| --- | --- |
| Teaching | 3–4 |
| Fee chasing & parent calls | 2–3 |
| Scheduling, substitutes, faculty issues | 2 |
| Test/material prep | 1 |
| Walk-ins, inquiries, conversion | 1 |
| Admin (spreadsheets, registers) | 1 |

Industry workflow vendors estimate ~2 days/week reclaimable through automation of fees, attendance, and parent comms.

## 2.3 Real pain points (ranked by willingness-to-pay)

| Rank | Pain | Quantified loss | WTP/month |
| --- | --- | --- | --- |
| 1 | Late / leaking fee collection | 20–40% of fees >30 days late at baseline; ₹30K–1L locked at any time on a 200-student center | ₹1,500–3,000 |
| 2 | Compliance / inspector / refund risk | ₹2 lakh per Rajasthan violation, ₹50 lakh per CCPA misleading-ad notice | ₹2,000–5,000 |
| 3 | Faculty churn → student loss | 25% sector attrition; FIITJEE-style mass exits can wipe out a batch | ₹1,500–3,000 |
| 4 | Slow inquiry response (lost enrollments) | 5-minute response = 21× conversion lift (Reshape) | ₹1,500–2,500 |
| 5 | Student dropout / parent anxiety | 5% retention gain on 200 students = ₹1L+/month | ₹1,000–2,000 |

**Total wallet for a 200-student tier-2 center: ₹6,000–15,000 / month** — 3–5× commodity ERP price because the features pay for themselves in measurable rupees.

## 2.4 Why this market is hard

- **Meta WhatsApp Business AI launched in India on May 7, 2026** — free, multilingual, with UPI payments coming. It commoditizes generic FAQ chat, lead capture, appointment booking. Any coaching SaaS whose wedge is "AI-powered WhatsApp reminders" is dead on arrival.
- **Classplus pivoted away from B2B SaaS** to test-prep content (Testbook acquisition) because pure-SaaS unit economics didn't hold (Inc42).
- **Indian edtech funding hit an 8-year low** (–56% YoY to $249M in 2025) — no VC route for another B2B coaching SaaS.
- **Teachmint cut headcount 662 → 187** and still couldn't crack profitable scale.

The viable path threads the needle: bootstrap, ₹999–4,999/month, compliance-led wedge, founder-led Hindi GTM, integrate **alongside** WhatsApp Business AI rather than competing with it.

## 2.5 Compliance landscape (this is the wedge)

| Regulation | Effect | Penalty |
| --- | --- | --- |
| **Rajasthan Coaching Centres Act 2025** (Sep 2025) | Registration mandate for 100+ student centers, 1 sqm/student, max 5 hrs/day, ≥4-instalment fees, 10-day pro-rata refund, mental-health counsellor, no misleading ads | ₹2L / ₹5L / cancellation |
| **MoE Central Guidelines 2024** | No enrolment <16, tutor must be graduate, no guarantee-rank ads, refund-policy disclosure | State-enforced |
| **CCPA Coaching Sector Guidelines 2024** | No-refund clauses per-se invalid; selection-claim must have evidence; banned terms list | ₹10L–50L per offence; ₹1.39 Cr collected on 31 institutes already (PIB) |
| **DPDPA 2023 + Rules (notified Nov 2025, enforcement May 2027)** | Verifiable parental consent for all <18 students (no COPPA-style 13/16 carve-out); 90-day rights SLA; 72-hour breach notification | ₹250 Cr (security safeguards), ₹200 Cr (child data), ₹50 Cr (catch-all) |
| **IT Rules 2026** (Feb 10 2026) | All AI-generated content must carry visible watermark + tamper-resistant provenance; 3-hour takedown SLA | Intermediary liability |

A coaching SaaS that ships these as features is a non-bypassable insurance product.

---

# 3. Product Positioning & Wedge

## 3.1 One-line positioning

**"The compliance-native operating system for Indian coaching centers. Classplus gives you an app. EduFlow runs your coaching — and keeps you out of court."**

## 3.2 What we build, what we don't

**Build (core 5 modules):**

1. **Smart Dunning Engine** — fee collection automation with behavioural-econ-tuned cadences, WhatsApp utility templates, UPI deep links.
2. **AI Test & Grading** — curriculum-tagged question bank, one-click shuffled PDFs, OMR + handwritten Devanagari grading, chapter-wise analytics.
3. **ComplyShield** — Rajasthan/UP/Karnataka/Bihar/Central rules engine, registration filings, refund calculator, ad-copy lint, inspector-ready PDF pack.
4. **Faculty & Batch Margin Analytics** — per-batch revenue attribution, faculty cost, gross margin per teacher, student rating, retention forecast.
5. **Inquiry CRM + Parent Digest** — 60-second auto-greet on WhatsApp leads, demo scheduler, referral attribution; weekly auto-digest to parents with attendance + test scores + one small-win highlight.

**Don't build (commoditized or low-value):**

- Generic LMS / live class streaming (Zoom + Google Meet own this; PhysicsWallah dominates free side)
- Branded mobile app per coaching (Classplus race-to-bottom; parents won't install N apps)
- Yet-another student quiz app (Testbook/Embibe/Unacademy saturate this)
- GST/accounting (Tally/Zoho own it; integrate, don't compete)
- Student social feed / forum (engagement low, moderation cost high, suicide-prevention liability)

## 3.3 Pricing tiers

| Tier | Monthly | Includes | Target customer |
| --- | --- | --- | --- |
| **Starter** | ₹999 | Smart Dunning + Inquiry CRM + Parent Digest, up to 50 students | Single-owner tier-3 coaching |
| **Pro** | ₹2,499 | + AI Test & Grading + Faculty Analytics + Risk Score, up to 200 students | Mid tier-2 coaching |
| **Compliance+** | ₹4,999 | + ComplyShield (state-specific) + audit pack + DPDPA consent broker, up to 500 students | Regulated tier-1/2 coaching |
| **Per-student add-on** | ₹15 / student / month | Alternative to flat plan; same features | Centers that prefer usage pricing |

OCR-heavy grading metered separately at ₹3/page beyond 100/month in Pro, 200/month in Compliance+.

## 3.4 What positioning rejects

This positioning explicitly **abandons** the "AI school management" framing. AI is the *infrastructure*, not the *product*. The product is operational outcomes (fees collected, students retained, inspectors satisfied, faculty rated). The XPRIZE judges will reward genuine AI-native operations — but we sell to the owner on rupees.

---

# 4. System Architecture

## 4.1 Architectural philosophy

Five principles derived from the research:

1. **Workflows over agents.** Per Anthropic's "Building Effective Agents" (Dec 2024), most production tasks should be structured workflows (routing, prompt chaining, orchestrator-workers, evaluator-optimizer). Autonomous agent loops are reserved for genuinely open-ended interactions.
2. **Human-in-the-loop at every write boundary.** IT Revolution data shows autonomous pipelines have a 23% critical-error rate without HITL gates; structured gates drop this to 5.1%. EduFlow gates: any fee-structure write, any escalated dunning message, any compliance document send.
3. **Crypto-shred for right-to-erasure.** Per-tenant Data Encryption Keys (DEKs) envelope-encrypted by a KMS Key Encryption Key (KEK). Right-to-erasure = drop the DEK; ciphertext becomes unreadable. Avoids cascading delete races at scale.
4. **Postgres-first.** Single source of truth for transactional state, RLS for tenancy, pgvector + pg_search for hybrid retrieval, PostgresSaver for LangGraph checkpoints. Avoid multi-DB ops complexity at <1000 customers.
5. **India-region everything.** Postgres in AWS ap-south-1 (Mumbai), Langfuse self-hosted in Mumbai, default LLM = Azure OpenAI South India or Gemini Vertex Mumbai. PII anonymizer gateway before any non-India inference call.

## 4.2 Reference architecture (textual diagram)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Channel Layer                                                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│ │ WhatsApp     │ │ Web (Next 16)│ │ Mobile (Expo)│ │ Razorpay       │  │
│ │ Cloud API    │ │              │ │ 52           │ │ Webhooks       │  │
│ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └────────┬───────┘  │
└────────┼────────────────┼────────────────┼─────────────────┼──────────┘
         │                │                │                 │
         ▼                ▼                ▼                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ NestJS Edge Layer (TypeScript)                                         │
│  Subdomain → tenant resolution → RLS context → JWT auth → BullMQ enqueue│
└────────┬───────────────────────────────────────────────────────────────┘
         │
         ├──► [Agent Service: FastAPI + LangGraph (Python)]
         │      │ Postgres-checkpointed state graphs
         │      │ Routing → Solver → Evaluator pattern
         │      │ HITL interrupt nodes
         │      ▼
         │   Model Router → { Gemini Flash 2.5 (default),
         │                    Sarvam-M (Indic),
         │                    Gemini Pro / Claude (escalation),
         │                    Sarvam Vision (OCR) }
         │
         ├──► [Realtime: Socket.IO + Redis adapter]
         │      Teacher dashboards, live grading status
         │
         ├──► [Background: BullMQ workers]
         │      WhatsApp send loop, dunning scheduler, OCR queue
         │
         └──► [Compliance Service]
                DigiLocker VPC, consent ledger, audit pgAudit, watermark stamper

┌────────────────────────────────────────────────────────────────────────┐
│ Data Layer — PostgreSQL 17 (AWS RDS Multi-AZ, ap-south-1 Mumbai)        │
│  + RLS keyed on school_id     + pgvector HNSW    + pg_search (BM25)     │
│  + pgcrypto field encryption  + pgAudit          + langgraph_checkpoints│
│  + Per-tenant DEK envelope encrypted by KMS KEK                         │
└────────────────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌────────────────────────────────────────────────────────────────────────┐
│ Observability — Langfuse (self-hosted Mumbai) + DeepEval CI            │
│  OpenInference tracing on every LangGraph node                          │
│  Per-tenant cost rollup → circuit-breaker middleware                    │
└────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Component-by-component

### 4.3.1 Tenancy

- **Single PostgreSQL cluster**, all tenant-scoped tables include `school_id uuid not null`.
- **Row-Level Security**: `FORCE ROW LEVEL SECURITY` keyed on `current_setting('app.current_tenant_id')`.
- **Prisma extension** (`row-level-security` pattern) opens a transaction per request, calls `SELECT set_config('app.current_tenant_id', $1, true)`, runs query, commits. Transaction-scoped config is PgBouncer-safe.
- **PgBouncer** in transaction-pool mode in front of RDS.
- **Composite indexes** lead with `school_id`; analytics role has `BYPASSRLS` for internal dashboards.
- **Schema-per-tenant rejected**: PlanetScale's 2025 analysis shows shared system catalogs slow the planner past a few hundred tenants. Database-per-tenant reserved as enterprise upsell for districts that demand it.

### 4.3.2 NestJS edge

- Three logical modules: `core` (tenancy, auth, billing), `agent` (LangGraph client), `channels` (WhatsApp webhook, Razorpay webhook, Socket.IO).
- Middleware order: tenant-from-subdomain → JWT verify → RLS context set → handler.
- Async-Local Storage for per-request context (tenant_id, user_id, consent_id) so it propagates to all internal calls.

### 4.3.3 Agent service (LangGraph)

- Separate FastAPI service, Python 3.12, deployed alongside NestJS on ECS Fargate.
- Called from NestJS via internal gRPC.
- `PostgresSaver` checkpointer in a separate `langgraph_checkpoints` schema in the same Postgres — gives durable execution across multi-day flows like dunning cadences.
- **State always carries `{tenant_id, user_id, consent_id, conversation_id}`** — propagated through every node.
- `interrupt()` nodes for HITL approval gates.
- `Send` API for fan-out so checkpoint consistency holds across parallel branches.

### 4.3.4 Realtime

- Socket.IO server in the NestJS process, Redis adapter for horizontal scaling.
- Used for teacher dashboards (live grading status, attendance check-in), owner dashboards (today-view live updates).

### 4.3.5 Background workers

- BullMQ on Redis (ElastiCache).
- Queues: `whatsapp_inbound`, `whatsapp_outbound`, `dunning_scheduler`, `ocr_grading`, `nightly_digest`, `compliance_renewal_check`.
- Rate-limited per-tenant against Meta's tiered messaging limits.

### 4.3.6 Web & mobile

- **Next.js 16** App Router on Vercel with multi-tenant routing (Vercel for Platforms pattern: `acme.eduflow.in`).
- **Expo 52** mobile shell sharing API contract.
- Same auth (JWT + refresh in httpOnly cookie web, Expo SecureStore mobile).
- Tailwind v4, shadcn/ui, React Server Components for owner dashboard.

### 4.3.7 Payments

- **Razorpay Subscriptions** for school plans (one Plan per tier, one Subscription per school).
- UPI eMandate primary, cards secondary.
- Webhook on `subscription_charged` → updates `subscriptions` table → entitlements refreshed in JWT claims at next login.
- Per-student fee collection handled outside the SaaS plan layer — coaching center owns the Razorpay account; EduFlow generates payment links on their behalf.

### 4.3.8 Deployment

- **AWS ap-south-1 (Mumbai)** primary.
- **2-AZ Multi-AZ** for RDS, ElastiCache, ECS.
- **ECS Fargate** for NestJS + FastAPI services behind ALB.
- **S3 Object Lock (Compliance Mode)** for audit log backups and student artifacts (test PDFs, answer sheets, refund proofs).
- **CloudWatch + Langfuse + Sentry** for infra / LLM / app errors.
- **Vercel** for marketing + web app.
- **EAS Build** for Expo mobile artifacts.

---

# 5. AI Agent Specifications

## 5.1 Design pattern selection

Following Anthropic's "Building Effective Agents":

| Agent | Pattern | Rationale |
| --- | --- | --- |
| Onboarding | **Routing → Orchestrator-Workers** | Setup steps are fixed, but each step's content depends on coaching's profile. |
| Test Report | **Evaluator-Optimizer** | Generator drafts a report; evaluator scores against the 8 Maurya pedagogical dimensions; loop ≤3 iterations. |
| Smart Dunning | **Workflow with HITL interrupt** | Cadence is deterministic; stage 4+ requires owner approval. |
| Compliance Watch | **Routing → Tool-Use** | Match rule changes to coaching's profile, generate filings. |
| Doubt Resolution (V2) | **Autonomous Agent** | True open-ended; tool path unknown until reasoning. |

## 5.2 Onboarding Agent

**Goal**: Convert a fresh coaching-center signup into a fully configured tenant within 24 hours via WhatsApp in Hindi/Hinglish.

**Inputs**: Owner phone, school name, city, estimated student count, screenshot or CSV of existing batch/fee data.

**Outputs**:
- Created `school`, `batches`, `students`, `fee_structures` records
- DPDPA-compliant privacy notice URL sent to owner
- Day-1 demo class scheduled with the owner

**Flow**:
1. Welcome message in Hindi (via WhatsApp template, utility category).
2. Ask for school name → confirm via menu.
3. Ask for batches (e.g., "Class 10 Maths Morning", "JEE Foundation Evening").
4. Ask for fee structure per batch.
5. (Optional) Owner uploads spreadsheet/screenshot of existing students → Sarvam Vision OCR → LLM normalizes to canonical JSON → owner confirms.
6. Generate per-student parent consent URLs (DigiLocker flow).
7. Send owner a setup summary + dashboard link.

**Model routing**:
- Router (intent classification): Gemini Flash 2.5
- Hindi conversation: Sarvam-M
- Spreadsheet/screenshot OCR: Sarvam Vision
- Data normalization (JSON extraction): Gemini Flash 2.5 with strict JSON schema

**HITL gates**:
- After OCR ingestion: owner must confirm parsed student list before write.
- Before activating fee structure: owner approves.

**Eval metric**: Time-to-first-active-batch ≤ 24 hours; CSAT > 4.0/5 from owners.

## 5.3 Test Report Agent

**Goal**: Generate a personalized per-student progress report after a test, with weak topics, comparative analytics, and study plan.

**Inputs**: Test ID, raw scores (per student, per question), curriculum tags, optional handwritten answer-sheet scan.

**Outputs**:
- Per-student PDF report (with C2PA watermark)
- WhatsApp-friendly text summary for parent
- Updated Bayesian Knowledge Tracing scores in `student_kt` table

**Flow**:
1. **Deterministic compute** (Python tool, not LLM): aggregate scores, compute percentile rank, chapter-wise mastery, identify top-3 weak topics. This avoids LLM math hallucination per the Khanmigo / Kestin RCT lessons.
2. **Update KT scores**: Beta(α, β) per concept; do not let LLM hallucinate mastery.
3. **RAG retrieval**: pull 3–5 curriculum-aligned worked examples for the weak topics from the embedded curriculum corpus.
4. **Generator** (Gemini Flash 2.5): drafts the report using the 8 Maurya pedagogical dimensions (mistake ID, mistake location, guidance, actionability, tone, accuracy, age-appropriateness, clarity).
5. **Evaluator** (Gemini Flash 2.5 as judge, non-deterministic temp 0.7): scores draft against 8 dimensions.
6. If any dimension < 7/10, regenerate (≤2 retries).
7. **Translate** to Hindi via Sarvam Translate.
8. **Watermark + provenance**: PDF gets C2PA metadata + visible footer "AI-assisted content. Generated by EduFlow on <date>. Verify before action."
9. **Teacher approval** (HITL): teacher dashboard shows draft; one-tap approve → send to parent.

**Why this design wins**:
- Deterministic compute layer means scores are always correct.
- RAG layer means content is curriculum-anchored, not hallucinated.
- Eval-optimizer loop catches obvious failures before teacher review.
- Teacher HITL means hallucination liability stays with teacher's judgement, not pure AI.

**Eval metric**: Teacher edit rate < 20% (acceptance with minor tweaks); parent-rated usefulness > 4.0/5.

## 5.4 Smart Dunning Agent

**Goal**: Recover overdue fees through a behaviourally-tuned cadence in Hindi/Hinglish, while protecting the coaching center's parent relationships.

**Cadence** (grounded in PNAS 2024 behavioural-econ, Dutch field experiment 23.4% lift, ACF BIAS report):

| Stage | Timing | Channel | Tone | Auto/HITL |
| --- | --- | --- | --- | --- |
| 1 | T–3 days | WhatsApp utility template | Friendly nudge, percentage framing, payment link | Auto |
| 2 | T+0 | WhatsApp utility template | Due-today reminder, social proof ("85% of parents have paid") | Auto |
| 3 | T+3 | WhatsApp utility template | Faculty-signed, single follow-up | Auto |
| 4 | T+7 | Phone call script + WhatsApp | Owner-level, no auto-send | **HITL — owner must trigger** |
| 5 | T+14 | Formal letter | Escalation to legal-tone | **HITL — owner must approve text** |

**Guardrails** (RBI FREE-AI principles, FDCPA-equivalent norms):

- **Hard cap**: max 1 reminder per day, max 4 per week per parent.
- **Quiet hours**: 21:00–09:00 IST, no sends.
- **Stop-words**: parent says "stop", "lawyer", "court" → escalate to human owner, never auto-reply.
- **Mandatory disclosure**: every message labelled "Sent on behalf of <coaching> via EduFlow (AI-assisted)".
- **Full audit log** of every send (DPDPA + RBI requirement).

**Personalization**:
- Segment by (days overdue, fee size, payment-latency history, parent vs student account).
- Tone calibration: Indian middle-class face-saving sensitivity — never threaten; always offer instalment renegotiation in stages 3+.

**Model routing**:
- Template fill (utility category): Gemini Flash 2.5 with strict JSON schema.
- Parent reply analysis: Sarvam-M (Hinglish handling).
- Escalation tone (stage 5): Claude Opus 4.7 via startup-program credits.

**Eval metric**: Days-to-collect reduction > 20% vs baseline; opt-out rate < 2%; zero complaints to coaching owner.

## 5.5 Compliance Watch Agent (ComplyShield)

**Goal**: Keep the coaching center continuously compliant with Rajasthan / UP / Karnataka / Bihar / Central rules; generate inspector-ready filings on demand.

**Watch sources**:
- State coaching-act gazette feeds (scraped weekly)
- CCPA notification page
- MoE press releases
- Sector news (ThePrint, Business Standard) for enforcement actions

**Capabilities**:
1. **Registration & renewal**: state-aware wizard, auto-generated PDF application, renewal alerts at T–90 / 60 / 30 days.
2. **Infrastructure tracker**: 1 sqm/student calculator, batch-size cap, CCTV uptime monitor (Hikvision/CP+ RTSP integration), first-aid checklist with monthly attestation.
3. **Fee & refund compliance**: ≥4-instalment enforcement, pro-rata refund calculator (Rajasthan 10-day rule), UPI payout generator, audit trail.
4. **Ad-copy lint**: pre-publish CCPA scanner; flags "100% selection", "guaranteed rank", false scarcity, unverified selection claims.
5. **Faculty compliance**: graduation-degree upload, background-check log, contract template library.
6. **Mental-health duty of care**: counsellor assignment per 200 students, Student Risk Score → counsellor escalation, helpline footer on parent messages, quarterly auto-PDF report.
7. **Inspector Pack**: one-click PDF bundle of all of the above with tamper-evident hash chain.
8. **Penalty risk dashboard**: real-time score "Your Rajasthan compliance is 87% — 3 issues could trigger ₹2L penalty" with one-click remediation flow.

**Model routing**:
- Rule-change ingestion: Gemini Flash 2.5 with JSON extraction.
- Filing generation: Gemini Pro (longer reasoning).
- Ad-copy lint: lightweight classifier + Sarvam-M for Hinglish.

**HITL gates**: every filing generation requires owner approval before submission to state authority.

**Eval metric**: Customer-reported penalty avoidance; inspector-pack completeness > 95%.

## 5.6 Auxiliary agents (V1.5 / V2)

- **Student Risk Score**: weighs attendance (40%), test trend (30%), fee delinquency (15%), parent contact recency (15%). Threshold breach → counsellor outreach.
- **Parent Weekly Digest**: auto-summarizes attendance, last 2 test scores with peer average + topper benchmark, one teacher-tagged "small win", upcoming test date. Sent via WhatsApp utility template.
- **Inquiry CRM**: 60-second auto-greet on WhatsApp leads from Meta/Google ads, demo scheduler, referral attribution. Single biggest conversion-lift feature in the stack per Reshape data (21× lift on 5-min response).
- **Doubt Resolution** (V2): true autonomous agent for student questions; reserved for future once data shows demand.

---

# 6. Data Model & Multi-Tenancy

## 6.1 Core entities

```
schools (tenant root)
  └─ users (owner, teacher, counsellor, admin)
  └─ batches
      └─ students
          └─ guardians (parent records with VPC token)
          └─ enrolments
          └─ attendances (partitioned monthly)
          └─ test_attempts
              └─ question_responses
          └─ payments
          └─ fee_structures
          └─ dunning_events (audit)
          └─ kt_state (Bayesian KT scores per concept)
  └─ faculties
      └─ contracts
      └─ batch_assignments
      └─ ratings
  └─ inquiries
      └─ touchpoints
      └─ conversions
  └─ compliance_records
      └─ registrations
      └─ refunds
      └─ ad_lints
      └─ counsellor_sessions
  └─ ai_generations (provenance ledger)
  └─ consent_events (append-only)
  └─ audit_log (append-only, monthly partitioned)
```

## 6.2 Multi-tenancy implementation

Every tenant-scoped table has:

```sql
school_id UUID NOT NULL REFERENCES schools(id),
-- Composite index leads with school_id
INDEX idx_<table>_school_id_<col> (school_id, <other_col>)

-- RLS policy
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <table>
  USING (school_id = current_setting('app.current_tenant_id')::uuid);
```

Prisma extension wraps every request:

```typescript
const tenantExtension = Prisma.defineExtension({
  query: {
    $allOperations: async ({ args, query, model, operation }) => {
      const tenantId = AsyncLocalStorage.get('tenant_id');
      return prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_tenant_id', '${tenantId}', true)`
        );
        return query(args);
      });
    },
  },
});
```

## 6.3 Encryption strategy

Three tiers:

1. **Storage encryption** (infra): AWS RDS at-rest with KMS CMK in ap-south-1 — covers compliance baseline, transparent to app.
2. **Field-level pgcrypto** (app): AES-256-GCM on `students.dob`, `guardians.phone`, `guardians.aadhaar_hash`, `students.exam_scores`, `payments.upi_id`. Keys in AWS KMS, rotated yearly.
3. **Per-tenant DEK** (crypto-shred): each tenant has a Data Encryption Key, envelope-encrypted by a KMS Key Encryption Key. Right-to-erasure = drop the DEK; ciphertext becomes garbage. No cascading delete races.

## 6.4 Append-only ledgers

`consent_events`, `audit_log`, `ai_generations`, `dunning_events` are append-only:

- No UPDATE, no DELETE allowed at the database role level for application user.
- Monthly partitions for `audit_log` and `attendances`.
- Hourly export to S3 Object Lock (Compliance Mode) for immutable backup.
- `pgaudit` extension enabled with `log = 'write, ddl'`.

## 6.5 Vector & search

- `pgvector` 0.8 with HNSW index for embeddings.
- `pg_search` (ParadeDB) for BM25 in the same Postgres.
- Curriculum corpus chunked via `MarkdownHeaderTextSplitter` (textbook structure) → recursive 512/50 overlap fallback.
- Hybrid retrieval: BM25 top-20 ∪ vector top-20 → Reciprocal Rank Fusion → Cohere Rerank-3 → top-5 → LLM. Two-stage gives +17% Recall@5 over single-stage (OptyxStack 2025).
- **Embedding model**: Vyakyarth-1 (Krutrim, Indic-contrastive) for Hindi/Indic; Cohere embed-multilingual-v3 as managed fallback for mixed content.
- **Privacy**: opaque IDs in vector metadata; never store student names. For high-risk content (essays), add Gaussian noise (DP, ε=1.0) to embeddings to mitigate inversion attacks (arXiv 2411.05034).

---

# 7. DPDPA + IT Rules 2026 Compliance Architecture

## 7.1 Layered compliance stack

```
Layer 7 — Governance: DPIA register, data_map.yaml in repo, audit log
Layer 6 — Rights Portal: /privacy with access, correction, erasure, portability (90-day SLA)
Layer 5 — Consent Layer: DigiLocker VPC + Consent Manager SDK (post Nov 2026)
Layer 4 — AI Gateway: PII anonymiser → LLM router → watermarker + provenance ledger
Layer 3 — Application: child-flag aware, minor-privacy-switch, RBAC, MFA enforced
Layer 2 — Data Plane: Postgres + pg_tde + pgcrypto + per-tenant DEK + Mumbai region
Layer 1 — Infra: AWS ap-south-1, VPC isolation, CloudTrail immutable, WAF, Vault secrets
```

## 7.2 Verifiable Parental Consent (VPC) flow

**Primary path: DigiLocker OAuth**

1. Student signs up; age check → if <18, account stays in `pending_consent` state.
2. Student provides parent's phone number.
3. EduFlow sends WhatsApp message to parent with DigiLocker authorisation link.
4. Parent authenticates via Aadhaar-linked DigiLocker; platform receives a signed verified-adult token.
5. Token, parent identity hash, child_id, purpose scope written to `consent_events` (append-only).
6. Student account activated.

**Fallback path**: Phone OTP + Aadhaar XML offline-KYC for age verification, then PAN/Aadhaar Offline KYC, then OTP-signed consent.

**Withdrawal**: parent visits `/privacy` (or sends WhatsApp `STOP` to a dedicated number) → consent withdrawn → next data access blocked → 90-day deletion timer starts.

**Re-consent triggers**: any change in data-use purpose; new AI feature added that processes student data.

## 7.3 IT Rules 2026 — Synthetic content watermarking

Every AI-generated artefact (test reports, parent messages, study plans, dunning copy) carries:

1. **Visible watermark**: PDF footer "Generated by EduFlow AI on <date>. AI-assisted content."
2. **C2PA provenance metadata** embedded in the file.
3. **Audio TTS**: prepended with "The following is AI-generated content."
4. **Provenance ledger**: `ai_generations` table with `(id, model, prompt_hash, output_hash, student_id, tenant_id, timestamp, channel)`.
5. **3-hour takedown SLA**: `/grievance` endpoint auto-pages on-call; SLA tracker enforces 3 hours.

## 7.4 Breach playbook

- **Detection**: CloudTrail anomaly + Sentry alerts + database access pattern monitor.
- **72-hour clock starts** at first credible indicator of breach.
- **Notify**: Data Protection Board + affected Data Principals via email + dashboard banner.
- **Template notices** pre-drafted in repo (`/runbooks/breach-notification/`).
- **On-call rotation** with weekly drill.

## 7.5 10-item MVP compliance checklist (ship by Sept 2026)

1. Age-gate + DigiLocker VPC on every signup.
2. RDS storage encryption + pgcrypto field encryption + per-tenant DEK.
3. Privacy notice in Hindi + English + 4 regional languages.
4. Rights portal at `/privacy` with 90-day SLA timer.
5. Published grievance contact `dpo@eduflow.in`.
6. AI gateway: PII anonymizer + default to Azure OpenAI South India; provenance ledger; visible watermark.
7. MFA on all admin / teacher / support accounts.
8. 72-hour breach playbook with on-call rotation.
9. `data_map.yaml` reviewed per PR that touches schema.
10. Behavioural-monitoring kill-switch default-on for minor accounts.

## 7.6 Post-launch compliance roadmap (2026–2027)

1. Engage MeitY-registered Consent Manager (Leegality / Consently / Digital Anumati) once registration list publishes (Nov 2026).
2. Annual DPIA + independent audit; DPO-as-a-Service (₹15–50K/month).
3. Cyber insurance ₹10 Cr cover with regulatory-penalty rider (Marsh / ICICI Lombard / HDFC Ergo).
4. Migrate Indic inference fully to Sarvam / AI4Bharat self-hosted in ap-south-1 as SDF localisation list firms up.
5. Differential-privacy analytics + federated fine-tuning post 20-customer threshold.

---

# 8. Indic Language Stack

## 8.1 Model routing matrix

| Task | Model | Why |
| --- | --- | --- |
| Hindi/Hinglish parent message draft | **Sarvam-M** | +86% on romanized GSM-8K; best native Hindi tone |
| Fee reminder template fill (mixed English/Hindi) | **Gemini 2.5 Flash** | Cheapest reliable structured-output |
| Test report generation (English reasoning) | **Gemini 2.5 Flash** | Reasoning quality; cost |
| Final Hindi polish of report | **Sarvam Translate** | Production-grade Indic translation |
| Handwritten Devanagari answer-sheet OCR | **Sarvam Vision** | 95.91% Hindi doc accuracy; beats Gemini 3 Pro by 4 pts |
| Mixed English-math answer sheet | **Gemini 2.5 Pro vision** | Better on math + figures |
| Customer onboarding voice call | **Sarvam Saaras v3** + Sarvam-M | Indic-native voice loop |
| Curriculum embeddings | **Vyakyarth-1 / Cohere embed-multilingual-v3** | Indic-tuned vs managed quality |
| Complex parent dispute / refund negotiation | **Claude Opus 4.7** (startup credits) | Premium reasoning when stakes high |
| Real-time WhatsApp reply | **Gemini 2.5 Flash + prompt cache** | Latency + cost |

## 8.2 Anonymizer gateway

Before any cross-border LLM call:

1. Regex + NER strips: name, phone, email, school name, exam-id, address.
2. Replaces with `[STUDENT_001]`, `[GUARDIAN_001]` opaque tokens.
3. Tokens persisted in `pii_tokens` (short-TTL, tenant-scoped).
4. After response, tokens rehydrated to original PII.
5. Every cross-border call logged with payload hash + token map hash.

For child-data flows, default-route to Azure OpenAI South India or Sarvam (India region); only use Anthropic / OpenAI (US) when explicit re-consent recorded for that feature.

## 8.3 Cost estimates

**Per-customer per-month at 1000 customers** (50 WhatsApp utility msgs, 200 LLM-generated msgs, 5 voice min, 100 OCR pages, 30 embedding ops):

| Line | Cost |
| --- | --- |
| Gemini 2.5 Flash | ~$1.86 |
| Sarvam-M | ~₹30 |
| Sarvam Vision OCR | ~₹200 (passed through as ₹3/page beyond plan limit) |
| Sarvam STT/TTS | ~₹2.5 |
| Sarvam Translate | ~₹20 |
| Cohere Embed | ~$0.15 |
| WhatsApp via Cloud API | ~₹30 |
| Vertex AI infra | ~$0.20 |
| Claude premium (5% calls, post-credits) | ~$0.40 |
| **Total ≈ ₹560 ($6.70) per customer per month** |

At ₹999 Starter pricing: 44% gross margin. At ₹2,499 Pro: 78% gross margin. Both sustainable.

Year 1: Sarvam Startup Program + Anthropic Startup Program credits cover ~50% of variable cost.

---

# 9. Observability & Evaluation

## 9.1 Tracing stack

- **Langfuse self-hosted** in AWS ap-south-1 (DPDPA-compliant; no student traces to US SaaS).
- **OpenInference instrumentation** auto-captures LangGraph nodes as spans.
- Each span carries `tenant_id`, `user_id`, `consent_id` (which DPDPA grant covered this call), prompt hash, output hash, model, tokens-in/out, cost, eval verdict.
- **Per-tenant cost rollup** in Postgres feeds a circuit-breaker middleware: when tenant approaches monthly LLM budget, downgrade to cheaper model or queue.

## 9.2 Three-layer evaluation pipeline

Every prompt / model change runs through:

1. **Offline pedagogical eval** (DeepEval in CI):
   - 200+ anonymized real student situations
   - LLM-as-judge (Gemini 2.5 Pro, temp 0.7, no CoT) scoring against 8 Maurya dimensions
   - Calibrated against 50 human-graded samples quarterly

2. **Bias eval, stratified**:
   - Paired test set varying only student name (Hindu/Muslim/Dalit-coded) or Hinglish script proficiency
   - Measure tone, recommended action, report-length deltas
   - Blocking failures: > 5% delta in recommended action

3. **Adversarial / prompt-injection eval**:
   - OWASP LLM Top 10 suite
   - Student-data-extraction attacks (arXiv 2512.03694 method)
   - Trojanized-prompt-chain detection (arXiv 2507.14207)

## 9.3 Agent-specific metrics (DeepEval)

- **Goal Accuracy**: did the agent achieve the user's intent?
- **Plan Adherence**: did the agent follow the expected control flow?
- **Tool Use**: were tools called correctly?
- **Step Efficiency**: minimal steps to completion?

Tracked per tenant, surfaced in customer health dashboard.

---

# 10. Implementation Plan (90-day shipping)

## 10.1 Sprint structure

Six 2-week sprints from May 28 to Sept 4, 2026, ending with XPRIZE submission packaging Sept 5–17.

### Sprint 1 — May 28 to Jun 10: Foundation + Pilot Zero

**Engineering**:
- Repo rebrand: rename modules, kill school-specific copy, update README
- Strip non-coaching modules: Class Wall, Chat, Homework (Google Classroom replaces these for free)
- Add `language` column to all user-facing tables; default `hi`
- Set up AWS ap-south-1: RDS PostgreSQL 17, ElastiCache Redis, S3 buckets, KMS keys
- Apply Prisma RLS extension across all tenant-scoped models
- Add `pgaudit`, `pgvector`, `pg_search`, `pgcrypto` extensions
- Deploy NestJS to ECS Fargate behind ALB
- Set up Langfuse self-hosted in ap-south-1
- Compliance skeleton module: `consent_events`, `audit_log`, `ai_generations` tables

**GTM**:
- Founder 1 (full-time): build list of 20 coaching owner contacts via family, IIITA alumni, hometown network
- 10 Hindi phone calls; pitch concierge pilot (free 30-day + ₹599/mo after)
- **Target: 1 verbal yes**

**Setup**:
- GitHub Student Pack, Google Cloud $300, NVIDIA Inception, Microsoft for Founders Hub apply
- Udyam + Razorpay KYC
- Apply Sarvam Startup Program day 1
- Apply Anthropic Claude Startup Program (need IIITA prof advisor)
- Buy `eduflow.in` domain

**Content**:
- YouTube channel launch
- Video #1 in Hindi: "Coaching center kaise efficiently chalaye — 5 mistakes you're making"

### Sprint 2 — Jun 11 to Jun 24: Smart Dunning + Onboarding Agent

**Engineering**:
- WhatsApp Cloud API integration: NestJS webhook controller with HMAC verify; BullMQ workers; utility template submission to Meta for approval (target 6 templates)
- LangGraph Python service deployed on ECS, FastAPI exposing gRPC endpoint
- Onboarding Agent (Sprint 1 spec):
  - State graph: welcome → school_name → batches → fee_structure → student_upload → confirm
  - Sarvam-M for conversation, Sarvam Vision for spreadsheet OCR
  - HITL confirm node before write
- Smart Dunning Agent (Sprint 1 spec):
  - 5-stage cadence with WhatsApp utility templates
  - Behavioural-econ-tuned copy in Hindi + English
  - Hard caps + quiet hours + stop-word handling
  - Audit log of every send

**GTM**:
- Onboard pilot zero — 2 days in coaching center if hometown, else full Zoom
- Founder 1 conducts onboarding personally; record interactions for product feedback
- Founder 5 captures testimonial video (30 sec Hindi phone-shot)

**Content**:
- Video #2: "Rajasthan Coaching Act ka asar — chhote coachings ke liye"
- Set up Click-to-WhatsApp Meta ads account (configure, don't launch yet)

### Sprint 3 — Jun 25 to Jul 8: Test Report + AI Grading

**Engineering**:
- Curriculum corpus ingestion: NCERT + CBSE Class 9-12 + JEE Foundation + NEET Foundation
  - Chunked via MarkdownHeaderTextSplitter
  - Embedded via Vyakyarth-1 (Indic) + Cohere embed v3 (mixed)
  - pgvector HNSW + pg_search BM25 hybrid index
- Test Report Agent:
  - Deterministic compute layer (Python tool): score aggregation, percentile, chapter mastery
  - Bayesian Knowledge Tracing: `student_kt` table with Beta(α, β) per concept
  - Generator (Gemini Flash 2.5) → Evaluator (Gemini Flash 2.5 judge) → ≤3 retries
  - Hindi polish via Sarvam Translate
  - C2PA watermark + provenance ledger
  - Teacher HITL approval node
- OCR module: Sarvam Vision for handwritten Devanagari; Gemini 2.5 Pro vision fallback for math
- DPDPA: rights portal `/privacy` skeleton with access + correction + erasure forms

**GTM**:
- Launch Click-to-WhatsApp Meta ads — ₹500/day, target Prayagraj/Agra/Kota/Lucknow coaching owners
- Founder 1 conducts Hindi Zoom demos; founder 5 records for content reuse
- **Target: 1 paying customer + 3-5 active free trials**

**Content**:
- Video #3: "EduFlow product walkthrough — Hindi"
- Founder 1 LinkedIn + Twitter posts on pilot zero testimonial

### Sprint 4 — Jul 9 to Jul 22: ComplyShield (Rajasthan + Central)

**Engineering**:
- Rajasthan Coaching Act 2025 rules engine:
  - Registration application PDF generator
  - 1 sqm/student calculator with batch-size enforcement
  - 5-hours/day class limit
  - 4-instalment fee enforcement
  - Pro-rata refund calculator with UPI payout integration
  - Counsellor assignment per 200 students
  - Mental-health helpline auto-footer on parent messages
- MoE Central Guidelines 2024: faculty graduation upload + age-gate on enrollment
- CCPA Ad Lint: Sarvam-M classifier for banned terms + selection-claim verifier
- Inspector Pack: one-click PDF bundle with hash-chain audit trail
- Penalty Risk Dashboard: real-time compliance score

**GTM**:
- Continue ads; iterate copy based on Sprint 3 learnings
- Convert week-3 trials to paid; aim for 30-40% trial-to-paid conversion
- Founder 1 starts asking pilots for referrals

**Content**:
- Video #4: "Rajasthan inspector ko ₹2 lakh penalty se kaise bachen"
- Blog post #1: "Why we built compliance-first"

### Sprint 5 — Jul 23 to Aug 5: Faculty + Inquiry CRM + Parent Digest

**Engineering**:
- Faculty module:
  - `faculties`, `contracts`, `batch_assignments`, `ratings` tables
  - Per-batch revenue attribution; gross margin per teacher
  - Student-rating micro-survey post-test (1-tap WhatsApp)
  - Faculty-result analytics: avg student score by faculty
  - Salary processing with contractual deductions
- Inquiry CRM:
  - WhatsApp lead-capture from Meta/Google ads via Lead Ads API
  - 60-second auto-greet via WhatsApp template
  - Demo-class scheduler with calendar integration
  - Referral-tracking with auto-credit to existing parent
- Parent Weekly Digest:
  - Cron-scheduled Sunday 09:00 IST
  - Sarvam-M-generated 4-line WhatsApp template
  - Includes attendance, last 2 scores with peer avg + topper, one "small win", next test
- Student Risk Score:
  - Weighted: attendance 40%, test trend 30%, fee delinquency 15%, contact recency 15%
  - Threshold breach → auto-flag to counsellor + owner

**GTM**:
- Convert pilots to "Compliance+" tier (₹4,999/mo); price-test the upgrade
- **Target: 5 paying customers, ₹15K-30K MRR**
- Faculty advisor (IIITA prof) onboarded for XPRIZE submission credibility

**Content**:
- Video #5 + #6: faculty management + retention case studies

### Sprint 6 — Aug 6 to Aug 19: Polish + XPRIZE Submission Packaging

**Engineering**:
- Bug fixes from pilot feedback
- Performance pass: query plans, RLS index coverage, hot-path caching
- Multi-state expansion: UP, Karnataka, Bihar rules added to ComplyShield
- 30-day free-trial flow polish; payment upgrade UX
- Final security pass: MFA enforcement, secrets rotation, KMS key audit
- DeepEval suite green-light

**XPRIZE submission**:
- 500–1000 word narrative (positioning, traction, AI-native moat, category impact)
- 3-minute video: founder 1 demos product in English with Hindi subtitles
  - 0:00–0:30 problem framing
  - 0:30–1:30 product walkthrough (Onboarding Agent, Smart Dunning, Test Report, ComplyShield)
  - 1:30–2:30 agent execution logs + Langfuse traces shown
  - 2:30–3:00 customer testimonial + ARR + traction metrics
- Razorpay revenue export
- Agent execution log export from Langfuse
- 3+ customer testimonial videos
- GitHub repo cleanup; README pointing to architecture doc, this document attached

**Submission deadline: Aug 17, 2026 (UTC midnight)**

## 10.2 Day 90 success criteria

| Criterion | Target | Failure threshold |
| --- | --- | --- |
| Paying customers | ≥ 5 | < 3 → call it |
| MRR | ≥ ₹15K | < ₹8K → call it |
| Active pilots / trials | ≥ 10 | < 5 → call it |
| Production AI agents | 4 (Onboarding, Test Report, Dunning, Compliance) | < 3 → defer XPRIZE |
| YouTube subscribers | ≥ 200 | < 50 → channel restart |
| XPRIZE narrative + video | Ready by Aug 17 | Missed → no submission |

Hit ≥ 4 of 6 → continue to month 4. Hit < 3 → pause and reassess.

---

# 11. Team Allocation & Operating Model

## 11.1 Five-founder structure

| Founder | Role | Allocation | Day-90 deliverables |
| --- | --- | --- | --- |
| F1 | **GTM Lead** — Hindi sales calls, demos, customer support, pilot onboarding | 100% | 5–10 paying customers; Hindi demo library |
| F2 | **Backend Lead** — NestJS, Prisma, Postgres RLS, payments, WhatsApp integration | 100% | All core APIs, multi-tenant tested, payments live |
| F3 | **Frontend Lead** — Next.js 16 web, Expo 52 mobile, dashboards | 100% | Owner dashboard, teacher dashboard, parent app shell |
| F4 | **AI / Agent Lead** — LangGraph, Gemini/Sarvam routing, RAG, evaluation | 100% | 4 production agents with Langfuse traces |
| F5 | **Content + Compliance + XPRIZE Lead** — YouTube, blog, compliance research, DPDPA, XPRIZE submission | 100% | 6 YouTube videos, ComplyShield content base, XPRIZE narrative + video |

## 11.2 Five part-time helpers (10–15 hrs/week each)

- **Helper 1**: QA + manual testing on real coaching workflows
- **Helper 2**: Pilot customer support — Hindi WhatsApp first-line
- **Helper 3**: Content writing — blog posts, social, ad copy
- **Helper 4**: Video editing — YouTube + XPRIZE submission video
- **Helper 5**: Data entry for pilot onboarding — bridge any rough edges

## 11.3 Faculty advisor

One IIITA professor (CS, Software Engineering, or NLP background) as advisor:
- 1–2 hours/month
- Co-signs XPRIZE submission for credibility
- No equity; honorarium ₹0 (relationship-based)

## 11.4 Operating cadence

- **Daily**: 30-min standup, 09:30 IST
- **Weekly**: Friday retro + demo + metrics review
- **Sprint review**: every 2 weeks
- **Customer call rota**: F1 + one rotating other founder; min 2 calls/week each
- **On-call**: weekly rotation among F2/F3/F4; weekend escalation to F1

---

# 12. Unit Economics

## 12.1 Cost stack (per customer per month, steady state)

| Line | Cost |
| --- | --- |
| AI inference (Gemini + Sarvam + premium) | ₹560 |
| WhatsApp Cloud API (utility messages) | ₹30 |
| Hosting (RDS + Fargate + ElastiCache amortized) | ₹150 |
| Observability (Langfuse self-host amortized) | ₹20 |
| Payment processing (Razorpay 2%) | ₹20 (Starter) – ₹100 (Compliance+) |
| Support (founder time amortized at scale) | ₹100 |
| **Total COGS** | **₹880 – ₹960** |

## 12.2 Gross margin by tier

| Tier | Price | COGS | Gross margin |
| --- | --- | --- | --- |
| Starter ₹999 | ₹999 | ₹880 | 12% |
| Pro ₹2,499 | ₹2,499 | ₹920 | 63% |
| Compliance+ ₹4,999 | ₹4,999 | ₹960 | 81% |

**Starter is a loss-leader / acquisition tier.** The business model lives on Pro and Compliance+ conversions. Target mix at 100 customers: 30% Starter, 50% Pro, 20% Compliance+ → blended ARPU ₹2,400, blended margin 62%.

## 12.3 18-month projection (realistic, not optimistic)

| Month | Customers | MRR | ARR run-rate |
| --- | --- | --- | --- |
| 3 | 5–10 | ₹15K–25K | ₹2L |
| 6 | 15–25 | ₹40K–70K | ₹6L |
| 12 | 60–100 | ₹1.5L–3L | ₹25L |
| 18 | 150–250 | ₹4L–7L | ₹60L |
| 24 | 300–500 | ₹8L–15L | ₹1.2 Cr |

This is a ₹50L–1.5 Cr ARR business, not a unicorn. Bootstrapped, sustainable, defensible via compliance moat.

## 12.4 Credits stack (year 1)

| Source | Estimated value | Effort |
| --- | --- | --- |
| Sarvam Startup Program | ₹3–5L equivalent | Apply day 1 |
| Anthropic Claude Startup | $25K–$100K | Need IIITA prof advisor + apply |
| Google Cloud / Gemini | $300 + Founders ~$2K | Apply day 1 |
| Microsoft for Founders Hub | $1K Azure + $2.5K OpenAI | Apply day 1 |
| NVIDIA Inception | $0 cash, credibility + GPU credits | Instant approval |
| GitHub Student Pack | $200 DigitalOcean + Heroku + JetBrains | Verify with `.iiita.ac.in` email |
| **Total year-1 absorption** | **~₹6–10L of variable cost** | Mostly automated applications |

---

# 13. XPRIZE Submission Strategy

## 13.1 Category and scoring

**Submitting to**: Education & Human Potential (primary), Small Business Services (secondary alignment).

XPRIZE weights three criteria equally:

1. **Business Viability** — real ARR, growth trajectory, defensible moat.
2. **AI-Native Operations** — does the business itself run on AI agents, not just have AI features?
3. **Category Impact** — measurable outcomes for end users (students, coaching owners, parents).

## 13.2 Narrative angles (one for each criterion)

**Business Viability angle**:
- 5–10 paying customers, ₹15–30K MRR by Day 90
- 18-month path to ₹50L–1 Cr ARR
- Defensible compliance moat (Rajasthan Act, CCPA, DPDPA)
- Unit economics: 62% blended gross margin

**AI-Native Operations angle**:
- 4 production LangGraph agents handling >70% of operational work
- Onboarding Agent: 24-hour activation, 90% automated
- Smart Dunning Agent: 5-stage behavioural cadence, RBI-compliant
- Test Report Agent: KT + RAG + tool-use, 8 Maurya dimensions evaluated
- ComplyShield: continuous rule-monitoring + filing generation
- Langfuse execution logs proving end-to-end agent traces

**Category Impact angle**:
- Measurable per-customer outcomes: % faster fee collection, hours saved per teacher, retention lift, compliance violations avoided
- Pilot testimonials in Hindi with quantified results
- Mental-health duty-of-care alignment (post-Kota crisis)

## 13.3 Submission package

| Deliverable | Owner | Deadline |
| --- | --- | --- |
| GitHub repo public + README | F2 + F4 | Aug 10 |
| Architecture document (this doc) attached as appendix | F5 | Aug 10 |
| 500–1000 word narrative | F5 | Aug 12 |
| 3-minute video | F1 + F5 + Helper 4 | Aug 14 |
| Razorpay revenue export | F2 | Aug 14 |
| Langfuse agent execution log export | F4 | Aug 14 |
| 3+ customer testimonial videos | F1 + F5 | Aug 14 |
| Final polish + submit | F5 | Aug 17 |

## 13.4 What submission cannot fix

This is lottery economics. The marginal cost is ~60 hours of submission packaging on top of work being done regardless. Even at 0.5% win probability the EV justifies submitting. But:

- The real business goal is sustainable ₹50L–1 Cr ARR, not XPRIZE.
- Do NOT warp the product to please judges over paying customers.
- Use the deadline as a forcing function for shipping, not as a north star.

---

# 14. Risk Register

## 14.1 Top 10 risks ranked by probability × severity

| # | Risk | Probability | Severity | Mitigation |
| --- | --- | --- | --- | --- |
| 1 | No customer pickup in 90 days | 60% | High | Concierge pilot Day 0 from family network; Hindi founder calls; 30-day free trial |
| 2 | Meta WhatsApp Business AI commoditizes our channel | 90% (already live) | Medium | Position as *complement* to WhatsApp AI, not replacement; differentiate on deep coaching-specific data |
| 3 | Classplus discount-bombs to ₹999 | 35% | High | Compliance moat (they don't have it); per-student pricing optionality |
| 4 | Pilot customer churn within 60 days | 50% | High | Concierge onboarding; success-manager touch by F1; weekly business review |
| 5 | Founder burnout / team dissolution | 40% | Critical | Clear roles; faculty advisor; weekly retro; explicit "call it" thresholds |
| 6 | DPDPA enforcement misstep → penalty | 10% (until May 2027), 30% after | Critical | 10-item MVP compliance checklist non-negotiable; cyber insurance Q4 2026 |
| 7 | LLM cost overrun | 25% | Medium | Per-tenant circuit breakers; aggressive Gemini Flash prompt caching; Sarvam credits |
| 8 | OCR quality fails on field conditions | 50% | Medium | Sarvam Vision primary + Gemini Pro fallback; teacher HITL approval blocks bad output |
| 9 | Razorpay subscription disputes / chargebacks | 20% | Medium | Pro-rata refund logic; clear T&Cs; never auto-debit beyond plan |
| 10 | XPRIZE submission misses deadline | 30% | Low (business doesn't depend on it) | F5 owns; Aug 14 internal deadline 3 days before public deadline |

## 14.2 Walk-away triggers

If any of these hit by Day 90, pause and reassess:

- 0 paying customers by Day 60
- < ₹8K MRR by Day 90
- All 5 pilot customers churn before Day 60
- A founder leaves
- Critical DPDPA violation discovered before Sept 2026 ship

---

# 15. Open Questions for Peer Review

We are sharing this document with Gemini, DeepSeek, and other AI reviewers for peer critique. The following are open questions where we'd particularly value pushback:

1. **LangGraph vs Claude Agent SDK** for the orchestration layer — we chose LangGraph for durable execution and PostgresSaver checkpointing. Would Claude Agent SDK's subagent isolation model be a better fit given our mixed-model strategy?

2. **Agent service language**: Python (LangGraph) introduces a second runtime alongside Node (NestJS). Would a TypeScript-only stack with `@langchain/langgraph-sdk-js` reduce ops complexity at acceptable feature cost?

3. **Vector store**: pgvector + pg_search in one Postgres simplifies ops but pgvector hits a wall past ~50M chunks. Should we plan a Qdrant migration trigger from day one, or defer until we see the wall?

4. **Multi-tenancy enforcement**: RLS via Prisma extension feels brittle (one missed `set_config` and isolation breaks). Should we layer in WorkOS-style permission boundaries as a defense-in-depth, or trust the extension + RLS forced policy?

5. **DigiLocker VPC fallback**: how robust is the DigiLocker OAuth flow in 2026 for parents who don't have Aadhaar-linked DigiLocker yet? Should we plan a phone-OTP-only fallback that meets DPDPA Rule 10 specifically?

6. **Crypto-shredding for right-to-erasure**: per-tenant DEK envelope encryption is clean but operationally heavy (key rotation, backup, recovery). Is application-level pgcrypto + cascading DELETE sufficient for DPDPA's 90-day SLA?

7. **Smart Dunning ethical edge**: the Dutch field experiment shows 23% repayment lift from AI dunning, but the psychological-impact study warns of "stigma reduction" framing. Are we drawing the right line on tone escalation in stages 3–5?

8. **Sarvam concentration risk**: we depend on Sarvam for translate + STT + TTS + OCR. They're well-funded ($1.5B valuation, HCLTech-led Series B) but still pre-IPO. Should we self-host AI4Bharat IndicTrans2 + Whisper as a permanent fallback, even at higher ops cost?

9. **Compliance wedge sustainability**: the Rajasthan / CCPA / DPDPA stack is real today. But what's the 3-year half-life of regulatory pain? Will competitors (Classplus, Teachmint) ship the same features within 12–18 months and erase our moat?

10. **GTM realism**: research says no Indian SMB SaaS at ₹1.5K–4K/month ever scaled purely online-only. We're betting on founder-led Hindi Zoom demos + Click-to-WhatsApp ads + freemium. Is there a channel we're missing?

11. **XPRIZE category fit**: Education & Human Potential vs Small Business Services — which category is the right submission slot given that our buyer is the coaching owner (small business) but our impact is on students?

12. **Pricing tier sequencing**: should we launch only Pro ₹2,499 in Sprint 1–3 and add Starter ₹999 + Compliance+ ₹4,999 in Sprint 4–6, or all three from Sprint 1? Starter is a margin loss-leader; launching it too early may anchor pricing low.

---

# 16. Research Bibliography

## 16.1 AI agents in education

- Maurya et al., *Unifying AI Tutor Evaluation* (arXiv 2412.09416)
- Maurya et al., *BEA 2025 Shared Task on Pedagogical Ability Assessment* (arXiv 2507.10579)
- Wang et al., *TutorLLM: Knowledge Tracing + RAG* (arXiv 2502.15709)
- Stanford SCALE, *Tutor CoPilot* (arXiv 2410.03017)
- Kestin et al., *AI Tutor RCT* (Nature Scientific Reports 2025) — `nature.com/articles/s41598-025-97652-6`
- Khan Academy, *Khanmigo* — `khanmigo.ai`
- CMU, *AI Math Tutor Helping Millions* — `cmu.edu/research-office/research-impacts/ai-math-tutor.html`
- LPITutor (PeerJ CS 2025) — `ncbi.nlm.nih.gov/pmc/articles/PMC12453719/`

## 16.2 LangGraph & agent orchestration

- Anthropic, *Building Effective Agents* (Dec 2024) — `anthropic.com/research/building-effective-agents`
- Anthropic, *Multi-agent Research System* — `anthropic.com/engineering/multi-agent-research-system`
- Anthropic, *Claude Agent SDK* — `anthropic.com/engineering/building-agents-with-the-claude-agent-sdk`
- LangGraph docs — `docs.langchain.com/oss/python/langgraph/memory`
- LangGraph case study, Remote — `langchain.com/blog/customers-remote`
- LangGraph vs CrewAI vs AutoGen 2025 — `latenode.com/blog/.../langgraph-vs-autogen-vs-crewai...`
- DataCamp comparison — `datacamp.com/tutorial/crewai-vs-langgraph-vs-autogen`

## 16.3 Multi-tenant SaaS

- PlanetScale, *Approaches to tenancy in Postgres* — `planetscale.com/blog/approaches-to-tenancy-in-postgres`
- Crunchy Data, *RLS for Tenants in Postgres* — `crunchydata.com/blog/row-level-security-for-tenants-in-postgres`
- Prisma row-level-security extension — `github.com/prisma/prisma-client-extensions/tree/main/row-level-security`
- Notion DB sharding case study — `talent500.com/blog/notion-postgresql-database-sharding/`
- WorkOS multi-tenant permissions — `workos.com/blog/multi-tenant-permissions-slack-notion-linear`
- Vercel multi-tenant SaaS docs — `vercel.com/docs/multi-tenant`

## 16.4 Vector stores & RAG

- pgvector vs Pinecone vs Qdrant vs Weaviate — `dev.to/kencho/...vector-database-performance-compared...`
- AWS pgvector indexing — `aws.amazon.com/blogs/database/optimize-generative-ai-applications-with-pgvector-indexing...`
- ParadeDB hybrid search — `paradedb.com/blog/hybrid-search-in-postgresql-the-missing-manual`
- Notion two-years vector search — `notion.com/blog/two-years-of-vector-search-at-notion`
- OptyxStack hybrid search + reranking playbook — `optyxstack.com/rag-reliability/hybrid-search-reranking-playbook`

## 16.5 Indic AI

- Sarvam-1 / OpenHathi — `sarvam.ai/blogs/sarvam-1`
- Sarvam-M (May 2025) — `sarvam.ai/blogs/sarvam-m`
- Sarvam Vision (OCR) — `sarvam.ai/blogs/Sarvam-vision`
- Sarvam Startup Program — `sarvam.ai/startup-program`
- AI4Bharat — `ai4bharat.iitm.ac.in`; IndicTrans2 — `github.com/AI4Bharat/IndicTrans2`
- Krutrim LLM paper (arXiv 2502.09642)
- COMI-LINGUA Hinglish dataset (arXiv 2503.21670)
- IndicParam benchmark — `medium.com/@vbsowmya/indicparam...`
- Vyakyarth-1 — `ai-labs.olakrutrim.com/models/Vyakyarth-1-Indic-Embedding`

## 16.6 WhatsApp Business

- Meta webhook reference — `developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/`
- WhatsApp template messages — `developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview`
- WhatsApp Cloud API 2026 — `medium.com/@aktyagihp/whatsapp-cloud-api-integration-in-2026...`
- Meta Business AI India launch (May 2026) — `about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/`
- Webxion: WhatsApp fee alerts for coaching — `webxion.com/how-coaching-institutes-send-fee-alerts-on-whatsapp-business-platform/`

## 16.7 DPDPA & regulatory

- Rule 10 (Children's data & VPC) — `dpdpa.com/dpdparules/rule10.html`
- Rule 12 (SDF + localisation) — `dpdpa.com/dpdparules/rule12.html`
- Rule 14 (Rights & SLA) — `dpdpa.com/dpdparules/rule14.html`
- PIB official PDF — `static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf`
- Grant Thornton brochure — `grantthornton.in/.../dpdpa-rules-detailed-brochure_final-25th-november-2025-1.pdf`
- EY DPDPA guide — `ey.com/en_in/insights/cybersecurity/decoding-the-digital-personal-data-protection-act-2023`
- Penalties guide — `dpdpa.com/blogs/dpdpa_penalties_explained_50_crore_250_crore_fines.html`
- Securiti cross-border — `securiti.ai/cross-border-data-transfer-requirements-under-india-dpdpa/`
- DigiLocker framework — `dpo-india.com/Resources/.../Digital-Locker-Tecnology-Framework-Verifiable-Parental-Consent-India's-DPDPA.pdf`
- Hogan Lovells IT Rules 2026 — `hoganlovells.com/en/publications/india-introduces-mandatory-labelling-for-ai-and-3hour-takedown-for-illegal-content`
- PowerSchool breach lessons — `mcmillan.ca/insights/publications/lessons-learned-from-the-powerschool-breach/`

## 16.8 Coaching center operations

- IMARC India Coaching Market Report — `imarcgroup.com/india-coaching-institutes-market`
- NSS 2025 PIB release — `pib.gov.in/PressReleasePage.aspx?PRID=2160863`
- Rajasthan Coaching Centres Act 2025 (PRS brief) — `prsindia.org/files/bills_acts/bills_states/rajasthan/2025/Legislative_Brief_Rajasthan_Coaching_Centres_(Control_and_Regulation)_Bill_2025.pdf`
- MoE Coaching Guidelines 2024 — `education.gov.in/sites/upload_files/mhrd/files/Guideliens_Coaching_Centres_en.pdf`
- PIB CCPA penalties on coaching — `pib.gov.in/PressReleaseIframePage.aspx?PRID=2073013`
- ThePrint FIITJEE crisis — `theprint.in/india/education/fiitjee-crisis-angry-parents-allege-big-fraud-teachers-who-quit-join-rival-institutes/2462823/`
- SAGE Kota suicide study (Meena 2025) — `journals.sagepub.com/doi/10.1177/09710973251356797`
- Microsoft Research Physics Wallah Alakh AI — `microsoft.com/en-us/research/blog/microsoft-research-and-physics-wallah-team-up-to-enhance-ai-based-tutoring/`
- ClassPlus / Inc42 pivot coverage — `inc42.com/features/classplus-flips-its-edtech-playbook/`

## 16.9 Behavioural economics & dunning

- PNAS, *Behavioural Nudges Prevent Loan Delinquencies* — `ncbi.nlm.nih.gov/pmc/articles/PMC11789030/`
- Netherlands AI debt collection field experiment — `ncbankruptcyexpert.com/sites/default/files/2024-07/artificial_intelligence_and_debt_collection_evidence_from_a_field_experiment_compressed_0.pdf`
- AI in Debt Collection: Psychological Impact (arXiv 2602.00050)
- RBI FREE-AI Framework — `lexology.com/library/detail.aspx?g=cdd93d6c-fd28-4c12-ac23-33d7820439ab`
- WhatsApp notifications & micro-conversions in fintech — `chatarchitect.com/news/fintech-meets-messaging-whatsapp-based-notifications-and-micro-conversions`

## 16.10 Evaluation & safety

- LLM-as-Judge Survey (arXiv 2411.15594)
- Empirical Study of LLM-as-Judge (arXiv 2506.13639)
- Implicit Grading Bias in LLMs (arXiv 2603.18765)
- FairAIED (arXiv 2407.18745)
- SRPG Privacy Guard for Ed-MAS (arXiv 2512.03694)
- HITL non-negotiable for safety-critical AI — `itrevolution.com/articles/human-in-the-loop-is-non-negotiable-leading-ai-adoption-in-safety-critical-systems/`
- DeepEval changelog 2025 — `deepeval.com/changelog/changelog-2025`

---

*End of document. Version 1.0. To be revised based on peer review and pilot feedback by Sprint 3 close (July 8, 2026).*
