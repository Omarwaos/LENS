// Utilidades del navegador e iconos de la interfaz.
export const $ = selector => document.querySelector(selector);
export const escape = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
  camera:
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13.5" r="3.5"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/><circle cx="9" cy="7" r="4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6zM14 5l5 5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  box: '<path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  warning: '<path d="m12 3 10 18H2zM12 9v5M12 17v1"/>',
  lens: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  drone:
    '<circle cx="5" cy="5" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="m7 7 10 10M17 7 7 17"/>',
  flash: '<path d="m13 2-9 12h7l-1 8 10-13h-8z"/>',
};
export const icon = name => `
  <svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    ${paths[name] || paths.box}
  </svg>
`;

export const format = (date, options) =>
  new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', ...options }).format(new Date(date));
export const dayText = date => format(date, { day: 'numeric', month: 'short', year: 'numeric' });
export const timeText = date => format(date, { hour: '2-digit', minute: '2-digit', hour12: false });
export const initials = person => escape(`${person.nombres[0] || ''}${person.apellidos[0] || ''}`);
export const fullName = p => `${p.nombres} ${p.apellidos}`;
export const equipmentIcon = e =>
  ({
    Cámaras: 'camera',
    Lentes: 'lens',
    Drones: 'drone',
    Iluminación: 'flash',
    Audio: 'box',
    Accesorios: 'box',
  })[e.categoria];

// Componentes de HTML que se reutilizan en las vistas.
export const badge = (label, tone = 'blue') => `
  <span class="badge ${tone}">${escape(label)}</span>
`;
export const eventBadge = e =>
  badge(e.estado, { Programado: 'blue', Finalizado: 'green', Cancelado: 'red' }[e.estado]);
export const empty = (title, description, action = '', compact = false) => `
  <div class="empty ${compact ? 'compact' : ''}">
    ${icon('box')}
    <h3>${escape(title)}</h3>
    <p>${escape(description)}</p>
    ${action}
  </div>
`;
export const newButton = entity => `
  <button class="button primary" data-action="new" data-entity="${entity}">
    ${icon('plus')}${
      { equipos: 'Nuevo equipo', personal: 'Nueva persona', eventos: 'Nuevo evento' }[entity]
    }
  </button>
`;
export const actionButton = (action, entity, id, name, kind) => `
  <button
    class="icon-button ${action === 'delete' ? 'delete' : ''}"
    data-action="${action}"
    data-entity="${entity}"
    data-id="${id}"
    title="${escape(name)}"
    aria-label="${escape(name)}"
  >
    ${icon(kind)}
  </button>
`;

export function heading(title, subtitle, action = '', eyebrow = 'TU ESPACIO DE PRODUCCIÓN') {
  return `
    <div class="page-heading">
      <div>
        <div class="eyebrow">${escape(eyebrow)}</div>
        <h1>${escape(title)}</h1>
        <p>${escape(subtitle)}</p>
      </div>
      ${action}
    </div>
  `;
}
