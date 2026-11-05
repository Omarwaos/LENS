// Vistas y estado de la pantalla. Los datos se cargan desde la API.
export const views = {
  inicio: ['Operaciones', 'grid'],
  eventos: ['Eventos', 'calendar'],
  equipos: ['Equipos', 'camera'],
  personal: ['Personal', 'users'],
};
export let data;
export let view = 'inicio';
export let search = '';
export let filter = '';
export let detailId = null;
export const personFor = r => data.personal.find(p => p.id === r.personal_id);
export const responsibleFor = a => data.responsables.find(r => r.id === a.responsable_id);
export const eventFor = a => data.eventos.find(e => e.id === responsibleFor(a)?.evento_id);
export const roster = id => data.responsables.filter(r => r.evento_id === id);
export const loans = id => data.asignaciones.filter(a => eventFor(a)?.id === id);
export const nextEvents = () =>
  data.eventos.filter(e => e.estado === 'Programado' && new Date(e.fin) > new Date());
export const inUse = id => data.asignaciones.some(a => a.equipo_id === id && a.entregado_en && !a.devuelto_en);

export function setData(value) {
  data = value;
}

export function setView(value) {
  view = value;
  search = '';
  filter = '';
}

export function setSearch(value) {
  search = value;
}

export function setFilter(value) {
  filter = value;
}

export function setDetailId(value) {
  detailId = value;
}
