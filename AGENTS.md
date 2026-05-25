# Proyecto Final - Sistema de Gestión Integral para Tambos

Sistema web para la gestión integral de tambos, desarrollado como Proyecto Final de Ingeniería en Sistemas de Información en la UTN Rosario.

## Objetivo

Construir una aplicación web para administrar usuarios, roles, lotes, animales, eventos reproductivos/sanitarios, agenda de tareas, alimentación, vacunación, alertas y dashboard.

## Documentación

La carpeta /docs contiene la documentación funcional y académica del proyecto.

Antes de programar, revisar especialmente:
- Logica.docx
- descripcion resumida del sistema y funcionamiento.docx
- TERCERA ENTREGA.docx
- der_proyecto.drawio
- der_proyecto.drawio.png

## Stack

Frontend:
- React
- TypeScript
- Vite
- React Router

Backend:
- Node.js
- Express
- TypeScript
- arquitectura por capas

Base de datos:
- PostgreSQL
- Prisma ORM

Autenticación:
- JWT
- bcrypt

Roles:
- ADMIN
- EMPLEADO

## Reglas de negocio principales

1. ADMIN puede crear, modificar y eliminar.
2. EMPLEADO tiene permisos limitados.
3. Los permisos deben validarse en backend, no solo en frontend.
4. Cada animal debe tener caravana única.
5. La caravana no debería modificarse una vez creada.
6. Los animales vendidos o muertos no se eliminan físicamente: se marcan como inactivos.
7. Los eventos pueden modificar el estado del animal.
8. Algunos eventos pueden generar tareas futuras en la agenda.
9. No eliminar información histórica importante.
10. Priorizar un MVP realista para Proyecto Final universitario.

## Orden de desarrollo

Avanzar por etapas:
1. estructura inicial;
2. backend base;
3. base de datos;
4. autenticación;
5. usuarios;
6. lotes;
7. animales;
8. eventos;
9. agenda de tareas;
10. alimentación;
11. vacunación;
12. dashboard;
13. documentación.

## Forma de trabajo

Antes de modificar código:
- leer archivos relevantes;
- explicar brevemente qué se va a hacer;
- modificar solo lo necesario.

Después de modificar código:
- indicar qué archivos se modificaron;
- explicar cómo probar;
- indicar comandos necesarios.