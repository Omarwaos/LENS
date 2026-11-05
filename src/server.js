import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createDatabase } from './config/db.js';
import { readPort } from './config/env.js';
import { createService } from './services/lens.service.js';

export function createLensServer(db) {
  return createServer({
    headersTimeout: 10_000,
    requestTimeout: 30_000,
    connectionsCheckingInterval: 1_000,
  }, createApp(db, createService(db)));
}

async function start() {
  const port = readPort(process.env.PORT || 3000, 'PORT');
  const db = createDatabase();

  try {
    const ready = await db('control_escrituras').where({ clave: 'operaciones' }).first();
    if (!ready || !await db.schema.hasTable('sesiones')) {
      throw new Error('La base de datos todavía no está preparada.');
    }
    // Exige la migración antes de aceptar nuevas asignaciones con color.
    if (!await db.schema.hasColumn('responsables', 'color_asignacion')) {
      throw new Error('Falta la migración de colores de responsables.');
    }
    const server = createLensServer(db);
    server.once('close', () => void db.destroy());
    server.once('error', error => {
      console.error(`No se pudo iniciar LENS: ${error.message}`);
      process.exitCode = 1;
      server.close();
    });
    server.listen(port, '127.0.0.1', () => console.log(`LENS listo en http://127.0.0.1:${port}`));
    process.once('SIGINT', () => server.close());
    process.once('SIGTERM', () => server.close());
  } catch (error) {
    await db.destroy();
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().catch(error => {
    console.error(`No se pudo iniciar LENS: ${error.code ?? error.message}. Revisa .env y ejecuta npm run migrate.`);
    process.exitCode = 1;
  });
}
