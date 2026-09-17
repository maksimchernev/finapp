import {
  PrismaClient,
  type CreditCard,
  type CreditCardBalance,
  type CreditCardMinimumPayment,
} from "@prisma/client";
import { moscowDate } from "./credit-card-reminders.service";

export type CreditCardInput = {
  name: string;
  currency: string;
  gracePeriodEndDate: string | null;
  gracePaid: boolean;
  minPaymentAssignmentDate: string | null;
  minPaymentDueDate: string | null;
  minPaymentAmountMinor: number | null;
  minPaymentPaid: boolean;
};

type CardWithHistory = CreditCard & {
  balances: CreditCardBalance[];
  paymentHistory: CreditCardMinimumPayment[];
};

export function dateKey(date: Date | null) {
  return date?.toISOString().slice(0, 10) ?? null;
}

function dbDate(date: string | null) {
  return date ? new Date(`${date}T00:00:00.000Z`) : null;
}

function cardData(data: CreditCardInput) {
  return {
    name: data.name.trim().replace(/\s+/g, " "),
    currency: data.currency,
    gracePeriodEndDate: dbDate(data.gracePeriodEndDate),
    gracePaid: data.gracePaid,
    minPaymentAssignmentDate: dbDate(data.minPaymentAssignmentDate),
    minPaymentDueDate: dbDate(data.minPaymentDueDate),
    minPaymentAmountMinor: data.minPaymentAmountMinor,
    minPaymentPaid: data.minPaymentPaid,
  };
}

export function serializeCreditCard(card: CardWithHistory) {
  return {
    id: card.id,
    name: card.name,
    currency: card.currency,
    gracePeriodEndDate: dateKey(card.gracePeriodEndDate),
    gracePaid: card.gracePaid,
    minPaymentAssignmentDate: dateKey(card.minPaymentAssignmentDate),
    minPaymentDueDate: dateKey(card.minPaymentDueDate),
    minPaymentAmountMinor: card.minPaymentAmountMinor,
    minPaymentPaid: card.minPaymentPaid,
    balances: card.balances.map((balance) => ({
      id: balance.id,
      date: dateKey(balance.date),
      amountMinor: balance.amountMinor,
    })),
    paymentHistory: card.paymentHistory.map((payment) => ({
      id: payment.id,
      dueDate: dateKey(payment.dueDate),
      amountMinor: payment.amountMinor,
      paid: payment.paid,
      archivedAt: payment.archivedAt.toISOString(),
    })),
  };
}

const historyInclude = {
  balances: { orderBy: { date: "desc" as const } },
  paymentHistory: { orderBy: { archivedAt: "desc" as const } },
};

export async function processCreditCardAssignments(prisma: PrismaClient, today: string, userId?: string) {
  const cards = await prisma.creditCard.findMany({
    where: {
      ...(userId ? { userId } : {}),
      minPaymentAssignmentDate: { lte: new Date(`${today}T00:00:00.000Z`) },
    },
  });

  for (const card of cards) {
    const assignmentDate = card.minPaymentAssignmentDate;
    if (!assignmentDate || dateKey(card.assignmentProcessedDate) === dateKey(assignmentDate)) continue;

    await prisma.$transaction(async (tx) => {
      const priorPayment = card.minPaymentDueDate && card.minPaymentDueDate < assignmentDate
        && card.minPaymentAmountMinor !== null
        ? { dueDate: card.minPaymentDueDate, amountMinor: card.minPaymentAmountMinor, paid: card.minPaymentPaid }
        : null;
      const updated = await tx.creditCard.updateMany({
        where: {
          id: card.id,
          userId: card.userId,
          minPaymentAssignmentDate: assignmentDate,
          assignmentProcessedDate: card.assignmentProcessedDate,
        },
        data: {
          assignmentProcessedDate: assignmentDate,
          ...(priorPayment ? {
            minPaymentDueDate: null,
            minPaymentAmountMinor: null,
            minPaymentPaid: false,
          } : {}),
        },
      });
      if (updated.count === 0 || !priorPayment) return;

      await tx.creditCardMinimumPayment.create({
        data: {
          cardId: card.id,
          ...priorPayment,
        },
      });
    });
  }
}

export async function listUserCreditCards(prisma: PrismaClient, userId: string, today: string) {
  await processCreditCardAssignments(prisma, today, userId);
  const cards = await prisma.creditCard.findMany({
    where: { userId },
    include: historyInclude,
    orderBy: { name: "asc" },
  });
  return cards.map(serializeCreditCard);
}

export async function getUserCreditCard(prisma: PrismaClient, userId: string, cardId: string) {
  const card = await prisma.creditCard.findFirst({
    where: { id: cardId, userId },
    include: historyInclude,
  });
  return card ? serializeCreditCard(card) : null;
}

export async function createUserCreditCard(prisma: PrismaClient, userId: string, data: CreditCardInput, today = moscowDate()) {
  const assignmentProcessedDate = data.minPaymentAssignmentDate && data.minPaymentAssignmentDate <= today
    && data.minPaymentDueDate && data.minPaymentDueDate >= data.minPaymentAssignmentDate
    && data.minPaymentAmountMinor !== null
    ? dbDate(data.minPaymentAssignmentDate) : null;
  const card = await prisma.creditCard.create({ data: { userId, ...cardData(data), assignmentProcessedDate } });
  return getUserCreditCard(prisma, userId, card.id);
}

export async function updateUserCreditCard(prisma: PrismaClient, userId: string, cardId: string, data: CreditCardInput, today = moscowDate()) {
  const existing = await prisma.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!existing) return null;

  const assignmentChanged = dateKey(existing.minPaymentAssignmentDate) !== data.minPaymentAssignmentDate;
  const paymentChanged = dateKey(existing.minPaymentDueDate) !== data.minPaymentDueDate
    || existing.minPaymentAmountMinor !== data.minPaymentAmountMinor;
  const newPaymentAfterAssignment = data.minPaymentAssignmentDate && data.minPaymentAssignmentDate <= today
    && data.minPaymentDueDate && data.minPaymentDueDate >= data.minPaymentAssignmentDate
    && data.minPaymentAmountMinor !== null && paymentChanged;
  const priorPaymentAfterAssignment = data.minPaymentAssignmentDate && data.minPaymentAssignmentDate <= today
    && data.minPaymentDueDate && data.minPaymentDueDate < data.minPaymentAssignmentDate && paymentChanged;
  const update = {
    where: { id: cardId },
    data: {
      ...cardData(data),
      ...(newPaymentAfterAssignment
        ? { assignmentProcessedDate: dbDate(data.minPaymentAssignmentDate) }
        : assignmentChanged || priorPaymentAfterAssignment ? { assignmentProcessedDate: null } : {}),
    },
  };
  const archivedPayment = existing.minPaymentDueDate && existing.minPaymentAmountMinor !== null
    && data.minPaymentDueDate === null && data.minPaymentAssignmentDate
    ? { dueDate: existing.minPaymentDueDate, amountMinor: existing.minPaymentAmountMinor, paid: existing.minPaymentPaid }
    : null;
  if (archivedPayment) {
    await prisma.$transaction(async (tx) => {
      await tx.creditCard.update(update);
      await tx.creditCardMinimumPayment.create({ data: { cardId, ...archivedPayment } });
    });
  } else {
    await prisma.creditCard.update(update);
  }
  return getUserCreditCard(prisma, userId, cardId);
}

export async function deleteUserCreditCard(prisma: PrismaClient, userId: string, cardId: string) {
  const result = await prisma.creditCard.deleteMany({ where: { id: cardId, userId } });
  return result.count > 0;
}

export async function addCreditCardBalance(prisma: PrismaClient, userId: string, cardId: string, date: string, amountMinor: number) {
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId }, select: { id: true } });
  if (!card) return null;
  return prisma.creditCardBalance.create({ data: { cardId, date: dbDate(date)!, amountMinor } });
}

export async function updateCreditCardBalance(prisma: PrismaClient, userId: string, cardId: string, balanceId: string, date: string, amountMinor: number) {
  const balance = await prisma.creditCardBalance.findFirst({ where: { id: balanceId, cardId, card: { userId } } });
  if (!balance) return null;
  return prisma.creditCardBalance.update({ where: { id: balanceId }, data: { date: dbDate(date)!, amountMinor } });
}

export async function deleteCreditCardBalance(prisma: PrismaClient, userId: string, cardId: string, balanceId: string) {
  const result = await prisma.creditCardBalance.deleteMany({ where: { id: balanceId, cardId, card: { userId } } });
  return result.count > 0;
}
