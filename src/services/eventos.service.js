import { equipmentAvailable, equiposPorEvento, personAvailable } from './disponibilidad.js';
import { choice, datetime, fail, getRecord, idValue, text } from './registros.js';

export async function eventFields(db, body, previous) {
  const fields = {
    nombre: text(body.nombre, 'Nombre del evento'),
    tipo_evento_id: idValue(body.tipo_evento_id),
    inicio: datetime(body.inicio, 'Inicio'),
    fin: datetime(body.fin, 'Fin'),
    direccion: text(body.direccion, 'Lugar', 250),
    descripcion: text(body.descripcion, 'Descripción', 1000, false),
    estado: choice(body.estado, ['Programado', 'Finalizado', 'Cancelado'], 'Estado'),
  };

  await getRecord(db, 'tipos_evento', fields.tipo_evento_id);
  if (fields.fin <= fields.inicio) fail('El fin debe ser posterior al inicio.');
  if (!previous) return fields;

  const deliveries = equiposPorEvento(db).where('e.id', previous.id).whereNotNull('a.entregado_en');
  if ((previous.inicio !== fields.inicio || previous.fin !== fields.fin) && await deliveries.clone().first('a.id')) {
    fail('Un evento con entregas registradas conserva sus fechas para proteger el historial.', 409);
  }
  if (fields.estado !== 'Programado' && await deliveries.clone().whereNull('a.devuelto_en').first('a.id')) {
    fail('Registra las devoluciones antes de finalizar o cancelar el evento.', 409);
  }

  if (fields.estado !== 'Cancelado') {
    const candidate = { ...fields, id: previous.id };
    const requireActive = fields.estado === 'Programado';
    const people = await db('responsables').where('evento_id', previous.id).pluck('personal_id');
    const equipment = await equiposPorEvento(db).where('e.id', previous.id).pluck('a.equipo_id');
    for (const id of people) await personAvailable(db, id, candidate, requireActive);
    for (const id of equipment) await equipmentAvailable(db, id, candidate, requireActive);
  }

  return fields;
}
