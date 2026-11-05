import { AppError } from '../utils.js';

export function localOnly(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  });

  const { host, origin } = req.headers;
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host ?? '')) {
    throw new AppError('Host no permitido.', 403);
  }
  if (origin && origin !== `http://${host}`) {
    throw new AppError('Origen no permitido.', 403);
  }

  next();
}
