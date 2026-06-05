-- CreateEnum
CREATE TYPE "TurnoOrdene" AS ENUM ('MANANA', 'TARDE', 'NOCHE');

-- CreateEnum
CREATE TYPE "MotivoDescarteLeche" AS ENUM ('MASTITIS', 'ANTIBIOTICO', 'CALOSTRO', 'MALA_CALIDAD', 'CONTAMINACION', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoLoteLeche" AS ENUM ('DISPONIBLE', 'VENDIDO', 'VENCIDO');

-- CreateTable
CREATE TABLE "lotes_leche" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "fechaProduccion" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "fechaVenta" TIMESTAMP(3),
    "estado" "EstadoLoteLeche" NOT NULL DEFAULT 'DISPONIBLE',
    "litrosTotales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "litrosDescartados" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "litrosNetos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "grasa" DECIMAL(5,2),
    "proteina" DECIMAL(5,2),
    "recuentoBacteriano" INTEGER,
    "recuentoCelulasSomaticas" INTEGER,
    "temperatura" DECIMAL(5,2),
    "observacionesCalidad" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_leche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producciones_animales" (
    "id" SERIAL NOT NULL,
    "animalId" INTEGER NOT NULL,
    "loteLecheId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "turno" "TurnoOrdene" NOT NULL,
    "litrosProducidos" DECIMAL(10,2) NOT NULL,
    "litrosDescartados" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "motivoDescarte" "MotivoDescarteLeche",
    "observacionDescarte" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producciones_animales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lotes_leche_codigo_key" ON "lotes_leche"("codigo");

-- CreateIndex
CREATE INDEX "lotes_leche_estado_idx" ON "lotes_leche"("estado");

-- CreateIndex
CREATE INDEX "lotes_leche_fechaProduccion_idx" ON "lotes_leche"("fechaProduccion");

-- CreateIndex
CREATE UNIQUE INDEX "producciones_animales_animalId_fechaHora_turno_key" ON "producciones_animales"("animalId", "fechaHora", "turno");

-- CreateIndex
CREATE INDEX "producciones_animales_animalId_idx" ON "producciones_animales"("animalId");

-- CreateIndex
CREATE INDEX "producciones_animales_loteLecheId_idx" ON "producciones_animales"("loteLecheId");

-- CreateIndex
CREATE INDEX "producciones_animales_fechaHora_idx" ON "producciones_animales"("fechaHora");

-- CreateIndex
CREATE INDEX "producciones_animales_turno_idx" ON "producciones_animales"("turno");

-- CreateIndex
CREATE INDEX "producciones_animales_usuarioId_idx" ON "producciones_animales"("usuarioId");

-- AddForeignKey
ALTER TABLE "producciones_animales" ADD CONSTRAINT "producciones_animales_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producciones_animales" ADD CONSTRAINT "producciones_animales_loteLecheId_fkey" FOREIGN KEY ("loteLecheId") REFERENCES "lotes_leche"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producciones_animales" ADD CONSTRAINT "producciones_animales_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
