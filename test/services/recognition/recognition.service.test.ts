import assert from "node:assert/strict";
import test from "node:test";
import {
  getRecognitionAccess,
  getRecognitionUsage,
  normalizeRecognitionTransactions,
  recordRecognitionUsage,
  recognizeWithOpenAI,
  RecognitionResponseError,
  releaseRecognitionUsage,
  reserveRecognitionUsage,
  validateRecognitionImage,
} from "../../../src/services/recognition.service";

test("recognition access requires feature flag, test access, consent, and tokens", () => {
  assert.deepEqual(
    getRecognitionAccess({
      featureEnabled: true,
      hasTestAccess: true,
      consent: true,
      usedTokens: 25_000,
      tokenLimit: 100_000,
    }),
    { allowed: true, remainingTokens: 75_000 },
  );
  assert.equal(
    getRecognitionAccess({
      featureEnabled: true,
      hasTestAccess: true,
      consent: true,
      usedTokens: 100_000,
      tokenLimit: 100_000,
    }).allowed,
    false,
  );
});

test("recognition image validation accepts only non-empty png and jpeg bodies", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const jpeg = Buffer.from([255, 216, 255, 224]);
  assert.equal(validateRecognitionImage("image/png", png, 10).ok, true);
  assert.equal(validateRecognitionImage("image/jpeg", jpeg, 10).ok, true);
  assert.equal(validateRecognitionImage("image/png", Buffer.from("not png"), 10).ok, false);
  assert.equal(validateRecognitionImage("image/gif", Buffer.from("gif"), 10).ok, false);
  assert.equal(validateRecognitionImage("image/jpeg", Buffer.alloc(0), 10).ok, false);
  assert.equal(validateRecognitionImage("image/jpeg", Buffer.alloc(11), 10).ok, false);
});

test("normalization drops unknown ids and preserves the default selection", () => {
  assert.deepEqual(
    normalizeRecognitionTransactions(
      [
        {
          amount: -125.5,
          bankId: "unknown-bank",
          categoryId: "category-1",
          currency: "rub",
          date: "2026-08-31",
          merchant: "  Coffee  ",
          selected: false,
        },
      ],
      new Set(["bank-1"]),
      new Set(["category-1"]),
    ),
    [
      {
        amount: -125.5,
        bankId: undefined,
        categoryId: "category-1",
        currency: "RUB",
        date: "2026-08-31",
        merchant: "Coffee",
        selected: false,
      },
    ],
  );
});

test("OpenAI recognition sends an image with strict structured output and returns usage", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const fetcher: typeof fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  transactions: [
                    {
                      amount: -320,
                      bankId: "bank-1",
                      categoryId: "category-1",
                      currency: "RUB",
                      date: "2026-08-31",
                      merchant: "Coffee",
                      selected: true,
                    },
                  ],
                }),
              },
            ],
          },
        ],
        usage: { input_tokens: 1234, output_tokens: 120 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const result = await recognizeWithOpenAI({
    apiKey: "test-key",
    banks: [{ id: "bank-1", name: "Test Bank", keywords: ["test"] }],
    categories: [{ id: "category-1", nameRu: "Кафе", type: "expense", keywords: ["coffee"] }],
    contentType: "image/png",
    fetcher,
    image: Buffer.from("image"),
  });

  assert.deepEqual(result.usage, { inputTokens: 1234, outputTokens: 120 });
  assert.equal(result.transactions[0].merchant, "Coffee");
  assert.equal(result.transactions[0].selected, true);
  const format = (requestBody?.text as {
    format: {
      schema: {
        properties: {
          transactions: {
            items: { required: string[]; properties: Record<string, unknown> };
          };
        };
      };
    };
  }).format;
  const transactionSchema = format.schema.properties.transactions.items;
  assert.ok(transactionSchema.required.includes("selected"));
  assert.deepEqual(transactionSchema.properties.selected, { type: "boolean" });
  assert.equal(requestBody?.model, "gpt-6-luna");
  assert.equal(requestBody?.store, false);
  assert.deepEqual(requestBody?.reasoning, { effort: "none" });
  assert.equal(
    ((requestBody?.text as { format: { strict: boolean } }).format.strict),
    true,
  );
  assert.match(JSON.stringify(requestBody?.input), /data:image\/png;base64,aW1hZ2U=/);
});

test("uses the configured proxy for the OpenAI request", async (t) => {
  const previousProxy = process.env.OPENAI_PROXY_URL;
  process.env.OPENAI_PROXY_URL = "http://127.0.0.1:18080";
  t.after(() => {
    if (previousProxy === undefined) delete process.env.OPENAI_PROXY_URL;
    else process.env.OPENAI_PROXY_URL = previousProxy;
  });

  await recognizeWithOpenAI({
    apiKey: "test",
    banks: [],
    categories: [],
    contentType: "image/png",
    image: Buffer.from("image"),
    fetcher: async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.ok(init);
      assert.equal(typeof Reflect.get(init, "dispatcher")?.dispatch, "function");
      assert.equal(init.redirect, "error");
      return Response.json({
        output_text: JSON.stringify({ transactions: [] }),
        usage: { input_tokens: 1, output_tokens: 1 },
      });
    },
  });
});

test("invalid JSON retains actual billed usage and quota failures explain the remedy", async () => {
  const input = { apiKey: "test", banks: [], categories: [], contentType: "image/png" as const, image: Buffer.from("png") };
  await assert.rejects(recognizeWithOpenAI({ ...input, fetcher: async () => new Response(JSON.stringify({
    output_text: "{broken", usage: { input_tokens: 123, output_tokens: 456 },
  })) }), (error: unknown) => {
    assert.ok(error instanceof RecognitionResponseError);
    assert.deepEqual(error.usage, { inputTokens: 123, outputTokens: 456 });
    return true;
  });
  await assert.rejects(recognizeWithOpenAI({ ...input, fetcher: async () => new Response(JSON.stringify({
    error: { code: "insufficient_quota" },
  }), { status: 429 }) }), /Баланс OpenAI API исчерпан/);
});

test("cloud access rejects missing consent, new accounts and an emergency shutdown", () => {
  const access = { featureEnabled: true, hasTestAccess: true, consent: true, usedTokens: 0, tokenLimit: 100_000 };
  for (const patch of [{ featureEnabled: false }, { hasTestAccess: false }, { consent: false }, { consent: null }]) {
    assert.equal(getRecognitionAccess({ ...access, ...patch }).allowed, false);
  }
});

test("malformed transaction rows are ignored safely", () => {
  const transactions = [null, { amount: -10, date: "2026-10-08", merchant: null, currency: "RUB" }, { amount: -10, date: "2026-02-30", merchant: "Invalid date", currency: "RUB" }] as unknown as Parameters<typeof normalizeRecognitionTransactions>[0];
  assert.deepEqual(normalizeRecognitionTransactions(transactions, new Set(), new Set()), []);
});

test("OpenAI recognition rejects a response without structured JSON", async () => {
  const fetcher: typeof fetch = async () =>
    new Response(JSON.stringify({ output: [], usage: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    recognizeWithOpenAI({
      apiKey: "test-key",
      banks: [],
      categories: [],
      contentType: "image/jpeg",
      fetcher,
      image: Buffer.from("image"),
    }),
    /не вернул структурированный результат/i,
  );
});

test("OpenAI recognition propagates provider and timeout failures", async () => {
  await assert.rejects(
    recognizeWithOpenAI({
      apiKey: "test-key",
      banks: [],
      categories: [],
      contentType: "image/png",
      fetcher: async () => new Response("rate limited", { status: 429 }),
      image: Buffer.from("png"),
    }),
    /OpenAI вернул ошибку 429/,
  );

  await assert.rejects(
    recognizeWithOpenAI({
      apiKey: "test-key",
      banks: [],
      categories: [],
      contentType: "image/png",
      fetcher: async () => {
        throw new Error("request timeout");
      },
      image: Buffer.from("png"),
    }),
    /timeout/,
  );
});

test("daily usage is read from the UTC day for one provider", async () => {
  let aggregateArgs: unknown;
  const prisma = {
    aiUsageDaily: {
      aggregate: async (args: unknown) => {
        aggregateArgs = args;
        return { _sum: { inputTokens: 1000, outputTokens: 250 } };
      },
    },
  };

  const usage = await getRecognitionUsage(
    prisma,
    "user-1",
    "openai",
    new Date("2026-09-01T22:15:00.000Z"),
  );

  assert.deepEqual(usage, { inputTokens: 1000, outputTokens: 250, totalTokens: 1250 });
  assert.deepEqual(aggregateArgs, {
    where: {
      day: new Date("2026-09-01T00:00:00.000Z"),
      provider: "openai",
      userId: "user-1",
    },
    _sum: { inputTokens: true, outputTokens: true },
  });
});

test("recording usage increments the current provider day", async () => {
  let upsertArgs: unknown;
  const prisma = {
    aiUsageDaily: {
      upsert: async (args: unknown) => {
        upsertArgs = args;
        return {};
      },
    },
  };

  await recordRecognitionUsage(
    prisma,
    "user-1",
    "openai",
    { inputTokens: 1200, outputTokens: 80 },
    new Date("2026-09-01T22:15:00.000Z"),
  );

  assert.deepEqual(upsertArgs, {
    where: {
      userId_provider_day: {
        day: new Date("2026-09-01T00:00:00.000Z"),
        provider: "openai",
        userId: "user-1",
      },
    },
    create: {
      day: new Date("2026-09-01T00:00:00.000Z"),
      inputTokens: 1200,
      inFlight: false,
      outputTokens: 80,
      provider: "openai",
      reservationExpiresAt: null,
      totalTokens: 1280,
      userId: "user-1",
    },
    update: {
      inputTokens: { increment: 1200 },
      inFlight: false,
      outputTokens: { increment: 80 },
      reservationExpiresAt: null,
      totalTokens: { increment: 1280 },
    },
  });
});

test("token reservation atomically allows only an account below its daily limit", async () => {
  const calls: Array<{ method: string; args: unknown }> = [];
  const prisma = {
    aiUsageDaily: {
      upsert: async (args: unknown) => {
        calls.push({ method: "upsert", args });
        return {};
      },
      updateMany: async (args: unknown) => {
        calls.push({ method: "updateMany", args });
        return { count: 1 };
      },
    },
  };

  assert.equal(
    await reserveRecognitionUsage(
      prisma,
      "user-1",
      "openai",
      100_000,
      new Date("2026-09-01T22:15:00.000Z"),
    ),
    true,
  );
  assert.deepEqual(calls[1], {
    method: "updateMany",
    args: {
      where: {
        day: new Date("2026-09-01T00:00:00.000Z"),
        OR: [
          { inFlight: false },
          {
            reservationExpiresAt: {
              lt: new Date("2026-09-01T22:15:00.000Z"),
            },
          },
        ],
        provider: "openai",
        totalTokens: { lt: 100_000 },
        userId: "user-1",
      },
      data: {
        inFlight: true,
        reservationExpiresAt: new Date("2026-09-01T22:17:00.000Z"),
      },
    },
  });

  await releaseRecognitionUsage(
    prisma,
    "user-1",
    "openai",
    new Date("2026-09-01T22:15:00.000Z"),
  );
  assert.equal(calls[2].method, "updateMany");
});
