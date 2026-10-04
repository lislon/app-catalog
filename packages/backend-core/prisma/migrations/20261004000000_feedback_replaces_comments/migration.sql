-- Comments become feedback: one object for a note, a correction, or an ask for something
-- the catalog does not have yet. Ids are carried over rather than regenerated, because the
-- review tooling prints them and a maintainer may be holding one in a terminal scrollback.

-- CreateTable
CREATE TABLE "DbFeedback" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT,
    "subject" TEXT,
    "authorHash" TEXT NOT NULL,
    "authorAlias" TEXT NOT NULL,
    "body" TEXT,
    "editedAt" TIMESTAMP(3),
    "status" "CommentStatus",
    "reviewerReply" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DbFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DbFeedbackAttachment" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT,
    "content" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "originalFilename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DbFeedbackAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DbFeedback_resourceId_createdAt_idx" ON "DbFeedback"("resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "DbFeedback_authorHash_idx" ON "DbFeedback"("authorHash");

-- CreateIndex
CREATE INDEX "DbFeedback_status_createdAt_idx" ON "DbFeedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DbFeedbackAttachment_feedbackId_idx" ON "DbFeedbackAttachment"("feedbackId");

-- AddForeignKey
ALTER TABLE "DbFeedback" ADD CONSTRAINT "DbFeedback_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "DbResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DbFeedbackAttachment" ADD CONSTRAINT "DbFeedbackAttachment_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "DbFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry every existing comment across, ids and review state intact. `body` was NOT NULL on
-- DbComment and is nullable here, so nothing needs coercing.
INSERT INTO "DbFeedback" (
    "id", "resourceId", "subject", "authorHash", "authorAlias", "body",
    "editedAt", "status", "reviewerReply", "reviewedAt", "createdAt", "updatedAt"
)
SELECT
    "id", "resourceId", NULL, "authorHash", "authorAlias", "body",
    "editedAt", "status", "reviewerReply", "reviewedAt", "createdAt", "updatedAt"
FROM "DbComment";

-- DropTable
DROP TABLE "DbComment";
