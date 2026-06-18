CREATE TABLE "ordenes" (
  "id" SERIAL NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  "turno" "TurnoOrdene" NOT NULL,
  "litrosBuenos" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "litrosDescartados" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "observaciones" TEXT,
  "usuarioId" INTEGER,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ordenes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ordenes_detalles" (
  "id" SERIAL NOT NULL,
  "ordeneId" INTEGER NOT NULL,
  "animalId" INTEGER NOT NULL,
  "litros" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "observaciones" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ordenes_detalles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ordenes_fecha_turno_key" ON "ordenes"("fecha", "turno");
CREATE INDEX "ordenes_fecha_idx" ON "ordenes"("fecha");
CREATE INDEX "ordenes_turno_idx" ON "ordenes"("turno");
CREATE INDEX "ordenes_activo_idx" ON "ordenes"("activo");
CREATE UNIQUE INDEX "ordenes_detalles_ordeneId_animalId_key" ON "ordenes_detalles"("ordeneId", "animalId");
CREATE INDEX "ordenes_detalles_animalId_idx" ON "ordenes_detalles"("animalId");

ALTER TABLE "ordenes"
ADD CONSTRAINT "ordenes_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ordenes_detalles"
ADD CONSTRAINT "ordenes_detalles_ordeneId_fkey"
FOREIGN KEY ("ordeneId") REFERENCES "ordenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ordenes_detalles"
ADD CONSTRAINT "ordenes_detalles_animalId_fkey"
FOREIGN KEY ("animalId") REFERENCES "animales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
