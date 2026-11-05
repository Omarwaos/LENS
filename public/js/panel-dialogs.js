import { $, escape, icon, fullName } from './panel-ui.js';
import { data } from './panel-state.js';

// Campos y formularios para crear o editar registros.
export function field(name, label, value = '', type = 'text', required = true, max = 160, wide = false) {
  return `
    <label class="field ${wide ? 'wide' : ''}">
      ${escape(label)}${
        type === 'textarea'
          ? `<textarea name="${name}" maxlength="${max}" ${required ? 'required' : ''}>${escape(value)}</textarea>`
          : `
            <input
              name="${name}"
              type="${type}"
              value="${escape(value)}"
              maxlength="${max}"
              ${required ? 'required' : ''}
            />
          `
      }
    </label>
  `;
}
export function select(name, label, options, value, placeholder = false) {
  return `
    <label class="field">
      ${escape(label)}
      <select name="${name}" required>
        ${placeholder ? '<option value="">Selecciona una opción</option>' : ''}${options
          .map(o => {
            const [id, label] = Array.isArray(o) ? o : [o, o];
            return `<option value="${escape(id)}" ${String(id) === String(value) ? 'selected' : ''}>${escape(label)}</option>`;
          })
          .join('')}
      </select>
    </label>
  `;
}
const catalogOptions = key => data.catalogos[key].map(o => [o.id, o.nombre]);
export function showEditor(entity, id) {
  const record = id ? data[entity].find(r => r.id === id) : {};
  const noun = { equipos: 'equipo', personal: 'persona', eventos: 'evento' }[entity];
  let fields;
  if (entity === 'equipos')
    fields =
      field('modelo', 'Modelo', record.modelo) +
      field('numero_serie', 'Número de serie o código interno', record.numero_serie, 'text', true, 80) +
      select('marca_id', 'Marca', catalogOptions('marcas'), record.marca_id) +
      select('categoria_id', 'Categoría', catalogOptions('categorias'), record.categoria_id) +
      select('estado', 'Estado operativo', ['Operativo', 'Mantenimiento', 'Baja'], record.estado) +
      field(
        'descripcion',
        'Descripción y accesorios incluidos',
        record.descripcion,
        'textarea',
        false,
        1000,
        true,
      );
  if (entity === 'personal')
    fields =
      field('nombres', 'Nombres', record.nombres, 'text', true, 80) +
      field('apellidos', 'Apellidos', record.apellidos, 'text', true, 80) +
      field('documento', 'Documento o identificador', record.documento, 'text', true, 30) +
      field('telefono', 'Teléfono (opcional)', record.telefono, 'tel', false, 30) +
      field('especialidad', 'Especialidad', record.especialidad, 'text', true, 80) +
      select('estado', 'Estado', ['Activo', 'Inactivo'], record.estado);
  if (entity === 'eventos')
    fields =
      field('nombre', 'Nombre del evento', record.nombre, 'text', true, 160, true) +
      select('tipo_evento_id', 'Tipo de evento', catalogOptions('tipos_evento'), record.tipo_evento_id) +
      select('estado', 'Estado', ['Programado', 'Finalizado', 'Cancelado'], record.estado) +
      field('inicio', 'Inicio · hora de Lima', record.inicio?.slice(0, 16), 'datetime-local') +
      field('fin', 'Fin · hora de Lima', record.fin?.slice(0, 16), 'datetime-local') +
      field('direccion', 'Lugar / dirección', record.direccion, 'text', true, 250, true) +
      field(
        'descripcion',
        'Notas de producción (opcional)',
        record.descripcion,
        'textarea',
        false,
        1000,
        true,
      );
  $('#editor').innerHTML = `
    <form id="entity-form" data-entity="${entity}" ${id ? `data-id="${id}"` : ''}>
      <header class="dialog-header">
        <div>
          <h2 id="editor-title">${id ? 'Editar' : entity === 'personal' ? 'Nueva' : 'Nuevo'} ${noun}</h2>
          <p>
            ${
              id
                ? 'Actualiza la información del registro.'
                : 'Completa los datos para incorporarlo a tu operación.'
            }
          </p>
        </div>
        <button type="button" class="icon-button" data-close="editor" aria-label="Cerrar">
          ${icon('close')}
        </button>
      </header>
      <div class="dialog-body">
        <div class="form-error" role="alert"></div>
        <div class="form-grid">${fields}</div>
        ${
          entity === 'equipos'
            ? '<p class="help-text">Cada unidad física debe tener una serie o un código único, incluidos los accesorios.</p>'
            : ''
        }${
          entity === 'eventos'
            ? '<p class="help-text">La disponibilidad del personal y los equipos se calcula con el intervalo completo del evento.</p>'
            : ''
        }
      </div>
      <footer class="dialog-footer">
        <button type="button" class="button secondary" data-close="editor">Cancelar</button>
        <button class="button primary" type="submit">${icon('check')} Guardar ${noun}</button>
      </footer>
    </form>
  `;
  $('#editor').showModal();
}

// Diálogos para registrar entregas, devoluciones y eliminaciones.
export function showMovement(id, action) {
  const returnMode = action === 'devolver',
    a = data.asignaciones.find(a => a.id === id),
    eq = data.equipos.find(e => e.id === a.equipo_id);
  $('#editor').innerHTML = `
    <form id="movement-form" data-id="${id}" data-movement="${action}">
      <header class="dialog-header">
        <div>
          <h2 id="editor-title">${returnMode ? 'Registrar devolución' : 'Registrar entrega'}</h2>
          <p>${escape(eq.modelo)} · ${escape(eq.numero_serie)}</p>
        </div>
        <button type="button" class="icon-button" data-close="editor" aria-label="Cerrar">
          ${icon('close')}
        </button>
      </header>
      <div class="dialog-body">
        <div class="form-error" role="alert"></div>
        <div class="form-grid">
          ${field(
            'condicion',
            returnMode ? 'Condición al regresar' : 'Condición de salida',
            '',
            'textarea',
            true,
            500,
            true,
          )}${
            returnMode
              ? field(
                  'observacion',
                  'Observación / incidencia (opcional)',
                  '',
                  'textarea',
                  false,
                  1000,
                  true,
                )
              : ''
          }
        </div>
        <p class="help-text">
          Se guardará la fecha y hora actual. Este movimiento permanecerá en el
          historial.${returnMode ? ' Si requiere revisión, cambia después su estado en Equipos.' : ''}
        </p>
      </div>
      <footer class="dialog-footer">
        <button type="button" class="button secondary" data-close="editor">Cancelar</button>
        <button class="button primary" type="submit">
          ${icon('check')} Confirmar ${returnMode ? 'devolución' : 'entrega'}
        </button>
      </footer>
    </form>
  `;
  $('#editor').showModal();
}
export function confirmDelete(entity, id) {
  const item = data[entity].find(r => r.id === id);
  const label =
    item.modelo ||
    item.nombre ||
    (item.nombres
      ? fullName(item)
      : entity === 'responsables'
        ? 'esta persona del evento'
        : 'esta reserva');
  $('#confirmation').innerHTML = `
    <form id="delete-form" data-entity="${entity}" data-id="${id}">
      <header class="dialog-header">
        <h2 id="confirm-title">
          ${
            ['responsables', 'asignaciones'].includes(entity)
              ? 'Retirar asignación'
              : 'Eliminar registro'
          }
        </h2>
        <button type="button" class="icon-button" data-close="confirmation" aria-label="Cerrar">
          ${icon('close')}
        </button>
      </header>
      <div class="dialog-body">
        <div class="form-error" role="alert"></div>
        <p>
          Vas a eliminar
          <strong>${escape(label)}</strong>
          . Esta acción no se puede deshacer. Los registros con relaciones o entregas se protegen para
          conservar el historial.
        </p>
      </div>
      <footer class="dialog-footer">
        <button type="button" class="button secondary" data-close="confirmation">Cancelar</button>
        <button class="button danger" type="submit">Sí, eliminar</button>
      </footer>
    </form>
  `;
  $('#confirmation').showModal();
}
