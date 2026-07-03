import assert from "node:assert/strict";
import test from "node:test";
import { createTransactionValidators } from "../../../src/validators/transaction.validators";

function runMiddleware(middleware: unknown, req: unknown, res: unknown) {
  return new Promise<void>((resolve) => {
    (res as { onDone?: () => void }).onDone = resolve;
    (middleware as (req: unknown, res: unknown, next: () => void) => void)(
      req,
      res,
      resolve,
    );
  });
}

test("create transaction validators accept a transaction batch", async () => {
  const req = {
    body: [
      {
        amountMinor: -10000,
        currency: "RUB",
        date: "2026-07-02",
        merchant: "Coffee",
        sourceType: "screenshot",
      },
    ],
  };
  const response = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      this.onDone?.();
      return this;
    },
    onDone: undefined as undefined | (() => void),
  };

  for (const validator of createTransactionValidators) {
    await runMiddleware(validator, req, response);
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload, undefined);
});

test("create transaction validators accept HUF transactions", async () => {
  const req = {
    body: [
      {
        amountMinor: -650000,
        currency: "HUF",
        date: "2026-07-02",
        merchant: "Test merchant",
        sourceType: "screenshot",
      },
    ],
  };
  const response = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      this.onDone?.();
      return this;
    },
    onDone: undefined as undefined | (() => void),
  };

  for (const validator of createTransactionValidators) {
    await runMiddleware(validator, req, response);
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload, undefined);
});
