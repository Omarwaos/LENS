import { bindLogout, homeFor, redirectIfSignedOut, request } from './session.js';
import { $, icon, empty } from './panel-ui.js';
import {
  data,
  view,
  views,
  detailId,
  nextEvents,
  setData,
  setView,
  setSearch,
  setFilter,
  setDetailId,
  setEventSection,
} from './panel-state.js';
import { dashboard } from './dashboard.js';
import { listPage, listContent } from './resource-list.js';
import { showEditor, showMovement, confirmDelete, confirmEventCreation } from './panel-dialogs.js';
import { eventDetail } from './event-detail.js';

let toastTimeout;

// Peticiones de la API, mensajes y recarga de datos.
async function api(path, method = 'GET', body) {
  try {
    return await request(path, method, body);
  } catch (error) {
    redirectIfSignedOut(error);
    throw error;
  }
}
function toast(message, error = false) {
  clearTimeout(toastTimeout);
  $('#toast').textContent = message;
  $('#toast').className = `toast visible ${error ? 'error' : ''}`;
  toastTimeout = setTimeout(() => ($('#toast').className = 'toast'), 5000);
}
async function refresh() {
  setData(await api('datos'));
  render();
}

function render() {
  document.title = `LENS · ${views[view][0]}`;
  $('#breadcrumb').textContent = views[view][0];
  $('#navigation').innerHTML = Object.entries(views)
    .map(
      ([key, [label, i]]) => `
        <a
          class="nav-link ${view === key ? 'active' : ''}"
          href="#${key}"
          ${view === key ? 'aria-current="page"' : ''}
        >
          ${icon(i)}${label}${
            key === 'eventos'
              ? `
                <span class="nav-count">${nextEvents().length}</span>
              `
              : ''
          }
        </a>
      `,
    )
    .join('');
  // La ficha ocupa la página. Los formularios de edición conservan sus diálogos.
  $('#main').innerHTML = detailId ? eventDetail() : view === 'inicio' ? dashboard() : listPage();
}

// Mueve el foco al contenido sin cambiar el fragmento que selecciona la vista.
$('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  $('#main').focus();
});

// Los eventos se escuchan en el documento porque las vistas se vuelven a dibujar.
document.addEventListener('click', event => {
  const close = event.target.closest('[data-close]');
  if (close) {
    $(`#${close.dataset.close}`).close();
    return;
  }
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const id = Number(el.dataset.id),
    entity = el.dataset.entity;
  if (el.dataset.action === 'new') showEditor(entity);
  if (el.dataset.action === 'edit') showEditor(entity, id);
  if (el.dataset.action === 'delete') confirmDelete(entity, id);
  if (el.dataset.action === 'detail') {
    location.hash = `eventos/${id}`;
  }
  if (el.dataset.action === 'movement') showMovement(id, el.dataset.movement);
  if (el.dataset.action === 'retry') load();
});

// Envía el formulario a la API y actualiza el panel al terminar.
document.addEventListener('submit', async event => {
  const form = event.target;
  if (!form.matches('#entity-form,#create-event-form,#movement-form,#delete-form,[data-assign]')) return;
  event.preventDefault();
  const button = form.querySelector('[type="submit"]');
  if (button.disabled) return;
  const payload = Object.fromEntries(new FormData(form));
  for (const key of Object.keys(payload))
    if (key.endsWith('_id')) payload[key] = Number(payload[key]);
  const error = form.querySelector('.form-error');
  error.textContent = '';
  // Crear un evento requiere revisar el resumen antes de enviar la solicitud a la API.
  if (form.id === 'entity-form' && form.dataset.entity === 'eventos' && !form.dataset.id) {
    confirmEventCreation(payload);
    return;
  }
  button.disabled = true;
  let message = 'Cambios guardados.';
  try {
    if (form.id === 'create-event-form') {
      await api('eventos', 'POST', payload);
      $('#confirmation').close();
      $('#editor').close();
      message = 'Evento creado.';
    } else if (form.id === 'entity-form') {
      await api(
        form.dataset.entity + (form.dataset.id ? `/${form.dataset.id}` : ''),
        form.dataset.id ? 'PUT' : 'POST',
        payload,
      );
      $('#editor').close();
      message = form.dataset.id ? 'Registro actualizado.' : 'Registro creado.';
    } else if (form.id === 'delete-form') {
      await api(`${form.dataset.entity}/${form.dataset.id}`, 'DELETE');
      $('#confirmation').close();
      message = 'Registro eliminado.';
    } else if (form.id === 'movement-form') {
      await api(`asignaciones/${form.dataset.id}/${form.dataset.movement}`, 'POST', payload);
      $('#editor').close();
      message =
        form.dataset.movement === 'entregar' ? 'Entrega registrada.' : 'Devolución registrada.';
    } else {
      if (form.dataset.assign === 'responsables') payload.evento_id = detailId;
      await api(form.dataset.assign, 'POST', payload);
      message = 'Asignación registrada.';
    }
  } catch (e) {
    error.textContent = e.message;
    button.disabled = false;
    return;
  }
  try {
    await refresh();
    toast(message);
  } catch {
    toast(`${message} No se pudo actualizar la vista; recarga la página.`, true);
  } finally {
    button.disabled = false;
  }
});
document.addEventListener('input', event => {
  if (event.target.id === 'search') {
    setSearch(event.target.value);
    $('#list-content').innerHTML = listContent();
  }
});
document.addEventListener('change', event => {
  if (event.target.id === 'filter') {
    setFilter(event.target.value);
    $('#list-content').innerHTML = listContent();
  }
});

// Navegación por la URL y carga inicial según la sesión.
function navigate() {
  const route = location.hash.slice(1);
  const match = route.match(/^eventos\/(\d+)$/);
  setDetailId(match ? Number(match[1]) : null);
  if (match || ['eventos', 'historial', 'cancelados'].includes(route)) {
    setView('eventos');
    if (!match) setEventSection(route === 'eventos' ? 'programados' : route);
  } else {
    setView(Object.hasOwn(views, route) ? route : 'inicio');
  }
  if (data) {
    render();
    $('#main').focus();
    window.scrollTo({ top: 0 });
  }
}
window.addEventListener('hashchange', navigate);
bindLogout($('#logout'), message => toast(message, true));
async function load() {
  try {
    const user = await api('auth/me');
    if (user.nivel_acceso !== 'ADMIN') {
      location.replace(homeFor(user));
      return;
    }
    navigate();
    await refresh();
  } catch (error) {
    if (error.status !== 401) {
      $('#main').innerHTML = empty(
        'No se pudo conectar con LENS',
        error.message,
        '<button class="button primary" data-action="retry">Reintentar</button>',
      );
    }
  }
}
load();
