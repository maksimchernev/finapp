import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TransactionInput } from '../types';
import {
  categoryExists,
  createUserTransaction,
  deleteUserTransaction,
  findUserTransaction,
  getUserTransactionStatistics,
  listUserTransactions,
  updateUserTransaction,
} from '../services/transaction.service';
import { userBankExists } from '../services/bank.service';

const prisma = new PrismaClient();

function getQueryString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate, categoryId, limit = 100, offset = 0 } = req.query;

    const { transactions, total } = await listUserTransactions(prisma, userId, {
      startDate: getQueryString(startDate),
      endDate: getQueryString(endDate),
      categoryId: getQueryString(categoryId),
    }, {
      limit: Number(limit),
      offset: Number(offset),
    });

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

    const transaction = await findUserTransaction(prisma, userId, id);

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

    if (!(await categoryExists(prisma, userId, data.categoryId))) {
      res.status(400).json({ error: 'Category not found' });
      return;
    }

    if (!(await userBankExists(prisma, userId, data.bankId))) {
      res.status(400).json({ error: 'Bank not found' });
      return;
    }

    const transaction = await createUserTransaction(prisma, userId, data);

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

    if (!(await categoryExists(prisma, userId, data.categoryId))) {
      res.status(400).json({ error: 'Category not found' });
      return;
    }

    if (!(await userBankExists(prisma, userId, data.bankId))) {
      res.status(400).json({ error: 'Bank not found' });
      return;
    }

    const transaction = await updateUserTransaction(prisma, userId, id, data);

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

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

    const wasDeleted = await deleteUserTransaction(prisma, userId, id);

    if (!wasDeleted) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

export const getStatistics = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const statistics = await getUserTransactionStatistics(prisma, userId, {
      startDate: getQueryString(startDate),
      endDate: getQueryString(endDate),
    });

    res.json(statistics);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
