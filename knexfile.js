import { fileURLToPath } from 'node:url';
import { readDatabaseConfig } from './src/config/env.js';

export default {
  client: 'mysql2',
  connection: readDatabaseConfig(),
  migrations: {
    directory: fileURLToPath(new URL('./src/db/migrations/', import.meta.url)),
    loadExtensions: ['.js'],
  },
  seeds: {
    directory: fileURLToPath(new URL('./src/db/seeds/', import.meta.url)),
    loadExtensions: ['.js'],
  },
};
