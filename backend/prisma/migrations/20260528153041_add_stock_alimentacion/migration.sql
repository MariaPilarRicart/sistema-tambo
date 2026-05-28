-- CreateEnum
CREATE TYPE "TipoMovimientoStockAlimentacion" AS ENUM ('ENTRADA', 'CONSUMO', 'AJUSTE');

-- CreateTable
CREATE TABLE "insumos_alimentacion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidadMedida" TEXT NOT NULL,
    "stockActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockMinimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumos_alimentacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_stock_alimentacion" (
    "id" SERIAL NOT NULL,
    "insumoId" INTEGER NOT NULL,
    "tipoMovimiento" "TipoMovimientoStockAlimentacion" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "observaciones" TEXT,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimientos_stock_alimentacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insumos_alimentacion_nombre_key" ON "insumos_alimentacion"("nombre");

-- CreateIndex
CREATE INDEX "movimientos_stock_alimentacion_insumoId_idx" ON "movimientos_stock_alimentacion"("insumoId");

-- CreateIndex
CREATE INDEX "movimientos_stock_alimentacion_usuarioId_idx" ON "movimientos_stock_alimentacion"("usuarioId");

-- CreateIndex
CREATE INDEX "movimientos_stock_alimentacion_tipoMovimiento_idx" ON "movimientos_stock_alimentacion"("tipoMovimiento");

-- CreateIndex
CREATE INDEX "movimientos_stock_alimentacion_fecha_idx" ON "movimientos_stock_alimentacion"("fecha");

-- AddForeignKey
ALTER TABLE "movimientos_stock_alimentacion" ADD CONSTRAINT "movimientos_stock_alimentacion_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos_alimentacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock_alimentacion" ADD CONSTRAINT "movimientos_stock_alimentacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
