-- AlterEnum
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINING_MANUAL_PRESCRIPTION_CREATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINING_PERCENTAGE_PRESCRIPTION_CREATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINING_PERCENTAGE_CALCULATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINING_PERCENTAGE_WITHOUT_PR';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'PERSONAL_RECORD_CANDIDATE_IDENTIFIED';

-- AlterEnum
ALTER TYPE "TargetPrExercise" ADD VALUE 'CLEAN_JERK';
ALTER TYPE "TargetPrExercise" ADD VALUE 'DEADLIFT';

-- CreateTable
CREATE TABLE "personal_record_history" (
  "id" TEXT NOT NULL,
  "personal_record_id" TEXT NOT NULL,
  "athlete_id" TEXT NOT NULL,
  "exercise" "PersonalRecordMovement" NOT NULL,
  "weight" DECIMAL(6,2) NOT NULL,
  "record_date" DATE NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "personal_record_history_pkey" PRIMARY KEY ("id")
);

INSERT INTO "personal_record_history" (
  "id",
  "personal_record_id",
  "athlete_id",
  "exercise",
  "weight",
  "record_date",
  "notes",
  "created_at"
)
SELECT
  gen_random_uuid()::text,
  "id",
  "athlete_id",
  "exercise",
  "weight",
  "record_date",
  "notes",
  "updated_at"
FROM "personal_records";

CREATE INDEX "personal_record_history_athlete_id_exercise_created_at_idx"
ON "personal_record_history"("athlete_id", "exercise", "created_at");

ALTER TABLE "personal_record_history"
ADD CONSTRAINT "personal_record_history_personal_record_id_fkey"
FOREIGN KEY ("personal_record_id") REFERENCES "personal_records"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "personal_record_history"
ADD CONSTRAINT "personal_record_history_athlete_id_fkey"
FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
