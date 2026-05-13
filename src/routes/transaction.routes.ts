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

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getTransactions);
router.get('/statistics', getStatistics);
router.get('/:id', getTransaction);
router.post('/', createTransaction);
router.patch('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
