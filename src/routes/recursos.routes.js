import { Router } from 'express';
import { createResourceController } from '../controllers/recursos.controller.js';
import { methodNotAllowed, notFound } from '../middlewares/errorHandler.js';
import { jsonBody } from '../middlewares/jsonBody.js';
import { AppError } from '../utils.js';

export function createResourceRouter(service, entity, createRecord) {
  const router = Router({ strict: true, caseSensitive: true });
  const controller = createResourceController(service, entity, createRecord ?? (body => service.save(entity, body)));

  router.param('id', (req, res, next, id) => {
    if (!/^\d+$/.test(id)) return notFound(req, res);
    req.resourceId = Number(id);
    if (!Number.isSafeInteger(req.resourceId) || req.resourceId < 1) {
      throw new AppError('Identificador no válido.');
    }
    next();
  });

  router.route('/')
    .get(controller.list)
    .post(jsonBody, controller.create)
    .all(methodNotAllowed);

  const item = router.route('/:id');
  item.get(controller.get).delete(controller.remove);
  if (!createRecord) item.put(jsonBody, controller.update);
  item.all(methodNotAllowed);

  return router;
}
