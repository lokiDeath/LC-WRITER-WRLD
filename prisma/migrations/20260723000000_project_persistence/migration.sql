CREATE TABLE "ProjectChapter" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectChapter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectChatMessage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectChapter_projectId_orderIndex_idx" ON "ProjectChapter"("projectId", "orderIndex");
CREATE INDEX "ProjectChatMessage_projectId_createdAt_idx" ON "ProjectChatMessage"("projectId", "createdAt");
CREATE INDEX "ProjectChatMessage_userId_idx" ON "ProjectChatMessage"("userId");
ALTER TABLE "ProjectChapter" ADD CONSTRAINT "ProjectChapter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectChatMessage" ADD CONSTRAINT "ProjectChatMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectChatMessage" ADD CONSTRAINT "ProjectChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
