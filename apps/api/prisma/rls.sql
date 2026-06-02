-- =====================================================================
-- EduFlow — Row-Level Security policies (DPDPA defense-in-depth, R3 in the
-- architecture plan). Run AFTER `prisma db push` / migrate, idempotently, via:
--     pnpm --filter api db:rls            # node applier (uses DATABASE_URL)
--   or
--     psql "$DATABASE_URL" -f apps/api/prisma/rls.sql
--
-- Model:
--   • Every tenant query runs through PrismaService.db, which sets the GUC
--     `app.current_tenant_id` (transaction-scoped). The policy below matches it
--     against each row's "schoolId".
--   • An unset GUC -> current_setting(..., true) = NULL -> the predicate is NULL
--     -> the row is excluded. Queries without tenant context fail CLOSED.
--   • Deliberate system work sets `app.bypass_rls = 'on'` (PrismaService.runAsSystem).
--   • WITH CHECK mirrors USING, so a row can never be written into another tenant.
--
-- Tables covered: the 23 models that carry a `schoolId` column directly. Child /
-- join tables without `schoolId` (Term, ParentLink, RefreshToken, Assignment,
-- ChatMember, TimetablePeriod, TimetableSubstitution, NotificationPreference)
-- are reachable only through their tenant-scoped parents; adding subquery-based
-- policies for them is a tracked follow-up.
--
-- This is ONE statement (a DO block) so it can be applied with
-- $executeRawUnsafe as well as psql.
-- =====================================================================
DO $rls$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'AcademicYear', 'User', 'OtpCode', 'Class', 'Section', 'Subject',
    'ClassSubject', 'AttendanceRecord', 'LeaveApplication', 'Exam', 'ExamMark',
    'Post', 'PostComment', 'PostReaction', 'Submission', 'ChatGroup',
    'ChatMessage', 'Timetable', 'Notification', 'NotificationTemplate',
    'FeeStructure', 'FeePayment', 'AuditLog', 'ConsentEvent', 'AiGeneration',
    'WhatsAppInboundEvent', 'OutboxItem', 'DunningRun', 'DunningEvent',
    'GradedSheet', 'TestReport'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    -- Skip tables that don't exist yet (lets this run before all models ship).
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'RLS: table % not found, skipping', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- FORCE so the table owner (the app role under prisma) is constrained too.
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format($pol$
      CREATE POLICY tenant_isolation ON public.%I
      USING (
        current_setting('app.bypass_rls', true) = 'on'
        OR "schoolId" = current_setting('app.current_tenant_id', true)
      )
      WITH CHECK (
        current_setting('app.bypass_rls', true) = 'on'
        OR "schoolId" = current_setting('app.current_tenant_id', true)
      )
    $pol$, t);

    RAISE NOTICE 'RLS: enforced tenant_isolation on %', t;
  END LOOP;
END
$rls$;
