import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getStatistics,
} from '../controllers/transaction.controller';
import {
  createTransactionValidators,
  transactionIdValidators,
  transactionListValidators,
  transactionStatisticsValidators,
  updateTransactionValidators,
} from '../validators/transaction.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', transactionListValidators, getTransactions);
router.get('/statistics', transactionStatisticsValidators, getStatistics);
router.get('/:id', transactionIdValidators, getTransaction);
router.post('/', createTransactionValidators, createTransaction);
router.patch('/:id', updateTransactionValidators, updateTransaction);
router.delete('/:id', transactionIdValidators, deleteTransaction);

export default router;
