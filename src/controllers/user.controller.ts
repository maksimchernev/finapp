import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

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

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { defaultCurrency, budgetLimits } = req.body;

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, defaultCurrency, budgetLimits },
      update: {
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
