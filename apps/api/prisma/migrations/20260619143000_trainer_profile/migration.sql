-- AlterEnum
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINER_PROFILE_UPDATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'TRAINER_PHOTO_UPDATED';

-- AlterTable
ALTER TABLE "coach_settings"
ADD COLUMN "profile_photo" TEXT,
ADD COLUMN "birth_date" DATE,
ADD COLUMN "gym" TEXT,
ADD COLUMN "bio" TEXT;
