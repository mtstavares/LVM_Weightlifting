-- CreateEnum
CREATE TYPE "AccountCodeType" AS ENUM ('EMAIL_VERIFICATION');

-- CreateEnum
CREATE TYPE "AuthAuditEvent" AS ENUM ('TRAINER_REGISTERED', 'EMAIL_VERIFICATION_SENT', 'EMAIL_VERIFIED', 'EMAIL_VERIFICATION_FAILED', 'LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'PASSWORD_RECOVERY_REQUESTED', 'TEMPORARY_PASSWORD_SENT', 'PASSWORD_CHANGED', 'ATHLETE_CREATED', 'ACCESS_DENIED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "full_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locked_until" TIMESTAMP(3),
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temporary_password_expires_at" TIMESTAMP(3),
ADD COLUMN     "temporary_password_used_at" TIMESTAMP(3);

-- Preserve access for accounts created before email verification existed.
UPDATE "users"
SET
  "email_verified_at" = "updated_at",
  "is_active" = true,
  "full_name" = split_part("email", '@', 1);

-- CreateTable
CREATE TABLE "account_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "AccountCodeType" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT,
    "event" "AuthAuditEvent" NOT NULL,
    "ip_address" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_codes_user_id_type_used_at_idx" ON "account_codes"("user_id", "type", "used_at");

-- CreateIndex
CREATE INDEX "auth_audit_logs_user_id_created_at_idx" ON "auth_audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "auth_audit_logs_email_created_at_idx" ON "auth_audit_logs"("email", "created_at");

-- AddForeignKey
ALTER TABLE "account_codes" ADD CONSTRAINT "account_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_audit_logs" ADD CONSTRAINT "auth_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
