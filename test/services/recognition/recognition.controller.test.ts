import assert from "node:assert/strict";
import { after, before, beforeEach, mock, test } from "node:test";
import type { Request, Response } from "express";

let hasTestAccess = true;
let preferences: Record<string, unknown> = {};
let tokens = 0;
let inFlight = false;
let writes = 0;
let controller: typeof import("../../../src/controllers/user.controller");
let recognition: typeof import("../../../src/controllers/recognition.controller");
const originalEnv = { flag: process.env.AI_RECOGNITION_ENABLED, key: process.env.OPENAI_API_KEY, limit: process.env.AI_DAILY_TOKEN_LIMIT };

before(async () => {
  const prismaModule = require("@prisma/client");
  const restore = mock.method(prismaModule, "PrismaClient", function () {
    return {
      user: { findUnique: async () => ({ aiTestAccess: hasTestAccess }) },
      userPreferences: {
        findUnique: async () => preferences,
        upsert: async ({ update }: { update: Record<string, unknown> }) => {
          writes++;
          return preferences = { ...preferences, ...update };
        },
      },
      bank: { findMany: async () => [] },
      category: { findMany: async () => [] },
      aiUsageDaily: {
        aggregate: async () => ({ _sum: { inputTokens: tokens, outputTokens: 0 } }),
        upsert: async ({ update }: { update: { inputTokens?: { increment: number }; outputTokens?: { increment: number }; inFlight?: boolean } }) => {
          tokens += (update.inputTokens?.increment ?? 0) + (update.outputTokens?.increment ?? 0);
          if (update.inFlight !== undefined) inFlight = update.inFlight;
          return {};
        },
        updateMany: async ({ data }: { data: { inFlight: boolean } }) => {
          if (data.inFlight && (inFlight || tokens >= 100_000)) return { count: 0 };
          inFlight = data.inFlight;
          return { count: 1 };
        },
      },
    };
  });
  controller = await import("../../../src/controllers/user.controller");
  recognition = await import("../../../src/controllers/recognition.controller");
  restore.mock.restore();
});

beforeEach(() => {
  hasTestAccess = true;
  preferences = { defaultCurrency: "RUB", recognitionMethod: "tesseract", aiRecognitionConsent: false };
  tokens = 0;
  inFlight = false;
  writes = 0;
  process.env.AI_RECOGNITION_ENABLED = "true";
  process.env.OPENAI_API_KEY = "test-key";
  process.env.AI_DAILY_TOKEN_LIMIT = "100000";
});

after(() => {
  for (const [key, value] of Object.entries({ AI_RECOGNITION_ENABLED: originalEnv.flag, OPENAI_API_KEY: originalEnv.key, AI_DAILY_TOKEN_LIMIT: originalEnv.limit })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

function response() {
  const result = { status: 200, body: undefined as unknown };
  const res = {
    status(code: number) { result.status = code; return res; },
    json(body: unknown) { result.body = body; return res; },
  };
  return { result, res: res as unknown as Response };
}

test("profile persists consent across local recognition and subsequent AI activation", async () => {
  const { result, res } = response();
  await controller.updatePreferences({ user: { id: "test" }, body: { recognitionMethod: "ai", aiRecognitionConsent: true } } as Request, res);
  assert.equal(result.status, 200);
  assert.equal(preferences.recognitionMethod, "ai");
  assert.equal(preferences.defaultCurrency, "RUB");
  await controller.updatePreferences({ user: { id: "test" }, body: { recognitionMethod: "tesseract" } } as Request, res);
  assert.equal(preferences.recognitionMethod, "tesseract");
  assert.equal(preferences.aiRecognitionConsent, true);
  await controller.updatePreferences({ user: { id: "test" }, body: { recognitionMethod: "ai" } } as Request, res);
  assert.equal(result.status, 200);
  assert.equal(preferences.recognitionMethod, "ai");
  assert.equal(preferences.aiRecognitionConsent, true);
});

test("revoking consent separately restores local recognition", async () => {
  preferences = { recognitionMethod: "ai", aiRecognitionConsent: true };
  const { res } = response();
  await controller.updatePreferences({ user: { id: "test" }, body: { aiRecognitionConsent: false } } as Request, res);
  assert.equal(preferences.recognitionMethod, "tesseract");
  assert.equal(preferences.aiRecognitionConsent, false);
});

test("profile rejects new accounts, missing consent, invalid values and disabled AI before writing", async () => {
  for (const scenario of ["pool", "consent", "method", "flag", "key"]) {
    hasTestAccess = scenario !== "pool";
    process.env.AI_RECOGNITION_ENABLED = scenario === "flag" ? "false" : "true";
    process.env.OPENAI_API_KEY = scenario === "key" ? "" : "test";
    const { result, res } = response();
    await controller.updatePreferences({ user: { id: "test" }, body: {
      recognitionMethod: scenario === "method" ? "invalid" : "ai", aiRecognitionConsent: scenario !== "consent",
    } } as Request, res);
    assert.ok(result.status >= 400, scenario);
  }
  assert.equal(writes, 0);
});

function imageRequest(contentType = "image/png", body = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) {
  return { user: { id: "test" }, body, get: () => contentType } as unknown as Request;
}

test("recognition rejects bad images, access, missing key, exhausted limit and concurrent calls without calling provider", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => { throw new Error("must not call"); });
  try {
    for (const scenario of ["mime", "size", "pool", "consent", "method", "flag", "key", "limit", "busy"]) {
      preferences = { recognitionMethod: scenario === "method" ? "tesseract" : "ai", aiRecognitionConsent: scenario !== "consent" };
      hasTestAccess = scenario !== "pool";
      process.env.AI_RECOGNITION_ENABLED = scenario === "flag" ? "false" : "true";
      process.env.OPENAI_API_KEY = scenario === "key" ? "" : "test";
      tokens = scenario === "limit" ? 100_000 : 0;
      inFlight = scenario === "busy";
      const { result, res } = response();
      await recognition.recognizeOpenAI(scenario === "mime" ? imageRequest("image/gif") : scenario === "size" ? imageRequest("image/png", Buffer.alloc(5_242_881)) : imageRequest(), res);
      assert.ok(result.status >= 400, scenario);
    }
    assert.equal(fetchMock.mock.callCount(), 0);
  } finally { fetchMock.mock.restore(); }
});

test("recognition accounts for actual usage even when structured output fails and releases failed requests", async () => {
  preferences = { recognitionMethod: "ai", aiRecognitionConsent: true };
  const fetchMock = mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ output_text: "{broken", usage: { input_tokens: 123, output_tokens: 45 } })));
  try {
    const { result, res } = response();
    await recognition.recognizeOpenAI(imageRequest(), res);
    assert.equal(result.status, 502);
    assert.equal(tokens, 168);
    assert.equal(inFlight, false);
  } finally { fetchMock.mock.restore(); }
  const timeout = mock.method(globalThis, "fetch", async () => { throw new Error("request timeout"); });
  try {
    const { result, res } = response();
    await recognition.recognizeOpenAI(imageRequest(), res);
    assert.equal(result.status, 504);
    assert.equal(tokens, 168);
    assert.equal(inFlight, false);
  } finally { timeout.mock.restore(); }
});

test("successful recognition returns drafts without saving transactions and with billed usage", async () => {
  preferences = { recognitionMethod: "ai", aiRecognitionConsent: true };
  const fetchMock = mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ output_text: JSON.stringify({ transactions: [] }), usage: { input_tokens: 1000, output_tokens: 100 } })));
  try {
    const { result, res } = response();
    await recognition.recognizeOpenAI(imageRequest(), res);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { transactions: [], usage: { inputTokens: 1000, outputTokens: 100 } });
    assert.equal(tokens, 1100);
    assert.equal(inFlight, false);
  } finally { fetchMock.mock.restore(); }
});
