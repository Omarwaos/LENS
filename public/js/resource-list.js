import {
  escape,
  icon,
  format,
  dayText,
  timeText,
  initials,
  fullName,
  equipmentIcon,
  badge,
  eventBadge,
  empty,
  newButton,
  actionButton,
  heading,
} from './panel-ui.js';
import {
  data,
  view,
  search,
  filter,
  views,
  eventSection,
  nextEvents,
  inUse,
  eventFor,
  roster,
  loans,
} from './panel-state.js';

const equipmentBadge = e =>
  e.estado === 'Operativo'
    ? inUse(e.id)
      ? badge('En uso', 'blue')
      : badge('Operativo', 'green')
    : badge(e.estado, e.estado === 'Baja' ? 'red' : 'amber');

const eventSections = {
  programados: ['Programados', 'Programado'],
  historial: ['Historial', 'Finalizado'],
  cancelados: ['Cancelados', 'Cancelado'],
};

// El historial consulta las mismas relaciones y movimientos que conserva la API.
function eventTabs() {
  return `
    <nav class="event-tabs" aria-label="Sección de eventos">
      ${Object.entries(eventSections)
        .map(
          ([key, [label, status]]) => `
        <a href="#${key === 'programados' ? 'eventos' : key}"
          class="button ${eventSection === key ? 'primary' : 'secondary'}"
          ${eventSection === key ? 'aria-current="page"' : ''}>
          ${label} <span>${data.eventos.filter(event => event.estado === status).length}</span>
        </a>
      `,
        )
        .join('')}
    </nav>
  `;
}

// Listados, búsqueda por texto y filtros por estado.
export function listPage() {
  const descriptions = {
    equipos: 'Cada activo identificado. Cada movimiento bajo control.',
    personal: 'Las personas detrás de cada producción.',
    eventos: 'Planifica las próximas coberturas y consulta las que ya terminaron.',
  };
  const options = {
    equipos: ['Operativo', 'En uso', 'Mantenimiento', 'Baja'],
    personal: ['Activo', 'Inactivo'],
    eventos: ['Programado', 'Finalizado', 'Cancelado'],
  }[view];
  return (
    heading(views[view][0], descriptions[view], newButton(view)) +
    (view === 'eventos' ? eventTabs() : '') +
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
        ${
          view !== 'eventos'
            ? `<select id="filter" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          ${options.map(o => `<option ${filter === o ? 'selected' : ''}>${o}</option>`).join('')}
        </select>`
            : ''
        }
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
  const records =
    view === 'eventos'
      ? data.eventos.filter(event => event.estado === eventSections[eventSection][1])
      : data[view];
  const result = records.filter(row => {
    const matches = normalize(Object.values(row).join(' ')).includes(normalize(search));
    return (
      matches &&
      (!filter ||
        (view === 'equipos' && filter === 'En uso' ? inUse(row.id) : row.estado === filter))
    );
  });
  // Los finalizados y cancelados muestran primero las fechas más recientes.
  return view === 'eventos' && eventSection !== 'programados'
    ? result.sort((first, second) => second.inicio.localeCompare(first.inicio))
    : result;
}

export function eventRow(event) {
  const staffCount = roster(event.id).length;
  const equipmentCount = loans(event.id).length;
  return `
    <article class="production-event">
      <div class="date-tile">
        <span>${escape(format(event.inicio, { month: 'short' }).replace('.', ''))}</span>
        <strong>${format(event.inicio, { day: '2-digit' })}</strong>
      </div>
      <div class="production-event-info">
        <div class="event-title-line"><h2>${escape(event.nombre)}</h2>${eventBadge(event)}</div>
        <p>${dayText(event.inicio)} · ${timeText(event.inicio)} –
          ${event.inicio.slice(0, 10) !== event.fin.slice(0, 10) ? dayText(event.fin) + ' · ' : ''}${timeText(event.fin)}
        </p>
        <p>${escape(event.direccion)} · ${escape(event.tipo)}</p>
        <div class="event-tags">
          ${badge(staffCount ? `${staffCount} ${staffCount === 1 ? 'responsable' : 'responsables'}` : 'Sin personal', staffCount ? 'green' : 'amber')}
          ${badge(equipmentCount ? `${equipmentCount} ${equipmentCount === 1 ? 'equipo' : 'equipos'}` : 'Sin equipos', equipmentCount ? 'blue' : 'amber')}
        </div>
      </div>
      <div class="production-event-actions">
        <button class="button secondary" data-action="detail" data-id="${event.id}">
          ${event.estado === 'Finalizado' ? 'Ver historial' : 'Gestionar'} ${icon('arrow')}
        </button>
        <div class="row-actions">
          ${actionButton('edit', 'eventos', event.id, `Editar ${event.nombre}`, 'edit')}
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
              r => r.personal_id === person.id && nextEvents().some(e => e.id === r.evento_id),
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
      <td class="serial" data-label="Serie">${escape(equipment.numero_serie)}</td>
      <td data-label="Categoría">${escape(equipment.categoria)}</td>
      <td data-label="Estado">${equipmentBadge(equipment)}</td>
      <td>
        ${
          data.asignaciones.filter(
            a => a.equipo_id === equipment.id && nextEvents().some(ev => ev.id === eventFor(a)?.id),
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
      search || filter
        ? 'No hay coincidencias'
        : view === 'eventos'
          ? 'No hay eventos en esta sección'
          : 'Aún no hay registros',
      search || filter
        ? 'Prueba otra búsqueda o cambia el filtro.'
        : view === 'eventos'
          ? 'Los eventos aparecen aquí según su estado.'
          : 'Agrega el primer registro para empezar.',
      search || filter || (view === 'eventos' && eventSection !== 'programados')
        ? ''
        : newButton(view),
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
      <div class="panel production-events">
        ${rows.map(eventRow).join('')}
      </div>
    `
  );
}
