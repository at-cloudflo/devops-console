import { Router } from 'express';
import * as devopsController from '../controllers/devops.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
const devopsRead = requireRole('devops.read', 'portal.admin');
const approvalRead = requireRole('devops.approval.read', 'portal.admin');

router.get('/pools', requireAuth, devopsRead, devopsController.getPools);
router.get('/pools/:id', requireAuth, devopsRead, devopsController.getPoolById);
router.get('/pools/:id/agents', requireAuth, devopsRead, devopsController.getAgentsByPool);
router.get('/agents', requireAuth, devopsRead, devopsController.getAgents);
router.get('/queue', requireAuth, devopsRead, devopsController.getQueue);
router.get('/approvals', requireAuth, approvalRead, devopsController.getApprovals);
router.get('/alerts', requireAuth, devopsRead, devopsController.getAlerts);
router.post('/alerts/:id/acknowledge', requireAuth, devopsRead, devopsController.acknowledgeAlert);

export default router;
