import assert from "node:assert/strict";
import test from "node:test";
import { sendReminderOnce } from "../../../src/services/credit-card-push.service";

test("retrying the scheduler sends a card reminder only once to each subscription", async () => {
  const delivered = new Set<string>();
  const database = {
    creditCardPushDelivery: {
      create: async ({ data }: { data: { eventKey: string; subscriptionId: string } }) => {
        const key = `${data.subscriptionId}:${data.eventKey}`;
        if (delivered.has(key)) throw { code: "P2002" };
        delivered.add(key);
      },
      deleteMany: async () => undefined,
    },
    pushSubscription: { deleteMany: async () => undefined },
  };
  const subscription = {
    id: "device-1",
    endpoint: "https://push.example.test/a",
    p256dh: "key",
    auth: "auth",
  };
  const reminder = { type: "grace-today" as const, body: "Сегодня пополните карту", key: "card-1:grace-today:2026-09-17" };
  let sends = 0;
  const send = async () => { sends += 1; };

  await sendReminderOnce(database as never, "card-1", subscription, reminder, send);
  await sendReminderOnce(database as never, "card-1", subscription, reminder, send);

  assert.equal(sends, 1);
});

test("expired subscriptions are removed and reported as gone", async () => {
  let removed = false;
  const database = {
    creditCardPushDelivery: {
      create: async () => undefined,
      deleteMany: async () => undefined,
    },
    pushSubscription: { deleteMany: async () => { removed = true; } },
  };
  const result = await sendReminderOnce(
    database as never,
    "card-1",
    { id: "device-1", endpoint: "https://push.example.test/a", p256dh: "key", auth: "auth" },
    { type: "grace-today", body: "Сегодня", key: "card-1:grace-today:2026-09-17" },
    async () => { throw { statusCode: 410 }; },
  );

  assert.equal(result, "gone");
  assert.equal(removed, true);
});
