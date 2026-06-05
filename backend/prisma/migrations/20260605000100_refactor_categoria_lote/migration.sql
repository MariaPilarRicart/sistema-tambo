-- Replace the old productive-category enum with the final one.
ALTER TYPE "CategoriaAnimal" RENAME TO "CategoriaAnimal_old";

CREATE TYPE "CategoriaAnimal" AS ENUM (
  'GUACHERA',
  'ESCUELITA',
  'TERNERA',
  'VAQUILLONA',
  'VACA_PRODUCCION',
  'VACA_SECA',
  'PREPARTO',
  'TORO',
  'BAJA'
);

ALTER TABLE "animales"
ALTER COLUMN "categoria" TYPE "CategoriaAnimal"
USING (
  CASE
    WHEN "categoria"::text = 'VACA' THEN 'VACA_PRODUCCION'
    ELSE "categoria"::text
  END
)::"CategoriaAnimal";

DROP TYPE "CategoriaAnimal_old";

-- Raciones can now be associated to a productive category.
ALTER TABLE "raciones" ADD COLUMN IF NOT EXISTS "categoriaAnimal" "CategoriaAnimal";

-- Feeding records move from physical lote to productive category.
ALTER TABLE "registros_alimentacion" ADD COLUMN IF NOT EXISTS "categoriaAnimal" "CategoriaAnimal";

UPDATE "registros_alimentacion" ra
SET "categoriaAnimal" = CASE
  WHEN lower(l."nombre") IN ('producción', 'produccion', 'lecheras') THEN 'VACA_PRODUCCION'::"CategoriaAnimal"
  WHEN lower(l."nombre") = 'guachera' THEN 'GUACHERA'::"CategoriaAnimal"
  WHEN lower(l."nombre") = 'escuelita' THEN 'ESCUELITA'::"CategoriaAnimal"
  WHEN lower(l."nombre") = 'terneras' THEN 'TERNERA'::"CategoriaAnimal"
  WHEN lower(l."nombre") = 'vaquillonas' THEN 'VAQUILLONA'::"CategoriaAnimal"
  WHEN lower(l."nombre") = 'secas' THEN 'VACA_SECA'::"CategoriaAnimal"
  WHEN lower(l."nombre") = 'preparto' THEN 'PREPARTO'::"CategoriaAnimal"
  ELSE 'VACA_PRODUCCION'::"CategoriaAnimal"
END
FROM "lotes" l
WHERE ra."loteId" = l."id"
  AND ra."categoriaAnimal" IS NULL;

ALTER TABLE "registros_alimentacion" ALTER COLUMN "categoriaAnimal" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'registros_alimentacion_loteId_fkey'
      AND table_name = 'registros_alimentacion'
  ) THEN
    ALTER TABLE "registros_alimentacion" DROP CONSTRAINT "registros_alimentacion_loteId_fkey";
  END IF;
END $$;

DROP INDEX IF EXISTS "registros_alimentacion_loteId_idx";
CREATE INDEX IF NOT EXISTS "registros_alimentacion_categoriaAnimal_idx" ON "registros_alimentacion"("categoriaAnimal");
ALTER TABLE "registros_alimentacion" DROP COLUMN IF EXISTS "loteId";

-- Create a default physical lote and map old productive lote names into animal categories.
INSERT INTO "lotes" ("nombre", "descripcion", "activo", "createdAt", "updatedAt")
VALUES ('Lote 001', 'Lote físico por defecto', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nombre") DO UPDATE SET "activo" = true, "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "animales" a
SET "categoria" = CASE
  WHEN lower(l."nombre") IN ('producción', 'produccion', 'lecheras') THEN 'VACA_PRODUCCION'::"CategoriaAnimal"
  WHEN lower(l."nombre") = 'guachera' THEN 'GUACHERA'::"CategoriaAnimal"
  WHEN lower(l."nombre") = 'escuelita' THEN 'ESCUELITA'::"CategoriaAnimal"
  WHEN lower(l."nombre") = 'terneras' THEN 'TERNERA'::"CategoriaAnimal"
  WHEN lower(l."nombre") = 'vaquillonas' THEN 'VAQUILLONA'::"CategoriaAnimal"
  WHEN lower(l."nombre") = 'secas' THEN 'VACA_SECA'::"CategoriaAnimal"
  WHEN lower(l."nombre") = 'preparto' THEN 'PREPARTO'::"CategoriaAnimal"
  ELSE a."categoria"
END
FROM "lotes" l
WHERE a."loteId" = l."id";

UPDATE "animales"
SET "categoria" = 'BAJA'::"CategoriaAnimal"
WHERE "activo" = false;

UPDATE "animales"
SET "loteId" = (SELECT "id" FROM "lotes" WHERE "nombre" = 'Lote 001')
WHERE "loteId" IN (
  SELECT "id"
  FROM "lotes"
  WHERE lower("nombre") IN (
    'producción',
    'produccion',
    'lecheras',
    'guachera',
    'escuelita',
    'terneras',
    'vaquillonas',
    'secas',
    'preparto'
  )
);
