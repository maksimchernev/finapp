import { Category, Prisma, PrismaClient } from "@prisma/client";
import { TransactionInput } from "../types";

export type TransactionPrisma = Pick<PrismaClient, "transaction" | "category" | "bank">;

export type TransactionListFilters = {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
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
      ...(filters.endDate && { lte: new Date(filters.endDate) }),
    };
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
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
      orderBy: { date: "desc" },
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
  totalMinor: number;
  count: number;
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

  const totalIncomeMinor = transactions
    .filter((transaction) => transaction.amountMinor > 0)
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);

  const totalExpenseMinor = transactions
    .filter((transaction) => transaction.amountMinor < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amountMinor), 0);

  const byCategory = transactions.reduce<Record<string, CategoryStat>>((acc, transaction) => {
    if (!transaction.category) return acc;
    const key = transaction.category.id;
    if (!acc[key]) {
      acc[key] = { category: transaction.category, totalMinor: 0, count: 0 };
    }
    acc[key].totalMinor += Math.abs(transaction.amountMinor);
    acc[key].count += 1;
    return acc;
  }, {});

  return {
    totalIncomeMinor,
    totalExpenseMinor,
    balanceMinor: totalIncomeMinor - totalExpenseMinor,
    byCategory: Object.values(byCategory),
  };
}
