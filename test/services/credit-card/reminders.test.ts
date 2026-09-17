import assert from "node:assert/strict";
import test from "node:test";
import { buildCreditCardReminders } from "../../../src/services/credit-card-reminders.service";

const card = {
  id: "card-1",
  name: "Платинум",
  currency: "RUB",
  gracePeriodEndDate: "2026-10-01",
  gracePaid: false,
  minPaymentAssignmentDate: "2026-09-30",
  minPaymentDueDate: "2026-10-01",
  minPaymentAmountMinor: 123450,
  minPaymentPaid: false,
};

test("reminds about tomorrow's grace deadline and a newly entered minimum payment across a month boundary", () => {
  const reminders = buildCreditCardReminders(card, "2026-09-30");

  assert.deepEqual(reminders.map(({ type, body }) => ({ type, body })), [
    {
      type: "grace-tomorrow",
      body: "Завтра не забудьте пополнить Платинум для сохранения льготного периода",
    },
    {
      type: "minimum-tomorrow",
      body: "Завтра не забудьте внести мин платеж на Платинум на 1 234,50 ₽ для сохранения льготного периода",
    },
  ]);
});

test("assignment asks for a new payment only while its date and amount are empty", () => {
  const reminders = buildCreditCardReminders({ ...card, minPaymentDueDate: null, minPaymentAmountMinor: null }, "2026-09-30");
  assert.equal(reminders.find((item) => item.type === "assignment-today")?.body,
    "Заполните дату и сумму минимального платежа по карте Платинум");
});

test("sends today's reminders and suppresses each completed obligation independently", () => {
  const today = buildCreditCardReminders(card, "2026-10-01");
  assert.deepEqual(today.map(({ type }) => type), ["grace-today", "minimum-today"]);

  const paidMinimum = buildCreditCardReminders({ ...card, minPaymentPaid: true }, "2026-10-01");
  assert.deepEqual(paidMinimum.map(({ type }) => type), ["grace-today"]);

  const paidGrace = buildCreditCardReminders({ ...card, gracePaid: true }, "2026-10-01");
  assert.deepEqual(paidGrace.map(({ type }) => type), ["minimum-today"]);
});

test("does not remind about incomplete or past payment information", () => {
  const reminders = buildCreditCardReminders(
    { ...card, gracePeriodEndDate: null, minPaymentAmountMinor: null, minPaymentAssignmentDate: null },
    "2026-10-01",
  );
  assert.deepEqual(reminders, []);
});
