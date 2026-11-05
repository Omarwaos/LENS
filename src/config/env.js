import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

try {
  loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

export const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));

export function readPort(value, name) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} debe ser un puerto entre 1 y 65535.`);
  }
  return port;
}

export function readDatabaseConfig(env = process.env) {
  return {
    host: env.DB_HOST || '127.0.0.1',
    port: readPort(env.DB_PORT || 3306, 'DB_PORT'),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME || 'lens',
    charset: 'utf8mb4',
    multipleStatements: false,
  };
}
