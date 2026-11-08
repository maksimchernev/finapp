import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { updateUserProfile } from '../services/user.service';
import { getRecognitionPreferenceError } from '../services/recognition.service';

const prisma = new PrismaClient();

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await updateUserProfile(prisma, userId, { name: req.body.name });

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { defaultCurrency, budgetLimits, recognitionMethod, aiRecognitionConsent } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { aiTestAccess: true } });
    const current = await prisma.userPreferences.findUnique({ where: { userId } });
    const consent = aiRecognitionConsent === undefined ? current?.aiRecognitionConsent : aiRecognitionConsent;
    const error = getRecognitionPreferenceError(recognitionMethod, consent, Boolean(user?.aiTestAccess));
    if (error) {
      res.status(400).json({ error });
      return;
    }
    if (recognitionMethod === 'ai' && (process.env.AI_RECOGNITION_ENABLED !== 'true' || !process.env.OPENAI_API_KEY)) {
      res.status(503).json({ error: 'Облачное распознавание сейчас отключено или не настроено' });
      return;
    }
    const recognitionPreferences = {
      ...(recognitionMethod !== undefined && { recognitionMethod }),
      ...(aiRecognitionConsent !== undefined && { aiRecognitionConsent }),
      ...(aiRecognitionConsent === false || aiRecognitionConsent === null
        ? { recognitionMethod: 'tesseract', aiRecognitionConsent: false }
        : {}),
    };

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, defaultCurrency, budgetLimits, ...recognitionPreferences },
      update: {
        ...recognitionPreferences,
        ...(defaultCurrency && { defaultCurrency }),
        ...(budgetLimits && { budgetLimits }),
      },
    });

    res.json(preferences);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};
