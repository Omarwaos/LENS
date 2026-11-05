import { randomInt } from 'node:crypto';

export async function pickResponsibleColor(trx, eventId) {
  const colors = await trx('responsables').where({ evento_id: eventId }).pluck('color_asignacion');
  const counts = Array(10).fill(0);
  for (const color of colors) counts[color]++;

  // Primero sortea entre colores libres. Si hay más de diez personas, reparte las repeticiones.
  const minimum = Math.min(...counts);
  const candidates = counts
    .map((count, color) => ({ count, color }))
    .filter(item => item.count === minimum);
  return candidates[randomInt(candidates.length)].color;
}
