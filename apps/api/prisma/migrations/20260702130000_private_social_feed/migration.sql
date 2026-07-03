ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_POST_CREATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_POST_DELETED_BY_AUTHOR';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_POST_DELETED_BY_TRAINER';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_POST_DELETE_DENIED';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_ACCESS_DENIED';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_UPLOAD_INVALID_TYPE';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_UPLOAD_VIDEO_TOO_LONG';

CREATE TYPE "FeedPostMediaType" AS ENUM ('IMAGE', 'VIDEO');

CREATE TABLE "feed_posts" (
  "id" TEXT NOT NULL,
  "trainer_id" TEXT NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "caption" TEXT,
  "media_type" "FeedPostMediaType",
  "media_path" TEXT,
  "media_url" TEXT,
  "media_mime_type" TEXT,
  "media_size_bytes" INTEGER,
  "video_duration_seconds" INTEGER,
  "deleted_at" TIMESTAMP(3),
  "deleted_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "feed_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feed_posts_trainer_id_deleted_at_created_at_idx" ON "feed_posts"("trainer_id", "deleted_at", "created_at");
CREATE INDEX "feed_posts_author_user_id_created_at_idx" ON "feed_posts"("author_user_id", "created_at");

ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;