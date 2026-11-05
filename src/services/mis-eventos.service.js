export function listWorkerEvents(db, personalId) {
  return db.transaction(async trx => {
    const events = await trx('responsables as r')
      .join('eventos as e', 'e.id', 'r.evento_id')
      .join('tipos_evento as t', 't.id', 'e.tipo_evento_id')
      .where('r.personal_id', personalId)
      .select('e.id', 'e.nombre', 'e.inicio', 'e.fin', 'e.direccion', 'e.descripcion', 'e.estado',
        't.nombre as tipo', 'r.rol')
      .orderBy('e.inicio');

    const equipment = await trx('responsables as r')
      .join('asignaciones as a', 'a.responsable_id', 'r.id')
      .join('equipos as eq', 'eq.id', 'a.equipo_id')
      .join('marcas as m', 'm.id', 'eq.marca_id')
      .where('r.personal_id', personalId)
      .select('r.evento_id', 'm.nombre as marca', 'eq.modelo', 'eq.numero_serie', 'a.entregado_en', 'a.devuelto_en')
      .orderBy('a.id');

    const byEvent = Map.groupBy(equipment, item => item.evento_id);
    return events.map(event => ({ ...event, equipos: byEvent.get(event.id) ?? [] }));
  }, { isolationLevel: 'repeatable read' });
}
