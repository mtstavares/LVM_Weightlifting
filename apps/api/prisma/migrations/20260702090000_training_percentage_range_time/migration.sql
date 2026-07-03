ALTER TABLE "training_sets" ADD COLUMN "percentage_end" DECIMAL(5,2);
ALTER TABLE "training_sets" ADD COLUMN "calculated_weight_end_snapshot" DECIMAL(6,2);
ALTER TABLE "training_sets" ADD COLUMN "duration_minutes" INTEGER;
