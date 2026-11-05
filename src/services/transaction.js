import { AppError } from '../utils.js';

export async function writeTransaction(db, operation) {
  try {
    return await db.transaction(async trx => {
      // Las reservas de distintos eventos pueden competir por el mismo recurso.
      const lock = await trx('control_escrituras').where({ clave: 'operaciones' }).forUpdate().first();
      if (!lock) throw new Error('Falta el registro de control de escrituras.');
      return operation(trx);
    }, { isolationLevel: 'read committed' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new AppError('Ya existe un registro con esa serie, documento o asignación.', 409);
    }
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      throw new AppError('Este registro tiene relaciones. Retira primero sus asignaciones; el historial de entregas se conserva.', 409);
    }
    throw error;
  }
}
