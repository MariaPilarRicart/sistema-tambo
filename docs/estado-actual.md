# Estado actual del sistema

Sistema de Gestion Integral para Tambos, orientado a tambos familiares/no robotizados. El estado actual cubre la base tecnica, autenticacion, ABMC iniciales y la logica central de eventos con agenda automatica.

## 1. Modulos implementados

- Autenticacion real con JWT.
- Usuarios:
  - listado;
  - alta;
  - edicion;
  - baja logica.
- Lotes:
  - listado;
  - alta;
  - edicion;
  - baja logica;
  - bloqueo de baja si tiene animales asociados.
- Animales:
  - listado;
  - detalle;
  - alta;
  - edicion;
  - baja logica;
  - relacion opcional con madre;
  - padre como texto opcional;
  - filtros basicos.
- Eventos:
  - listado;
  - detalle;
  - registro de eventos;
  - sin edicion ni eliminacion para preservar historial.
- Agenda:
  - listado general;
  - listado de tareas pendientes;
  - generacion/cierre/cancelacion automatica desde eventos.
- Frontend minimo:
  - login real;
  - dashboard visual;
  - usuarios;
  - lotes;
  - animales;
  - registro de eventos desde Rodeo;
  - agenda pendiente;
  - historial de eventos.

## 2. Tecnologias usadas

Backend:

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT
- bcrypt
- Docker Compose para PostgreSQL local

Frontend:

- React
- TypeScript
- Vite
- React Router
- CSS propio
- lucide-react

Base de datos:

- PostgreSQL 16
- Prisma migrations
- Prisma Client

## 3. Endpoints principales

Health:

- `GET /health`

Autenticacion:

- `POST /auth/login`
- `GET /auth/me`

Usuarios:

- `GET /users`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`

Lotes:

- `GET /lotes`
- `POST /lotes`
- `PUT /lotes/:id`
- `DELETE /lotes/:id`

Animales:

- `GET /animales`
- `GET /animales/:id`
- `POST /animales`
- `PUT /animales/:id`
- `DELETE /animales/:id`

Eventos:

- `GET /eventos`
- `GET /eventos/:id`
- `POST /eventos`

Agenda:

- `GET /agenda`
- `GET /agenda/pendientes`

## 4. Flujo de autenticacion

1. El usuario ingresa `username` y `password` en el frontend.
2. El frontend llama a `POST /auth/login`.
3. El backend busca el usuario por `username`.
4. Verifica que el usuario exista y este activo.
5. Compara la password con `bcrypt`.
6. Si las credenciales son validas, genera un JWT.
7. El token guarda:
   - `id`;
   - `nombre`;
   - `rol`.
8. El frontend guarda el token en `localStorage`.
9. Al recargar la app, el frontend llama a `GET /auth/me` con `Authorization: Bearer <token>`.
10. Si el token es invalido o expiro, se limpia la sesion y se vuelve al login.

## 5. Reglas de permisos ADMIN/EMPLEADO

ADMIN:

- Puede administrar usuarios.
- Puede administrar lotes.
- Puede crear, editar y dar de baja animales.
- Puede registrar eventos.
- Puede consultar eventos y agenda.

EMPLEADO:

- Puede iniciar sesion.
- Puede consultar animales.
- Puede consultar lotes.
- Puede registrar eventos.
- Puede consultar eventos y agenda.
- No puede administrar usuarios.
- No puede crear, editar ni dar de baja animales.
- No puede crear, editar ni dar de baja lotes.

Regla importante:

- Los permisos se validan en backend con middleware de autenticacion y autorizacion por rol. El frontend tambien oculta acciones, pero no es la barrera de seguridad principal.

## 6. Flujo de eventos y agenda automatica

Los eventos son historicos y no se editan ni eliminan por ahora.

Antes de registrar un evento desde el frontend se muestra una confirmacion propia del sistema, porque el evento puede modificar el estado del animal y generar, cerrar o cancelar tareas automaticas. Para `VENTA` y `MUERTE`, la confirmacion advierte ademas que el animal quedara inactivo y que se cancelaran tareas pendientes.

Eventos implementados:

- `CELO`
- `INSEMINACION`
- `TACTO`
- `SECADO`
- `PARTO`
- `ABORTO`
- `CLINICO`
- `VACUNACION`
- `CAMBIO_LOTE`
- `VENTA`
- `MUERTE`

Reglas principales:

- `CELO`: registra solo el evento.
- `INSEMINACION`:
  - cambia el animal a `INSEMINADA`;
  - cancela una tarea `TACTO` pendiente previa si existe;
  - crea una tarea `TACTO` pendiente a 35 dias.
- `TACTO`:
  - requiere `datosJson.resultado` con `POSITIVO` o `NEGATIVO`;
  - cierra la tarea `TACTO` pendiente;
  - si es `POSITIVO`, cambia el animal a `PRENADA` y crea tareas `SECADO` y `PARTO`;
  - si es `NEGATIVO`, cambia el animal a `VACIA`.
- `SECADO`:
  - cierra tarea `SECADO`;
  - cambia el animal a `SECA`;
  - si existe lote activo `Secas`, mueve el animal a ese lote.
- `PARTO`:
  - cierra tarea `PARTO`;
  - cambia el animal a `RECUPERACION`;
  - crea tarea `ALTA_POST_PARTO`;
  - si era `VAQUILLONA`, pasa a `VACA`.
- `ABORTO`:
  - cambia el animal a `VACIA`;
  - cancela tareas pendientes `SECADO` y `PARTO`;
  - crea tarea `TACTO` pendiente inmediata.
- `VENTA`:
  - cambia `estadoAnimal` a `VENDIDO`;
  - cambia `activo` a `false`;
  - registra `fechaBaja`;
  - cancela tareas pendientes.
- `MUERTE`:
  - cambia `estadoAnimal` a `MUERTO`;
  - cambia `activo` a `false`;
  - registra `fechaBaja`;
  - cancela tareas pendientes.
- `CLINICO` y `VACUNACION`:
  - registran evento;
  - no tienen logica completa adicional todavia.

Las operaciones que crean eventos y modifican estado/agenda usan transacciones Prisma.

## 7. Comandos para correr el sistema

Desde la raiz del proyecto, levantar PostgreSQL:

```powershell
docker-compose up -d postgres
```

Backend:

```powershell
cd backend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run prisma:migrate -- --name init
npm.cmd run prisma:seed
npm.cmd run dev
```

Frontend:

```powershell
cd frontend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

Build backend:

```powershell
cd backend
npm.cmd run build
```

Build frontend:

```powershell
cd frontend
npm.cmd run build
```

Diagnostico de base de datos:

```powershell
cd backend
npm.cmd run prisma:diagnose
```

## 8. Datos de prueba iniciales

El seed inicial crea:

Usuario administrador:

- `username`: `admin`
- `password`: `admin123`
- `rol`: `ADMIN`

Lotes iniciales:

- Guachera
- Escuelita
- Terneras
- Vaquillonas
- Secas
- Produccion

Durante pruebas manuales o automatizadas pueden existir registros con nombres tipo:

- `empleado_test_*`
- `usuario_abmc_*`
- `Lote Test *`
- `Lote Con Animal *`
- `FLOW-*`
- `CAR-*`

Esos registros son datos de prueba y no forman parte del seed principal.

## 9. Baja logica e historial

Los animales no se eliminan fisicamente desde la aplicacion.

La baja de animal se representa con:

- `activo = false`;
- `estadoAnimal = VENDIDO`, `MUERTO`, `ROBADO`, `TRASLADADO` u `OTRO`;
- `fechaBaja` con la fecha del momento de baja;
- `observacionesBaja` opcional.

Al dar de baja un animal desde la pantalla de Rodeo, el sistema abre un modal para seleccionar el motivo y cargar observaciones. La baja tambien cancela las tareas pendientes del animal.

Esto permite conservar:

- datos del animal;
- eventos historicos;
- tareas generadas o cerradas;
- relaciones genealogicas con otros animales.

Los eventos tampoco se editan ni eliminan por ahora, porque modificarlos implicaria deshacer cambios historicos sobre animales y agenda.

## 10. Madre y padre en animales

El modelo `Animal` incluye:

- `madreId`: relacion opcional hacia otro `Animal`;
- `padreNombre`: texto opcional para registrar el nombre externo del padre/inseminacion.

La relacion de madre usa `onDelete: Restrict`.

Motivo:

- la regla de negocio indica que no se borran animales fisicamente;
- si una madre fue vendida o murio, sigue existiendo como registro historico;
- `Restrict` evita que una eliminacion fisica accidental rompa la genealogia.

## 11. Pendientes proximos

Recomendado antes de nuevos modulos:

- Revisar visualmente en navegador con usuario `ADMIN` y `EMPLEADO`.
- Limpiar o conservar identificados los datos de prueba.
- Preparar una demo corta del flujo principal:
  - login;
  - crear animal;
  - registrar inseminacion;
  - revisar agenda;
  - registrar tacto positivo;
  - revisar agenda e historial.

Modulos pendientes:

- Alimentacion.
- Vacunacion.
- Dashboard con datos reales.
- Listados operativos especificos.
- Reportes simples.
- Mejoras visuales responsivas.
- Tests automatizados.
- Documentacion de decisiones funcionales.
