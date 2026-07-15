import assert from "node:assert/strict";
import test from "node:test";
import { transactionListValidators } from "../../../src/validators/transaction.validators";

function createResponse() {
  return {
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
}

function runMiddleware(middleware: unknown, req: unknown, res: unknown) {
  return new Promise<void>((resolve) => {
    (res as { onDone?: () => void }).onDone = resolve;
    (middleware as (req: unknown, res: unknown, next: () => void) => void)(req, res, resolve);
  });
}

async function validate(query: Record<string, string>) {
  const req = { query };
  const response = createResponse();
  for (const validator of transactionListValidators) {
    await runMiddleware(validator, req, response);
  }
  return response;
}

test("transaction list validators accept all supported filters", async () => {
  const response = await validate({
    startDate: "2026-07-01T21:00:00.000Z",
    endDate: "2026-07-08T21:00:00.000Z",
    bankId: "bank-a",
    categoryId: "category-a",
    limit: "20",
    offset: "40",
  });
  assert.equal(response.statusCode, 200);
});

test("transaction list validators reject non-increasing date boundaries", async () => {
  const response = await validate({
    startDate: "2026-07-08T21:00:00.000Z",
    endDate: "2026-07-01T21:00:00.000Z",
  });
  assert.equal(response.statusCode, 400);
});

test("transaction list validators require timestamp boundaries", async () => {
  const response = await validate({ startDate: "2026-07-01", endDate: "2026-07-08" });
  assert.equal(response.statusCode, 400);
});

test("transaction list validators enforce page and id bounds", async () => {
  for (const query of [
    { limit: "0" },
    { limit: "501" },
    { offset: "-1" },
    { bankId: "" },
    { categoryId: "" },
  ]) {
    const response = await validate(query);
    assert.equal(response.statusCode, 400, JSON.stringify(query));
  }
});
