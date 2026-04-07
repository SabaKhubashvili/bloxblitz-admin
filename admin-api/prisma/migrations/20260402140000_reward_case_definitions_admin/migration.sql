-- Reward case admin controls + wager settings (shared with main app DB).

ALTER TABLE "reward_case_definitions" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "reward_case_definitions" ADD COLUMN IF NOT EXISTS "receivesWagerKeys" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reward_case_definitions" ADD COLUMN IF NOT EXISTS "wagerCoinsPerKey" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "reward_case_definitions" ADD COLUMN IF NOT EXISTS "wagerKeysMaxPerEvent" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "reward_case_definitions" ADD COLUMN IF NOT EXISTS "levelUpKeysOverride" INTEGER;

UPDATE "reward_case_definitions"
SET "receivesWagerKeys" = true
WHERE "slug" = 'reward-bronze';
