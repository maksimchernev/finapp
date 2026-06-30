import { Prisma, PrismaClient } from "@prisma/client";

export type BankPrisma = Pick<PrismaClient, "bank">;

export function normalizeBankName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeBankDisplayName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeBankKeywords(keywords: string[] = []) {
  return [...new Set(keywords.map(normalizeBankName).filter(Boolean))];
}

export function toBankCreateData(
  userId: string,
  name: string,
  keywords: string[] = [],
): Prisma.BankUncheckedCreateInput {
  const trimmedName = normalizeBankDisplayName(name);
  return {
    userId,
    name: trimmedName,
    normalizedName: normalizeBankName(trimmedName),
    keywords: normalizeBankKeywords([trimmedName, ...keywords]),
  };
}

export function listUserBanks(prisma: BankPrisma, userId: string) {
  return prisma.bank.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function createUserBank(
  prisma: BankPrisma,
  userId: string,
  name: string,
  keywords: string[] = [],
) {
  const nextData = toBankCreateData(userId, name, keywords);
  const nextKeywords = normalizeBankKeywords([name, ...keywords]);
  const existingBank = await prisma.bank.findUnique({
    where: {
      userId_normalizedName: {
        userId,
        normalizedName: nextData.normalizedName,
      },
    },
  });

  if (!existingBank) {
    return prisma.bank.create({ data: nextData });
  }

  return prisma.bank.update({
    where: { id: existingBank.id },
    data: {
      name: nextData.name,
      keywords: normalizeBankKeywords([
        ...existingBank.keywords,
        ...nextKeywords,
      ]),
    },
  });
}

export async function updateUserBank(
  prisma: BankPrisma,
  userId: string,
  bankId: string,
  data: { name: string; keywords: string[] },
) {
  const existingBank = await prisma.bank.findFirst({
    where: { id: bankId, userId },
    select: { id: true },
  });

  if (!existingBank) {
    return null;
  }

  const name = normalizeBankDisplayName(data.name);

  return prisma.bank.update({
    where: { id: bankId },
    data: {
      keywords: normalizeBankKeywords(data.keywords),
      name,
      normalizedName: normalizeBankName(name),
    },
  });
}

export async function userBankExists(
  prisma: BankPrisma,
  userId: string,
  bankId: string | null | undefined,
) {
  if (!bankId) return true;

  const bank = await prisma.bank.findFirst({
    where: { id: bankId, userId },
    select: { id: true },
  });

  return Boolean(bank);
}
