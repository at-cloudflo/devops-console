import { Router } from 'express';
import * as systemController from '../controllers/system.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/health', systemController.getHealth);
router.get('/refresh-status', requireAuth, systemController.getRefreshStatus);
router.post('/refresh', requireAuth, systemController.triggerRefresh);

export default router;
