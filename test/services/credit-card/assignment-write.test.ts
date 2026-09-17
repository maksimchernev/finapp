import assert from "node:assert/strict";
import test from "node:test";
import { createUserCreditCard, updateUserCreditCard, type CreditCardInput } from "../../../src/services/credit-card.service";

const input: CreditCardInput = {
  name: "Карта",
  currency: "RUB",
  gracePeriodEndDate: null,
  gracePaid: false,
  minPaymentAssignmentDate: "2026-09-17",
  minPaymentDueDate: "2026-09-25",
  minPaymentAmountMinor: 10000,
  minPaymentPaid: false,
};

test("new payment entered on its assignment day remains active", async () => {
  let created: Record<string, unknown> | null = null;
  const prisma = {
    creditCard: {
      create: async ({ data }: { data: Record<string, unknown> }) => { created = data; return { id: "card-a" }; },
      findFirst: async () => null,
    },
  };

  await createUserCreditCard(prisma as never, "user-a", input, "2026-09-17");
  assert.equal((created as Record<string, unknown> | null)?.assignmentProcessedDate instanceof Date, true);
});

test("updating a payment after the assignment date does not archive the new values", async () => {
  let updated: Record<string, unknown> | null = null;
  let lookup = 0;
  const prisma = {
    creditCard: {
      findFirst: async () => {
        lookup += 1;
        return lookup === 1 ? {
          id: "card-a",
          minPaymentAssignmentDate: new Date("2026-09-17T00:00:00Z"),
          minPaymentDueDate: null,
          minPaymentAmountMinor: null,
          assignmentProcessedDate: null,
        } : null;
      },
      update: async ({ data }: { data: Record<string, unknown> }) => { updated = data; },
    },
  };

  await updateUserCreditCard(prisma as never, "user-a", "card-a", input, "2026-09-17");
  assert.equal((updated as Record<string, unknown> | null)?.assignmentProcessedDate instanceof Date, true);
});

test("switching from a due payment to its next assignment date keeps the old payment in history", async () => {
  const existing = {
    id: "card-a",
    userId: "user-a",
    minPaymentAssignmentDate: new Date("2026-09-17T00:00:00Z"),
    minPaymentDueDate: new Date("2026-09-25T00:00:00Z"),
    minPaymentAmountMinor: 10000,
    minPaymentPaid: true,
    assignmentProcessedDate: new Date("2026-09-17T00:00:00Z"),
  };
  const archived: Array<Record<string, unknown>> = [];
  let lookups = 0;
  const database = {
    creditCard: {
      findFirst: async () => { lookups += 1; return lookups === 1 ? existing : null; },
      update: async () => undefined,
    },
    creditCardMinimumPayment: {
      create: async ({ data }: { data: Record<string, unknown> }) => { archived.push(data); },
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(database),
  };

  await updateUserCreditCard(database as never, "user-a", "card-a", {
    ...input,
    minPaymentAssignmentDate: "2026-10-10",
    minPaymentDueDate: null,
    minPaymentAmountMinor: null,
    minPaymentPaid: false,
  }, "2026-09-20");

  assert.equal(archived.length, 1);
  assert.equal(archived[0].cardId, "card-a");
  assert.equal(archived[0].amountMinor, 10000);
  assert.equal(archived[0].paid, true);
});
