ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_COMMENT_CREATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_COMMENT_DELETED_BY_AUTHOR';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_COMMENT_DELETED_BY_TRAINER';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_COMMENT_DELETE_DENIED';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_COMMENT_CREATE_DENIED';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_LIKE_CREATED';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_LIKE_REMOVED';
ALTER TYPE "AuthAuditEvent" ADD VALUE IF NOT EXISTS 'FEED_LIKE_DENIED';

CREATE TABLE "feed_comments" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "deleted_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "feed_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feed_likes" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feed_likes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feed_comments_post_id_deleted_at_created_at_idx" ON "feed_comments"("post_id", "deleted_at", "created_at");
CREATE INDEX "feed_comments_author_user_id_created_at_idx" ON "feed_comments"("author_user_id", "created_at");
CREATE INDEX "feed_likes_post_id_created_at_idx" ON "feed_likes"("post_id", "created_at");
CREATE INDEX "feed_likes_user_id_created_at_idx" ON "feed_likes"("user_id", "created_at");
CREATE UNIQUE INDEX "feed_likes_post_id_user_id_key" ON "feed_likes"("post_id", "user_id");

ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
