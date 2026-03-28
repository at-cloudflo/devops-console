import { Router } from 'express';
import * as mlopsController from '../controllers/mlops.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
const mlopsRead = requireRole('mlops.read', 'portal.admin');

router.get('/vertex/jobs', requireAuth, mlopsRead, mlopsController.getVertexJobs);
router.get('/vertex/jobs/:id', requireAuth, mlopsRead, mlopsController.getVertexJobById);

export default router;
