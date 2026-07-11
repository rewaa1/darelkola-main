-- Assistant doctor: pre-consultation assessments.
--
-- Adds the ASSISTANT role, the WITH_ASSISTANT queue status, and the
-- pre_assessments table. A pre-assessment is the assistant's vitals and
-- examination, taken after check-in and before the doctor's session exists.
--
-- It is keyed to the appointment, not the patient. An unclaimed lab sheet may
-- belong to the next session; an unclaimed pulse may not. Scoping to the visit
-- is what stops a reading taken at an abandoned visit from surfacing weeks
-- later as though it were measured today.
--
-- Nothing is backfilled: every existing session predates the assistant.
--
-- HOW TO RUN — Supabase dashboard, SQL Editor, as TWO separate queries:
--   1. section 1 (the two ALTER TYPE lines)
--   2. section 2 (BEGIN; ... COMMIT;)
-- The editor submits a pasted script as one batch, which Postgres wraps in an
-- implicit transaction. Running section 2 on its own keeps the enum values
-- committed before the table that will reference them, and keeps the table's
-- own DDL in a single explicit transaction. Pasting the whole file at once also
-- works, but logs a harmless "there is already a transaction in progress"
-- warning at the BEGIN. Both sections are safe to re-run.
--
-- Afterwards, locally: `npx prisma generate`.

-- ---------------------------------------------------------------------------
-- 1. Enum values.
--
-- Deliberately outside a transaction. Postgres will not let a value added by
-- ALTER TYPE be *used* by the same transaction that added it, so keeping these
-- separate leaves the door open for a later section to reference them.
-- IF NOT EXISTS makes this section safe to re-run.
-- ---------------------------------------------------------------------------

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ASSISTANT';

-- AFTER 'CHECKED_IN' places it at the ordinal position matching the real flow,
-- so anything that ever sorts by this enum sorts in visit order.
ALTER TYPE "AppointmentStatus"
  ADD VALUE IF NOT EXISTS 'WITH_ASSISTANT' AFTER 'CHECKED_IN';

-- ---------------------------------------------------------------------------
-- 2. The table.
-- ---------------------------------------------------------------------------

BEGIN;

CREATE TABLE "pre_assessments" (
  "id"             TEXT NOT NULL,
  "patient_id"     TEXT NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "session_id"     TEXT,
  "assistant_id"   TEXT,

  -- Vitals as the assistant measured them. The doctor's own readings stay on
  -- `sessions` and are left empty unless he re-measures. Nothing is copied
  -- between the two, so a reading always carries the name of the man who took it.
  "blood_pressure" TEXT,
  "pulse"          TEXT,
  "temperature"    TEXT,
  "resp_rate"      TEXT,

  "examination"    TEXT,

  -- No date column. The visit's date is the appointment's. The clinic works
  -- past midnight, so a second source of truth for "which day was this" would
  -- disagree with the appointment for the last hours of every shift.
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pre_assessments_pkey" PRIMARY KEY ("id")
);

-- One assessment per visit: the assistant corrects his note, he does not write
-- a second one. Postgres allows many NULLs in a unique index, so any number of
-- assessments may sit unclaimed with session_id IS NULL.
CREATE UNIQUE INDEX "pre_assessments_appointment_id_key"
  ON "pre_assessments"("appointment_id");
CREATE UNIQUE INDEX "pre_assessments_session_id_key"
  ON "pre_assessments"("session_id");

CREATE INDEX "pre_assessments_patient_id_idx"
  ON "pre_assessments"("patient_id");

ALTER TABLE "pre_assessments"
  ADD CONSTRAINT "pre_assessments_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- RESTRICT, not CASCADE. An appointment at which a clinician examined the
-- patient is not a booking mistake, and deleting it must not quietly take his
-- note with it. `deleteAppointment` will refuse; that is the intended answer.
ALTER TABLE "pre_assessments"
  ADD CONSTRAINT "pre_assessments_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Matches investigation_sheets: deleting a session releases what it claimed
-- rather than destroying it.
ALTER TABLE "pre_assessments"
  ADD CONSTRAINT "pre_assessments_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "sessions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- A closed staff account must not erase the notes it signed.
ALTER TABLE "pre_assessments"
  ADD CONSTRAINT "pre_assessments_assistant_id_fkey"
  FOREIGN KEY ("assistant_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
