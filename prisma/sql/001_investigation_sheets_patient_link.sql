-- Move InvestigationSheet from Session-owned to Patient-owned.
--
-- Lab sheets are entered by reception before the doctor's session exists, so
-- they now hang off the patient. session_id becomes nullable and is filled in
-- when a session claims the sheet.
--
-- Run once against the database, then `npx prisma generate`.
-- Existing rows all have a NOT NULL session_id, so the backfill is total.

BEGIN;

ALTER TABLE "investigation_sheets" ADD COLUMN "patient_id" TEXT;
ALTER TABLE "investigation_sheets"
  ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "investigation_sheets" AS sheet
SET "patient_id" = session."patient_id"
FROM "sessions" AS session
WHERE sheet."session_id" = session."id";

-- Aborts the transaction if the backfill missed a row.
DO $$
DECLARE orphans INT;
BEGIN
  SELECT COUNT(*) INTO orphans
  FROM "investigation_sheets" WHERE "patient_id" IS NULL;

  IF orphans > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % sheet(s) have no patient_id', orphans;
  END IF;
END $$;

ALTER TABLE "investigation_sheets" ALTER COLUMN "patient_id" SET NOT NULL;
ALTER TABLE "investigation_sheets" ALTER COLUMN "session_id" DROP NOT NULL;

-- Deleting a session must not take the patient's lab history with it.
ALTER TABLE "investigation_sheets"
  DROP CONSTRAINT "investigation_sheets_session_id_fkey";
ALTER TABLE "investigation_sheets"
  ADD CONSTRAINT "investigation_sheets_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "sessions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "investigation_sheets"
  ADD CONSTRAINT "investigation_sheets_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "investigation_sheets_patient_id_date_idx"
  ON "investigation_sheets"("patient_id", "date");

COMMIT;
