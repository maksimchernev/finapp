import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

// Get current user profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        provider: true,
        createdAt: true,
        preferences: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update user preferences
export const updatePreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { defaultCurrency, budgetLimits } = req.body;

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        defaultCurrency,
        budgetLimits,
      },
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
