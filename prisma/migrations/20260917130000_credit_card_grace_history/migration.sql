CREATE TABLE "credit_card_grace_periods" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "endDate" DATE NOT NULL,
    "paid" BOOLEAN NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_card_grace_periods_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "credit_card_grace_periods_cardId_idx" ON "credit_card_grace_periods"("cardId");

ALTER TABLE "credit_card_grace_periods" ADD CONSTRAINT "credit_card_grace_periods_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
