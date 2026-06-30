import { Prisma, PrismaClient } from "@prisma/client";

export type BankPrisma = Pick<PrismaClient, "bank">;

export function normalizeBankName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function toBankCreateData(
  userId: string,
  name: string,
): Prisma.BankUncheckedCreateInput {
  const trimmedName = name.trim().replace(/\s+/g, " ");
  return {
    userId,
    name: trimmedName,
    normalizedName: normalizeBankName(trimmedName),
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
) {
  const data = toBankCreateData(userId, name);
  return prisma.bank.upsert({
    where: {
      userId_normalizedName: {
        userId,
        normalizedName: data.normalizedName,
      },
    },
    create: data,
    update: { name: data.name },
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
