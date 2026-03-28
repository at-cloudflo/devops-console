import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', authController.me);

export default router;
