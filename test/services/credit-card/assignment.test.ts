import assert from "node:assert/strict";
import test from "node:test";
import { processCreditCardAssignments } from "../../../src/services/credit-card.service";

test("assignment archives the previous payment once and clears only the active payment", async () => {
  const card = {
    id: "card-a",
    userId: "user-a",
    minPaymentAssignmentDate: new Date("2026-09-17T00:00:00.000Z"),
    assignmentProcessedDate: null as Date | null,
    minPaymentDueDate: new Date("2026-09-20T00:00:00.000Z") as Date | null,
    minPaymentAmountMinor: 12345 as number | null,
    minPaymentPaid: true,
  };
  const archived: Array<Record<string, unknown>> = [];
  const database = {
    creditCard: {
      findMany: async () => [card],
      updateMany: async ({ where, data }: { where: { userId: string; assignmentProcessedDate: Date | null }; data: Record<string, unknown> }) => {
        if (where.userId !== card.userId || where.assignmentProcessedDate !== card.assignmentProcessedDate) return { count: 0 };
        Object.assign(card, data);
        return { count: 1 };
      },
    },
    creditCardMinimumPayment: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        archived.push(data);
      },
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(database),
  };

  await processCreditCardAssignments(database as never, "2026-09-17", "user-a");
  await processCreditCardAssignments(database as never, "2026-09-17", "user-a");

  assert.equal(archived.length, 1);
  assert.equal(archived[0].amountMinor, 12345);
  assert.equal(archived[0].paid, true);
  assert.equal(card.minPaymentDueDate, null);
  assert.equal(card.minPaymentAmountMinor, null);
  assert.equal(card.minPaymentPaid, false);
});
