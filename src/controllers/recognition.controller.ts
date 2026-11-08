import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import {
  getRecognitionAccess,
  getRecognitionUsage,
  normalizeRecognitionTransactions,
  recognizeWithOpenAI,
  RecognitionResponseError,
  recordRecognitionUsage,
  releaseRecognitionUsage,
  reserveRecognitionUsage,
  validateRecognitionImage,
} from "../services/recognition.service";

const prisma = new PrismaClient();
const OPENAI_PROVIDER = "openai";

export async function getRecognitionStatus(req: Request, res: Response) {
  try {
    const [user, preferences, usage] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { aiTestAccess: true },
      }),
      prisma.userPreferences.findUnique({ where: { userId: req.user!.id } }),
      getRecognitionUsage(prisma, req.user!.id, OPENAI_PROVIDER),
    ]);
    const tokenLimit = getTokenLimit();
    const access = getRecognitionAccess({
      featureEnabled: isRecognitionEnabled(),
      hasTestAccess: Boolean(user?.aiTestAccess),
      consent: preferences?.aiRecognitionConsent ?? null,
      usedTokens: usage.totalTokens,
      tokenLimit,
    });

    res.json({
      enabled: isRecognitionEnabled(),
      hasTestAccess: Boolean(user?.aiTestAccess),
      consent: preferences?.aiRecognitionConsent ?? null,
      providers: {
        openai: {
          available: Boolean(process.env.OPENAI_API_KEY),
          dailyLimit: tokenLimit,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          remainingTokens: access.remainingTokens,
        },
      },
    });
  } catch (error) {
    console.error("Recognition status error:", getErrorMessage(error));
    res.status(500).json({ error: "Не удалось получить статус AI" });
  }
}

export async function recognizeOpenAI(req: Request, res: Response) {
  try {
    const contentType = req.get("content-type")?.split(";", 1)[0];
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const validation = validateRecognitionImage(
      contentType,
      body,
      Number(process.env.MAX_FILE_SIZE) || 5_242_880,
    );
    if (!validation.ok) {
      res.status(400).json({ error: validation.message });
      return;
    }

    const userId = req.user!.id;
    const startedAt = new Date();
    const [user, preferences, usage, banks, categories] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { aiTestAccess: true },
      }),
      prisma.userPreferences.findUnique({ where: { userId } }),
      getRecognitionUsage(prisma, userId, OPENAI_PROVIDER, startedAt),
      prisma.bank.findMany({
        where: { userId },
        select: { id: true, name: true, keywords: true },
      }),
      prisma.category.findMany({
        where: { OR: [{ isDefault: true }, { userId }] },
        select: { id: true, nameRu: true, type: true, keywords: true },
      }),
    ]);
    const access = getRecognitionAccess({
      featureEnabled: isRecognitionEnabled(),
      hasTestAccess: Boolean(user?.aiTestAccess),
      consent: preferences?.aiRecognitionConsent ?? null,
      usedTokens: usage.totalTokens,
      tokenLimit: getTokenLimit(),
    });
    if (!access.allowed || preferences?.recognitionMethod !== "ai") {
      const status = access.remainingTokens === 0 ? 429 : 403;
      res.status(status).json({
        error:
          status === 429
            ? "Суточный лимит AI-токенов исчерпан"
            : "Облачное распознавание недоступно для аккаунта",
      });
      return;
    }
    if (!process.env.OPENAI_API_KEY) {
      res.status(503).json({ error: "OpenAI API не настроен" });
      return;
    }
    const reserved = await reserveRecognitionUsage(
      prisma,
      userId,
      OPENAI_PROVIDER,
      getTokenLimit(),
      startedAt,
    );
    if (!reserved) {
      res.status(409).json({
        error: "Лимит исчерпан или другое распознавание уже выполняется",
      });
      return;
    }

    let providerCompleted = false;
    try {
      const result = await recognizeWithOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        banks,
        categories,
        contentType: contentType as "image/png" | "image/jpeg",
        image: body,
      });
      providerCompleted = true;
      await recordRecognitionUsage(
        prisma,
        userId,
        OPENAI_PROVIDER,
        result.usage,
        startedAt,
      );
      const transactions = normalizeRecognitionTransactions(
        result.transactions,
        new Set(banks.map((bank) => bank.id)),
        new Set(categories.map((category) => category.id)),
      );

      res.json({ transactions, usage: result.usage });
    } catch (error) {
      if (error instanceof RecognitionResponseError && error.usage) {
        providerCompleted = true;
        await recordRecognitionUsage(prisma, userId, OPENAI_PROVIDER, error.usage, startedAt);
      }
      if (!providerCompleted) {
        await releaseRecognitionUsage(prisma, userId, OPENAI_PROVIDER, startedAt).catch(
          (releaseError) =>
            console.error(
              "Recognition reservation release error:",
              getErrorMessage(releaseError),
            ),
        );
      }
      throw error;
    }
  } catch (error) {
    const message = getErrorMessage(error);
    const status = error instanceof RecognitionResponseError && !error.usage
      ? 503
      : /timeout/i.test(message) ? 504 : 502;
    console.error("OpenAI recognition failed:", { status });
    res.status(status).json({
      error:
        error instanceof RecognitionResponseError
          ? error.message
          : status === 504
            ? "OpenAI не ответил вовремя"
            : "Не удалось распознать изображение через OpenAI",
    });
  }
}

function isRecognitionEnabled() {
  return process.env.AI_RECOGNITION_ENABLED === "true";
}

function getTokenLimit() {
  const limit = Number(process.env.AI_DAILY_TOKEN_LIMIT);
  return Number.isSafeInteger(limit) && limit > 0 ? limit : 100_000;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
