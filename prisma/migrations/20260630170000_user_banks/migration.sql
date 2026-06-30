CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "transactions" ADD COLUMN "bankId" TEXT;

CREATE UNIQUE INDEX "banks_userId_normalizedName_key" ON "banks"("userId", "normalizedName");
CREATE INDEX "banks_userId_idx" ON "banks"("userId");
CREATE INDEX "transactions_bankId_idx" ON "transactions"("bankId");

ALTER TABLE "banks" ADD CONSTRAINT "banks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
