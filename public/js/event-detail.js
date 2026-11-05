import {
  escape,
  icon,
  dayText,
  timeText,
  initials,
  fullName,
  equipmentIcon,
  badge,
  empty,
  actionButton,
} from './panel-ui.js';
import { data, detailId, personFor, responsibleFor, roster, loans } from './panel-state.js';
import { field, select } from './panel-dialogs.js';
import { assignmentColorClass } from './assignment-colors.js';

// Ficha del evento. El historial reutiliza los movimientos registrados y sus condiciones. Muestra responsables, reservas e historial de movimientos.
function equipmentLoanRow(assignment, editable, removable) {
  const eq = data.equipos.find(e => e.id === assignment.equipo_id);
  const responsible = responsibleFor(assignment);
  return `
    <div class="loan-item ${assignmentColorClass(responsible.color_asignacion)}">
      <div class="assignment-row">
        <span class="asset-icon">${icon(equipmentIcon(eq))}</span>
        <div class="assignment-name">
          <strong>${escape(eq.modelo)}</strong>
          <p>${escape(eq.numero_serie)}</p>
          <div class="assignment-owner"><span class="assignment-person">${escape(fullName(personFor(responsible)))}</span></div>
        </div>
        ${badge(
          assignment.devuelto_en ? 'Devuelto' : assignment.entregado_en ? 'Entregado' : 'Reservado',
          assignment.devuelto_en ? 'green' : assignment.entregado_en ? 'amber' : 'blue',
        )}${
          editable
            ? assignment.devuelto_en
              ? ''
              : assignment.entregado_en
                ? `
                  <button
                    class="button secondary compact"
                    data-action="movement"
                    data-movement="devolver"
                    data-id="${assignment.id}"
                  >
                    Devolver
                  </button>
                `
                : `
                  <button
                    class="button secondary compact"
                    data-action="movement"
                    data-movement="entregar"
                    data-id="${assignment.id}"
                  >
                    Entregar
                  </button>
                  ${actionButton(
                    'delete',
                    'asignaciones',
                    assignment.id,
                    `Retirar ${eq.modelo}`,
                    'trash',
                  )}
                `
            : removable && !assignment.entregado_en
              ? actionButton(
                  'delete',
                  'asignaciones',
                  assignment.id,
                  `Retirar ${eq.modelo}`,
                  'trash',
                )
              : ''
        }
      </div>
      ${
        assignment.entregado_en
          ? `
            <div class="loan-history">
              <span>
                <strong>
                  Salida · ${dayText(assignment.entregado_en)} ${timeText(assignment.entregado_en)}:
                </strong>
                ${escape(assignment.condicion_salida)}
              </span>
              ${
                assignment.devuelto_en
                  ? `
                    <span>
                      <strong>
                        Retorno · ${dayText(assignment.devuelto_en)} ${timeText(assignment.devuelto_en)}:
                      </strong>
                      ${escape(assignment.condicion_retorno)}
                    </span>
                  `
                  : ''
              }${
                assignment.observacion
                  ? `
                    <span>
                      <strong>Observación:</strong>
                      ${escape(assignment.observacion)}
                    </span>
                  `
                  : ''
              }
            </div>
          `
          : ''
      }
    </div>
  `;
}

function responsibleRow(responsible, removable) {
  return `
    <div class="assignment-row responsible-row ${assignmentColorClass(responsible.color_asignacion)}">
      <span class="avatar">${initials(personFor(responsible))}</span>
      <div class="assignment-name">
        <strong>${escape(fullName(personFor(responsible)))}</strong>
        <p>${escape(responsible.rol)}</p>
      </div>
      ${
        removable
          ? actionButton(
              'delete',
              'responsables',
              responsible.id,
              `Retirar a ${fullName(personFor(responsible))}`,
              'trash',
            )
          : ''
      }
    </div>
  `;
}

export function eventDetail() {
  const event = data.eventos.find(e => e.id === detailId);
  if (!event) {
    return empty(
      'El evento ya no existe',
      'Vuelve al listado para consultar otra cobertura.',
      '<a class="button secondary" href="#eventos">Volver a eventos</a>',
    );
  }
  const staff = roster(event.id),
    assignments = loans(event.id),
    editable = event.estado === 'Programado',
    removable = event.estado !== 'Finalizado';
  const peopleOptions = data.personal
    .filter(p => p.estado === 'Activo' && !staff.some(r => r.personal_id === p.id))
    .map(p => [p.id, fullName(p)]);
  const equipmentOptions = data.equipos
    .filter(e => e.estado === 'Operativo' && !assignments.some(a => a.equipo_id === e.id))
    .map(e => [e.id, `${e.modelo} · ${e.numero_serie}`]);
  const back =
    event.estado === 'Finalizado'
      ? 'historial'
      : event.estado === 'Cancelado'
        ? 'cancelados'
        : 'eventos';
  return `
    <a class="button ghost detail-back" href="#${back}">${icon('arrow')} Volver a eventos</a>
    <header class="production-banner">
      <div>
        <div class="eyebrow">${escape(event.tipo)} · ${escape(event.estado)}</div>
        <h1 id="detail-title">${escape(event.nombre)}</h1>
        <p>Personal, equipos y control de movimientos.</p>
      </div>

    </header>
    <div class="detail-intro">
      <span>${icon('calendar')}${dayText(event.inicio)}</span>
      <span>
        ${icon('clock')}${timeText(event.inicio)} –
        ${
          event.inicio.slice(0, 10) !== event.fin.slice(0, 10) ? dayText(event.fin) + ' · ' : ''
        }${timeText(event.fin)}
      </span>
      <span>${icon('pin')}${escape(event.direccion)}</span>
    </div>
    ${event.estado === 'Finalizado' ? '<p class="history-notice">Evento finalizado. Consulta el personal, los equipos y los movimientos registrados.</p>' : ''}
    <div class="production-detail-grid">
    <section class="detail-section panel">
      <div class="section-title">
        ${icon('users')}
        <h3>Personal responsable</h3>
        <span>${staff.length}</span>
      </div>
      ${
        staff.length
          ? staff.map(responsible => responsibleRow(responsible, removable)).join('')
          : empty(
              'Asigna a tu equipo',
              'Selecciona quién participará y qué función cumplirá.',
              '',
              true,
            )
      }
      ${
        editable && peopleOptions.length
          ? `
            <form class="inline-form" data-assign="responsables">
              <div class="form-error" role="alert"></div>
              ${select('personal_id', 'Persona', peopleOptions, '', true)}${field(
                'rol',
                'Rol en este evento',
                '',
                'text',
                true,
                80,
              )}
              <button class="button secondary" type="submit">${icon('plus')} Asignar</button>
            </form>
          `
          : ''
      }
    </section>
    <section class="detail-section panel">
      <div class="section-title">
        ${icon('camera')}
        <h3>Equipos y movimientos</h3>
        <span>${assignments.length}</span>
      </div>
      ${
        assignments.length
          ? assignments
              .map(assignment => equipmentLoanRow(assignment, editable, removable))
              .join('')
          : empty(
              'Prepara el equipamiento',
              staff.length
                ? 'Reserva equipos para una persona responsable.'
                : 'Primero asigna una persona para poder reservar sus equipos.',
              '',
              true,
            )
      }
      ${
        editable && staff.length && equipmentOptions.length
          ? `
            <form class="inline-form" data-assign="asignaciones">
              <div class="form-error" role="alert"></div>
              ${select('equipo_id', 'Equipo', equipmentOptions, '', true)}${select(
                'responsable_id',
                'Responsable',
                staff.map(r => [r.id, fullName(personFor(r))]),
                '',
                true,
              )}
              <button class="button secondary" type="submit">${icon('plus')} Reservar</button>
            </form>
          `
          : ''
      }
    </section>
    </div>
    ${
      event.descripcion
        ? `
          <p class="detail-note">
            <strong>Notas:</strong>
            ${escape(event.descripcion)}
          </p>
        `
        : ''
    }
    <footer class="event-detail-footer">
      <a class="button secondary" href="#${back}">Volver a eventos</a>
      <button class="button primary" data-action="edit" data-entity="eventos" data-id="${event.id}">
        Editar evento
      </button>
    </footer>
  `;
}
