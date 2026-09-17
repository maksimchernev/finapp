import { Category, Prisma, PrismaClient } from "@prisma/client";
import { TransactionInput } from "../types";

export type TransactionPrisma = Pick<
  PrismaClient,
  "$transaction" | "transaction" | "category" | "bank"
>;

export type TransactionListFilters = {
  startDate?: string;
  endDate?: string;
  bankId?: string;
  categoryId?: string;
  currency?: string;
};

export type PaginationOptions = {
  limit: number;
  offset: number;
};

export function buildUserTransactionWhere(
  userId: string,
  filters: TransactionListFilters = {},
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };

  if (filters.startDate || filters.endDate) {
    where.date = {
      ...(filters.startDate && { gte: new Date(filters.startDate) }),
      ...(filters.endDate && { lt: new Date(filters.endDate) }),
    };
  }

  if (filters.bankId) {
    where.bankId = filters.bankId;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.currency) {
    where.currency = filters.currency;
  }

  return where;
}

export function buildUserTransactionIdentity(
  userId: string,
  transactionId: string,
): Prisma.TransactionWhereInput {
  return { id: transactionId, userId };
}

export async function categoryExists(
  prisma: TransactionPrisma,
  userId: string,
  categoryId: string | null | undefined,
) {
  if (!categoryId) return true;

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      OR: [{ isDefault: true }, { userId }],
    },
    select: { id: true },
  });

  return Boolean(category);
}

export async function listUserTransactions(
  prisma: TransactionPrisma,
  userId: string,
  filters: TransactionListFilters,
  pagination: PaginationOptions,
) {
  const where = buildUserTransactionWhere(userId, filters);

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { bank: true, category: true },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: pagination.limit,
      skip: pagination.offset,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total };
}

export function toTransactionCreateData(
  userId: string,
  data: TransactionInput,
): Prisma.TransactionUncheckedCreateInput {
  return {
    userId,
    amountMinor: data.amountMinor,
    currency: data.currency || "RUB",
    date: new Date(data.date),
    merchant: data.merchant,
    categoryId: data.categoryId || undefined,
    bankId: data.bankId || undefined,
    confidence: data.confidence,
    sourceType: data.sourceType || "screenshot",
    notes: data.notes,
  };
}

export function toTransactionUpdateData(
  data: Partial<TransactionInput>,
): Prisma.TransactionUncheckedUpdateInput {
  return {
    ...(data.amountMinor !== undefined && { amountMinor: data.amountMinor }),
    ...(data.currency && { currency: data.currency }),
    ...(data.date && { date: new Date(data.date) }),
    ...(data.merchant && { merchant: data.merchant }),
    ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
    ...(data.bankId !== undefined && { bankId: data.bankId }),
    ...(data.confidence !== undefined && { confidence: data.confidence }),
    ...(data.sourceType && { sourceType: data.sourceType }),
    ...(data.notes !== undefined && { notes: data.notes }),
  };
}

export async function createUserTransaction(
  prisma: TransactionPrisma,
  userId: string,
  data: TransactionInput,
) {
  return prisma.transaction.create({
    data: toTransactionCreateData(userId, data),
    include: { bank: true, category: true },
  });
}

export async function createUserTransactions(
  prisma: TransactionPrisma,
  userId: string,
  transactions: TransactionInput[],
) {
  const bankIds = [
    ...new Set(
      transactions
        .map((transaction) => transaction.bankId)
        .filter((bankId): bankId is string => Boolean(bankId)),
    ),
  ];
  const importedAt = new Date();

  return prisma.$transaction(async (transactionPrisma) => {
    const createdTransactions =
      await transactionPrisma.transaction.createManyAndReturn({
        data: transactions.map((transaction) =>
          toTransactionCreateData(userId, transaction),
        ),
      });

    if (bankIds.length > 0) {
      await transactionPrisma.bank.updateMany({
        where: { userId, id: { in: bankIds } },
        data: { lastImportedAt: importedAt },
      });
    }

    return createdTransactions;
  });
}

export async function findUserTransaction(
  prisma: TransactionPrisma,
  userId: string,
  transactionId: string,
) {
  return prisma.transaction.findFirst({
    where: buildUserTransactionIdentity(userId, transactionId),
    include: { bank: true, category: true },
  });
}

export async function updateUserTransaction(
  prisma: TransactionPrisma,
  userId: string,
  transactionId: string,
  data: Partial<TransactionInput>,
) {
  const existing = await prisma.transaction.findFirst({
    where: buildUserTransactionIdentity(userId, transactionId),
    select: { id: true },
  });

  if (!existing) return null;

  return prisma.transaction.update({
    where: { id: transactionId },
    data: toTransactionUpdateData(data),
    include: { bank: true, category: true },
  });
}

export async function deleteUserTransaction(
  prisma: TransactionPrisma,
  userId: string,
  transactionId: string,
) {
  const existing = await prisma.transaction.findFirst({
    where: buildUserTransactionIdentity(userId, transactionId),
    select: { id: true },
  });

  if (!existing) return false;

  await prisma.transaction.delete({ where: { id: transactionId } });
  return true;
}

export type CategoryStat = {
  category: Category;
  currency: string;
  totalMinor: number;
  count: number;
};

export type CurrencyTotals = {
  currency: string;
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  balanceMinor: number;
};

export async function getUserTransactionStatistics(
  prisma: TransactionPrisma,
  userId: string,
  filters: TransactionListFilters,
) {
  const transactions = await prisma.transaction.findMany({
    where: buildUserTransactionWhere(userId, filters),
    include: { bank: true, category: true },
  });

  const totalsByCurrencyMap = transactions.reduce<Record<string, CurrencyTotals>>(
    (acc, transaction) => {
      const currency = transaction.currency || "RUB";
      if (!acc[currency]) {
        acc[currency] = {
          currency,
          totalIncomeMinor: 0,
          totalExpenseMinor: 0,
          balanceMinor: 0,
        };
      }

      if (transaction.amountMinor > 0) {
        acc[currency].totalIncomeMinor += transaction.amountMinor;
      } else if (transaction.amountMinor < 0) {
        acc[currency].totalExpenseMinor += Math.abs(transaction.amountMinor);
      }
      acc[currency].balanceMinor =
        acc[currency].totalIncomeMinor - acc[currency].totalExpenseMinor;
      return acc;
    },
    {},
  );
  const totalsByCurrency = Object.values(totalsByCurrencyMap);
  const rubTotals = totalsByCurrencyMap.RUB || {
    currency: "RUB",
    totalIncomeMinor: 0,
    totalExpenseMinor: 0,
    balanceMinor: 0,
  };

  const byCategory = transactions.reduce<Record<string, CategoryStat>>((acc, transaction) => {
    if (!transaction.category) return acc;
    const currency = transaction.currency || "RUB";
    const key = `${transaction.category.id}:${currency}`;
    if (!acc[key]) {
      acc[key] = {
        category: transaction.category,
        currency,
        totalMinor: 0,
        count: 0,
      };
    }
    acc[key].totalMinor += transaction.amountMinor;
    acc[key].count += 1;
    return acc;
  }, {});

  return {
    totalIncomeMinor: rubTotals.totalIncomeMinor,
    totalExpenseMinor: rubTotals.totalExpenseMinor,
    balanceMinor: rubTotals.balanceMinor,
    totalsByCurrency,
    byCategory: Object.values(byCategory),
  };
}
