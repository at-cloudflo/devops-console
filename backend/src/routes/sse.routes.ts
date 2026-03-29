import { Router } from 'express';
import * as sseController from '../controllers/sse.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', requireAuth, sseController.subscribe);

export default router;
