import assert from "node:assert/strict";
import test from "node:test";
import {
  createUserTransactions,
  type TransactionPrisma,
} from "../../../src/services/transaction.service";

test("creating transactions in batch uses one createManyAndReturn call scoped to user", async () => {
  const calls: Array<{ method: string; args: unknown }> = [];
  const prisma = {
    transaction: {
      createManyAndReturn: async (args: unknown) => {
        calls.push({ method: "createManyAndReturn", args });
        return [];
      },
    },
  } as unknown as TransactionPrisma;

  await createUserTransactions(prisma, "user-1", [
    {
      amountMinor: -10000,
      currency: "RUB",
      date: "2026-07-02",
      merchant: "Coffee",
      sourceType: "screenshot",
    },
    {
      amountMinor: -24000,
      currency: "RUB",
      date: "2026-07-02",
      merchant: "Market",
      sourceType: "screenshot",
    },
  ]);

  assert.deepEqual(calls, [
    {
      method: "createManyAndReturn",
      args: {
        data: [
          {
            userId: "user-1",
            amountMinor: -10000,
            currency: "RUB",
            date: new Date("2026-07-02"),
            merchant: "Coffee",
            categoryId: undefined,
            bankId: undefined,
            confidence: undefined,
            sourceType: "screenshot",
            notes: undefined,
          },
          {
            userId: "user-1",
            amountMinor: -24000,
            currency: "RUB",
            date: new Date("2026-07-02"),
            merchant: "Market",
            categoryId: undefined,
            bankId: undefined,
            confidence: undefined,
            sourceType: "screenshot",
            notes: undefined,
          },
        ],
      },
    },
  ]);
});
