import knex from 'knex';
import config from '../../knexfile.js';

export function createDatabase(connection = config.connection) {
  return knex({ ...config, connection });
}
