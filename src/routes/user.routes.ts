import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getProfile, updatePreferences, updateProfile } from '../controllers/user.controller';
import { updateProfileValidators } from '../validators/user.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', getProfile);
router.patch('/profile', updateProfileValidators, updateProfile);
router.patch('/preferences', updatePreferences);

export default router;
