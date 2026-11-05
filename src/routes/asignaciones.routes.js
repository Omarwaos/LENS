import { createMovementController } from '../controllers/asignaciones.controller.js';
import { methodNotAllowed } from '../middlewares/errorHandler.js';
import { jsonBody } from '../middlewares/jsonBody.js';
import { createResourceRouter } from './recursos.routes.js';

export function createAssignmentRouter(service) {
  const router = createResourceRouter(service, 'asignaciones', service.assignEquipment);
  router.route('/:id/entregar').post(jsonBody, createMovementController(service, 'entregar')).all(methodNotAllowed);
  router.route('/:id/devolver').post(jsonBody, createMovementController(service, 'devolver')).all(methodNotAllowed);
  return router;
}
