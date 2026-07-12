-- Index three foreign keys that are filtered on but were never indexed.
--
-- All three are read when a patient profile is opened (see getPatient in
-- src/actions/patients.ts): the patient's previous medications, the patient's
-- investigations, and — for each lab sheet — that sheet's extra investigations.
--
-- Without an index, each of these is a sequential scan: Postgres reads the whole
-- table and discards every row belonging to another patient/sheet, so the cost
-- grows with the total size of the table, not with how much this one patient
-- has. An index turns "read every row" into "jump to the matching ones". Today
-- the tables are small and the scan is invisible; this keeps it invisible as the
-- clinic accumulates years of records.
--
-- Index names match Prisma's own convention (<table>_<column>_idx) so the schema
-- (@@index added to the three models) and the database stay in agreement and a
-- later `prisma db pull` / `migrate diff` reports no drift.
--
-- HOW TO RUN — Supabase dashboard, SQL Editor. The tables are small, so each
-- CREATE INDEX takes a sub-second write lock; pasting all three at once is fine.
-- Every statement is IF NOT EXISTS, so the file is safe to re-run.
--
-- LATER, IF A TABLE HAS GROWN LARGE: swap CREATE INDEX for
-- CREATE INDEX CONCURRENTLY (no write lock, safe during clinic hours). That form
-- cannot run inside a transaction, and the SQL Editor wraps a pasted batch in
-- one — so run the three statements one at a time in that case.
--
-- Afterwards, locally: `npx prisma generate`.

CREATE INDEX IF NOT EXISTS "previous_medications_patient_id_idx"
  ON "previous_medications"("patient_id");

CREATE INDEX IF NOT EXISTS "investigations_patient_id_idx"
  ON "investigations"("patient_id");

CREATE INDEX IF NOT EXISTS "extra_investigations_sheet_id_idx"
  ON "extra_investigations"("sheet_id");
