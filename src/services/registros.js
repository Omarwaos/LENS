import { AppError } from '../utils.js';

export function fail(message, status) {
  throw new AppError(message, status);
}

export function text(value, label, max = 160, required = true) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') fail(`${label}: ingresa un texto válido.`);
  const result = value.trim();
  if ((required && !result) || result.length > max) {
    fail(`${label}: ${required ? 'es obligatorio y ' : ''}admite hasta ${max} caracteres.`);
  }
  return result;
}

export function choice(value, options, label) {
  if (!options.includes(value)) fail(`${label}: opción no válida.`);
  return value;
}

export function idValue(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail('Identificador no válido.');
  return value;
}

export function datetime(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    fail(`${label}: fecha y hora no válidas.`);
  }
  const date = new Date(`${value}:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== value) {
    fail(`${label}: fecha no válida.`);
  }
  return `${value}:00-05:00`;
}

export function limaNow() {
  const lima = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return `${lima.toISOString().slice(0, 19)}-05:00`;
}

export async function getRecord(db, table, id) {
  const record = await db(table).where({ id }).first();
  if (!record) fail('El registro ya no existe.', 404);
  return record;
}
