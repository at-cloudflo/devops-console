import { Router } from 'express';
import * as menuController from '../controllers/menu.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', requireAuth, menuController.getMenu);

export default router;
