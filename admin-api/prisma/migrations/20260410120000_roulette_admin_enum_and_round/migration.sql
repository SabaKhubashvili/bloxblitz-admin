-- Align admin-api Prisma with main DB: GameType variants, RouletteColor, RouletteRound.

DO $$ BEGIN
  CREATE TYPE "RouletteColor" AS ENUM ('GREEN', 'BROWN', 'YELLOW');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- PostgreSQL 15+: skip if label already present (shared DB with main app).
ALTER TYPE "GameType" ADD VALUE IF NOT EXISTS 'ROULETTE';
ALTER TYPE "GameType" ADD VALUE IF NOT EXISTS 'TOWERS';

CREATE TABLE IF NOT EXISTS "RouletteRound" (
    "id" TEXT NOT NULL,
    "gameIndex" INTEGER NOT NULL,
    "serverSeed" VARCHAR(128) NOT NULL,
    "eosBlockId" VARCHAR(64) NOT NULL,
    "outcomeHash" VARCHAR(64) NOT NULL,
    "outcome" "RouletteColor" NOT NULL,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RouletteRound_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RouletteRound_gameIndex_key" ON "RouletteRound"("gameIndex");
CREATE INDEX IF NOT EXISTS "RouletteRound_gameIndex_idx" ON "RouletteRound"("gameIndex" DESC);
CREATE INDEX IF NOT EXISTS "RouletteRound_createdAt_idx" ON "RouletteRound"("createdAt" DESC);
