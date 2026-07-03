import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUserTransactionIdentity,
  buildUserTransactionWhere,
  deleteUserTransaction,
  getUserTransactionStatistics,
  listUserTransactions,
  updateUserTransaction,
  type TransactionPrisma,
} from "../../../src/services/transaction.service";

type FakeTransaction = {
  id: string;
  userId: string;
  amountMinor: number;
  currency?: string;
  date: Date;
  merchant: string;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    nameRu: string;
    icon: string;
    color: string;
    bgColor: string;
    type: string;
    keywords: string[];
    isDefault: boolean;
    createdAt: Date;
  } | null;
};

function createFakeCategory(id: string, type: "expense" | "income" = "expense") {
  return {
    id,
    name: id,
    nameRu: id,
    icon: "receipt",
    color: "#244c38",
    bgColor: "#e6eee8",
    type,
    keywords: [],
    isDefault: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function createFakePrisma(transactions: FakeTransaction[]) {
  const calls: Array<{ method: string; args: unknown }> = [];

  const prisma = {
    transaction: {
      findMany: async (args: { where: { userId: string } }) => {
        calls.push({ method: "findMany", args });
        return transactions.filter((transaction) => transaction.userId === args.where.userId);
      },
      count: async (args: { where: { userId: string } }) => {
        calls.push({ method: "count", args });
        return transactions.filter((transaction) => transaction.userId === args.where.userId).length;
      },
      findFirst: async (args: { where: { id: string; userId: string }; select?: { id: true } }) => {
        calls.push({ method: "findFirst", args });
        const transaction = transactions.find((item) => item.id === args.where.id && item.userId === args.where.userId);
        if (!transaction) return null;
        return args.select ? { id: transaction.id } : transaction;
      },
      update: async (args: { where: { id: string }; data: Partial<FakeTransaction> }) => {
        calls.push({ method: "update", args });
        const transaction = transactions.find((item) => item.id === args.where.id);
        if (!transaction) throw new Error("Transaction not found");
        Object.assign(transaction, args.data);
        return transaction;
      },
      delete: async (args: { where: { id: string } }) => {
        calls.push({ method: "delete", args });
        return transactions.find((item) => item.id === args.where.id);
      },
    },
    category: {
      findUnique: async () => null,
    },
  };

  return { calls, prisma: prisma as unknown as TransactionPrisma };
}

test("transaction identity always includes the current user id", () => {
  assert.deepEqual(buildUserTransactionIdentity("user-b", "tx-a"), {
    id: "tx-a",
    userId: "user-b",
  });
});

test("transaction list filters are always scoped by user id", () => {
  assert.deepEqual(buildUserTransactionWhere("user-a"), { userId: "user-a" });
});

test("listing transactions returns only the current user's rows", async () => {
  const category = createFakeCategory("groceries");
  const { prisma, calls } = createFakePrisma([
    {
      id: "tx-a",
      userId: "user-a",
      amountMinor: -1200,
      date: new Date("2026-01-02T00:00:00.000Z"),
      merchant: "Market",
      categoryId: category.id,
      category,
    },
    {
      id: "tx-b",
      userId: "user-b",
      amountMinor: -900,
      date: new Date("2026-01-02T00:00:00.000Z"),
      merchant: "Cafe",
      categoryId: category.id,
      category,
    },
  ]);

  const result = await listUserTransactions(prisma, "user-a", {}, { limit: 100, offset: 0 });

  assert.equal(result.total, 1);
  assert.deepEqual(result.transactions.map((transaction) => transaction.id), ["tx-a"]);
  assert.deepEqual(
    calls.filter((call) => call.method === "findMany" || call.method === "count").map((call) => call.args),
    [
      {
        where: { userId: "user-a" },
        include: { bank: true, category: true },
        orderBy: { date: "desc" },
        take: 100,
        skip: 0,
      },
      { where: { userId: "user-a" } },
    ],
  );
});

test("updating another user's transaction is rejected before mutation", async () => {
  const category = createFakeCategory("groceries");
  const { prisma, calls } = createFakePrisma([
    {
      id: "tx-a",
      userId: "user-a",
      amountMinor: -1200,
      date: new Date("2026-01-02T00:00:00.000Z"),
      merchant: "Market",
      categoryId: category.id,
      category,
    },
  ]);

  const result = await updateUserTransaction(prisma, "user-b", "tx-a", { amountMinor: -500 });

  assert.equal(result, null);
  assert.equal(calls.some((call) => call.method === "update"), false);
  assert.deepEqual(calls[0].args, {
    where: { id: "tx-a", userId: "user-b" },
    select: { id: true },
  });
});

test("deleting another user's transaction is rejected before mutation", async () => {
  const category = createFakeCategory("groceries");
  const { prisma, calls } = createFakePrisma([
    {
      id: "tx-a",
      userId: "user-a",
      amountMinor: -1200,
      date: new Date("2026-01-02T00:00:00.000Z"),
      merchant: "Market",
      categoryId: category.id,
      category,
    },
  ]);

  const result = await deleteUserTransaction(prisma, "user-b", "tx-a");

  assert.equal(result, false);
  assert.equal(calls.some((call) => call.method === "delete"), false);
  assert.deepEqual(calls[0].args, {
    where: { id: "tx-a", userId: "user-b" },
    select: { id: true },
  });
});

test("statistics ignore transactions owned by other users", async () => {
  const category = createFakeCategory("groceries");
  const { prisma } = createFakePrisma([
    {
      id: "income-a",
      userId: "user-a",
      amountMinor: 100000,
      date: new Date("2026-01-02T00:00:00.000Z"),
      merchant: "Salary",
      categoryId: null,
      category: null,
    },
    {
      id: "expense-a",
      userId: "user-a",
      amountMinor: -1200,
      date: new Date("2026-01-02T00:00:00.000Z"),
      merchant: "Market",
      categoryId: category.id,
      category,
    },
    {
      id: "expense-b",
      userId: "user-b",
      amountMinor: -900,
      date: new Date("2026-01-02T00:00:00.000Z"),
      merchant: "Cafe",
      categoryId: category.id,
      category,
    },
  ]);

  const statistics = await getUserTransactionStatistics(prisma, "user-a", {});

  assert.equal(statistics.totalIncomeMinor, 100000);
  assert.equal(statistics.totalExpenseMinor, 1200);
  assert.equal(statistics.balanceMinor, 98800);
  assert.deepEqual(statistics.byCategory.map((item) => item.totalMinor), [-1200]);
});

test("statistics include income and expense category totals with signs", async () => {
  const expenseCategory = createFakeCategory("groceries");
  const incomeCategory = createFakeCategory("salary", "income");
  const { prisma } = createFakePrisma([
    {
      id: "income-a",
      userId: "user-a",
      amountMinor: 100000,
      date: new Date("2026-01-02T00:00:00.000Z"),
      merchant: "Salary",
      categoryId: incomeCategory.id,
      category: incomeCategory,
    },
    {
      id: "expense-a",
      userId: "user-a",
      amountMinor: -1200,
      date: new Date("2026-01-02T00:00:00.000Z"),
      merchant: "Market",
      categoryId: expenseCategory.id,
      category: expenseCategory,
    },
  ]);

  const statistics = await getUserTransactionStatistics(prisma, "user-a", {});

  assert.deepEqual(
    statistics.byCategory.map((item) => ({ id: item.category.id, totalMinor: item.totalMinor })),
    [
      { id: "salary", totalMinor: 100000 },
      { id: "groceries", totalMinor: -1200 },
    ],
  );
});

test("statistics group totals and category totals by currency", async () => {
  const expenseCategory = createFakeCategory("groceries");
  const incomeCategory = createFakeCategory("salary", "income");
  const { prisma } = createFakePrisma([
    {
      id: "rub-income",
      userId: "user-a",
      amountMinor: 100000,
      currency: "RUB",
      date: new Date("2026-01-02T00:00:00.000Z"),
      merchant: "Salary",
      categoryId: incomeCategory.id,
      category: incomeCategory,
    },
    {
      id: "rub-expense",
      userId: "user-a",
      amountMinor: -1200,
      currency: "RUB",
      date: new Date("2026-01-02T00:00:00.000Z"),
      merchant: "Market",
      categoryId: expenseCategory.id,
      category: expenseCategory,
    },
    {
      id: "huf-expense",
      userId: "user-a",
      amountMinor: -650000,
      currency: "HUF",
      date: new Date("2026-01-02T00:00:00.000Z"),
      merchant: "Cafe",
      categoryId: expenseCategory.id,
      category: expenseCategory,
    },
  ]);

  const statistics = await getUserTransactionStatistics(prisma, "user-a", {});

  assert.deepEqual(statistics.totalsByCurrency, [
    {
      currency: "RUB",
      totalIncomeMinor: 100000,
      totalExpenseMinor: 1200,
      balanceMinor: 98800,
    },
    {
      currency: "HUF",
      totalIncomeMinor: 0,
      totalExpenseMinor: 650000,
      balanceMinor: -650000,
    },
  ]);
  assert.deepEqual(
    statistics.byCategory.map((item) => ({
      id: item.category.id,
      currency: item.currency,
      totalMinor: item.totalMinor,
    })),
    [
      { id: "salary", currency: "RUB", totalMinor: 100000 },
      { id: "groceries", currency: "RUB", totalMinor: -1200 },
      { id: "groceries", currency: "HUF", totalMinor: -650000 },
    ],
  );
  assert.equal(statistics.totalIncomeMinor, 100000);
  assert.equal(statistics.totalExpenseMinor, 1200);
  assert.equal(statistics.balanceMinor, 98800);
});
