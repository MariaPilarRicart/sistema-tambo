DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoAlimento') THEN
    CREATE TYPE "TipoAlimento" AS ENUM ('SILO', 'BALANCEADO', 'FIBRA', 'SUPLEMENTO', 'SALES', 'OTRO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UnidadAlimento') THEN
    CREATE TYPE "UnidadAlimento" AS ENUM ('KG', 'ROLLO', 'UNIDAD');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoCalculoAlimentacion') THEN
    CREATE TYPE "TipoCalculoAlimentacion" AS ENUM ('KG_POR_ANIMAL_DIA', 'ROLLOS_POR_GRUPO_DURACION', 'OBLIGATORIO_SIN_CANTIDAD');
  END IF;
END $$;

ALTER TYPE "TipoMovimientoStockAlimentacion" ADD VALUE IF NOT EXISTS 'BAJA';
ALTER TYPE "TipoMovimientoStockAlimentacion" ADD VALUE IF NOT EXISTS 'MODIFICACION';

ALTER TABLE "insumos_alimentacion"
  ADD COLUMN IF NOT EXISTS "tipoAlimento" "TipoAlimento" NOT NULL DEFAULT 'OTRO';

ALTER TABLE "detalles_alimentacion"
  ADD COLUMN IF NOT EXISTS "cantidadSugeridaMinima" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "cantidadSugeridaMaxima" DOUBLE PRECISION;

ALTER TABLE "registros_alimentacion"
  ADD COLUMN IF NOT EXISTS "cantidadAnimales" INTEGER;

CREATE TABLE IF NOT EXISTS "reglas_alimentacion" (
  "id" SERIAL NOT NULL,
  "nombre" TEXT NOT NULL,
  "categoriaAnimal" "CategoriaAnimal" NOT NULL,
  "alimentoId" INTEGER NOT NULL,
  "tipoCalculo" "TipoCalculoAlimentacion" NOT NULL,
  "unidad" "UnidadAlimento" NOT NULL,
  "cantidadMinima" DOUBLE PRECISION,
  "cantidadMaxima" DOUBLE PRECISION,
  "animalesBase" INTEGER,
  "rollosBase" DOUBLE PRECISION,
  "duracionDias" INTEGER,
  "obligatorio" BOOLEAN NOT NULL DEFAULT false,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "observaciones" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reglas_alimentacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "reglas_alimentacion_categoriaAnimal_alimentoId_tipoCalculo_nombre_key"
  ON "reglas_alimentacion"("categoriaAnimal", "alimentoId", "tipoCalculo", "nombre");
CREATE INDEX IF NOT EXISTS "reglas_alimentacion_categoriaAnimal_idx" ON "reglas_alimentacion"("categoriaAnimal");
CREATE INDEX IF NOT EXISTS "reglas_alimentacion_alimentoId_idx" ON "reglas_alimentacion"("alimentoId");
CREATE INDEX IF NOT EXISTS "reglas_alimentacion_activo_idx" ON "reglas_alimentacion"("activo");
CREATE INDEX IF NOT EXISTS "insumos_alimentacion_tipoAlimento_idx" ON "insumos_alimentacion"("tipoAlimento");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reglas_alimentacion_alimentoId_fkey'
      AND table_name = 'reglas_alimentacion'
  ) THEN
    ALTER TABLE "reglas_alimentacion"
      ADD CONSTRAINT "reglas_alimentacion_alimentoId_fkey"
      FOREIGN KEY ("alimentoId") REFERENCES "insumos_alimentacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
