# Backups de base local

Esta carpeta conserva instrucciones para guardar y restaurar escenarios completos de prueba de la base local.

Los archivos de backup (`.dump`, `.backup`) no se versionan. Este `README.md` sí queda versionado.

## Requisitos

- Docker iniciado.
- Contenedor PostgreSQL local en ejecución.
- Archivo `backend/.env` con `DATABASE_URL` configurado.
- `docker-compose.yml` con el `container_name` del servicio PostgreSQL.

Configuración detectada actualmente:

- Motor: PostgreSQL.
- Contenedor Docker: `tampo_postgres`.
- Base: `tampo_db`.
- Host local: `127.0.0.1`.
- Puerto local: `5433`.
- Usuario: `tampo_user`.

No documentes contraseñas ni secretos en este archivo.

## Crear Backup

Desde la raíz del proyecto:

```powershell
.\scripts\backup-db.ps1
```

El script:

- lee la configuración desde `backend/.env`;
- detecta el contenedor desde `docker-compose.yml`;
- crea `database/backups/` si no existe;
- ejecuta `pg_dump` en formato custom (`-Fc`);
- copia el archivo al proyecto;
- valida que el dump pueda leerse con `pg_restore --list`.

El nombre generado usa fecha y hora:

```text
database/backups/ganaderia-test-YYYY-MM-DD_HHmm.dump
```

## Restaurar Backup

Desde la raíz del proyecto:

```powershell
.\scripts\restore-db.ps1 -BackupFile .\database\backups\ganaderia-test-YYYY-MM-DD_HHmm.dump
```

El script:

- valida que el archivo exista;
- copia el backup al contenedor PostgreSQL;
- valida que el backup sea legible;
- ejecuta `pg_restore --clean --if-exists` sobre la base local.

Advertencia: restaurar reemplaza objetos y datos de la base local por el contenido del backup seleccionado. No lo ejecutes contra producción, staging ni una base compartida.

## Cuándo usarlo

- Antes de grandes cambios funcionales.
- Antes de probar migraciones nuevas.
- Antes de limpiar o recargar datos.
- Cuando necesites congelar un escenario de pruebas para repetir validaciones.
