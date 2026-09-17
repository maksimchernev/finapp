import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteCreditCardBalance,
  updateUserCreditCard,
  type CreditCardInput,
} from "../../../src/services/credit-card.service";

const input: CreditCardInput = {
  name: "Карта",
  currency: "RUB",
  gracePeriodEndDate: null,
  gracePaid: false,
  minPaymentAssignmentDate: null,
  minPaymentDueDate: null,
  minPaymentAmountMinor: null,
  minPaymentPaid: false,
};

test("another user's card cannot be edited", async () => {
  let updated = false;
  const prisma = {
    creditCard: {
      findFirst: async ({ where }: { where: { userId: string } }) => where.userId === "owner" ? { id: "card-a" } : null,
      update: async () => { updated = true; },
    },
  };

  assert.equal(await updateUserCreditCard(prisma as never, "other", "card-a", input), null);
  assert.equal(updated, false);
});

test("balance deletion includes both card and owner in its filter", async () => {
  let where: unknown;
  const prisma = {
    creditCardBalance: {
      deleteMany: async (args: { where: unknown }) => { where = args.where; return { count: 0 }; },
    },
  };

  assert.equal(await deleteCreditCardBalance(prisma as never, "other", "card-a", "balance-a"), false);
  assert.deepEqual(where, { id: "balance-a", cardId: "card-a", card: { userId: "other" } });
});
