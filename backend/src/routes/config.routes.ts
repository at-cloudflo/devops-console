import { Router } from 'express';
import * as configController from '../controllers/config.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
const configAdmin = requireRole('config.admin', 'portal.admin');

router.get('/', requireAuth, configController.getConfig);
router.put('/', requireAuth, configAdmin, configController.updateConfig);
router.post('/reset', requireAuth, configAdmin, configController.resetConfig);
router.post('/test-teams-webhook', requireAuth, configAdmin, configController.testTeamsWebhook);

export default router;
