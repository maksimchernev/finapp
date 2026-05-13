import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getProfile, updatePreferences } from '../controllers/user.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', getProfile);
router.patch('/preferences', updatePreferences);

export default router;
