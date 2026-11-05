export const config = { transaction: false };

const catalogs = {
  marcas: ['Canon', 'Sony', 'Nikon', 'DJI', 'Godox', 'SanDisk', 'Otra'],
  categorias: ['Cámaras', 'Lentes', 'Drones', 'Iluminación', 'Audio', 'Accesorios'],
  tipos_evento: ['Boda', 'Graduación', 'Corporativo', 'Sesión fotográfica', 'Cumpleaños', 'Otro'],
};

function configure(table) {
  table.engine('InnoDB');
  table.charset('utf8mb4');
  table.collate('utf8mb4_unicode_ci');
}

function reference(table, name, target) {
  table.integer(name).unsigned().notNullable().references('id').inTable(target).onDelete('RESTRICT');
}

export async function up(knex) {
  const schema = knex.schema;

  for (const name of Object.keys(catalogs)) {
    schema.createTable(name, table => {
      configure(table);
      table.increments('id');
      table.string('nombre', 80).notNullable().unique();
    });
  }

  schema.createTable('equipos', table => {
    configure(table);
    table.increments('id');
    reference(table, 'marca_id', 'marcas');
    reference(table, 'categoria_id', 'categorias');
    table.string('modelo', 160).notNullable();
    table.string('numero_serie', 80).notNullable().unique();
    table.string('descripcion', 1000).notNullable().defaultTo('');
    table.enu('estado', ['Operativo', 'Mantenimiento', 'Baja']).notNullable().defaultTo('Operativo');
    table.string('creado_en', 24).notNullable();
  });

  schema.createTable('personal', table => {
    configure(table);
    table.increments('id');
    table.string('nombres', 80).notNullable();
    table.string('apellidos', 80).notNullable();
    table.string('documento', 30).notNullable().unique();
    table.string('telefono', 30).notNullable().defaultTo('');
    table.string('especialidad', 80).notNullable();
    table.enu('estado', ['Activo', 'Inactivo']).notNullable().defaultTo('Activo');
    table.string('creado_en', 24).notNullable();
  });

  schema.createTable('eventos', table => {
    configure(table);
    table.increments('id');
    reference(table, 'tipo_evento_id', 'tipos_evento');
    table.string('nombre', 160).notNullable();
    table.string('descripcion', 1000).notNullable().defaultTo('');
    table.string('inicio', 25).notNullable();
    table.string('fin', 25).notNullable();
    table.string('direccion', 250).notNullable();
    table.enu('estado', ['Programado', 'Finalizado', 'Cancelado']).notNullable().defaultTo('Programado');
    table.string('creado_en', 24).notNullable();
    table.index(['inicio', 'fin']);
    table.check('fin > inicio', [], 'eventos_intervalo_valido');
  });

  schema.createTable('responsables', table => {
    configure(table);
    table.increments('id');
    reference(table, 'evento_id', 'eventos');
    reference(table, 'personal_id', 'personal');
    table.string('rol', 80).notNullable();
    table.unique(['evento_id', 'personal_id']);
  });

  schema.createTable('asignaciones', table => {
    configure(table);
    table.increments('id');
    reference(table, 'responsable_id', 'responsables');
    reference(table, 'equipo_id', 'equipos');
    table.string('entregado_en', 24);
    table.string('devuelto_en', 24);
    table.string('condicion_salida', 500).notNullable().defaultTo('');
    table.string('condicion_retorno', 500).notNullable().defaultTo('');
    table.string('observacion', 1000).notNullable().defaultTo('');
    table.unique(['responsable_id', 'equipo_id']);
    table.check('devuelto_en IS NULL OR (entregado_en IS NOT NULL AND devuelto_en >= entregado_en)', [], 'asignaciones_devolucion_valida');
  });

  schema.createTable('control_escrituras', table => {
    configure(table);
    table.string('clave', 30).primary();
  });

  await schema;
  await knex.transaction(async trx => {
    for (const [table, names] of Object.entries(catalogs)) {
      await trx(table).insert(names.map(nombre => ({ nombre })));
    }
    await trx('control_escrituras').insert([{ clave: 'operaciones' }, { clave: 'demo' }]);
  });
}

export async function down(knex) {
  await knex.schema
    .dropTableIfExists('control_escrituras')
    .dropTableIfExists('asignaciones')
    .dropTableIfExists('responsables')
    .dropTableIfExists('eventos')
    .dropTableIfExists('personal')
    .dropTableIfExists('equipos')
    .dropTableIfExists('tipos_evento')
    .dropTableIfExists('categorias')
    .dropTableIfExists('marcas');
}
