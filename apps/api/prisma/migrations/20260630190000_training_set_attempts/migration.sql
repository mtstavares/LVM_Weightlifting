CREATE TABLE "training_set_attempts" (
  "id" TEXT NOT NULL,
  "training_set_id" TEXT NOT NULL,
  "set_index" INTEGER NOT NULL,
  "successful" BOOLEAN NOT NULL,
  "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "training_set_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "training_set_attempts_training_set_id_set_index_key"
ON "training_set_attempts"("training_set_id", "set_index");

CREATE INDEX "training_set_attempts_training_set_id_idx"
ON "training_set_attempts"("training_set_id");

ALTER TABLE "training_set_attempts"
ADD CONSTRAINT "training_set_attempts_training_set_id_fkey"
FOREIGN KEY ("training_set_id") REFERENCES "training_sets"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
