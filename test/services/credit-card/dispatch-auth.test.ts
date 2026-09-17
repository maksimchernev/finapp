import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorizedReminderDispatch } from "../../../src/services/credit-card-dispatch-auth";

test("scheduled reminder dispatch requires the exact configured secret", () => {
  assert.equal(isAuthorizedReminderDispatch("Bearer secret", "secret"), true);
  assert.equal(isAuthorizedReminderDispatch("Bearer wrong", "secret"), false);
  assert.equal(isAuthorizedReminderDispatch(undefined, "secret"), false);
  assert.equal(isAuthorizedReminderDispatch("Bearer secret", undefined), false);
});
