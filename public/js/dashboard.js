import { escape, icon, format, timeText, badge, empty, newButton, heading } from './panel-ui.js';
import { data, nextEvents, inUse, roster, loans } from './panel-state.js';

// Resumen de operaciones y próximos eventos.
function metric(label, value, caption, i, tone = '') {
  return `
    <article class="metric">
      <div class="metric-top">
        ${label}
        <span class="metric-icon ${tone}">${icon(i)}</span>
      </div>
      <strong class="metric-value">${value}</strong>
      <span class="metric-caption">${caption}</span>
    </article>
  `;
}
function upcomingEventRow(event) {
  return `
    <article class="event-row">
      <div class="date-tile">
        <span>${escape(format(event.inicio, { month: 'short' }).replace('.', ''))}</span>
        <strong>${format(event.inicio, { day: '2-digit' })}</strong>
      </div>
      <div class="event-info">
        <button class="event-title" data-action="detail" data-id="${event.id}">
          ${escape(event.nombre)}
        </button>
        <p class="event-sub">
          <span>${timeText(event.inicio)} – ${timeText(event.fin)}</span>
          <span>·</span>
          <span>${escape(event.direccion)}</span>
        </p>
        <div class="event-tags">
          ${badge(
            roster(event.id).length
              ? `${roster(event.id).length} personas asignadas`
              : 'Personal sin asignar',
            roster(event.id).length ? 'green' : 'amber',
          )}${badge(
            loans(event.id).length
              ? `${loans(event.id).length} equipos reservados`
              : 'Equipos sin asignar',
            loans(event.id).length ? 'blue' : 'amber',
          )}
        </div>
      </div>
      <button
        class="icon-button"
        data-action="detail"
        data-id="${event.id}"
        aria-label="Abrir ${escape(event.nombre)}"
      >
        ${icon('arrow')}
      </button>
    </article>
  `;
}

export function dashboard() {
  const events = nextEvents(),
    available = data.equipos.filter(e => e.estado === 'Operativo' && !inUse(e.id)).length;
  const pending = events.filter(e => !roster(e.id).length || !loans(e.id).length);
  const returns = data.asignaciones.filter(a => a.entregado_en && !a.devuelto_en);
  const percent = data.equipos.length ? Math.round((available / data.equipos.length) * 100) : 0;
  const unavailable = data.equipos.filter(e => e.estado !== 'Operativo').length;
  return (
    heading(
      'Operaciones',
      'Una vista clara de tus eventos, tu equipo y tus recursos.',
      newButton('eventos'),
      format(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    ) +
    `
      <section class="metrics" aria-label="Resumen de operaciones">
        ${metric('Próximos eventos', events.length, 'Programados por atender', 'calendar')}${metric(
          'Equipos listos',
          available,
          `De ${data.equipos.length} activos registrados`,
          'camera',
          'green',
        )}${metric(
          'Personal activo',
          data.personal.filter(p => p.estado === 'Activo').length,
          'Tu equipo de producción',
          'users',
          'purple',
        )}${metric('Por devolver', returns.length, 'Equipos entregados en campo', 'box', 'amber')}
      </section>
      <div class="dashboard-grid">
        <section class="panel">
          <div class="panel-heading">
            <div>
              <h2>Próximos eventos</h2>
              <p>Todo listo para lo que viene.</p>
            </div>
            <a class="button ghost compact" href="#eventos">Ver agenda ${icon('arrow')}</a>
          </div>
          ${
            events.length
              ? events.slice(0, 4).map(upcomingEventRow).join('')
              : empty(
                  'Tu agenda está libre',
                  'Crea un evento y empieza a organizar su producción.',
                  newButton('eventos'),
                  true,
                )
          }
        </section>
        <aside class="dashboard-aside">
          <section class="readiness">
            <div class="readiness-top">${icon('camera')} Disponibilidad del inventario</div>
            <strong>
              ${percent}
              <small>%</small>
            </strong>
            <p>Operativos y sin una entrega pendiente</p>
            <div class="progress" aria-label="${percent}% de equipos listos">
              ${Array.from(
                { length: 100 },
                (_, i) => `
                  <span class="${i < percent ? 'filled' : ''}"></span>
                `,
              ).join('')}
            </div>
            <div class="readiness-bottom">
              <span>${available} listos para despacho</span>
              <span>
                ${data.equipos.length - available}
                ${data.equipos.length - available === 1 ? 'no disponible' : 'no disponibles'}
              </span>
            </div>
          </section>
          <section class="panel">
            <div class="panel-heading">
              <h2>Por atender</h2>
              ${icon('clock')}
            </div>
            <div class="pending-item">
              <span class="pending-symbol">${icon('users')}</span>
              <div>
                <strong>${pending.length} eventos por preparar</strong>
                <p>Sin personal o sin equipos asignados.</p>
                <a href="#eventos">Revisar eventos →</a>
              </div>
            </div>
            <div class="pending-item">
              <span class="pending-symbol">${icon('warning')}</span>
              <div>
                <strong>
                  ${unavailable} ${unavailable === 1 ? 'equipo no operativo' : 'equipos no operativos'}
                </strong>
                <p>En mantenimiento o dados de baja.</p>
                <a href="#equipos">Consultar inventario →</a>
              </div>
            </div>
          </section>
        </aside>
      </div>
      <section class="quick-start">
        <span class="quick-icon">${icon('plus')}</span>
        <div>
          <h3>Haz crecer tu inventario</h3>
          <p>Cámaras, lentes y accesorios. Cada recurso tiene su lugar.</p>
        </div>
        <button class="button secondary compact" data-action="new" data-entity="equipos">
          Registrar equipo ${icon('arrow')}
        </button>
      </section>
    `
  );
}
