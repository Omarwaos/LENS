import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { cookieName, cookieOptions, readToken, sessionMs } from '../middlewares/auth.js';
import { AppError } from '../utils.js';

const dummyHash = bcrypt.hashSync('lens-placeholder', 12);

export function createAuthController(db, secret) {
  return {
    async login(req, res) {
      const { nombre_usuario: username, clave_acceso: password } = req.body;
      if (typeof username !== 'string' || !username.trim() || username.trim().length > 50 ||
          typeof password !== 'string' || !password || bcrypt.truncates(password)) {
        throw new AppError('Ingresa un usuario y una contraseña válidos.');
      }

      const user = await db('usuarios as u').leftJoin('personal as p', 'u.personal_id', 'p.id')
        .where('u.nombre_usuario', username.trim())
        .select('u.id', 'u.estado', 'u.clave_acceso', 'u.nivel_acceso', 'p.estado as estado_personal')
        .first();
      const matches = await bcrypt.compare(password, user?.clave_acceso ?? dummyHash);
      if (!matches || !user?.estado || (user.nivel_acceso === 'TRABAJADOR' && user.estado_personal !== 'Activo')) {
        throw new AppError('Usuario o contraseña incorrectos.', 401);
      }

      const sessionId = randomUUID();
      const now = Date.now();
      const token = jwt.sign({}, secret, {
        algorithm: 'HS256',
        audience: 'lens',
        subject: String(user.id),
        jwtid: sessionId,
        expiresIn: sessionMs / 1000,
      });
      await db('sesiones').where('expira_en', '<=', now).delete();

      // Bloquea la cuenta y vuelve a comprobar el hash por si cambió durante la comparación.
      await db.transaction(async trx => {
        const current = await trx('usuarios').where({ id: user.id }).forUpdate()
          .first('estado', 'clave_acceso');
        if (!current?.estado || current.clave_acceso !== user.clave_acceso) {
          throw new AppError('Usuario o contraseña incorrectos.', 401);
        }
        await trx('sesiones').insert({ id: sessionId, usuario_id: user.id, expira_en: now + sessionMs });
      });
      res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionMs }).json({ ok: true });
    },

    async logout(req, res) {
      const payload = readToken(req, secret);
      if (payload) await db('sesiones').where({ id: payload.jti, usuario_id: payload.sub }).delete();
      res.clearCookie(cookieName, cookieOptions).json({ ok: true });
    },

    me(req, res) {
      const { id, nombre_usuario, nivel_acceso, nombres, apellidos } = req.user;
      res.json({ id, nombre_usuario, nivel_acceso, nombres, apellidos });
    },
  };
}
