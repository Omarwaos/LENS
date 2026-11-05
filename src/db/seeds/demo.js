import { writeTransaction } from '../../services/transaction.js';
import { pickResponsibleColor } from '../../services/colores.js';

function futureDate(days, time) {
  const day = new Date(Date.now() - 5 * 60 * 60 * 1000);
  day.setUTCDate(day.getUTCDate() + days);
  return `${day.toISOString().slice(0, 10)}T${time}:00-05:00`;
}

export async function seed(knex) {
  await writeTransaction(knex, async trx => {
    const marker = trx('control_escrituras').where({ clave: 'demo' });
    if (!await marker.clone().first()) return;

    const creado_en = new Date().toISOString();
    for (const [marca, categoria, modelo, numero_serie, descripcion, estado] of [
      ['Sony', 'Cámaras', 'Alpha A7 IV', 'LENS-CAM-001', 'Cuerpo full frame · incluye batería y correa', 'Operativo'],
      ['Canon', 'Cámaras', 'EOS R6 Mark II', 'LENS-CAM-002', 'Cuerpo de cámara para fotografía y video', 'Operativo'],
      ['Sony', 'Lentes', 'FE 24–70 mm f/2.8 GM', 'LENS-LEN-001', 'Lente estándar con parasol y tapas', 'Operativo'],
      ['DJI', 'Drones', 'Mini 4 Pro', 'LENS-DRN-001', 'Kit con control, hélices y 3 baterías', 'Operativo'],
      ['Godox', 'Iluminación', 'AD200 Pro', 'LENS-LUZ-001', 'Flash portátil con estuche', 'Mantenimiento'],
      ['SanDisk', 'Accesorios', 'Extreme Pro 128 GB', 'LENS-ACC-001', 'Tarjeta SD identificada individualmente', 'Operativo'],
    ]) {
      const { id: marca_id } = await trx('marcas').where('nombre', marca).first('id');
      const { id: categoria_id } = await trx('categorias').where('nombre', categoria).first('id');
      await trx('equipos').insert({ marca_id, categoria_id, modelo, numero_serie, descripcion, estado, creado_en });
    }

    const people = [
      { nombres: 'Valeria', apellidos: 'Torres', documento: 'DEMO-001', especialidad: 'Fotografía', creado_en },
      { nombres: 'Mateo', apellidos: 'Ríos', documento: 'DEMO-002', especialidad: 'Videografía', creado_en },
      { nombres: 'Lucía', apellidos: 'Vega', documento: 'DEMO-003', especialidad: 'Asistencia de producción', creado_en },
      { nombres: 'Diego', apellidos: 'Mendoza', documento: 'DEMO-004', especialidad: 'Operación de drones', creado_en },
    ];
    const existingDocuments = await trx('personal').whereIn('documento', people.map(person => person.documento)).pluck('documento');
    const newPeople = people.filter(person => !existingDocuments.includes(person.documento));
    if (newPeople.length) await trx('personal').insert(newPeople);

    const eventIds = [];
    for (const [tipo, nombre, descripcion, days, start, end, direccion] of [
      ['Boda', 'Boda · Karen y Frank', 'Ceremonia y recepción. Preparar cámaras y audio.', 2, '16:00', '23:00', 'Hacienda Los Olivos, Chincha'],
      ['Graduación', 'Graduación · Promoción 2026', 'Fotografía grupal y cobertura de ceremonia.', 5, '18:00', '22:00', 'Villa Lomo Largo, Chincha'],
      ['Sesión fotográfica', 'Retratos · Estudio creativo', 'Sesión de retratos en estudio.', 7, '09:00', '12:00', 'Estudio Piero, Chincha Alta'],
    ]) {
      const { id: tipo_evento_id } = await trx('tipos_evento').where('nombre', tipo).first('id');
      const [id] = await trx('eventos').insert({
        tipo_evento_id, nombre, descripcion, direccion, creado_en,
        inicio: futureDate(days, start),
        fin: futureDate(days, end),
      });
      eventIds.push(id);
    }

    const eventId = eventIds[0];
    const { id: photographer } = await trx('personal').where('documento', 'DEMO-001').first('id');
    const { id: videographer } = await trx('personal').where('documento', 'DEMO-002').first('id');
    const [responsable_id] = await trx('responsables').insert({
      evento_id: eventId, personal_id: photographer, rol: 'Fotógrafa principal',
      color_asignacion: await pickResponsibleColor(trx, eventId),
    });
    await trx('responsables').insert({
      evento_id: eventId, personal_id: videographer, rol: 'Videógrafo',
      color_asignacion: await pickResponsibleColor(trx, eventId),
    });
    const equipment = await trx('equipos').whereIn('numero_serie', ['LENS-CAM-001', 'LENS-LEN-001']).pluck('id');
    await trx('asignaciones').insert(equipment.map(equipo_id => ({ responsable_id, equipo_id })));
    await marker.delete();
  });
}
