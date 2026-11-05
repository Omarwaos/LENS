import { responsablesPorEvento } from './disponibilidad.js';
import { choice, fail, limaNow, text } from './registros.js';

export async function personFields(db, body, previous) {
  const fields = {
    nombres: text(body.nombres, 'Nombres', 80),
    apellidos: text(body.apellidos, 'Apellidos', 80),
    documento: text(body.documento, 'Documento', 30),
    telefono: text(body.telefono, 'Teléfono', 30, false),
    especialidad: text(body.especialidad, 'Especialidad', 80),
    estado: choice(body.estado, ['Activo', 'Inactivo'], 'Estado'),
  };

  if (previous && fields.estado === 'Inactivo') {
    const conflict = await responsablesPorEvento(db).where('r.personal_id', previous.id)
      .where('e.estado', 'Programado').where('e.fin', '>', limaNow()).first('r.id');
    if (conflict) fail('Esta persona tiene eventos pendientes. Retira primero sus asignaciones.', 409);
  }
  return fields;
}
