export const config = { transaction: false };

export async function up(knex) {
  await knex.schema.createTable('usuarios', table => {
    table.engine('InnoDB');
    table.charset('utf8mb4');
    table.collate('utf8mb4_unicode_ci');
    table.increments('id');
    table.integer('personal_id').unsigned().unique()
      .references('id').inTable('personal').onDelete('CASCADE');
    table.string('nombre_usuario', 50).notNullable().unique();
    table.string('clave_acceso', 60).notNullable();
    table.enu('nivel_acceso', ['ADMIN', 'TRABAJADOR']).notNullable();
    table.boolean('estado').notNullable().defaultTo(true);
    table.check("nivel_acceso = 'ADMIN' OR personal_id IS NOT NULL", [], 'usuarios_trabajador_con_ficha');
  }).createTable('sesiones', table => {
    table.engine('InnoDB');
    table.string('id', 36).primary();
    table.integer('usuario_id').unsigned().notNullable()
      .references('id').inTable('usuarios').onDelete('CASCADE');
    table.bigInteger('expira_en').unsigned().notNullable().index();
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('sesiones').dropTableIfExists('usuarios');
}
