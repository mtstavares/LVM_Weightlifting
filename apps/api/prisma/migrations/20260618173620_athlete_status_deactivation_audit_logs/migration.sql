-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'FAILURE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthAuditEvent" ADD VALUE 'ATHLETE_INVITATION_RESENT';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'ATHLETE_FIRST_LOGIN';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'ATHLETE_TEMPORARY_PASSWORD_CHANGED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'ATHLETE_DEACTIVATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'ATHLETE_REACTIVATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'ATHLETE_UPDATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINING_CREATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINING_UPDATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINING_ARCHIVED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'FEEDBACK_CREATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'FEEDBACK_UPDATED';

-- AlterTable
ALTER TABLE "athletes" ADD COLUMN     "deactivated_at" TIMESTAMP(3),
ADD COLUMN     "deactivation_reason" TEXT;

-- AlterTable
ALTER TABLE "auth_audit_logs" ADD COLUMN     "actor_user_id" TEXT,
ADD COLUMN     "affected_user_id" TEXT,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "result" "AuditResult" NOT NULL DEFAULT 'SUCCESS',
ADD COLUMN     "user_agent" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "first_login_at" TIMESTAMP(3),
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "last_password_change_at" TIMESTAMP(3);

-- Backfill legacy audit records and account milestones.
UPDATE "auth_audit_logs"
SET
  "actor_user_id" = "user_id",
  "affected_user_id" = "user_id",
  "description" = lower(replace("event"::text, '_', ' ')) || CASE
    WHEN "email" IS NOT NULL THEN ': ' || "email"
    ELSE ''
  END || '.';

UPDATE "users"
SET
  "first_login_at" = COALESCE("temporary_password_used_at", "updated_at"),
  "last_login_at" = COALESCE("temporary_password_used_at", "updated_at"),
  "last_password_change_at" = CASE
    WHEN "must_change_password" = false THEN "updated_at"
    ELSE NULL
  END
WHERE "role" = 'ATHLETE' AND "temporary_password_used_at" IS NOT NULL;

-- CreateIndex
CREATE INDEX "auth_audit_logs_actor_user_id_created_at_idx" ON "auth_audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "auth_audit_logs_affected_user_id_created_at_idx" ON "auth_audit_logs"("affected_user_id", "created_at");

-- CreateIndex
CREATE INDEX "auth_audit_logs_event_result_created_at_idx" ON "auth_audit_logs"("event", "result", "created_at");

-- AddForeignKey
ALTER TABLE "auth_audit_logs" ADD CONSTRAINT "auth_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_audit_logs" ADD CONSTRAINT "auth_audit_logs_affected_user_id_fkey" FOREIGN KEY ("affected_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
