import { escape, icon, dayText, timeText, initials, fullName, equipmentIcon, badge, eventBadge, empty, newButton, actionButton, heading } from './panel-ui.js';
import { data, view, search, filter, views, nextEvents, inUse, eventFor, roster, loans } from './panel-state.js';

const equipmentBadge = e =>
  e.estado === 'Operativo'
    ? inUse(e.id)
      ? badge('En uso', 'blue')
      : badge('Operativo', 'green')
    : badge(e.estado, e.estado === 'Baja' ? 'red' : 'amber');

// Listados, búsqueda por texto y filtros por estado.
export function listPage() {
  const descriptions = {
    equipos: 'Cada activo identificado. Cada movimiento bajo control.',
    personal: 'Las personas detrás de cada producción.',
    eventos: 'Planifica cada cobertura y asigna sus recursos.',
  };
  const options = {
    equipos: ['Operativo', 'En uso', 'Mantenimiento', 'Baja'],
    personal: ['Activo', 'Inactivo'],
    eventos: ['Programado', 'Finalizado', 'Cancelado'],
  }[view];
  return (
    heading(views[view][0], descriptions[view], newButton(view)) +
    `
      <div class="toolbar">
        <label class="search-box">
          ${icon('search')}
          <input
            id="search"
            type="search"
            aria-label="Buscar ${views[view][0].toLowerCase()}"
            placeholder="${
              view === 'equipos'
                ? 'Buscar por modelo, serie o marca…'
                : view === 'personal'
                  ? 'Buscar por nombre o documento…'
                  : 'Buscar por evento o lugar…'
            }"
            value="${escape(search)}"
          />
        </label>
        <select id="filter" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          ${options.map(o => `<option ${filter === o ? 'selected' : ''}>${o}</option>`).join('')}
        </select>
      </div>
      <div id="list-content">${listContent()}</div>
    `
  );
}
function filtered() {
  const normalize = value =>
    String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  return data[view].filter(row => {
    const matches = normalize(Object.values(row).join(' ')).includes(normalize(search));
    return (
      matches &&
      (!filter || (view === 'equipos' && filter === 'En uso' ? inUse(row.id) : row.estado === filter))
    );
  });
}
function eventCard(event) {
  return `
    <article class="event-card">
      <div class="event-card-top">
        <span class="event-type">${icon('calendar')}${escape(event.tipo)}</span>
        ${eventBadge(event)}
      </div>
      <div class="event-card-body">
        <h2>${escape(event.nombre)}</h2>
        <p class="meta-line">${icon('calendar')}${dayText(event.inicio)}</p>
        <p class="meta-line">
          ${icon('clock')}${timeText(event.inicio)} –
          ${
            event.inicio.slice(0, 10) !== event.fin.slice(0, 10)
              ? dayText(event.fin) + ' · '
              : ''
          }${timeText(event.fin)}
        </p>
        <p class="meta-line">${icon('pin')}${escape(event.direccion)}</p>
        <div class="event-tags">
          ${badge(
            roster(event.id).length ? 'Personal asignado' : 'Personal pendiente',
            roster(event.id).length ? 'green' : 'amber',
          )}${badge(
            loans(event.id).length ? 'Equipos asignados' : 'Equipos pendientes',
            loans(event.id).length ? 'blue' : 'amber',
          )}
        </div>
      </div>
      <div class="event-card-footer">
        <div class="mini-resource">
          <span>${icon('users')}${roster(event.id).length}</span>
          <span>${icon('camera')}${loans(event.id).length}</span>
        </div>
        <div class="row-actions">
          ${actionButton('edit', 'eventos', event.id, `Editar ${event.nombre}`, 'edit')}${actionButton(
            'delete',
            'eventos',
            event.id,
            `Eliminar ${event.nombre}`,
            'trash',
          )}
          <button class="button ghost compact" data-action="detail" data-id="${event.id}">
            Gestionar ${icon('arrow')}
          </button>
        </div>
      </div>
    </article>
  `;
}

function personCard(person) {
  return `
    <article class="person-card">
      <div class="person-card-top">
        <span class="avatar">${initials(person)}</span>
        ${badge(person.estado, person.estado === 'Activo' ? 'green' : 'red')}
      </div>
      <h2>${escape(fullName(person))}</h2>
      <p>${escape(person.especialidad)}</p>
      <div class="person-data">
        <div>
          <span>Documento</span>
          <strong>${escape(person.documento)}</strong>
        </div>
        <div>
          <span>Teléfono</span>
          <strong>${escape(person.telefono || 'Sin registrar')}</strong>
        </div>
      </div>
      <div class="person-actions">
        <span class="badge">
          ${
            data.responsables.filter(
              r =>
                r.personal_id === person.id && nextEvents().some(e => e.id === r.evento_id),
            ).length
          }
          eventos próximos
        </span>
        <div class="row-actions">
          ${actionButton(
            'edit',
            'personal',
            person.id,
            `Editar ${fullName(person)}`,
            'edit',
          )}${actionButton('delete', 'personal', person.id, `Eliminar ${fullName(person)}`, 'trash')}
        </div>
      </div>
    </article>
  `;
}

function equipmentRow(equipment) {
  return `
    <tr>
      <td>
        <div class="asset-name">
          <span class="asset-icon">${icon(equipmentIcon(equipment))}</span>
          <div>
            <strong>${escape(equipment.modelo)}</strong>
            <small>${escape(equipment.marca)}</small>
          </div>
        </div>
      </td>
      <td class="serial">${escape(equipment.numero_serie)}</td>
      <td>${escape(equipment.categoria)}</td>
      <td>${equipmentBadge(equipment)}</td>
      <td>
        ${
          data.asignaciones.filter(
            a =>
              a.equipo_id === equipment.id &&
              nextEvents().some(ev => ev.id === eventFor(a)?.id),
          ).length
        }
        eventos
      </td>
      <td>
        <div class="row-actions">
          ${actionButton(
            'edit',
            'equipos',
            equipment.id,
            `Editar ${equipment.modelo}`,
            'edit',
          )}${actionButton('delete', 'equipos', equipment.id, `Eliminar ${equipment.modelo}`, 'trash')}
        </div>
      </td>
    </tr>
  `;
}

export function listContent() {
  const rows = filtered();
  if (!rows.length)
    return empty(
      search || filter ? 'No hay coincidencias' : 'Aún no hay registros',
      search || filter
        ? 'Prueba otra búsqueda o cambia el filtro.'
        : 'Agrega el primer registro para empezar.',
      search || filter ? '' : newButton(view),
    );
  const counter = `
    <p class="result-count">
      ${rows.length}
      ${rows.length === 1 ? 'registro' : 'registros'}${
        search || filter ? (rows.length === 1 ? ' encontrado' : ' encontrados') : ''
      }
    </p>
  `;
  if (view === 'equipos')
    return (
      counter +
      `
        <div class="panel table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Número de serie</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Reservas próximas</th>
                <th aria-label="Acciones"></th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(equipmentRow).join('')}
            </tbody>
          </table>
        </div>
      `
    );
  if (view === 'personal')
    return (
      counter +
      `
        <div class="cards-grid">
          ${rows.map(personCard).join('')}
        </div>
      `
    );
  return (
    counter +
    `
      <div class="cards-grid">
        ${rows.map(eventCard).join('')}
      </div>
    `
  );
}
