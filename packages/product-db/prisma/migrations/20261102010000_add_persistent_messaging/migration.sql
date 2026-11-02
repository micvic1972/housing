CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignedAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "clientMessageId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_studentId_listingId_key"
    ON "Conversation"("studentId", "listingId");
CREATE INDEX "Conversation_studentId_updatedAt_idx"
    ON "Conversation"("studentId", "updatedAt");
CREATE INDEX "Conversation_assignedAdminId_updatedAt_idx"
    ON "Conversation"("assignedAdminId", "updatedAt");
CREATE UNIQUE INDEX "Message_conversationId_clientMessageId_key"
    ON "Message"("conversationId", "clientMessageId");
CREATE INDEX "Message_conversationId_createdAt_idx"
    ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_conversationId_senderRole_readAt_idx"
    ON "Message"("conversationId", "senderRole", "readAt");

ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
