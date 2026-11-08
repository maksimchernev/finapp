import express, { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import {
  getRecognitionStatus,
  recognizeOpenAI,
} from "../controllers/recognition.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);
router.get("/status", getRecognitionStatus);
router.post(
  "/openai",
  express.raw({
    type: ["image/png", "image/jpeg"],
    limit: Number(process.env.MAX_FILE_SIZE) || 5_242_880,
  }),
  recognizeOpenAI,
);

router.use((error: { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = error.status === 413 ? 413 : 400;
  res.status(status).json({ error: status === 413 ? "Изображение слишком большое" : "Не удалось прочитать изображение" });
});

export default router;
