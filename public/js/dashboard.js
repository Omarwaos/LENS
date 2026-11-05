import { escape, icon, format, empty, newButton, heading } from './panel-ui.js';
import { data, nextEvents, roster, loans, eventFor } from './panel-state.js';
import { eventRow } from './resource-list.js';

// El resumen da prioridad a las próximas coberturas y a las tareas pendientes.
function metric(label, value, caption, name) {
  return `
    <article class="metric">
      <div class="metric-top">${escape(label)}<span class="metric-icon">${icon(name)}</span></div>
      <strong class="metric-value">${value}</strong>
      <span class="metric-caption">${escape(caption)}</span>
    </article>
  `;
}

function task(title, description, event, label, name) {
  return `
    <article class="production-task">
      <span class="task-icon">${icon(name)}</span>
      <div><h3>${escape(title)}</h3><p>${escape(description)}</p></div>
      <button class="button secondary" data-action="detail" data-id="${event.id}">${label}</button>
    </article>
  `;
}

export function dashboard() {
  const upcoming = nextEvents();
  const pending = upcoming.filter(event => !roster(event.id).length || !loans(event.id).length);
  const returns = data.asignaciones.filter(
    assignment => assignment.entregado_en && !assignment.devuelto_en,
  );
  const returnEvent = returns.length ? eventFor(returns[0]) : null;
  const tasks = [];

  if (pending.length) {
    tasks.push(
      task('Completar la preparación', pending[0].nombre, pending[0], 'Preparar', 'users'),
    );
  }
  if (returnEvent) {
    tasks.push(task('Registrar una devolución', returnEvent.nombre, returnEvent, 'Revisar', 'box'));
  }

  return (
    heading(
      'Tu próxima producción',
      format(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      newButton('eventos'),
      'Piero Producciones',
    ) +
    `
    <section class="metrics" aria-label="Resumen de operaciones">
      ${metric('Eventos próximos', upcoming.length, 'Programados por atender', 'calendar')}
      ${metric('Por preparar', pending.length, 'Personal o equipos pendientes', 'users')}
      ${metric('Por devolver', returns.length, 'Equipos entregados en campo', 'box')}
    </section>
    <div class="section-heading"><h2>Próximos eventos</h2><a href="#eventos" class="button secondary">Ver agenda ${icon('arrow')}</a></div>
    <section class="panel production-events" aria-label="Próximos eventos">
      ${
        upcoming.length
          ? upcoming.slice(0, 3).map(eventRow).join('')
          : empty(
              'Tu agenda está libre',
              'Crea un evento y empieza a organizar su producción.',
              newButton('eventos'),
              true,
            )
      }
    </section>
    <div class="section-heading"><h2>Lo que necesita tu atención</h2></div>
    <section class="production-tasks" aria-label="Tareas pendientes">
      ${tasks.length ? tasks.join('') : empty('Todo preparado', 'Puedes consultar la agenda para revisar tus próximas coberturas.', '', true)}
    </section>
  `
  );
}
