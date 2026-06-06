CREATE TABLE IF NOT EXISTS "detalles_reglas_alimentacion" (
  "id" SERIAL NOT NULL,
  "reglaAlimentacionId" INTEGER NOT NULL,
  "alimentoId" INTEGER NOT NULL,
  "tipoCalculo" "TipoCalculoAlimentacion" NOT NULL,
  "unidad" "UnidadAlimento" NOT NULL,
  "cantidadMinima" DOUBLE PRECISION,
  "cantidadMaxima" DOUBLE PRECISION,
  "animalesBase" INTEGER,
  "rollosBase" DOUBLE PRECISION,
  "duracionDias" INTEGER,
  "obligatorio" BOOLEAN NOT NULL DEFAULT false,
  "observaciones" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "detalles_reglas_alimentacion_pkey" PRIMARY KEY ("id")
);

INSERT INTO "detalles_reglas_alimentacion" (
  "reglaAlimentacionId",
  "alimentoId",
  "tipoCalculo",
  "unidad",
  "cantidadMinima",
  "cantidadMaxima",
  "animalesBase",
  "rollosBase",
  "duracionDias",
  "obligatorio",
  "observaciones",
  "createdAt",
  "updatedAt"
)
SELECT
  r."id",
  r."alimentoId",
  r."tipoCalculo",
  r."unidad",
  r."cantidadMinima",
  r."cantidadMaxima",
  r."animalesBase",
  r."rollosBase",
  r."duracionDias",
  r."obligatorio",
  r."observaciones",
  r."createdAt",
  r."updatedAt"
FROM "reglas_alimentacion" r
WHERE r."alimentoId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "detalles_reglas_alimentacion" d
    WHERE d."reglaAlimentacionId" = r."id"
      AND d."alimentoId" = r."alimentoId"
  );

ALTER TABLE "reglas_alimentacion"
  ALTER COLUMN "alimentoId" DROP NOT NULL,
  ALTER COLUMN "tipoCalculo" DROP NOT NULL,
  ALTER COLUMN "unidad" DROP NOT NULL;

DROP INDEX IF EXISTS "reglas_alimentacion_categoriaAnimal_alimentoId_tipoCalculo_nombre_key";
DROP INDEX IF EXISTS "reglas_alimentacion_alimentoId_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "reglas_alimentacion_categoriaAnimal_nombre_key"
  ON "reglas_alimentacion"("categoriaAnimal", "nombre");
CREATE UNIQUE INDEX IF NOT EXISTS "detalles_reglas_alimentacion_reglaAlimentacionId_alimentoId_key"
  ON "detalles_reglas_alimentacion"("reglaAlimentacionId", "alimentoId");
CREATE INDEX IF NOT EXISTS "detalles_reglas_alimentacion_reglaAlimentacionId_idx"
  ON "detalles_reglas_alimentacion"("reglaAlimentacionId");
CREATE INDEX IF NOT EXISTS "detalles_reglas_alimentacion_alimentoId_idx"
  ON "detalles_reglas_alimentacion"("alimentoId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'detalles_reglas_alimentacion_reglaAlimentacionId_fkey'
      AND table_name = 'detalles_reglas_alimentacion'
  ) THEN
    ALTER TABLE "detalles_reglas_alimentacion"
      ADD CONSTRAINT "detalles_reglas_alimentacion_reglaAlimentacionId_fkey"
      FOREIGN KEY ("reglaAlimentacionId") REFERENCES "reglas_alimentacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'detalles_reglas_alimentacion_alimentoId_fkey'
      AND table_name = 'detalles_reglas_alimentacion'
  ) THEN
    ALTER TABLE "detalles_reglas_alimentacion"
      ADD CONSTRAINT "detalles_reglas_alimentacion_alimentoId_fkey"
      FOREIGN KEY ("alimentoId") REFERENCES "insumos_alimentacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
