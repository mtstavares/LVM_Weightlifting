CREATE TYPE "ExercisePrescriptionType" AS ENUM ('LOAD', 'TIME', 'TEXT');

ALTER TABLE "exercises" ADD COLUMN "key" TEXT;
UPDATE "exercises" SET "key" = id WHERE "key" IS NULL;
ALTER TABLE "exercises" ALTER COLUMN "key" SET NOT NULL;
ALTER TABLE "exercises" ADD COLUMN "trainer_id" TEXT;
ALTER TABLE "exercises" ADD COLUMN "prescription_type" "ExercisePrescriptionType" NOT NULL DEFAULT 'LOAD';
ALTER TABLE "exercises" ADD COLUMN "pr_base" "PersonalRecordMovement";
ALTER TABLE "exercises" ADD COLUMN "can_update_personal_record" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "exercises" ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "exercises" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

DROP INDEX IF EXISTS "exercises_name_key";
CREATE UNIQUE INDEX "exercises_key_key" ON "exercises"("key");
CREATE INDEX "exercises_trainer_id_is_active_idx" ON "exercises"("trainer_id", "is_active");
CREATE INDEX "exercises_is_system_is_active_idx" ON "exercises"("is_system", "is_active");
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "training_sets" ADD COLUMN "exercise_category_snapshot" "ExerciseCategory";
ALTER TABLE "training_sets" ADD COLUMN "prescription_type_snapshot" "ExercisePrescriptionType";
ALTER TABLE "training_sets" ADD COLUMN "pr_base_snapshot" "PersonalRecordMovement";

INSERT INTO "exercises" ("id", "key", "name", "category", "prescription_type", "pr_base", "can_update_personal_record", "is_system", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'SNATCH', 'Snatch', 'SNATCH', 'LOAD', 'SNATCH', true, true, true, now(), now()),
  (gen_random_uuid(), 'POWER_SNATCH', 'Power Snatch', 'SNATCH', 'LOAD', 'SNATCH', false, true, true, now(), now()),
  (gen_random_uuid(), 'HANG_SNATCH', 'Hang Snatch', 'SNATCH', 'LOAD', 'SNATCH', false, true, true, now(), now()),
  (gen_random_uuid(), 'HANG_POWER_SNATCH', 'Hang Power Snatch', 'SNATCH', 'LOAD', 'SNATCH', false, true, true, now(), now()),
  (gen_random_uuid(), 'BLOCK_SNATCH', 'Block Snatch', 'SNATCH', 'LOAD', 'SNATCH', false, true, true, now(), now()),
  (gen_random_uuid(), 'BLOCK_POWER_SNATCH', 'Block Power Snatch', 'SNATCH', 'LOAD', 'SNATCH', false, true, true, now(), now()),
  (gen_random_uuid(), 'MUSCLE_SNATCH', 'Muscle Snatch', 'SNATCH', 'LOAD', 'SNATCH', false, true, true, now(), now()),
  (gen_random_uuid(), 'SNATCH_PULL', 'Snatch Pull', 'SNATCH', 'LOAD', 'SNATCH', false, true, true, now(), now()),
  (gen_random_uuid(), 'SNATCH_HIGH_PULL', 'Snatch High Pull', 'SNATCH', 'LOAD', 'SNATCH', false, true, true, now(), now()),
  (gen_random_uuid(), 'SNATCH_DEADLIFT', 'Snatch Deadlift', 'SNATCH', 'LOAD', 'SNATCH', false, true, true, now(), now()),
  (gen_random_uuid(), 'SNATCH_BALANCE', 'Snatch Balance', 'SNATCH', 'LOAD', 'SNATCH', false, true, true, now(), now()),
  (gen_random_uuid(), 'DROP_SNATCH', 'Drop Snatch', 'SNATCH', 'LOAD', 'SNATCH', false, true, true, now(), now()),
  (gen_random_uuid(), 'OVERHEAD_SQUAT', 'Overhead Squat', 'SNATCH', 'LOAD', 'SNATCH', false, true, true, now(), now()),
  (gen_random_uuid(), 'CLEAN_JERK', 'Clean & Jerk', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', true, true, true, now(), now()),
  (gen_random_uuid(), 'CLEAN', 'Clean', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'POWER_CLEAN', 'Power Clean', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'HANG_CLEAN', 'Hang Clean', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'HANG_POWER_CLEAN', 'Hang Power Clean', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'BLOCK_CLEAN', 'Block Clean', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'BLOCK_POWER_CLEAN', 'Block Power Clean', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'CLEAN_PULL', 'Clean Pull', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'CLEAN_HIGH_PULL', 'Clean High Pull', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'CLEAN_DEADLIFT', 'Clean Deadlift', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'JERK', 'Jerk', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'SPLIT_JERK', 'Split Jerk', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'POWER_JERK', 'Power Jerk', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'PUSH_JERK', 'Push Jerk', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'JERK_FROM_RACK', 'Jerk from Rack', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'JERK_FROM_BLOCKS', 'Jerk from Blocks', 'CLEAN_AND_JERK', 'LOAD', 'CLEAN_JERK', false, true, true, now(), now()),
  (gen_random_uuid(), 'BACK_SQUAT', 'Back Squat', 'SQUAT', 'LOAD', 'BACK_SQUAT', true, true, true, now(), now()),
  (gen_random_uuid(), 'PAUSE_BACK_SQUAT', 'Pause Back Squat', 'SQUAT', 'LOAD', 'BACK_SQUAT', false, true, true, now(), now()),
  (gen_random_uuid(), 'TEMPO_BACK_SQUAT', 'Tempo Back Squat', 'SQUAT', 'LOAD', 'BACK_SQUAT', false, true, true, now(), now()),
  (gen_random_uuid(), 'PIN_BACK_SQUAT', 'Pin Back Squat', 'SQUAT', 'LOAD', 'BACK_SQUAT', false, true, true, now(), now()),
  (gen_random_uuid(), 'BOX_SQUAT', 'Box Squat', 'SQUAT', 'LOAD', 'BACK_SQUAT', false, true, true, now(), now()),
  (gen_random_uuid(), 'FRONT_SQUAT', 'Front Squat', 'SQUAT', 'LOAD', 'FRONT_SQUAT', true, true, true, now(), now()),
  (gen_random_uuid(), 'PAUSE_FRONT_SQUAT', 'Pause Front Squat', 'SQUAT', 'LOAD', 'FRONT_SQUAT', false, true, true, now(), now()),
  (gen_random_uuid(), 'TEMPO_FRONT_SQUAT', 'Tempo Front Squat', 'SQUAT', 'LOAD', 'FRONT_SQUAT', false, true, true, now(), now()),
  (gen_random_uuid(), 'PIN_FRONT_SQUAT', 'Pin Front Squat', 'SQUAT', 'LOAD', 'FRONT_SQUAT', false, true, true, now(), now()),
  (gen_random_uuid(), 'DEADLIFT', 'Deadlift', 'DEADLIFT', 'LOAD', 'DEADLIFT', true, true, true, now(), now()),
  (gen_random_uuid(), 'ROMANIAN_DEADLIFT', 'Romanian Deadlift', 'DEADLIFT', 'LOAD', 'DEADLIFT', false, true, true, now(), now()),
  (gen_random_uuid(), 'RDL', 'RDL', 'DEADLIFT', 'LOAD', 'DEADLIFT', false, true, true, now(), now()),
  (gen_random_uuid(), 'DEFICIT_DEADLIFT', 'Deficit Deadlift', 'DEADLIFT', 'LOAD', 'DEADLIFT', false, true, true, now(), now()),
  (gen_random_uuid(), 'SNATCH_GRIP_DEADLIFT', 'Snatch Grip Deadlift', 'DEADLIFT', 'LOAD', 'DEADLIFT', false, true, true, now(), now()),
  (gen_random_uuid(), 'MOBILITY', 'Mobilidade', 'MOBILITY', 'TIME', NULL, false, true, true, now(), now()),
  (gen_random_uuid(), 'GENERAL_WARMUP', 'Aquecimento Geral', 'GENERAL_WARMUP', 'TIME', NULL, false, true, true, now(), now()),
  (gen_random_uuid(), 'CORE', 'Core', 'ACCESSORY', 'TEXT', NULL, false, true, true, now(), now()),
  (gen_random_uuid(), 'GENERAL_ACCESSORY', 'Acessório geral', 'ACCESSORY', 'TEXT', NULL, false, true, true, now(), now())
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "prescription_type" = EXCLUDED."prescription_type",
  "pr_base" = EXCLUDED."pr_base",
  "can_update_personal_record" = EXCLUDED."can_update_personal_record",
  "is_system" = true,
  "is_active" = true,
  "updated_at" = now();
