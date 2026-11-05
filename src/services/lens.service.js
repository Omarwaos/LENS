import { createAssignmentService } from './asignaciones.service.js';
import { equipmentFields } from './equipos.service.js';
import { eventFields } from './eventos.service.js';
import { personFields } from './personal.service.js';
import { fail, getRecord } from './registros.js';
import { writeTransaction } from './transaction.js';

const validators = { equipos: equipmentFields, personal: personFields, eventos: eventFields };

function resourceQuery(db, entity) {
  switch (entity) {
    case 'equipos':
      return db('equipos').join('marcas as m', 'm.id', 'equipos.marca_id')
        .join('categorias as c', 'c.id', 'equipos.categoria_id')
        .select('equipos.*', 'm.nombre as marca', 'c.nombre as categoria').orderBy('equipos.id', 'desc');
    case 'eventos':
      return db('eventos').join('tipos_evento as t', 't.id', 'eventos.tipo_evento_id')
        .select('eventos.*', 't.nombre as tipo').orderBy('eventos.inicio');
    case 'personal':
      return db('personal').orderBy(['nombres', 'apellidos']);
    case 'responsables':
      return db('responsables').orderBy('id');
    case 'asignaciones':
      return db('asignaciones').orderBy('id', 'desc');
    default:
      return fail('Recurso no válido.', 404);
  }
}

async function checkRemoval(db, entity, row) {
  if (entity === 'asignaciones') {
    if (row.entregado_en) fail('No se puede eliminar una asignación con entrega registrada.', 409);
    const responsible = await getRecord(db, 'responsables', row.responsable_id);
    const event = await getRecord(db, 'eventos', responsible.evento_id);
    if (event.estado === 'Finalizado') fail('Las asignaciones de un evento finalizado se conservan.', 409);
  }
  if (entity === 'responsables') {
    const event = await getRecord(db, 'eventos', row.evento_id);
    if (event.estado === 'Finalizado') fail('El personal de un evento finalizado se conserva.', 409);
  }
}

export function createService(db) {
  return {
    ...createAssignmentService(db),

    list(entity) {
      return resourceQuery(db, entity);
    },

    async get(entity, id) {
      const row = await resourceQuery(db, entity).where(`${entity}.id`, id).first();
      if (!row) fail('El registro ya no existe.', 404);
      return row;
    },

    snapshot() {
      return db.transaction(async trx => ({
        catalogos: {
          marcas: await trx('marcas').orderBy('id'),
          categorias: await trx('categorias').orderBy('id'),
          tipos_evento: await trx('tipos_evento').orderBy('id'),
        },
        equipos: await resourceQuery(trx, 'equipos'),
        personal: await resourceQuery(trx, 'personal'),
        eventos: await resourceQuery(trx, 'eventos'),
        responsables: await resourceQuery(trx, 'responsables'),
        asignaciones: await resourceQuery(trx, 'asignaciones'),
      }), { isolationLevel: 'repeatable read' });
    },

    save(entity, body, id) {
      return writeTransaction(db, async trx => {
        const previous = id ? await getRecord(trx, entity, id) : null;
        const fields = await validators[entity](trx, body, previous);
        if (previous) {
          await trx(entity).where({ id }).update(fields);
          return getRecord(trx, entity, id);
        }

        const [newId] = await trx(entity).insert({ ...fields, creado_en: new Date().toISOString() });
        return getRecord(trx, entity, newId);
      });
    },

    remove(entity, id) {
      return writeTransaction(db, async trx => {
        const row = await getRecord(trx, entity, id);
        await checkRemoval(trx, entity, row);
        await trx(entity).where({ id }).delete();
        return { ok: true };
      });
    },
  };
}
