import { Request, Response } from 'express';
import { PrismaClient, Prisma, Category } from '@prisma/client';
import { TransactionInput } from '../types';

const prisma = new PrismaClient();

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate, categoryId, limit = 100, offset = 0 } = req.query;

    const where: Prisma.TransactionWhereInput = { userId };

    if (startDate || endDate) {
      where.date = {
        ...(startDate && { gte: new Date(startDate as string) }),
        ...(endDate && { lte: new Date(endDate as string) }),
      };
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.transaction.count({ where });

    res.json({
      transactions,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const getTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data: TransactionInput = req.body;

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: data.amount,
        currency: data.currency || 'EUR',
        date: new Date(data.date),
        merchant: data.merchant,
        categoryId: data.categoryId,
        confidence: data.confidence,
        imageUrl: data.imageUrl,
        notes: data.notes,
      },
      include: { category: true },
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const data: Partial<TransactionInput> = req.body;

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });

    if (!existing) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency && { currency: data.currency }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.merchant && { merchant: data.merchant }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.confidence !== undefined && { confidence: data.confidence }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { category: true },
    });

    res.json(transaction);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });

    if (!existing) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    await prisma.transaction.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

type CategoryStat = { category: Category; total: number; count: number };

export const getStatistics = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const where: Prisma.TransactionWhereInput = { userId };

    if (startDate || endDate) {
      where.date = {
        ...(startDate && { gte: new Date(startDate as string) }),
        ...(endDate && { lte: new Date(endDate as string) }),
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
    });

    const totalIncome = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const balance = totalIncome - totalExpense;

    const byCategory = transactions.reduce<Record<string, CategoryStat>>((acc, t) => {
      if (!t.category) return acc;
      const key = t.category.id;
      if (!acc[key]) {
        acc[key] = { category: t.category, total: 0, count: 0 };
      }
      acc[key].total += Math.abs(t.amount);
      acc[key].count += 1;
      return acc;
    }, {});

    res.json({
      totalIncome,
      totalExpense,
      balance,
      byCategory: Object.values(byCategory),
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
