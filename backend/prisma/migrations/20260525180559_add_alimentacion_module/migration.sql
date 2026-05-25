-- CreateTable
CREATE TABLE "raciones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_alimentacion" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "loteId" INTEGER NOT NULL,
    "racionId" INTEGER NOT NULL,
    "cantidadKg" DOUBLE PRECISION NOT NULL,
    "observaciones" TEXT,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_alimentacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raciones_nombre_key" ON "raciones"("nombre");

-- CreateIndex
CREATE INDEX "registros_alimentacion_fecha_idx" ON "registros_alimentacion"("fecha");

-- CreateIndex
CREATE INDEX "registros_alimentacion_loteId_idx" ON "registros_alimentacion"("loteId");

-- CreateIndex
CREATE INDEX "registros_alimentacion_racionId_idx" ON "registros_alimentacion"("racionId");

-- CreateIndex
CREATE INDEX "registros_alimentacion_usuarioId_idx" ON "registros_alimentacion"("usuarioId");

-- AddForeignKey
ALTER TABLE "registros_alimentacion" ADD CONSTRAINT "registros_alimentacion_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_alimentacion" ADD CONSTRAINT "registros_alimentacion_racionId_fkey" FOREIGN KEY ("racionId") REFERENCES "raciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_alimentacion" ADD CONSTRAINT "registros_alimentacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
