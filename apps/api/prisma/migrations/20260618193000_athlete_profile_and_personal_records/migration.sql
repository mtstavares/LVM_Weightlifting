-- CreateEnum
CREATE TYPE "AthleteProfileStatus" AS ENUM ('PROFILE_INCOMPLETE', 'PROFILE_COMPLETE');

-- CreateEnum
CREATE TYPE "AthleteSex" AS ENUM ('FEMALE', 'MALE');

-- CreateEnum
CREATE TYPE "CompetitiveLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'NATIONAL', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "PersonalRecordMovement" AS ENUM ('SNATCH', 'CLEAN_JERK', 'BACK_SQUAT', 'FRONT_SQUAT', 'DEADLIFT');

-- AlterEnum
ALTER TYPE "AuthAuditEvent" ADD VALUE 'ATHLETE_PROFILE_COMPLETED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'ATHLETE_PROFILE_UPDATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'ATHLETE_PHOTO_UPDATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'PERSONAL_RECORD_UPSERTED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINER_PROTECTED_EDIT_DENIED';

-- AlterTable
ALTER TABLE "athletes"
ADD COLUMN "sex" "AthleteSex",
ADD COLUMN "competitive_level" "CompetitiveLevel",
ADD COLUMN "profile_status" "AthleteProfileStatus" NOT NULL DEFAULT 'PROFILE_INCOMPLETE',
ADD COLUMN "profile_completed_at" TIMESTAMP(3);

-- Preserve legacy personal records while consolidating Clean and Jerk.
ALTER TABLE "personal_records" ADD COLUMN "exercise_new" "PersonalRecordMovement";

UPDATE "personal_records"
SET "exercise_new" = CASE "exercise"::text
  WHEN 'SNATCH' THEN 'SNATCH'::"PersonalRecordMovement"
  WHEN 'CLEAN' THEN 'CLEAN_JERK'::"PersonalRecordMovement"
  WHEN 'JERK' THEN 'CLEAN_JERK'::"PersonalRecordMovement"
  WHEN 'BACK_SQUAT' THEN 'BACK_SQUAT'::"PersonalRecordMovement"
  WHEN 'FRONT_SQUAT' THEN 'FRONT_SQUAT'::"PersonalRecordMovement"
END;

DELETE FROM "personal_records"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "athlete_id", "exercise_new"
        ORDER BY "weight" DESC, "record_date" DESC, "created_at" DESC
      ) AS "position"
    FROM "personal_records"
  ) ranked
  WHERE ranked."position" > 1
);

ALTER TABLE "personal_records"
DROP COLUMN "exercise";

ALTER TABLE "personal_records"
RENAME COLUMN "exercise_new" TO "exercise";

ALTER TABLE "personal_records"
ALTER COLUMN "exercise" SET NOT NULL,
ADD COLUMN "notes" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "personal_records_athlete_id_exercise_key" ON "personal_records"("athlete_id", "exercise");
