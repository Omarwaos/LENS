import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createAuthController } from '../controllers/auth.controller.js';
import { jsonBody } from '../middlewares/jsonBody.js';

export function createAuthRouter(db, secret, authenticate) {
  const router = Router();
  const controller = createAuthController(db, secret);
  const limitLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    message: { error: 'Demasiados intentos. Vuelve a intentarlo en unos minutos.' },
  });

  router.post('/login', limitLogin, jsonBody, controller.login);
  router.post('/logout', controller.logout);
  router.get('/me', authenticate, controller.me);
  return router;
}
