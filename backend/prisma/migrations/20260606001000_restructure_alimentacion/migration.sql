ALTER TYPE "TipoMovimientoStockAlimentacion" ADD VALUE IF NOT EXISTS 'CONSUMO_ALIMENTACION';
ALTER TYPE "TipoMovimientoStockAlimentacion" ADD VALUE IF NOT EXISTS 'BAJA_MANUAL';

ALTER TABLE "registros_alimentacion"
  ADD COLUMN IF NOT EXISTS "loteId" INTEGER;

ALTER TABLE "registros_alimentacion"
  ALTER COLUMN "racionId" DROP NOT NULL;

ALTER TABLE "movimientos_stock_alimentacion"
  ADD COLUMN IF NOT EXISTS "alimentacionId" INTEGER;

CREATE TABLE IF NOT EXISTS "detalles_alimentacion" (
  "id" SERIAL NOT NULL,
  "alimentacionId" INTEGER NOT NULL,
  "insumoId" INTEGER NOT NULL,
  "cantidad" DOUBLE PRECISION NOT NULL,
  "unidad" TEXT NOT NULL,
  "observaciones" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "detalles_alimentacion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "detalles_alimentacion_alimentacionId_idx" ON "detalles_alimentacion"("alimentacionId");
CREATE INDEX IF NOT EXISTS "detalles_alimentacion_insumoId_idx" ON "detalles_alimentacion"("insumoId");
CREATE INDEX IF NOT EXISTS "registros_alimentacion_loteId_idx" ON "registros_alimentacion"("loteId");
CREATE UNIQUE INDEX IF NOT EXISTS "registros_alimentacion_loteId_fecha_key" ON "registros_alimentacion"("loteId", "fecha");
CREATE INDEX IF NOT EXISTS "movimientos_stock_alimentacion_alimentacionId_idx" ON "movimientos_stock_alimentacion"("alimentacionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'registros_alimentacion_loteId_fkey'
      AND table_name = 'registros_alimentacion'
  ) THEN
    ALTER TABLE "registros_alimentacion"
      ADD CONSTRAINT "registros_alimentacion_loteId_fkey"
      FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'movimientos_stock_alimentacion_alimentacionId_fkey'
      AND table_name = 'movimientos_stock_alimentacion'
  ) THEN
    ALTER TABLE "movimientos_stock_alimentacion"
      ADD CONSTRAINT "movimientos_stock_alimentacion_alimentacionId_fkey"
      FOREIGN KEY ("alimentacionId") REFERENCES "registros_alimentacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'detalles_alimentacion_alimentacionId_fkey'
      AND table_name = 'detalles_alimentacion'
  ) THEN
    ALTER TABLE "detalles_alimentacion"
      ADD CONSTRAINT "detalles_alimentacion_alimentacionId_fkey"
      FOREIGN KEY ("alimentacionId") REFERENCES "registros_alimentacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'detalles_alimentacion_insumoId_fkey'
      AND table_name = 'detalles_alimentacion'
  ) THEN
    ALTER TABLE "detalles_alimentacion"
      ADD CONSTRAINT "detalles_alimentacion_insumoId_fkey"
      FOREIGN KEY ("insumoId") REFERENCES "insumos_alimentacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
