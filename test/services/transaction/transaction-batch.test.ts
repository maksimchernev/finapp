import assert from "node:assert/strict";
import test from "node:test";
import {
  createUserTransactions,
  type TransactionPrisma,
} from "../../../src/services/transaction.service";

test("creating transactions in batch uses one createManyAndReturn call scoped to user", async () => {
  const calls: Array<{ method: string; args: unknown }> = [];
  const prisma = {
    $transaction: async (
      callback: (transaction: {
        transaction: {
          createManyAndReturn: (args: unknown) => Promise<unknown[]>;
        };
        bank: {
          updateMany: (args: unknown) => Promise<{ count: number }>;
        };
      }) => Promise<unknown>,
    ) => {
      calls.push({ method: "$transaction", args: undefined });
      return callback(prisma);
    },
    transaction: {
      createManyAndReturn: async (args: unknown) => {
        calls.push({ method: "createManyAndReturn", args });
        return [];
      },
    },
    bank: {
      updateMany: async (args: unknown) => {
        calls.push({ method: "bank.updateMany", args });
        return { count: 2 };
      },
    },
  } as unknown as TransactionPrisma;

  await createUserTransactions(prisma, "user-1", [
    {
      amountMinor: -10000,
      currency: "RUB",
      date: "2026-07-02",
      merchant: "Coffee",
      bankId: "bank-1",
      sourceType: "screenshot",
    },
    {
      amountMinor: -24000,
      currency: "RUB",
      date: "2026-07-02",
      merchant: "Market",
      bankId: "bank-1",
      sourceType: "screenshot",
    },
    {
      amountMinor: -50000,
      currency: "RUB",
      date: "2026-07-02",
      merchant: "Fuel",
      bankId: "bank-2",
      sourceType: "screenshot",
    },
  ]);

  assert.equal(calls[0]?.method, "$transaction");
  assert.deepEqual(calls[1], {
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
          bankId: "bank-1",
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
          bankId: "bank-1",
          confidence: undefined,
          sourceType: "screenshot",
          notes: undefined,
        },
        {
          userId: "user-1",
          amountMinor: -50000,
          currency: "RUB",
          date: new Date("2026-07-02"),
          merchant: "Fuel",
          categoryId: undefined,
          bankId: "bank-2",
          confidence: undefined,
          sourceType: "screenshot",
          notes: undefined,
        },
      ],
    },
  });
  assert.equal(calls[2]?.method, "bank.updateMany");
  assert.deepEqual(
    (calls[2]?.args as { where: unknown }).where,
    {
      userId: "user-1",
      id: { in: ["bank-1", "bank-2"] },
    },
  );
  assert.ok(
    (calls[2]?.args as { data: { lastImportedAt: unknown } }).data
      .lastImportedAt instanceof Date,
  );
});
