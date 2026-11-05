import { fail, getRecord } from './registros.js';

export const responsablesPorEvento = db => db('responsables as r').join('eventos as e', 'r.evento_id', 'e.id');
export const equiposPorEvento = db => responsablesPorEvento(db).join('asignaciones as a', 'a.responsable_id', 'r.id');

function overlap(query, event) {
  return query
    .whereNot('e.id', event.id)
    .whereNot('e.estado', 'Cancelado')
    .where('e.inicio', '<', event.fin)
    .where('e.fin', '>', event.inicio)
    .first('e.nombre');
}

export async function personAvailable(db, personId, event, requireActive = true) {
  if (requireActive && (await getRecord(db, 'personal', personId)).estado !== 'Activo') {
    fail('La persona está inactiva.', 409);
  }
  const conflict = await overlap(responsablesPorEvento(db).where('r.personal_id', personId), event);
  if (conflict) fail(`Cruce de horario: esta persona ya participa en «${conflict.nombre}».`, 409);
}

export async function equipmentAvailable(db, equipmentId, event, requireActive = true) {
  if (requireActive && (await getRecord(db, 'equipos', equipmentId)).estado !== 'Operativo') {
    fail('Solo se pueden reservar equipos operativos.', 409);
  }
  const conflict = await overlap(equiposPorEvento(db).where('a.equipo_id', equipmentId), event);
  if (conflict) fail(`Cruce de horario: este equipo está reservado para «${conflict.nombre}».`, 409);
}

export async function editableEvent(db, id) {
  const event = await getRecord(db, 'eventos', id);
  if (event.estado !== 'Programado') fail('Solo puedes modificar asignaciones de eventos programados.', 409);
  return event;
}
