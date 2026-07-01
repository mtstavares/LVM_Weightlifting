-- AlterEnum
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINING_MESSAGE_SENT';

-- CreateTable
CREATE TABLE "training_messages" (
  "id" TEXT NOT NULL,
  "training_day_id" TEXT NOT NULL,
  "sender_user_id" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "training_messages_pkey" PRIMARY KEY ("id")
);

-- Backfill existing athlete feedback observations as immutable session messages.
INSERT INTO "training_messages" ("id", "training_day_id", "sender_user_id", "message", "created_at")
SELECT
  gen_random_uuid()::text,
  feedback."training_day_id",
  athlete."user_id",
  feedback."comment",
  feedback."created_at"
FROM "feedbacks" AS feedback
JOIN "athletes" AS athlete ON athlete."id" = feedback."athlete_id"
WHERE feedback."comment" IS NOT NULL AND btrim(feedback."comment") <> '';

-- Backfill existing trainer comments as session messages too.
INSERT INTO "training_messages" ("id", "training_day_id", "sender_user_id", "message", "created_at")
SELECT
  gen_random_uuid()::text,
  feedback."training_day_id",
  comment."coach_id",
  comment."comment",
  comment."created_at"
FROM "coach_comments" AS comment
JOIN "feedbacks" AS feedback ON feedback."id" = comment."feedback_id"
WHERE btrim(comment."comment") <> '';

CREATE INDEX "training_messages_training_day_id_created_at_idx"
ON "training_messages"("training_day_id", "created_at");

CREATE INDEX "training_messages_sender_user_id_created_at_idx"
ON "training_messages"("sender_user_id", "created_at");

ALTER TABLE "training_messages"
ADD CONSTRAINT "training_messages_training_day_id_fkey"
FOREIGN KEY ("training_day_id") REFERENCES "training_days"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "training_messages"
ADD CONSTRAINT "training_messages_sender_user_id_fkey"
FOREIGN KEY ("sender_user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
