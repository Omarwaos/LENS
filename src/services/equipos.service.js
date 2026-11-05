import { equiposPorEvento } from './disponibilidad.js';
import { choice, fail, getRecord, idValue, limaNow, text } from './registros.js';

export async function equipmentFields(db, body, previous) {
  const fields = {
    modelo: text(body.modelo, 'Modelo'),
    numero_serie: text(body.numero_serie, 'Número de serie', 80),
    marca_id: idValue(body.marca_id),
    categoria_id: idValue(body.categoria_id),
    descripcion: text(body.descripcion, 'Descripción', 1000, false),
    estado: choice(body.estado, ['Operativo', 'Mantenimiento', 'Baja'], 'Estado'),
  };

  await getRecord(db, 'marcas', fields.marca_id);
  await getRecord(db, 'categorias', fields.categoria_id);
  if (previous && fields.estado !== 'Operativo') {
    const conflict = await equiposPorEvento(db).where('a.equipo_id', previous.id)
      .andWhere(query => query
        .where(delivery => delivery.whereNotNull('a.entregado_en').whereNull('a.devuelto_en'))
        .orWhere(reservation => reservation.where('e.estado', 'Programado').where('e.fin', '>', limaNow())))
      .first('a.id');
    if (conflict) fail('El equipo tiene reservas vigentes o una entrega pendiente de devolución. Resuélvelas antes de cambiar su estado.', 409);
  }
  return fields;
}
