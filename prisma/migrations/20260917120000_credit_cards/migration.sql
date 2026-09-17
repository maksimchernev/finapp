CREATE TABLE "credit_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "gracePeriodEndDate" DATE,
    "gracePaid" BOOLEAN NOT NULL DEFAULT false,
    "minPaymentAssignmentDate" DATE,
    "assignmentProcessedDate" DATE,
    "minPaymentDueDate" DATE,
    "minPaymentAmountMinor" INTEGER,
    "minPaymentPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credit_card_balances" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_card_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credit_card_minimum_payments" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_card_minimum_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credit_card_push_deliveries" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_card_push_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "credit_cards_userId_idx" ON "credit_cards"("userId");
CREATE UNIQUE INDEX "credit_card_balances_cardId_date_key" ON "credit_card_balances"("cardId", "date");
CREATE INDEX "credit_card_minimum_payments_cardId_idx" ON "credit_card_minimum_payments"("cardId");
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");
CREATE UNIQUE INDEX "credit_card_push_deliveries_subscriptionId_eventKey_key" ON "credit_card_push_deliveries"("subscriptionId", "eventKey");

ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_card_balances" ADD CONSTRAINT "credit_card_balances_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_card_minimum_payments" ADD CONSTRAINT "credit_card_minimum_payments_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_card_push_deliveries" ADD CONSTRAINT "credit_card_push_deliveries_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_card_push_deliveries" ADD CONSTRAINT "credit_card_push_deliveries_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "push_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
