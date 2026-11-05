import jwt from 'jsonwebtoken';
import { AppError } from '../utils.js';

export const cookieName = 'lens_token';
export const sessionMs = 8 * 60 * 60 * 1000;
export const cookieOptions = { httpOnly: true, sameSite: 'strict', path: '/' };

export function readToken(req, secret) {
  try {
    return jwt.verify(req.cookies[cookieName], secret, { algorithms: ['HS256'], audience: 'lens' });
  } catch {
    return null;
  }
}

export function verifyToken(db, secret) {
  return async (req, res, next) => {
    const payload = readToken(req, secret);
    if (!payload) throw new AppError('Inicia sesión para continuar.', 401);

    const user = await db('usuarios as u').join('sesiones as s', 's.usuario_id', 'u.id')
      .leftJoin('personal as p', 'u.personal_id', 'p.id')
      .where('s.id', payload.jti).where('s.expira_en', '>', Date.now())
      .where('u.id', payload.sub).where('u.estado', true)
      .select('u.id', 'u.nombre_usuario', 'u.nivel_acceso', 'u.personal_id', 'p.nombres', 'p.apellidos', 'p.estado as estado_personal')
      .first();

    if (!user || (user.nivel_acceso === 'TRABAJADOR' && user.estado_personal !== 'Activo')) {
      throw new AppError('La cuenta está inactiva o ya no existe.', 401);
    }
    req.user = user;
    next();
  };
}

export function requireLevel(level) {
  return (req, res, next) => {
    if (req.user.nivel_acceso !== level) throw new AppError('No tienes permiso para esta acción.', 403);
    next();
  };
}
