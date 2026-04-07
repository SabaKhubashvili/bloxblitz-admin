-- CreateIndex
CREATE INDEX "GameHistory_createdAt_idx" ON "GameHistory"("createdAt");

-- CreateIndex
CREATE INDEX "GameHistory_gameType_createdAt_idx" ON "GameHistory"("gameType", "createdAt");
