import assert from "node:assert/strict";
import test from "node:test";
import { validationResult } from "express-validator";
import { creditCardWriteValidators } from "../../../src/validators/credit-card.validators";

async function errors(body: Record<string, unknown>) {
  const req = { body, params: {} } as never;
  for (const validator of creditCardWriteValidators.slice(0, -1)) {
    await validator.run(req);
  }
  return validationResult(req).array();
}

const base = {
  name: "Платинум",
  currency: "RUB",
  gracePeriodEndDate: null,
  gracePaid: false,
  minPaymentAssignmentDate: null,
  minPaymentDueDate: null,
  minPaymentAmountMinor: null,
  minPaymentPaid: false,
};

test("a card can be saved with only a name and currency", async () => {
  assert.deepEqual(await errors(base), []);
});

test("minimum payment date and amount must be supplied together", async () => {
  assert.notDeepEqual(await errors({ ...base, minPaymentDueDate: "2026-10-01" }), []);
  assert.notDeepEqual(await errors({ ...base, minPaymentAmountMinor: 100 }), []);
});

test("invalid calendar dates and unsupported currencies are rejected", async () => {
  assert.notDeepEqual(await errors({ ...base, gracePeriodEndDate: "2026-02-30" }), []);
  assert.notDeepEqual(await errors({ ...base, currency: "BTC" }), []);
});
