-- CreateEnum
CREATE TYPE "TurnoOrdene" AS ENUM ('MANANA', 'TARDE', 'NOCHE');

-- CreateEnum
CREATE TYPE "MotivoDescarteLeche" AS ENUM ('MASTITIS', 'ANTIBIOTICO', 'CALOSTRO', 'MALA_CALIDAD', 'CONTAMINACION', 'OTRO');

-- CreateTable
CREATE TABLE "producciones_animales" (
    "id" SERIAL NOT NULL,
    "animalId" INTEGER NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "turno" "TurnoOrdene" NOT NULL,
    "litrosProducidos" DECIMAL(10,2) NOT NULL,
    "litrosDescartados" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "motivoDescarte" "MotivoDescarteLeche",
    "observacionDescarte" TEXT,
    "temperaturaTanque" DECIMAL(5,2),
    "grasa" DECIMAL(5,2),
    "proteina" DECIMAL(5,2),
    "recuentoCelulasSomaticas" INTEGER,
    "recuentoBacteriano" INTEGER,
    "observacionesCalidad" TEXT,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producciones_animales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "producciones_animales_animalId_fecha_turno_key" ON "producciones_animales"("animalId", "fecha", "turno");

-- CreateIndex
CREATE INDEX "producciones_animales_animalId_idx" ON "producciones_animales"("animalId");

-- CreateIndex
CREATE INDEX "producciones_animales_fecha_idx" ON "producciones_animales"("fecha");

-- CreateIndex
CREATE INDEX "producciones_animales_fechaHora_idx" ON "producciones_animales"("fechaHora");

-- CreateIndex
CREATE INDEX "producciones_animales_turno_idx" ON "producciones_animales"("turno");

-- CreateIndex
CREATE INDEX "producciones_animales_usuarioId_idx" ON "producciones_animales"("usuarioId");

-- AddForeignKey
ALTER TABLE "producciones_animales" ADD CONSTRAINT "producciones_animales_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producciones_animales" ADD CONSTRAINT "producciones_animales_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
