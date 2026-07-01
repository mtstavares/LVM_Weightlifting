ALTER TABLE "training_sets"
ADD COLUMN "exercise_key" TEXT,
ADD COLUMN "pr_update_eligible" BOOLEAN NOT NULL DEFAULT false;
