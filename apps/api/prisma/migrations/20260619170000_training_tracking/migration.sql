-- CreateEnum
CREATE TYPE "TrainingSectionType" AS ENUM ('WARMUP', 'TECHNIQUE_BALLISTIC', 'STRENGTH', 'BODYBUILDING');

-- CreateEnum
CREATE TYPE "TrainingRevisionAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED');

-- AlterEnum
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINING_DELETED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINING_STARTED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINING_COMPLETED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'COACH_COMMENT_ADDED';

-- AlterTable
ALTER TABLE "athletes" ADD COLUMN "gym" TEXT;

-- AlterTable
ALTER TABLE "training_days"
ADD COLUMN "scheduled_date" DATE,
ADD COLUMN "title" TEXT,
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

UPDATE "training_days" AS day
SET "scheduled_date" = week."start_date" + GREATEST(day."weekday" - 1, 0)
FROM "training_weeks" AS week
WHERE week."id" = day."training_week_id";

ALTER TABLE "training_days" ALTER COLUMN "scheduled_date" SET NOT NULL;

-- AlterTable
ALTER TABLE "training_blocks"
ADD COLUMN "section_type" "TrainingSectionType",
ADD COLUMN "completed_at" TIMESTAMP(3);

UPDATE "training_blocks"
SET "section_type" = CASE "type"
  WHEN 'COMPLEX' THEN 'TECHNIQUE_BALLISTIC'::"TrainingSectionType"
  WHEN 'STRENGTH' THEN 'STRENGTH'::"TrainingSectionType"
  WHEN 'ACCESSORY' THEN 'BODYBUILDING'::"TrainingSectionType"
  ELSE 'WARMUP'::"TrainingSectionType"
END;

ALTER TABLE "training_blocks" ALTER COLUMN "section_type" SET NOT NULL;

-- AlterTable
ALTER TABLE "training_sets" ADD COLUMN "exercise_name" TEXT;
UPDATE "training_sets" SET "exercise_name" = COALESCE(NULLIF("notes", ''), 'Exercicio');
ALTER TABLE "training_sets" ALTER COLUMN "exercise_name" SET NOT NULL;

-- AlterTable
ALTER TABLE "workout_completions" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "feedbacks"
ADD COLUMN "fatigue" INTEGER,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "feedbacks" SET "fatigue" = COALESCE("energy", 1);
ALTER TABLE "feedbacks" ALTER COLUMN "fatigue" SET NOT NULL;
ALTER TABLE "feedbacks" ALTER COLUMN "energy" DROP NOT NULL;
ALTER TABLE "feedbacks" ALTER COLUMN "technique" DROP NOT NULL;
ALTER TABLE "feedbacks" ALTER COLUMN "pain" DROP NOT NULL;

-- AlterTable
ALTER TABLE "coach_comments" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Replace legacy indexes with uniqueness guarantees
DROP INDEX IF EXISTS "workout_completions_athlete_id_training_day_id_idx";
CREATE UNIQUE INDEX "workout_completions_athlete_id_training_day_id_key"
ON "workout_completions"("athlete_id", "training_day_id");

DROP INDEX IF EXISTS "feedbacks_athlete_id_training_day_id_idx";
CREATE UNIQUE INDEX "feedbacks_athlete_id_training_day_id_key"
ON "feedbacks"("athlete_id", "training_day_id");

CREATE UNIQUE INDEX "training_days_training_week_id_scheduled_date_key"
ON "training_days"("training_week_id", "scheduled_date");
CREATE INDEX "training_days_scheduled_date_deleted_at_idx"
ON "training_days"("scheduled_date", "deleted_at");

-- CreateTable
CREATE TABLE "training_revisions" (
  "id" TEXT NOT NULL,
  "training_day_id" TEXT NOT NULL,
  "changed_by_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "action" "TrainingRevisionAction" NOT NULL,
  "snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "training_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "training_revisions_training_day_id_created_at_idx"
ON "training_revisions"("training_day_id", "created_at");

ALTER TABLE "training_revisions"
ADD CONSTRAINT "training_revisions_training_day_id_fkey"
FOREIGN KEY ("training_day_id") REFERENCES "training_days"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "training_revisions"
ADD CONSTRAINT "training_revisions_changed_by_id_fkey"
FOREIGN KEY ("changed_by_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
