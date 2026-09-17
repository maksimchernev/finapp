import { PrismaClient, type PushSubscription } from "@prisma/client";
import webPush from "web-push";
import { dateKey, processCreditCardAssignments } from "./credit-card.service";
import {
  buildCreditCardReminders,
  moscowDate,
  type CreditCardReminder,
} from "./credit-card-reminders.service";

type PushTarget = Pick<PushSubscription, "id" | "endpoint" | "p256dh" | "auth">;

export async function sendReminderOnce(
  prisma: PrismaClient,
  cardId: string,
  subscription: PushTarget,
  reminder: CreditCardReminder,
  send: (subscription: PushTarget, reminder: CreditCardReminder, cardId: string) => Promise<unknown>,
) {
  try {
    await prisma.creditCardPushDelivery.create({
      data: { cardId, subscriptionId: subscription.id, eventKey: reminder.key },
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return "duplicate";
    throw error;
  }

  try {
    await send(subscription, reminder, cardId);
    return "sent";
  } catch (error) {
    await prisma.creditCardPushDelivery.deleteMany({
      where: { subscriptionId: subscription.id, eventKey: reminder.key },
    });
    const statusCode = typeof error === "object" && error && "statusCode" in error ? error.statusCode : null;
    if (statusCode === 404 || statusCode === 410) {
      await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
      return "gone";
    }
    throw error;
  }
}

export async function dispatchCreditCardReminders(prisma: PrismaClient, now = new Date()) {
  const today = moscowDate(now);
  await processCreditCardAssignments(prisma, today);
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now));
  if (hour < 12) return { sent: 0, failed: 0 };

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    throw new Error("VAPID configuration is missing");
  }
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const cards = await prisma.creditCard.findMany();
  let sent = 0;
  let failed = 0;
  for (const card of cards) {
    const reminders = buildCreditCardReminders({
      id: card.id,
      name: card.name,
      currency: card.currency,
      gracePeriodEndDate: dateKey(card.gracePeriodEndDate),
      gracePaid: card.gracePaid,
      minPaymentAssignmentDate: dateKey(card.minPaymentAssignmentDate),
      minPaymentDueDate: dateKey(card.minPaymentDueDate),
      minPaymentAmountMinor: card.minPaymentAmountMinor,
      minPaymentPaid: card.minPaymentPaid,
    }, today);
    if (reminders.length === 0) continue;

    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: card.userId } });
    for (const subscription of subscriptions) {
      for (const reminder of reminders) {
        try {
          const result = await sendReminderOnce(prisma, card.id, subscription, reminder, async (target, message, targetCardId) => {
            await webPush.sendNotification(
              { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
              JSON.stringify({ title: "Summa", body: message.body, url: `/credit-cards?card=${encodeURIComponent(targetCardId)}` }),
            );
          });
          if (result === "sent") sent += 1;
          if (result === "gone") break;
        } catch {
          failed += 1;
          console.error("Credit card push failed", { cardId: card.id, subscriptionId: subscription.id, eventKey: reminder.key });
        }
      }
    }
  }
  return { sent, failed };
}
