import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

// Basic health check
router.get('/', HealthController.basicHealth);

// Detailed health check with service status
router.get('/detailed', HealthController.detailedHealth);

// Kubernetes-style probes
router.get('/ready', HealthController.readiness);
router.get('/live', HealthController.liveness);

export { router as healthRoutes };
