import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getCategories,
  getCategory,
  suggestCategory,
} from '../controllers/category.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getCategories);
router.post('/suggest', suggestCategory);
router.get('/:id', getCategory);

export default router;
