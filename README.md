# LENS

Aplicación local para Piero Producciones. Gestiona equipos audiovisuales, personal y eventos, desde la reserva hasta la devolución.

## Preparar la base

Necesitas **Node.js 24 o superior** y una instancia activa de **MySQL o MariaDB**.

1. Ejecuta `database.sql` una sola vez con tu cliente de base de datos. El archivo crea y selecciona la base `lens`. Si ya existe, puedes pasar al siguiente paso.
2. En la carpeta LENS, instala las dependencias y crea la configuración local.

   ```powershell
   npm.cmd ci
   Copy-Item .env.example .env
   ```

3. Completa `.env` con el usuario, la contraseña y el puerto de tu servidor. Después aplica las migraciones.

   ```powershell
   npm run migrate
   ```

   Knex crea las tablas, sus restricciones y los catálogos de marcas, categorías y tipos de evento.

4. Si quieres probar la aplicación con equipos, personas y eventos ficticios, ejecuta `npm run seed`. Los ejemplos se insertan una vez por base y se pueden editar o eliminar desde la aplicación.
5. Ejecuta `npm run seed:usuarios` para preparar las cuentas de acceso y las fichas de los tres trabajadores.

En PowerShell, si la política de ejecución bloquea `npm`, usa `npm.cmd` en esos comandos.

## Arrancar

```powershell
npm run start
```

Abre **http://127.0.0.1:3000**. También puedes hacer doble clic en `iniciar-lens.cmd` tras preparar la base. Detén el servidor con `Ctrl+C`. Usa `npm run dev` para reiniciar el servidor automáticamente cuando cambie el código.

Los datos de esta versión se guardan en MySQL. La copia del prototipo en `data/lens.sqlite` se conserva como respaldo. El arranque y las migraciones no importan sus registros.

## Cuentas

| Usuario | Contraseña de prueba | Acceso |
| --- | --- | --- |
| `admin` | `admin123*` | Gestión de equipos, personal, eventos, reservas, entregas y devoluciones |
| `valeria` | `valeria123*` | Consulta de los eventos y equipos asignados a Valeria |
| `mateo` | `mateo123*` | Consulta de los eventos y equipos asignados a Mateo |
| `lucia` | `lucia123*` | Consulta de los eventos y equipos asignados a Lucía |

Estas contraseñas son para el prototipo local. La semilla guarda sus hashes y, si se vuelve a ejecutar, restablece las claves de prueba de las cuentas existentes.

Si ya tienes LENS instalado, aplica `npm run migrate` y `npm run seed:usuarios` antes de volver a arrancar. Para darle acceso a un evento a un trabajador, asígnalo como responsable desde el panel de administración.

Las sesiones caducan a las ocho horas o cuando se cierra sesión. Reiniciar el servidor también exige iniciar sesión de nuevo.

## Organización

```text
database.sql          Creación y selección de la base lens
knexfile.js           Conexión y directorios de migraciones y semillas
src/
  server.js           Conexión y arranque del servidor
  app.js              Configuración de Express y archivos públicos
  config/             Variables de entorno y conexión a la base
  routes/             Rutas de la API y operaciones de cada recurso
  controllers/        Solicitudes y respuestas HTTP
  middlewares/        Validación HTTP, seguridad local y errores
  services/           CRUD compartido y reglas por módulo
  db/migrations/      Tablas, restricciones y catálogos en JavaScript
  db/seeds/           Cuentas iniciales y datos de demostración opcionales
public/               Interfaz, estilos y scripts del navegador
docs/modelo.md        Modelo de datos y relaciones
test/api.test.js      Pruebas de integración
```

## Flujo de un evento

1. Registra los equipos y el personal en sus respectivos módulos.
2. Crea un evento con inicio, fin y lugar. Los horarios se interpretan en hora de Lima.
3. Desde **Gestionar**, asigna personal al evento y reserva equipos para cada responsable.
4. Registra la condición de cada equipo al entregarlo y al devolverlo.

LENS comprueba los cruces de horario al reservar recursos y al cambiar las fechas de un evento. Los eventos cancelados liberan las reservas. Una entrega pendiente impide volver a entregar el mismo equipo y debe resolverse antes de finalizar o cancelar su evento.

## Pruebas

Las pruebas requieren un usuario con permiso para crear y eliminar bases de prueba. Cada caso usa una base temporal con nombre `lens_test_…` y la elimina al finalizar. Puedes utilizar una instancia dedicada con las mismas variables de conexión.

```powershell
$env:LENS_TEST_DB = '1'
npm test
```
