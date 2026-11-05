import { AppError } from '../utils.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}

export function methodNotAllowed(req, res) {
  res.status(405).json({ error: 'Método no permitido.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    return res.status(error.status).json({ error: error.message });
  }

  const status = error.status;
  if (status === 400) return res.status(status).json({ error: 'El JSON o la solicitud no es válida.' });
  if (status === 413) return res.status(status).json({ error: 'La solicitud es demasiado grande.' });
  if (status === 415) return res.status(status).json({ error: 'Formato de solicitud no admitido.' });

  console.error(error);
  res.status(500).json({ error: 'Ocurrió un error interno. Revisa la terminal del servidor.' });
}
