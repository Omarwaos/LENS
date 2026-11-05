import { Router } from 'express';
import { requireLevel, verifyToken } from '../middlewares/auth.js';
import { listWorkerEvents } from '../services/mis-eventos.service.js';
import { createAssignmentRouter } from './asignaciones.routes.js';
import { createAuthRouter } from './auth.routes.js';
import { createResourceRouter } from './recursos.routes.js';

export function createApiRouter(db, service, secret) {
  const router = Router({ caseSensitive: true, strict: true });
  const authenticate = verifyToken(db, secret);

  router.get('/health', (req, res) => res.json({ ok: true }));
  router.use('/auth', createAuthRouter(db, secret, authenticate));
  router.use(authenticate);
  router.get('/mis-eventos', requireLevel('TRABAJADOR'), async (req, res) => {
    res.json(await listWorkerEvents(db, req.user.personal_id));
  });
  router.use(requireLevel('ADMIN'));
  router.get('/datos', async (req, res) => res.json(await service.snapshot()));
  router.use('/equipos', createResourceRouter(service, 'equipos'));
  router.use('/personal', createResourceRouter(service, 'personal'));
  router.use('/eventos', createResourceRouter(service, 'eventos'));
  router.use('/responsables', createResourceRouter(service, 'responsables', service.assignPerson));
  router.use('/asignaciones', createAssignmentRouter(service));

  return router;
}
