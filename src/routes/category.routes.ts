import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  suggestCategory,
  updateCategory,
} from '../controllers/category.controller';
import {
  categoryIdValidators,
  categoryWriteValidators,
  updateCategoryValidators,
} from '../validators/category.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getCategories);
router.post('/', categoryWriteValidators, createCategory);
router.post('/suggest', suggestCategory);
router.get('/:id', getCategory);
router.patch('/:id', updateCategoryValidators, updateCategory);
router.delete('/:id', categoryIdValidators, deleteCategory);

export default router;
