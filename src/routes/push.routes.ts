import { PrismaClient } from "@prisma/client";
import { Router, type Request, type Response } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { dispatchCreditCardReminders } from "../services/credit-card-push.service";
import { isAuthorizedReminderDispatch } from "../services/credit-card-dispatch-auth";

const prisma = new PrismaClient();

export const pushRouter = Router();
pushRouter.use(authenticate);

pushRouter.get("/public-key", (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) { res.status(503).json({ error: "Уведомления пока не настроены." }); return; }
  res.json({ publicKey: key });
});

const endpointRule = body("endpoint")
  .isString().isLength({ min: 1, max: 2048 })
  .custom((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.username === "" && url.password === "";
    } catch { return false; }
  });

pushRouter.post("/subscriptions", [
  endpointRule,
  body("keys.p256dh").isString().isLength({ min: 1, max: 512 }),
  body("keys.auth").isString().isLength({ min: 1, max: 512 }),
  validateRequest,
], async (req: Request, res: Response) => {
  try {
    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint: req.body.endpoint } });
    if (existing && existing.userId !== req.user!.id) {
      await prisma.creditCardPushDelivery.deleteMany({ where: { subscriptionId: existing.id } });
    }
    await prisma.pushSubscription.upsert({
      where: { endpoint: req.body.endpoint },
      create: {
        userId: req.user!.id,
        endpoint: req.body.endpoint,
        p256dh: req.body.keys.p256dh,
        auth: req.body.keys.auth,
      },
      update: {
        userId: req.user!.id,
        p256dh: req.body.keys.p256dh,
        auth: req.body.keys.auth,
      },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Save push subscription error:", error);
    res.status(500).json({ error: "Не удалось включить уведомления." });
  }
});

pushRouter.delete("/subscriptions", [endpointRule, validateRequest], async (req: Request, res: Response) => {
  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: req.body.endpoint, userId: req.user!.id } });
    res.status(204).send();
  } catch (error) {
    console.error("Delete push subscription error:", error);
    res.status(500).json({ error: "Не удалось выключить уведомления." });
  }
});

export const reminderDispatchRouter = Router();
reminderDispatchRouter.post("/dispatch", async (req, res) => {
  if (!isAuthorizedReminderDispatch(req.header("Authorization"), process.env.REMINDER_DISPATCH_SECRET)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const result = await dispatchCreditCardReminders(prisma);
    res.status(result.failed ? 503 : 200).json(result);
  } catch (error) {
    console.error("Reminder dispatch error:", error);
    res.status(500).json({ error: "Reminder dispatch failed" });
  }
});
