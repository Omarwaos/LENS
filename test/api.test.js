import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createDatabase } from '../src/config/db.js';
import { readDatabaseConfig } from '../src/config/env.js';
import { createLensServer } from '../src/server.js';
import { seed as seedUsers } from '../src/db/seeds/usuarios.js';

function test(name, run) {
  const skip = process.env.LENS_TEST_DB !== '1' && 'Define LENS_TEST_DB=1 para habilitar las pruebas de MySQL.';
  return nodeTest(name, { skip }, run);
}

const equipment = (overrides={}) => ({marca_id:1,categoria_id:1,modelo:'Cámara de prueba',numero_serie:'TEST-001',descripcion:'Cámara y batería',estado:'Operativo',...overrides});
const person = (overrides={}) => ({nombres:'Ana',apellidos:'Pérez',documento:'TEST-P001',telefono:'',especialidad:'Fotografía',estado:'Activo',...overrides});
const event = (overrides={}) => ({tipo_evento_id:1,nombre:'Evento de prueba',inicio:'2030-11-10T10:00',fin:'2030-11-10T13:00',direccion:'Chincha Alta',descripcion:'',estado:'Programado',...overrides});
const testPassword = 'clave-temporal-de-integracion';
const testHash = bcrypt.hashSync(testPassword, 4);

async function setup(t, database) {
  const connection = readDatabaseConfig();
  if (!database) {
    database = `lens_test_${randomUUID().replaceAll('-', '')}`;
    const admin = createDatabase({ ...connection, database: undefined });
    try {
      await admin.raw('CREATE DATABASE ??', [database]);
    } catch (error) {
      await admin.destroy();
      throw error;
    }
    t.after(async () => {
      try {
        await admin.raw('DROP DATABASE ??', [database]);
      } finally {
        await admin.destroy();
      }
    });
  }

  const db = createDatabase({ ...connection, database });
  t.after(() => db.destroy());
  await db.migrate.latest();
  if (!await db('usuarios').where('nombre_usuario', 'admin').first('id')) {
    await db('usuarios').insert({ nombre_usuario: 'admin', clave_acceso: testHash, nivel_acceso: 'ADMIN' });
  }
  const app=createLensServer(db);
  app.listen(0,'127.0.0.1');await once(app,'listening');
  const base=`http://127.0.0.1:${app.address().port}`;
  const close=()=>new Promise((resolve,reject)=>app.close(error=>error?reject(error):resolve()));
  t.after(()=>app.listening?close():undefined);
  const login = async (nombre_usuario, clave_acceso = testPassword) => {
    const response = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre_usuario, clave_acceso }),
    });
    assert.equal(response.status, 200, await response.text());
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    return cookie.split(';')[0];
  };
  const adminCookie = await login('admin');
  const request=async(path,method='GET',body,expected=200,cookie=adminCookie)=>{
    const headers = new Headers();
    if (cookie) headers.set('Cookie', cookie);
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    const response=await fetch(`${base}/api/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const json=await response.json();
    assert.equal(response.status,expected,JSON.stringify(json));return json;
  };
  const create=(path,body)=>request(path,'POST',body,201);
  return {request,create,base,close,database,db,login,adminCookie};
}
async function fixtures(api) {
  const p=await api.create('personal',person()),eq=await api.create('equipos',equipment()),ev=await api.create('eventos',event());
  const r=await api.create('responsables',{evento_id:ev.id,personal_id:p.id,rol:'Fotografía'});
  const a=await api.create('asignaciones',{responsable_id:r.id,equipo_id:eq.id});
  return {p,eq,ev,r,a};
}

test('Restablecer la clave revoca la sesión anterior y permite iniciar una nueva', async t => {
  const api = await setup(t);
  await api.request('auth/me');

  // La semilla cambia la clave del administrador que inició sesión en setup.
  await seedUsers(api.db);
  await api.request('auth/me', 'GET', undefined, 401);
  await api.request('auth/login', 'POST', { nombre_usuario: 'admin', clave_acceso: testPassword }, 401, null);

  const cookie = await api.login('admin', 'admin123*');
  const user = await api.request('auth/me', 'GET', undefined, 200, cookie);
  assert.equal(user.nombre_usuario, 'admin');
});

test('CRUD completo de equipos, personal y eventos, con Unicode y lectura individual',async t=>{
  const api=await setup(t);
  for (const [entity,body,key,value] of [['equipos',equipment(),'modelo','Cámara editada'],['personal',person(),'nombres','Lucía'],['eventos',event(),'nombre','Graduación actualizada']]) {
    const item=await api.create(entity,body);
    assert.equal((await api.request(`${entity}/${item.id}`))[key],body[key]);
    assert.equal((await api.request(`${entity}/${item.id}`,'PUT',{...body,[key]:value}))[key],value);
    await api.request(`${entity}/${item.id}`,'DELETE');
    await api.request(`${entity}/${item.id}`,'GET',undefined,404);
  }
});
test('Trata entradas con sintaxis SQL como datos en login e inventario', async t => {
  const api = await setup(t);
  const sqlLikeText = "admin' OR '1'='1' -- ";
  await api.request('auth/login', 'POST', {
    nombre_usuario: sqlLikeText,
    clave_acceso: testPassword,
  }, 401, null);

  const created = await api.create('equipos', equipment({ modelo: sqlLikeText }));
  const stored = await api.request('equipos/' + created.id);
  assert.equal(stored.modelo, sqlLikeText.trim());
});

test('Valida campos, fechas reales, intervalos, catálogos y unicidad',async t=>{
  const api=await setup(t);
  await api.request('equipos','POST',equipment({modelo:' '}),400);
  await api.request('equipos','POST',equipment({marca_id:999}),404);
  await api.request('eventos','POST',event({inicio:'2030-02-30T10:00'}),400);
  await api.request('eventos','POST',event({fin:'2030-11-10T09:00'}),400);
  await api.create('equipos',equipment());
  await api.request('equipos','POST',equipment({numero_serie:'test-001'}),409);
  await api.create('personal',person());await api.request('personal','POST',person(),409);
  await api.request('equipos','POST',null,400);
  await api.request('equipos/0','GET',undefined,400);
});
test('Bloquea personas y equipos en eventos solapados y permite intervalos contiguos',async t=>{
  const api=await setup(t),{p,eq}=await fixtures(api);
  const e2=await api.create('eventos',event({nombre:'Solapado',inicio:'2030-11-10T12:00',fin:'2030-11-10T15:00'}));
  await api.request('responsables','POST',{evento_id:e2.id,personal_id:p.id,rol:'Fotógrafa'},409);
  const p2=await api.create('personal',person({documento:'TEST-P002'}));
  const r2=await api.create('responsables',{evento_id:e2.id,personal_id:p2.id,rol:'Video'});
  await api.request('asignaciones','POST',{responsable_id:r2.id,equipo_id:eq.id},409);
  await api.request(`eventos/${e2.id}`,'PUT',event({nombre:'Contiguo',inicio:'2030-11-10T13:00',fin:'2030-11-10T16:00'}));
  await api.create('responsables',{evento_id:e2.id,personal_id:p.id,rol:'Fotógrafa'});
  await api.create('asignaciones',{responsable_id:r2.id,equipo_id:eq.id});
});
test('Reprogramar es atómico y revalida los recursos asignados',async t=>{
  const api=await setup(t),{p,eq}=await fixtures(api);
  const body=event({inicio:'2030-11-11T10:00',fin:'2030-11-11T13:00'});
  const ev=await api.create('eventos',body);
  const r=await api.create('responsables',{evento_id:ev.id,personal_id:p.id,rol:'Foto'});
  await api.create('asignaciones',{responsable_id:r.id,equipo_id:eq.id});
  await api.request(`eventos/${ev.id}`,'PUT',event(),409);
  assert.equal((await api.request(`eventos/${ev.id}`)).inicio,'2030-11-11T10:00:00-05:00');
});
test('Una cancelación libera reservas, pero reactivar o finalizar revalida los cruces',async t=>{
  const api=await setup(t),{p,eq,ev}=await fixtures(api);
  await api.request(`eventos/${ev.id}`,'PUT',event({estado:'Cancelado'}));
  const ev2=await api.create('eventos',event({nombre:'Reemplazo'}));
  const r2=await api.create('responsables',{evento_id:ev2.id,personal_id:p.id,rol:'Foto'});
  await api.create('asignaciones',{responsable_id:r2.id,equipo_id:eq.id});
  await api.request(`eventos/${ev.id}`,'PUT',event(),409);
  await api.request(`eventos/${ev.id}`,'PUT',event({estado:'Finalizado'}),409);
});
test('Evita duplicar un equipo entre responsables del mismo evento y protege relaciones',async t=>{
  const api=await setup(t),{p,eq,ev,r}=await fixtures(api);
  await api.request('responsables','POST',{evento_id:ev.id,personal_id:p.id,rol:'Duplicado'},409);
  const p2=await api.create('personal',person({documento:'TEST-P002'}));
  const r2=await api.create('responsables',{evento_id:ev.id,personal_id:p2.id,rol:'Asistencia'});
  await api.request('asignaciones','POST',{responsable_id:r2.id,equipo_id:eq.id},409);
  for (const [table,id] of [['personal',p.id],['equipos',eq.id],['eventos',ev.id],['responsables',r.id]]) await api.request(`${table}/${id}`,'DELETE',undefined,409);
});
test('Entrega y devolución mantienen trazabilidad y bloquean transiciones inválidas',async t=>{
  const api=await setup(t),{a,ev}=await fixtures(api);
  await api.request(`asignaciones/${a.id}/devolver`,'POST',{condicion:'Bien'},409);
  await api.request(`asignaciones/${a.id}/entregar`,'POST',{condicion:'Completo, sin daños'});
  await api.request(`asignaciones/${a.id}/entregar`,'POST',{condicion:'Duplicado'},409);
  await api.request(`asignaciones/${a.id}`,'DELETE',undefined,409);
  await api.request(`eventos/${ev.id}`,'PUT',event({estado:'Finalizado'}),409);
  await api.request(`eventos/${ev.id}`,'PUT',event({inicio:'2030-11-10T09:00'}),409);
  const returned=await api.request(`asignaciones/${a.id}/devolver`,'POST',{condicion:'Completo',observacion:'Revisar correa'});
  assert.ok(returned.entregado_en && returned.devuelto_en);assert.equal(returned.observacion,'Revisar correa');
  await api.request(`asignaciones/${a.id}/devolver`,'POST',{condicion:'Otra vez'},409);
  await api.request(`eventos/${ev.id}`,'PUT',event({estado:'Finalizado'}));
});
test('Una entrega pendiente impide un segundo despacho incluso en eventos no solapados',async t=>{
  const api=await setup(t),{p,eq,a}=await fixtures(api);
  await api.request(`asignaciones/${a.id}/entregar`,'POST',{condicion:'Bien'});
  const ev2=await api.create('eventos',event({inicio:'2030-11-12T10:00',fin:'2030-11-12T13:00'}));
  const r2=await api.create('responsables',{evento_id:ev2.id,personal_id:p.id,rol:'Foto'});
  const a2=await api.create('asignaciones',{responsable_id:r2.id,equipo_id:eq.id});
  await api.request(`asignaciones/${a2.id}/entregar`,'POST',{condicion:'Bien'},409);
});
test('No permite reservar recursos inactivos ni desactivarlos con reservas vigentes',async t=>{
  const api=await setup(t),{p,eq,ev}=await fixtures(api);
  await api.request(`equipos/${eq.id}`,'PUT',equipment({estado:'Mantenimiento'}),409);
  await api.request(`personal/${p.id}`,'PUT',person({estado:'Inactivo'}),409);
  const p2=await api.create('personal',person({documento:'TEST-P002',estado:'Inactivo'}));
  await api.request('responsables','POST',{evento_id:ev.id,personal_id:p2.id,rol:'Foto'},409);
});
test('Permite retirar reservas sin movimientos y borrar registros libres',async t=>{
  const api=await setup(t),{a,r,ev,eq,p}=await fixtures(api);
  for(const [table,id] of [['asignaciones',a.id],['responsables',r.id],['eventos',ev.id],['equipos',eq.id],['personal',p.id]])await api.request(`${table}/${id}`,'DELETE');
});
test('Un evento cancelado permite retirar reservas sin reactivarlo y sin borrar historial',async t=>{
  const api=await setup(t),{ev,a,r}=await fixtures(api);
  await api.request(`eventos/${ev.id}`,'PUT',event({estado:'Cancelado'}));
  await api.request(`asignaciones/${a.id}`,'DELETE');
  await api.request(`responsables/${r.id}`,'DELETE');
  await api.request(`eventos/${ev.id}`,'DELETE');
});
test('La base persiste tras reiniciar y las migraciones no siembran datos de ejemplo',async t=>{
  const api=await setup(t);
  const item=await api.create('equipos',equipment());
  await api.close();
  const reopened=await setup(t,api.database);
  assert.equal((await reopened.request('equipos')).length,1);
  assert.equal((await reopened.request(`equipos/${item.id}`)).modelo,'Cámara de prueba');
  await reopened.close();
});
test('Solo una solicitud simultánea puede reservar la misma persona en eventos solapados', async t => {
  const api = await setup(t);
  const personRecord = await api.create('personal', person());
  const first = await api.create('eventos', event());
  const second = await api.create('eventos', event({ nombre: 'Segundo evento' }));
  const responses = await Promise.all([first, second].map(({ id }) => fetch(`${api.base}/api/responsables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: api.adminCookie },
    body: JSON.stringify({ evento_id: id, personal_id: personRecord.id, rol: 'Fotografía' }),
  })));
  assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
  assert.equal((await api.request('responsables')).length, 1);
});
test('Restringe origen, rechaza JSON inválido y solo sirve archivos públicos',async t=>{
  const api=await setup(t);
  assert.equal((await fetch(`${api.base}/api/equipos`,{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify(equipment())})).status,403);
  assert.equal((await fetch(`${api.base}/api/equipos`,{method:'POST',headers:{Cookie:api.adminCookie,'Content-Type':'application/json'},body:'{oops'})).status,400);
  assert.equal((await fetch(`${api.base}/api/equipos`,{method:'POST',headers:{Cookie:api.adminCookie},body:'{}'})).status,415);
  assert.equal((await fetch(`${api.base}/database.sql`)).status,404);
  assert.equal((await fetch(`${api.base}/data/lens.sqlite`)).status,404);
  const page=await fetch(api.base);assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/script-src 'self'/);
});

test('El trabajador solo lee sus eventos y sus equipos, y la API bloquea operaciones de administrador', async t => {
  const api = await setup(t);
  const own = await fixtures(api);
  const other = await api.create('personal', person({ documento: 'TEST-P002' }));
  const shared = await api.create('responsables', { evento_id: own.ev.id, personal_id: other.id, rol: 'Video' });
  const privateEquipment = await api.create('equipos', equipment({ numero_serie: 'TEST-002' }));
  await api.create('asignaciones', { responsable_id: shared.id, equipo_id: privateEquipment.id });
  const privateEvent = await api.create('eventos', event({
    nombre: 'Evento ajeno', inicio: '2030-11-10T13:00', fin: '2030-11-10T15:00',
  }));
  await api.create('responsables', { evento_id: privateEvent.id, personal_id: other.id, rol: 'Video' });
  await api.db('usuarios').insert({
    nombre_usuario: 'trabajador',
    personal_id: own.p.id,
    clave_acceso: testHash,
    nivel_acceso: 'TRABAJADOR',
  });

  await api.request('datos', 'GET', undefined, 401, null);
  await api.request('mis-eventos', 'GET', undefined, 401, null);
  const cookie = await api.login('trabajador');
  const user = await api.request('auth/me', 'GET', undefined, 200, cookie);
  assert.equal(user.nivel_acceso, 'TRABAJADOR');
  assert.equal(Object.hasOwn(user, 'clave_acceso'), false);
  const events = await api.request('mis-eventos', 'GET', undefined, 200, cookie);
  assert.deepEqual(events.map(item => item.id), [own.ev.id]);
  assert.deepEqual(events[0].equipos.map(item => item.numero_serie), [own.eq.numero_serie]);

  for (const path of ['datos', 'personal', 'equipos', 'eventos', `eventos/${privateEvent.id}`, 'responsables', 'asignaciones']) {
    await api.request(path, 'GET', undefined, 403, cookie);
  }
  await api.request('eventos', 'POST', event(), 403, cookie);
  await api.request(`asignaciones/${own.a.id}/entregar`, 'POST', { condicion: 'OK' }, 403, cookie);
  await api.request(`eventos/${own.ev.id}`, 'DELETE', undefined, 403, cookie);

  const logout = await fetch(`${api.base}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /^lens_token=;/);
  await api.request('mis-eventos', 'GET', undefined, 401, cookie);
  const nextCookie = await api.login('trabajador');
  await api.db('usuarios').where('nombre_usuario', 'trabajador').update({ estado: false });
  await api.request('mis-eventos', 'GET', undefined, 401, nextCookie);
});
