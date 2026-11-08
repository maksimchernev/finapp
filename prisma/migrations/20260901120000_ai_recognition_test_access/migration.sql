ALTER TABLE "users" ADD COLUMN "aiTestAccess" BOOLEAN NOT NULL DEFAULT false;
UPDATE "users" SET "aiTestAccess" = true;

ALTER TABLE "user_preferences" ADD COLUMN "aiRecognitionConsent" BOOLEAN;

CREATE TABLE "ai_usage_daily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "inFlight" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_usage_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_usage_daily_userId_provider_day_key"
  ON "ai_usage_daily"("userId", "provider", "day");
CREATE INDEX "ai_usage_daily_userId_day_idx"
  ON "ai_usage_daily"("userId", "day");

ALTER TABLE "ai_usage_daily"
  ADD CONSTRAINT "ai_usage_daily_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
