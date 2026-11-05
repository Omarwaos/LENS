import { editableEvent, equipmentAvailable, equiposPorEvento, personAvailable } from './disponibilidad.js';
import { fail, getRecord, idValue, text } from './registros.js';
import { writeTransaction } from './transaction.js';
import { pickResponsibleColor } from './colores.js';

export function createAssignmentService(db) {
  return {
    assignPerson(body) {
      return writeTransaction(db, async trx => {
        const event = await editableEvent(trx, idValue(body.evento_id));
        const personal_id = idValue(body.personal_id);
        await personAvailable(trx, personal_id, event);
        const [id] = await trx('responsables').insert({
          evento_id: event.id,
          personal_id,
          rol: text(body.rol, 'Rol', 80),
          // Se guarda dentro de la transacción que serializa las asignaciones del evento.
          color_asignacion: await pickResponsibleColor(trx, event.id),
        });
        return getRecord(trx, 'responsables', id);
      });
    },

    assignEquipment(body) {
      return writeTransaction(db, async trx => {
        const responsible = await getRecord(trx, 'responsables', idValue(body.responsable_id));
        const event = await editableEvent(trx, responsible.evento_id);
        const equipo_id = idValue(body.equipo_id);
        await equipmentAvailable(trx, equipo_id, event);
        const duplicate = await equiposPorEvento(trx).where('e.id', event.id).where('a.equipo_id', equipo_id).first('a.id');
        if (duplicate) fail('Este equipo ya está asignado a una persona de este evento.', 409);
        const [id] = await trx('asignaciones').insert({ responsable_id: responsible.id, equipo_id });
        return getRecord(trx, 'asignaciones', id);
      });
    },

    movement(id, action, body) {
      return writeTransaction(db, async trx => {
        const assignment = await getRecord(trx, 'asignaciones', id);
        const responsible = await getRecord(trx, 'responsables', assignment.responsable_id);
        const event = await editableEvent(trx, responsible.evento_id);
        const condition = text(body.condicion, 'Condición del equipo', 500);
        const now = new Date().toISOString();
        const row = trx('asignaciones').where({ id });

        if (action === 'entregar') {
          if (assignment.entregado_en) fail('La entrega ya está registrada.', 409);
          await equipmentAvailable(trx, assignment.equipo_id, event);
          const pending = await trx('asignaciones').where('equipo_id', assignment.equipo_id)
            .whereNotNull('entregado_en').whereNull('devuelto_en').first('id');
          if (pending) fail('Este equipo sigue en poder de otro responsable. Registra su devolución primero.', 409);
          await row.update({ entregado_en: now, condicion_salida: condition });
        } else if (action === 'devolver') {
          if (!assignment.entregado_en || assignment.devuelto_en) {
            fail('Solo puedes devolver un equipo que está entregado.', 409);
          }
          await row.update({
            devuelto_en: now,
            condicion_retorno: condition,
            observacion: text(body.observacion, 'Observación', 1000, false),
          });
        } else {
          fail('Acción no válida.', 404);
        }
        return getRecord(trx, 'asignaciones', id);
      });
    },
  };
}
