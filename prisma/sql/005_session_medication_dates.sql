-- Record when a patient started and stopped each medication.
--
-- Until now the medications tab could only *infer* a "since" date from the
-- session a drug first appeared in, and it had no way at all to say when a drug
-- was stopped — flipping a medication to inactive recorded that it was inactive,
-- never the date. These two columns make both explicit:
--
--   started_at — stamped with the session date the first time the drug is
--                prescribed (see createSession / addSessionMedication), and
--                editable so the doctor can record an earlier real start (e.g.
--                a drug the patient was already on before their first visit).
--   stopped_at — stamped with the day a drug is deactivated (see
--                updateSessionMedication / toggleSessionMedication), cleared if
--                the drug is reactivated, and editable.
--
-- Both are nullable DATE columns. Existing rows stay NULL; the medications tab
-- falls back to the old session-date inference for those, so no backfill is
-- needed — the explicit dates simply take over as new rows are written.
--
-- Column names match Prisma's @map on SessionMedication (started_at / stopped_at)
-- so schema and database stay in agreement and a later `prisma migrate diff`
-- reports no drift.
--
-- HOW TO RUN — Supabase dashboard, SQL Editor. Adding a nullable column with no
-- default is a metadata-only change: it takes a brief lock and does not rewrite
-- the table, so this is safe to run during clinic hours. Both statements are
-- IF NOT EXISTS, so the file is safe to re-run.
--
-- Afterwards, locally: `npx prisma generate`.

ALTER TABLE "session_medications"
  ADD COLUMN IF NOT EXISTS "started_at" DATE;

ALTER TABLE "session_medications"
  ADD COLUMN IF NOT EXISTS "stopped_at" DATE;
