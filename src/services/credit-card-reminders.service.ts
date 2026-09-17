export type ReminderCard = {
  id: string;
  name: string;
  currency: string;
  gracePeriodEndDate: string | null;
  gracePaid: boolean;
  minPaymentAssignmentDate: string | null;
  minPaymentDueDate: string | null;
  minPaymentAmountMinor: number | null;
  minPaymentPaid: boolean;
};

export type CreditCardReminder = {
  type: "grace-tomorrow" | "grace-today" | "assignment-today" | "minimum-tomorrow" | "minimum-today";
  body: string;
  key: string;
};

export function nextCalendarDate(date: string) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export function moscowDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function buildCreditCardReminders(card: ReminderCard, today: string): CreditCardReminder[] {
  const tomorrow = nextCalendarDate(today);
  const reminders: CreditCardReminder[] = [];

  function add(type: CreditCardReminder["type"], body: string) {
    reminders.push({ type, body, key: `${card.id}:${type}:${today}` });
  }

  if (!card.gracePaid && card.gracePeriodEndDate === tomorrow) {
    add("grace-tomorrow", `Завтра не забудьте пополнить ${card.name} для сохранения льготного периода`);
  }
  if (!card.gracePaid && card.gracePeriodEndDate === today) {
    add("grace-today", `Сегодня не забудьте пополнить ${card.name} для сохранения льготного периода`);
  }
  if (card.minPaymentAssignmentDate === today && (card.minPaymentDueDate === null || card.minPaymentAmountMinor === null)) {
    add("assignment-today", `Заполните дату и сумму минимального платежа по карте ${card.name}`);
  }
  if (!card.minPaymentPaid && card.minPaymentDueDate && card.minPaymentAmountMinor !== null) {
    const amount = new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: card.currency,
      maximumFractionDigits: 2,
    }).format(card.minPaymentAmountMinor / 100);

    if (card.minPaymentDueDate === tomorrow) {
      add("minimum-tomorrow", `Завтра не забудьте внести мин платеж на ${card.name} на ${amount} для сохранения льготного периода`);
    }
    if (card.minPaymentDueDate === today) {
      add("minimum-today", `Сегодня не забудьте внести мин платеж на ${card.name} на ${amount} для сохранения льготного периода`);
    }
  }

  return reminders;
}
