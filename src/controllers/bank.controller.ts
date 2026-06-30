import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createUserBank, listUserBanks, updateUserBank } from "../services/bank.service";

const prisma = new PrismaClient();

export const getBanks = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const banks = await listUserBanks(prisma, userId);

    res.json(banks);
  } catch (error) {
    console.error("Get banks error:", error);
    res.status(500).json({ error: "Failed to fetch banks" });
  }
};

export const createBank = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const bank = await createUserBank(prisma, userId, req.body.name, req.body.keywords);

    res.status(201).json(bank);
  } catch (error) {
    console.error("Create bank error:", error);
    res.status(500).json({ error: "Failed to create bank" });
  }
};

export const updateBank = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const bank = await updateUserBank(prisma, userId, req.params.id, {
      keywords: req.body.keywords,
      name: req.body.name,
    });

    if (!bank) {
      res.status(404).json({ error: "Bank not found" });
      return;
    }

    res.json(bank);
  } catch (error) {
    console.error("Update bank error:", error);
    res.status(500).json({ error: "Failed to update bank" });
  }
};
