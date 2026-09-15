-- CreateTable
CREATE TABLE "DbComment" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "authorHash" TEXT NOT NULL,
    "authorAlias" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DbComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DbComment_resourceId_createdAt_idx" ON "DbComment"("resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "DbComment_authorHash_idx" ON "DbComment"("authorHash");

-- AddForeignKey
ALTER TABLE "DbComment" ADD CONSTRAINT "DbComment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "DbResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
