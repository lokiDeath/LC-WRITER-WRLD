-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "avatar" TEXT,
    "writingStatus" TEXT NOT NULL DEFAULT 'Writing',
    "ascensionTier" INTEGER NOT NULL DEFAULT 0,
    "attunement" INTEGER NOT NULL DEFAULT 0,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ageVerified" BOOLEAN NOT NULL DEFAULT false,
    "hiddenModeUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "hiddenModeCode" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "appearance" TEXT NOT NULL DEFAULT 'Dark',
    "accentColor" TEXT NOT NULL DEFAULT 'Default',
    "language" TEXT NOT NULL DEFAULT 'English (US)',
    "startupBehavior" TEXT NOT NULL DEFAULT 'Open last active Hub/DM',
    "sendWithEnter" BOOLEAN NOT NULL DEFAULT true,
    "autoSaveDocs" BOOLEAN NOT NULL DEFAULT true,
    "smartReadingCompanion" BOOLEAN NOT NULL DEFAULT false,
    "aiChatMemoryAutoload" BOOLEAN NOT NULL DEFAULT false,
    "allowIncomingCalls" BOOLEAN NOT NULL DEFAULT true,
    "showCallAlerts" BOOLEAN NOT NULL DEFAULT true,
    "showMessagePreviews" BOOLEAN NOT NULL DEFAULT true,
    "reactionNotifications" BOOLEAN NOT NULL DEFAULT false,
    "notifHubs" TEXT NOT NULL DEFAULT 'Push',
    "notifSharedProjects" TEXT NOT NULL DEFAULT 'Both',
    "notifProjectAnalysis" TEXT NOT NULL DEFAULT 'Push',
    "notifAIArt" TEXT NOT NULL DEFAULT 'Push',
    "notifLoreGap" TEXT NOT NULL DEFAULT 'Off',
    "notifProductUpdates" TEXT NOT NULL DEFAULT 'Email',
    "notifFeedbackEmails" TEXT NOT NULL DEFAULT 'Email',
    "personalAccent" TEXT NOT NULL DEFAULT 'Shadow Purple',
    "editorFontFamily" TEXT NOT NULL DEFAULT 'Serif (Novel Standard)',
    "editorFontSize" TEXT NOT NULL DEFAULT '16px',
    "lineSpacing" TEXT NOT NULL DEFAULT '1.5 (Recommended)',
    "compactMode" BOOLEAN NOT NULL DEFAULT false,
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
    "critiqueSeverity" TEXT NOT NULL DEFAULT 'Balanced (Constructive logic)',
    "loreAdherence" TEXT NOT NULL DEFAULT 'Strict Lore Match',
    "globalDirectives" TEXT NOT NULL DEFAULT '',
    "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LinkedAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hub" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarInitial" TEXT NOT NULL DEFAULT '⌘',
    "isTheHub" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubMember" (
    "id" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "favorited" BOOLEAN NOT NULL DEFAULT false,
    "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HubMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubMessage" (
    "id" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "replyToId" TEXT,
    "attachmentName" TEXT,
    "attachmentType" TEXT,
    "attachmentUrl" TEXT,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isSystemLog" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HubMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL DEFAULT 'hub',

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMember" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "favorited" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "replyToId" TEXT,
    "attachmentName" TEXT,
    "attachmentType" TEXT,
    "attachmentUrl" TEXT,
    "receipt" TEXT NOT NULL DEFAULT 'sent',
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTab" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tabKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Novel" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "genre" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "aiMode" TEXT NOT NULL DEFAULT 'novel_partner',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Novel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pov" TEXT,
    "arc" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "role" TEXT NOT NULL DEFAULT 'supporting',
    "age" TEXT,
    "birthday" TEXT,
    "race" TEXT,
    "cultivation" TEXT,
    "powerLevel" TEXT,
    "occupation" TEXT,
    "appearance" TEXT NOT NULL DEFAULT '',
    "height" TEXT,
    "weight" TEXT,
    "hair" TEXT,
    "eyes" TEXT,
    "voice" TEXT,
    "accent" TEXT,
    "personality" TEXT NOT NULL DEFAULT '',
    "likes" TEXT,
    "dislikes" TEXT,
    "habits" TEXT,
    "goals" TEXT,
    "secrets" TEXT,
    "background" TEXT NOT NULL DEFAULT '',
    "abilities" TEXT NOT NULL DEFAULT '',
    "qi" TEXT,
    "mana" TEXT,
    "aether" TEXT,
    "arc" TEXT NOT NULL DEFAULT '',
    "quotes" TEXT,
    "inventory" TEXT,
    "skills" TEXT,
    "magic" TEXT,
    "notes" TEXT,
    "portraitUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "novelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "novelId" TEXT,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "aiPersonality" TEXT,
    "aiMode" TEXT NOT NULL DEFAULT 'general',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMessage" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldElement" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "lore" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CultivationRealm" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "requirements" TEXT NOT NULL DEFAULT '',
    "breakthroughConditions" TEXT NOT NULL DEFAULT '',
    "failureChance" INTEGER NOT NULL DEFAULT 0,
    "energyType" TEXT NOT NULL DEFAULT 'Qi',
    "description" TEXT NOT NULL DEFAULT '',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CultivationRealm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicElement" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Fire',
    "energyCost" TEXT NOT NULL DEFAULT '',
    "weaknesses" TEXT NOT NULL DEFAULT '',
    "strengths" TEXT NOT NULL DEFAULT '',
    "combinations" TEXT NOT NULL DEFAULT '',
    "restrictions" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MagicElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "year" TEXT NOT NULL DEFAULT '',
    "month" TEXT NOT NULL DEFAULT '',
    "day" TEXT NOT NULL DEFAULT '',
    "hour" TEXT NOT NULL DEFAULT '',
    "event" TEXT NOT NULL,
    "charactersPresent" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "itemsUsed" TEXT NOT NULL DEFAULT '',
    "weather" TEXT NOT NULL DEFAULT '',
    "deaths" TEXT NOT NULL DEFAULT '',
    "births" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "fromCharacterId" TEXT NOT NULL,
    "toCharacterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlotThread" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'main',
    "status" TEXT NOT NULL DEFAULT 'open',
    "importance" INTEGER NOT NULL DEFAULT 3,
    "description" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlotThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foreshadow" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "clue" TEXT NOT NULL,
    "introducedInChapter" TEXT,
    "paidOff" BOOLEAN NOT NULL DEFAULT false,
    "paidOffInChapter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Foreshadow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "novelId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'scene',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "LinkedAccount_userId_idx" ON "LinkedAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedAccount_userId_provider_key" ON "LinkedAccount"("userId", "provider");

-- CreateIndex
CREATE INDEX "Hub_ownerId_idx" ON "Hub"("ownerId");

-- CreateIndex
CREATE INDEX "Hub_isArchived_idx" ON "Hub"("isArchived");

-- CreateIndex
CREATE INDEX "HubMember_userId_idx" ON "HubMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HubMember_hubId_userId_key" ON "HubMember"("hubId", "userId");

-- CreateIndex
CREATE INDEX "HubMessage_hubId_createdAt_idx" ON "HubMessage"("hubId", "createdAt");

-- CreateIndex
CREATE INDEX "HubMessage_senderId_idx" ON "HubMessage"("senderId");

-- CreateIndex
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_kind_key" ON "MessageReaction"("messageId", "userId", "emoji", "kind");

-- CreateIndex
CREATE INDEX "Conversation_isArchived_idx" ON "Conversation"("isArchived");

-- CreateIndex
CREATE INDEX "ConversationMember_userId_idx" ON "ConversationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationMember_conversationId_userId_key" ON "ConversationMember"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_createdAt_idx" ON "DirectMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_idx" ON "DirectMessage"("senderId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "ProjectTab_projectId_idx" ON "ProjectTab"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTab_projectId_tabKey_key" ON "ProjectTab"("projectId", "tabKey");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedAccount" ADD CONSTRAINT "LinkedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hub" ADD CONSTRAINT "Hub_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubMember" ADD CONSTRAINT "HubMember_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubMember" ADD CONSTRAINT "HubMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubMessage" ADD CONSTRAINT "HubMessage_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubMessage" ADD CONSTRAINT "HubMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubMessage" ADD CONSTRAINT "HubMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "HubMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_hubMessageId_fkey" FOREIGN KEY ("messageId") REFERENCES "HubMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_directMessageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DirectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "DirectMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTab" ADD CONSTRAINT "ProjectTab_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Novel" ADD CONSTRAINT "Novel_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "CommunityMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeListing" ADD CONSTRAINT "TradeListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldElement" ADD CONSTRAINT "WorldElement_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldElement" ADD CONSTRAINT "WorldElement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldElement" ADD CONSTRAINT "WorldElement_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorldElement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationRealm" ADD CONSTRAINT "CultivationRealm_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationRealm" ADD CONSTRAINT "CultivationRealm_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicElement" ADD CONSTRAINT "MagicElement_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicElement" ADD CONSTRAINT "MagicElement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlotThread" ADD CONSTRAINT "PlotThread_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlotThread" ADD CONSTRAINT "PlotThread_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foreshadow" ADD CONSTRAINT "Foreshadow_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foreshadow" ADD CONSTRAINT "Foreshadow_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

