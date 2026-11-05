export const config = { transaction: false };

export async function up(knex) {
  // MySQL confirma los cambios de estructura por separado. Esto permite reintentar la migración.
  if (!(await knex.schema.hasColumn('responsables', 'color_asignacion'))) {
    await knex.schema.alterTable('responsables', table => {
      table.tinyint('color_asignacion').unsigned().notNullable().defaultTo(0);
    });
  }

  await knex.transaction(async trx => {
    await trx('control_escrituras').where({ clave: 'operaciones' }).forUpdate().first();
    const records = await trx('responsables')
      .select('id', 'evento_id')
      .orderBy(['evento_id', 'id']);
    let eventId = null;
    let position = 0;

    // Las asignaciones anteriores reciben colores distintos y conservan sus identificadores.
    for (const record of records) {
      if (record.evento_id !== eventId) {
        eventId = record.evento_id;
        position = 0;
      }
      await trx('responsables')
        .where({ id: record.id })
        .update({ color_asignacion: position % 10 });
      position++;
    }
  });
}

export async function down(knex) {
  await knex.schema.alterTable('responsables', table => table.dropColumn('color_asignacion'));
}
