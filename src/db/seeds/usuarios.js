import bcrypt from 'bcryptjs';
import { writeTransaction } from '../../services/transaction.js';

const accounts = [
  ['admin', 'admin123*', null],
  ['valeria', 'valeria123*', { nombres: 'Valeria', apellidos: 'Torres', documento: 'DEMO-001', especialidad: 'Fotografía' }],
  ['mateo', 'mateo123*', { nombres: 'Mateo', apellidos: 'Ríos', documento: 'DEMO-002', especialidad: 'Videografía' }],
  ['lucia', 'lucia123*', { nombres: 'Lucía', apellidos: 'Vega', documento: 'DEMO-003', especialidad: 'Asistencia de producción' }],
];

export async function seed(knex) {
  await writeTransaction(knex, async trx => {
    for (const [nombre_usuario, password, profile] of accounts) {
      const account = await trx('usuarios').where({ nombre_usuario }).first('id');
      const clave_acceso = bcrypt.hashSync(password, 10);
      if (account) {
        // Cambia la clave y revoca las sesiones anteriores en la misma transacción.
        await trx('usuarios').where({ id: account.id }).update({ clave_acceso });
        await trx('sesiones').where({ usuario_id: account.id }).delete();
        continue;
      }

      let personal_id = null;
      if (profile) {
        const person = await trx('personal').where({ documento: profile.documento }).first('id');
        if (person) {
          personal_id = person.id;
        } else {
          [personal_id] = await trx('personal').insert({ ...profile, creado_en: new Date().toISOString() });
        }
      }

      await trx('usuarios').insert({
        personal_id,
        nombre_usuario,
        clave_acceso,
        nivel_acceso: profile ? 'TRABAJADOR' : 'ADMIN',
      });
    }

  });
}
