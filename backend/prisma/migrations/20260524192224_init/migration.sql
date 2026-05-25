-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'EMPLEADO');

-- CreateEnum
CREATE TYPE "CategoriaAnimal" AS ENUM ('TERNERA', 'VAQUILLONA', 'VACA', 'TORO');

-- CreateEnum
CREATE TYPE "EstadoReproductivo" AS ENUM ('NO_APLICA', 'VACIA', 'INSEMINADA', 'PRENADA', 'SECA', 'RECUPERACION');

-- CreateEnum
CREATE TYPE "EstadoAnimal" AS ENUM ('ACTIVO', 'VENDIDO', 'MUERTO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('CELO', 'INSEMINACION', 'TACTO', 'SECADO', 'PARTO', 'ABORTO', 'CLINICO', 'VACUNACION', 'CAMBIO_LOTE', 'VENTA', 'MUERTE');

-- CreateEnum
CREATE TYPE "TipoTarea" AS ENUM ('TACTO', 'SECADO', 'PARTO', 'ALTA_POST_PARTO', 'VACUNACION', 'CONTROL_CLINICO');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('PENDIENTE', 'REALIZADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animales" (
    "id" SERIAL NOT NULL,
    "caravana" TEXT NOT NULL,
    "nombre" TEXT,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "raza" TEXT,
    "categoria" "CategoriaAnimal" NOT NULL,
    "estadoReproductivo" "EstadoReproductivo" NOT NULL DEFAULT 'VACIA',
    "estadoAnimal" "EstadoAnimal" NOT NULL DEFAULT 'ACTIVO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "loteId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "animalId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "datosJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_tareas" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoTarea" NOT NULL,
    "fechaProgramada" TIMESTAMP(3) NOT NULL,
    "fechaRealizacion" TIMESTAMP(3),
    "estado" "EstadoTarea" NOT NULL DEFAULT 'PENDIENTE',
    "descripcion" TEXT,
    "animalId" INTEGER NOT NULL,
    "eventoOrigenId" INTEGER,
    "eventoCierreId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_tareas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_nombre_key" ON "lotes"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "animales_caravana_key" ON "animales"("caravana");

-- CreateIndex
CREATE INDEX "animales_loteId_idx" ON "animales"("loteId");

-- CreateIndex
CREATE INDEX "animales_estadoAnimal_idx" ON "animales"("estadoAnimal");

-- CreateIndex
CREATE INDEX "animales_estadoReproductivo_idx" ON "animales"("estadoReproductivo");

-- CreateIndex
CREATE INDEX "eventos_animalId_idx" ON "eventos"("animalId");

-- CreateIndex
CREATE INDEX "eventos_usuarioId_idx" ON "eventos"("usuarioId");

-- CreateIndex
CREATE INDEX "eventos_tipo_idx" ON "eventos"("tipo");

-- CreateIndex
CREATE INDEX "eventos_fecha_idx" ON "eventos"("fecha");

-- CreateIndex
CREATE INDEX "agenda_tareas_animalId_idx" ON "agenda_tareas"("animalId");

-- CreateIndex
CREATE INDEX "agenda_tareas_eventoOrigenId_idx" ON "agenda_tareas"("eventoOrigenId");

-- CreateIndex
CREATE INDEX "agenda_tareas_eventoCierreId_idx" ON "agenda_tareas"("eventoCierreId");

-- CreateIndex
CREATE INDEX "agenda_tareas_estado_idx" ON "agenda_tareas"("estado");

-- CreateIndex
CREATE INDEX "agenda_tareas_tipo_idx" ON "agenda_tareas"("tipo");

-- CreateIndex
CREATE INDEX "agenda_tareas_fechaProgramada_idx" ON "agenda_tareas"("fechaProgramada");

-- AddForeignKey
ALTER TABLE "animales" ADD CONSTRAINT "animales_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_tareas" ADD CONSTRAINT "agenda_tareas_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_tareas" ADD CONSTRAINT "agenda_tareas_eventoOrigenId_fkey" FOREIGN KEY ("eventoOrigenId") REFERENCES "eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_tareas" ADD CONSTRAINT "agenda_tareas_eventoCierreId_fkey" FOREIGN KEY ("eventoCierreId") REFERENCES "eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
