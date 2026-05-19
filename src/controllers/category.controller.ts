import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getCategories = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const where = type ? { type: type as string } : {};

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: "asc" },
    });

    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

export const getCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json(category);
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
};

export const suggestCategory = async (req: Request, res: Response) => {
  try {
    const { merchant } = req.body;

    if (!merchant) {
      res.status(400).json({ error: "Merchant name is required" });
      return;
    }

    const merchantLower = merchant.toLowerCase();

    const categories = await prisma.category.findMany();

    let bestMatch = null;
    let highestConfidence = 0;

    for (const category of categories) {
      for (const keyword of category.keywords) {
        if (merchantLower.includes(keyword.toLowerCase())) {
          const confidence = Math.min(95, 70 + keyword.length * 2);
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = category;
          }
        }
      }
    }

    if (bestMatch) {
      res.json({ category: bestMatch, confidence: highestConfidence });
      return;
    }

    const defaultCategory = await prisma.category.findFirst({
      where: { name: "other_expense" },
    });

    res.json({ category: defaultCategory, confidence: 30 });
  } catch (error) {
    console.error("Suggest category error:", error);
    res.status(500).json({ error: "Failed to suggest category" });
  }
};
