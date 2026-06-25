-- Store money as integer minor units and remove source artifacts.
ALTER TABLE "transactions" ADD COLUMN "amountMinor" INTEGER;

UPDATE "transactions"
SET "amountMinor" = ROUND("amount" * 100)::INTEGER
WHERE "amountMinor" IS NULL;

ALTER TABLE "transactions" ALTER COLUMN "amountMinor" SET NOT NULL;
ALTER TABLE "transactions" ALTER COLUMN "currency" SET DEFAULT 'RUB';
ALTER TABLE "transactions" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'screenshot';
ALTER TABLE "transactions" DROP COLUMN "amount";
ALTER TABLE "transactions" DROP COLUMN "imageUrl";

CREATE INDEX "transactions_userId_date_idx" ON "transactions"("userId", "date");
