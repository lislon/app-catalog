-- AlterTable: per-source check schedule, for the pulse mark in the Sources list
ALTER TABLE "SourceReference" ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "nextCheckAfter" TIMESTAMP(3),
ADD COLUMN     "lastContentChangeAt" TIMESTAMP(3),
ADD COLUMN     "checkIntervalHours" INTEGER,
ADD COLUMN     "changeHistory" JSONB;
