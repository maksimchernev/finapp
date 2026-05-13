import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

// Get all categories
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query; // 'income' or 'expense'

    const where = type ? { type: type as string } : {};

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Get single category
export const getCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
};

// Auto-categorize based on merchant name
export const suggestCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { merchant } = req.body;

    if (!merchant) {
      return res.status(400).json({ error: 'Merchant name is required' });
    }

    const merchantLower = merchant.toLowerCase();

    // Find matching category by keywords
    const categories = await prisma.category.findMany({
      where: {
        keywords: {
          hasSome: [], // Get all to filter in JS
        },
      },
    });

    let bestMatch = null;
    let highestConfidence = 0;

    for (const category of categories) {
      for (const keyword of category.keywords) {
        if (merchantLower.includes(keyword.toLowerCase())) {
          // Simple confidence: longer keyword = higher confidence
          const confidence = Math.min(95, 70 + keyword.length * 2);
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = category;
          }
        }
      }
    }

    if (bestMatch) {
      res.json({
        category: bestMatch,
        confidence: highestConfidence,
      });
    } else {
      // Default to 'other_expense' or 'other_income'
      const defaultCategory = await prisma.category.findFirst({
        where: { name: 'other_expense' },
      });
      
      res.json({
        category: defaultCategory,
        confidence: 30,
      });
    }
  } catch (error) {
    console.error('Suggest category error:', error);
    res.status(500).json({ error: 'Failed to suggest category' });
  }
};
