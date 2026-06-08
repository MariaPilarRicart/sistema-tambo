# Backend - Sistema de Gestion Integral para Tambos

Base tecnica del backend con Node.js, Express, TypeScript, Prisma y PostgreSQL.

## Requisitos

- Node.js
- Docker Desktop o PostgreSQL local

## Base de datos local con Docker Compose

Desde la raiz del proyecto:

```powershell
docker-compose up -d postgres
```

Esto levanta PostgreSQL 16 con:

- Base de datos: `tampo_db`
- Usuario: `tampo_user`
- Password: `tampo_password`
- Puerto local: `5433`

## Configuracion

Crear un archivo `.env` en `backend/` tomando como base `.env.example`:

```powershell
cd backend
Copy-Item .env.example .env
```

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://tampo_user:tampo_password@127.0.0.1:5433/tampo_db?schema=public"
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=change_this_secret_for_local_development
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
```

Para usar el Asistente IA, configurar `OPENAI_API_KEY` con una clave válida de OpenAI en `backend/.env`.
`OPENAI_MODEL` es opcional; si no se define, el backend usa `gpt-4o-mini`.
La clave se usa únicamente en backend y nunca debe exponerse en el frontend.

## Comandos

Instalar dependencias:

```powershell
npm.cmd install
```

Generar cliente Prisma:

```powershell
npm.cmd run prisma:generate
```

Diagnosticar la conexion de Prisma sin mostrar password:

```powershell
npm.cmd run prisma:diagnose
```

Crear la migracion inicial en PostgreSQL:

```powershell
npm.cmd run prisma:migrate -- --name init
```

Cargar datos iniciales:

```powershell
npm.cmd run prisma:seed
```

El seed crea o actualiza:

- Usuario administrador inicial: `username=admin`, password `admin123` hasheada con bcrypt.
- Lotes iniciales: Guachera, Escuelita, Terneras, Vaquillonas, Secas y Producción.

Correr en desarrollo:

```powershell
npm.cmd run dev
```

## Puesta en marcha local completa

Desde la raiz del proyecto:

```powershell
docker-compose up -d postgres
```

Luego, desde `backend/`:

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run prisma:migrate -- --name init
npm.cmd run prisma:seed
npm.cmd run dev
```

Probar el health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/health
```

Probar login:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/auth/login `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin123"}'
```

Probar usuario autenticado:

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/auth/login `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin123"}'

Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3000/auth/me `
  -Headers @{ Authorization = "Bearer $($login.token)" }
```

## Diagnostico de Prisma/PostgreSQL

Si Prisma devuelve `P1000 Authentication failed`, primero verificar que este usando la URL esperada:

```powershell
cd backend
npm.cmd run prisma:diagnose
```

El diagnostico muestra host, puerto, base y usuario sin mostrar la password.

En Windows puede haber un PostgreSQL local escuchando tambien en `5432`. Para evitar que Prisma conecte al servidor equivocado, el Docker Compose del proyecto publica el contenedor en `127.0.0.1:5433` y la `DATABASE_URL` de desarrollo apunta a ese puerto.

Si se cambia el puerto del compose, recrear el contenedor:

```powershell
docker-compose down
docker-compose up -d postgres
```

Alternativas limpias si persiste el problema:

- Opcion A: usar `POSTGRES_HOST_AUTH_METHOD=trust` solo en un compose local de desarrollo, nunca en produccion.
- Opcion B: usar PostgreSQL local sin Docker y ajustar `DATABASE_URL` al usuario/base reales.
- Opcion C: ejecutar migraciones desde un contenedor temporal conectado a la red de Docker Compose, usando el host interno `postgres:5432`.

Compilar:

```powershell
npm.cmd run build
```

Correr version compilada:

```powershell
npm.cmd start
```

## Health check

Con el servidor levantado:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "tampo-backend",
  "timestamp": "..."
}
```

## Modelo de datos inicial

El MVP usa cinco modelos principales:

- `Usuario`: usuarios del sistema con `username` unico para login, password hash y rol `ADMIN` o `EMPLEADO`.
- `Lote`: agrupacion de animales. El nombre es unico y puede desactivarse.
- `Animal`: identificacion por `caravana` unica, categoria, estado reproductivo, estado general y lote actual.
- `Evento`: historial de acciones sanitarias, reproductivas u operativas sobre un animal.
- `AgendaTarea`: tareas futuras o pendientes, con evento de origen opcional y evento de cierre opcional.

Reglas importantes que se validaran en la capa de servicios:

- La caravana no se modifica despues del alta.
- Los animales vendidos o muertos no se eliminan fisicamente; se actualiza `estadoAnimal` y `activo`.
- No se elimina historial de eventos.
- Un lote con animales asociados no deberia eliminarse.
