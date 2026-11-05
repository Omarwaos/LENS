import { bindLogout, homeFor, redirectIfSignedOut, request } from './session.js';

const list = document.querySelector('#event-list');
const errorText = document.querySelector('#session-error');
const format = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima',
});

function element(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}

function renderEvent(event) {
  const card = element('article', '', 'panel worker-event');
  const tones = { Programado: 'blue', Finalizado: 'green', Cancelado: 'red' };
  const header = element('header', '', 'worker-event-header');
  const title = element('div');
  title.append(element('h2', event.nombre), element('p', `${event.tipo} · ${event.rol}`));
  header.append(title, element('span', event.estado, `badge ${tones[event.estado]}`));

  const details = element('dl', '', 'worker-details');
  const fields = [
    ['Inicio', format.format(new Date(event.inicio))],
    ['Fin', format.format(new Date(event.fin))],
    ['Lugar', event.direccion],
  ];
  if (event.descripcion) fields.push(['Detalles', event.descripcion]);
  for (const [label, value] of fields) {
    const field = element('div');
    field.append(element('dt', label), element('dd', value));
    details.append(field);
  }

  const assigned = element('section', '', 'worker-equipment');
  assigned.append(element('h3', 'Equipos asignados'));
  if (event.equipos.length) {
    const equipment = element('ul');
    for (const item of event.equipos) {
      const [status, tone] = item.devuelto_en ? ['Devuelto', 'green'] : item.entregado_en ? ['Entregado', 'blue'] : ['Reservado', 'amber'];
      const asset = element('li');
      const name = element('div');
      name.append(element('strong', `${item.marca} ${item.modelo}`), element('small', item.numero_serie));
      asset.append(name, element('span', status, `badge ${tone}`));
      equipment.append(asset);
    }
    assigned.append(equipment);
  } else {
    assigned.append(element('p', 'Todavía no tienes equipos asignados.'));
  }

  const body = element('div', '', 'worker-event-body');
  body.append(details, assigned);
  card.append(header, body);
  return card;
}

bindLogout(document.querySelector('#logout'), message => { errorText.textContent = message; });

async function load() {
  try {
    const user = await request('auth/me');
    if (user.nivel_acceso !== 'TRABAJADOR') {
      location.replace(homeFor(user));
      return;
    }
    document.querySelector('#worker-name').textContent = `${user.nombres} ${user.apellidos}`;
    const events = await request('mis-eventos');
    list.replaceChildren(...(events.length
      ? events.map(renderEvent)
      : [element('p', 'Todavía no tienes eventos asignados.', 'empty')]));
  } catch (error) {
    if (redirectIfSignedOut(error)) return;
    list.replaceChildren();
    errorText.textContent = error.message;
  }
}

load();
