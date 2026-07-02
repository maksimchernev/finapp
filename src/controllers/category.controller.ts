import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  createUserCategory,
  deleteUserCategory,
  getVisibleCategory,
  listVisibleCategories,
  updateUserCategory,
} from "../services/category.service";

const prisma = new PrismaClient();

export const getCategories = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type } = req.query;
    const categoryType = typeof type === "string" ? type : undefined;

    const categories = await listVisibleCategories(prisma, userId, categoryType);

    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

export const getCategory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const category = await getVisibleCategory(prisma, userId, id);

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

export const createCategory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const category = await createUserCategory(prisma, userId, req.body);

    res.status(201).json(category);
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const category = await updateUserCategory(
      prisma,
      userId,
      req.params.id,
      req.body,
    );

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json(category);
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const category = await deleteUserCategory(prisma, userId, req.params.id);

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
};

export const suggestCategory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { merchant } = req.body;

    if (!merchant) {
      res.status(400).json({ error: "Merchant name is required" });
      return;
    }

    const merchantLower = merchant.toLowerCase();

    const categories = await listVisibleCategories(prisma, userId);

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

    const defaultCategory = categories.find(
      (category) => category.name === "other_expense",
    );

    res.json({ category: defaultCategory, confidence: 30 });
  } catch (error) {
    console.error("Suggest category error:", error);
    res.status(500).json({ error: "Failed to suggest category" });
  }
};
