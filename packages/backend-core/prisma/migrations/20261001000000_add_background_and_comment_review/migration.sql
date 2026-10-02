-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('applied', 'acknowledged');

-- AlterTable
ALTER TABLE "DbResource" ADD COLUMN "background" TEXT;

-- AlterTable
ALTER TABLE "DbComment" ADD COLUMN "status" "CommentStatus",
ADD COLUMN "reviewerReply" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3);
