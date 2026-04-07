-- CreateEnum
CREATE TYPE "CrashPlayerControlStatus" AS ENUM ('ACTIVE', 'LIMITED', 'BANNED');

-- CreateTable
CREATE TABLE "CrashPlayerControl" (
    "userUsername" TEXT NOT NULL,
    "status" "CrashPlayerControlStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxBetAmount" DECIMAL(12,2),
    "minSecondsBetweenBets" INTEGER,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrashPlayerControl_pkey" PRIMARY KEY ("userUsername")
);

-- CreateIndex
CREATE INDEX "CrashPlayerControl_status_idx" ON "CrashPlayerControl"("status");

-- AddForeignKey
ALTER TABLE "CrashPlayerControl" ADD CONSTRAINT "CrashPlayerControl_userUsername_fkey" FOREIGN KEY ("userUsername") REFERENCES "User"("username") ON DELETE CASCADE ON UPDATE CASCADE;
