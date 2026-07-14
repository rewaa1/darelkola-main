-- Let the doctor REQUEST investigations, not just record their results.
--
-- Until now everything investigation-related (investigation_sheets, the
-- investigations table) held results the patient arrived holding. There was no
-- way to ask for a test and hand the patient a slip, and no notion of an
-- outstanding/pending test. These two tables add that, mirroring how
-- medications work (a catalog + per-session lines):
--
--   investigation_catalog   — the reusable, searchable list of orderable tests
--                             (labs, imaging, procedures). Grows as staff add
--                             new ones, like the medications table.
--   session_investigations  — a test requested during a session. Starts
--                             REQUESTED (pending) and flips to RESULTED once the
--                             result is back, so nothing gets lost.
--
-- The two enum types match the Prisma enums (InvestigationCategory,
-- SessionInvestigationStatus) by name so the schema and DB agree and a later
-- `prisma migrate diff` reports no drift.
--
-- HOW TO RUN — Supabase dashboard, SQL Editor. New tables + a seed insert; no
-- existing table is touched, so this is safe during clinic hours. Every
-- statement is guarded (IF NOT EXISTS / duplicate_object / ON CONFLICT), so the
-- file is safe to re-run.
--
-- Afterwards, locally: `npx prisma generate`.

-- Enums (CREATE TYPE has no IF NOT EXISTS; swallow the duplicate on re-run).
DO $$ BEGIN
  CREATE TYPE "InvestigationCategory" AS ENUM ('LAB', 'IMAGING', 'PROCEDURE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SessionInvestigationStatus" AS ENUM ('REQUESTED', 'RESULTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Catalog of orderable tests.
CREATE TABLE IF NOT EXISTS "investigation_catalog" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "category"   "InvestigationCategory" NOT NULL DEFAULT 'LAB',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "investigation_catalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "investigation_catalog_name_key"
  ON "investigation_catalog"("name");

-- A test requested on a session.
CREATE TABLE IF NOT EXISTS "session_investigations" (
  "id"               TEXT NOT NULL,
  "session_id"       TEXT NOT NULL,
  "investigation_id" TEXT NOT NULL,
  "status"           "SessionInvestigationStatus" NOT NULL DEFAULT 'REQUESTED',
  "notes"            TEXT,
  "requested_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resulted_at"      DATE,
  CONSTRAINT "session_investigations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "session_investigations_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "session_investigations_investigation_id_fkey"
    FOREIGN KEY ("investigation_id") REFERENCES "investigation_catalog"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "session_investigations_session_id_investigation_id_key"
  ON "session_investigations"("session_id", "investigation_id");

CREATE INDEX IF NOT EXISTS "session_investigations_session_id_idx"
  ON "session_investigations"("session_id");

-- Seed the catalog with common tests so typeahead is useful immediately. Names
-- are what a doctor writes on a request; the catalog grows from here via the
-- app's "add new". gen_random_uuid() is built in on Postgres 13+ (Supabase).
INSERT INTO "investigation_catalog" ("id", "name", "category")
SELECT gen_random_uuid()::text, v.name, v.category::"InvestigationCategory"
FROM (VALUES
  ('CBC', 'LAB'),
  ('ESR', 'LAB'),
  ('CRP', 'LAB'),
  ('Fasting Blood Sugar', 'LAB'),
  ('Postprandial Blood Sugar', 'LAB'),
  ('HbA1c', 'LAB'),
  ('Serum Sodium', 'LAB'),
  ('Serum Potassium', 'LAB'),
  ('Serum Calcium', 'LAB'),
  ('Serum Phosphorus', 'LAB'),
  ('Serum Magnesium', 'LAB'),
  ('Serum Albumin', 'LAB'),
  ('Liver Function Tests', 'LAB'),
  ('Total & Direct Bilirubin', 'LAB'),
  ('Urea', 'LAB'),
  ('Creatinine', 'LAB'),
  ('eGFR', 'LAB'),
  ('Uric Acid', 'LAB'),
  ('Lipid Profile', 'LAB'),
  ('FT3', 'LAB'),
  ('FT4', 'LAB'),
  ('TSH', 'LAB'),
  ('PTH', 'LAB'),
  ('Urine Analysis', 'LAB'),
  ('Urine Culture', 'LAB'),
  ('HBsAg', 'LAB'),
  ('HCV Antibody', 'LAB'),
  ('HIV Antibody', 'LAB'),
  ('INR', 'LAB'),
  ('Serum Iron', 'LAB'),
  ('Ferritin', 'LAB'),
  ('TIBC', 'LAB'),
  ('PSA', 'LAB'),
  ('ANA', 'LAB'),
  ('Anti-dsDNA', 'LAB'),
  ('Complement C3', 'LAB'),
  ('Complement C4', 'LAB'),
  ('Rheumatoid Factor', 'LAB'),
  ('Anti-CCP', 'LAB'),
  ('ANCA', 'LAB'),
  ('Serum Protein Electrophoresis', 'LAB'),
  ('Chest X-ray', 'IMAGING'),
  ('Abdominal Ultrasound', 'IMAGING'),
  ('Pelvic Ultrasound', 'IMAGING'),
  ('Renal Ultrasound', 'IMAGING'),
  ('Doppler Ultrasound', 'IMAGING'),
  ('Echocardiography', 'IMAGING'),
  ('ECG', 'IMAGING'),
  ('CT Abdomen & Pelvis', 'IMAGING'),
  ('CT Chest', 'IMAGING'),
  ('MRI', 'IMAGING'),
  ('Renal Biopsy', 'PROCEDURE'),
  ('Bone Marrow Biopsy', 'PROCEDURE')
) AS v(name, category)
ON CONFLICT ("name") DO NOTHING;
