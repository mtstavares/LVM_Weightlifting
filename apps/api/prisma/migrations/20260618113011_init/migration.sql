-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('COACH', 'ATHLETE');

-- CreateEnum
CREATE TYPE "TrainingWeekStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('SNATCH', 'CLEAN', 'JERK', 'SQUAT', 'PULL', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "TrainingBlockType" AS ENUM ('STANDARD', 'COMPLEX', 'STRENGTH', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "TargetPrExercise" AS ENUM ('SNATCH', 'CLEAN', 'JERK', 'BACK_SQUAT', 'FRONT_SQUAT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_settings" (
    "id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "rounding_increment" DECIMAL(4,1) NOT NULL DEFAULT 2.5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athletes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "profile_photo" TEXT,
    "birth_date" DATE,
    "weight_category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_weeks" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "TrainingWeekStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_days" (
    "id" TEXT NOT NULL,
    "training_week_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ExerciseCategory" NOT NULL,
    "description" TEXT,
    "video_reference" TEXT,
    "objective" TEXT,
    "common_errors" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_blocks" (
    "id" TEXT NOT NULL,
    "training_day_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "TrainingBlockType" NOT NULL,
    "notes" TEXT,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_sets" (
    "id" TEXT NOT NULL,
    "training_block_id" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "percentage" DECIMAL(5,2),
    "prescribed_weight" DECIMAL(6,2),
    "target_pr_exercise" "TargetPrExercise",
    "calculated_weight_snapshot" DECIMAL(6,2),
    "rest_seconds" INTEGER,
    "notes" TEXT,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complex_movements" (
    "id" TEXT NOT NULL,
    "training_block_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "reps" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complex_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_completions" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "training_day_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "training_day_id" TEXT NOT NULL,
    "rpe" INTEGER NOT NULL,
    "energy" INTEGER NOT NULL,
    "technique" INTEGER NOT NULL,
    "pain" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_comments" (
    "id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_videos" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "training_day_id" TEXT NOT NULL,
    "exercise_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "duration" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_records" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "exercise" "TargetPrExercise" NOT NULL,
    "weight" DECIMAL(6,2) NOT NULL,
    "record_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fatigue_logs" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "sleep_score" INTEGER NOT NULL,
    "stress_score" INTEGER NOT NULL,
    "motivation_score" INTEGER NOT NULL,
    "muscle_soreness" INTEGER NOT NULL,
    "joint_pain" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fatigue_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "coach_settings_coach_id_key" ON "coach_settings"("coach_id");

-- CreateIndex
CREATE UNIQUE INDEX "athletes_user_id_key" ON "athletes"("user_id");

-- CreateIndex
CREATE INDEX "athletes_coach_id_idx" ON "athletes"("coach_id");

-- CreateIndex
CREATE INDEX "training_weeks_athlete_id_status_idx" ON "training_weeks"("athlete_id", "status");

-- CreateIndex
CREATE INDEX "training_days_training_week_id_idx" ON "training_days"("training_week_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_name_key" ON "exercises"("name");

-- CreateIndex
CREATE INDEX "training_blocks_training_day_id_idx" ON "training_blocks"("training_day_id");

-- CreateIndex
CREATE INDEX "training_sets_training_block_id_idx" ON "training_sets"("training_block_id");

-- CreateIndex
CREATE INDEX "complex_movements_training_block_id_idx" ON "complex_movements"("training_block_id");

-- CreateIndex
CREATE INDEX "workout_completions_athlete_id_training_day_id_idx" ON "workout_completions"("athlete_id", "training_day_id");

-- CreateIndex
CREATE INDEX "feedbacks_athlete_id_training_day_id_idx" ON "feedbacks"("athlete_id", "training_day_id");

-- CreateIndex
CREATE INDEX "coach_comments_feedback_id_idx" ON "coach_comments"("feedback_id");

-- CreateIndex
CREATE INDEX "uploaded_videos_athlete_id_training_day_id_idx" ON "uploaded_videos"("athlete_id", "training_day_id");

-- CreateIndex
CREATE INDEX "personal_records_athlete_id_exercise_idx" ON "personal_records"("athlete_id", "exercise");

-- CreateIndex
CREATE INDEX "fatigue_logs_athlete_id_created_at_idx" ON "fatigue_logs"("athlete_id", "created_at");

-- AddForeignKey
ALTER TABLE "coach_settings" ADD CONSTRAINT "coach_settings_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_weeks" ADD CONSTRAINT "training_weeks_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_days" ADD CONSTRAINT "training_days_training_week_id_fkey" FOREIGN KEY ("training_week_id") REFERENCES "training_weeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_blocks" ADD CONSTRAINT "training_blocks_training_day_id_fkey" FOREIGN KEY ("training_day_id") REFERENCES "training_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sets" ADD CONSTRAINT "training_sets_training_block_id_fkey" FOREIGN KEY ("training_block_id") REFERENCES "training_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complex_movements" ADD CONSTRAINT "complex_movements_training_block_id_fkey" FOREIGN KEY ("training_block_id") REFERENCES "training_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complex_movements" ADD CONSTRAINT "complex_movements_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_completions" ADD CONSTRAINT "workout_completions_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_completions" ADD CONSTRAINT "workout_completions_training_day_id_fkey" FOREIGN KEY ("training_day_id") REFERENCES "training_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_training_day_id_fkey" FOREIGN KEY ("training_day_id") REFERENCES "training_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_comments" ADD CONSTRAINT "coach_comments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedbacks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_comments" ADD CONSTRAINT "coach_comments_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_videos" ADD CONSTRAINT "uploaded_videos_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_videos" ADD CONSTRAINT "uploaded_videos_training_day_id_fkey" FOREIGN KEY ("training_day_id") REFERENCES "training_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fatigue_logs" ADD CONSTRAINT "fatigue_logs_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
