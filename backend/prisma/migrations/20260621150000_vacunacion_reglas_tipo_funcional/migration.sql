CREATE TYPE "PeriodicidadReglaSanitaria" AS ENUM ('FIJA_MARZO', 'DINAMICA_ANUAL');

CREATE TYPE "EstadoPendienteSanitario" AS ENUM ('PENDIENTE', 'REALIZADA', 'CANCELADA');

ALTER TABLE "reglas_sanitarias"
ADD COLUMN "periodicidad" "PeriodicidadReglaSanitaria" NOT NULL DEFAULT 'DINAMICA_ANUAL';

UPDATE "reglas_sanitarias"
SET "periodicidad" = CASE
  WHEN "mesFijo" = 3 THEN 'FIJA_MARZO'::"PeriodicidadReglaSanitaria"
  ELSE 'DINAMICA_ANUAL'::"PeriodicidadReglaSanitaria"
END;

CREATE TABLE "reglas_sanitarias_tipos_funcionales" (
  "id" SERIAL NOT NULL,
  "reglaSanitariaId" INTEGER NOT NULL,
  "tipoFuncional" "TipoFuncionalLote" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reglas_sanitarias_tipos_funcionales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pendientes_sanitarios" (
  "id" SERIAL NOT NULL,
  "reglaSanitariaId" INTEGER NOT NULL,
  "tipoFuncional" "TipoFuncionalLote" NOT NULL,
  "fechaMaxima" TIMESTAMP(3) NOT NULL,
  "estado" "EstadoPendienteSanitario" NOT NULL DEFAULT 'PENDIENTE',
  "aplicacionId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pendientes_sanitarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "aplicaciones_sanitarias" (
  "id" SERIAL NOT NULL,
  "reglaSanitariaId" INTEGER NOT NULL,
  "tipoFuncional" "TipoFuncionalLote" NOT NULL,
  "fechaRealizacion" TIMESTAMP(3) NOT NULL,
  "fechaMaximaCorrespondiente" TIMESTAMP(3) NOT NULL,
  "usuarioId" INTEGER,
  "observaciones" TEXT,
  "lotesSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "aplicaciones_sanitarias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "aplicaciones_sanitarias_animales" (
  "id" SERIAL NOT NULL,
  "aplicacionSanitariaId" INTEGER NOT NULL,
  "animalId" INTEGER,
  "caravanaSnapshot" TEXT NOT NULL,
  "categoriaSnapshot" TEXT NOT NULL,
  "loteSnapshot" TEXT NOT NULL,
  "tipoFuncionalSnapshot" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "aplicaciones_sanitarias_animales_pkey" PRIMARY KEY ("id")
);

INSERT INTO "reglas_sanitarias_tipos_funcionales" ("reglaSanitariaId", "tipoFuncional")
SELECT r."id", tf."tipoFuncional"::"TipoFuncionalLote"
FROM "reglas_sanitarias" r
CROSS JOIN (VALUES
  ('GUACHERA'),
  ('ESCUELITA'),
  ('TERNERA_1'),
  ('TERNERA_2'),
  ('TORITOS'),
  ('TOROS'),
  ('PRODUCCION'),
  ('SECAS'),
  ('PREPARTO'),
  ('RECUPERACION')
) AS tf("tipoFuncional")
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "reglas_sanitarias_tipos_funcionales_reglaSanitariaId_tipoFuncional_key" ON "reglas_sanitarias_tipos_funcionales"("reglaSanitariaId", "tipoFuncional");
CREATE INDEX "reglas_sanitarias_tipos_funcionales_tipoFuncional_idx" ON "reglas_sanitarias_tipos_funcionales"("tipoFuncional");

CREATE UNIQUE INDEX "pendientes_sanitarios_reglaSanitariaId_tipoFuncional_fechaMaxima_key" ON "pendientes_sanitarios"("reglaSanitariaId", "tipoFuncional", "fechaMaxima");
CREATE UNIQUE INDEX "pendientes_sanitarios_aplicacionId_key" ON "pendientes_sanitarios"("aplicacionId");
CREATE INDEX "pendientes_sanitarios_estado_idx" ON "pendientes_sanitarios"("estado");
CREATE INDEX "pendientes_sanitarios_tipoFuncional_idx" ON "pendientes_sanitarios"("tipoFuncional");
CREATE INDEX "pendientes_sanitarios_fechaMaxima_idx" ON "pendientes_sanitarios"("fechaMaxima");

CREATE INDEX "aplicaciones_sanitarias_reglaSanitariaId_idx" ON "aplicaciones_sanitarias"("reglaSanitariaId");
CREATE INDEX "aplicaciones_sanitarias_tipoFuncional_idx" ON "aplicaciones_sanitarias"("tipoFuncional");
CREATE INDEX "aplicaciones_sanitarias_fechaRealizacion_idx" ON "aplicaciones_sanitarias"("fechaRealizacion");
CREATE INDEX "aplicaciones_sanitarias_usuarioId_idx" ON "aplicaciones_sanitarias"("usuarioId");

CREATE INDEX "aplicaciones_sanitarias_animales_aplicacionSanitariaId_idx" ON "aplicaciones_sanitarias_animales"("aplicacionSanitariaId");
CREATE INDEX "aplicaciones_sanitarias_animales_animalId_idx" ON "aplicaciones_sanitarias_animales"("animalId");

CREATE INDEX "reglas_sanitarias_periodicidad_idx" ON "reglas_sanitarias"("periodicidad");

ALTER TABLE "reglas_sanitarias_tipos_funcionales"
ADD CONSTRAINT "reglas_sanitarias_tipos_funcionales_reglaSanitariaId_fkey"
FOREIGN KEY ("reglaSanitariaId") REFERENCES "reglas_sanitarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pendientes_sanitarios"
ADD CONSTRAINT "pendientes_sanitarios_reglaSanitariaId_fkey"
FOREIGN KEY ("reglaSanitariaId") REFERENCES "reglas_sanitarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pendientes_sanitarios"
ADD CONSTRAINT "pendientes_sanitarios_aplicacionId_fkey"
FOREIGN KEY ("aplicacionId") REFERENCES "aplicaciones_sanitarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "aplicaciones_sanitarias"
ADD CONSTRAINT "aplicaciones_sanitarias_reglaSanitariaId_fkey"
FOREIGN KEY ("reglaSanitariaId") REFERENCES "reglas_sanitarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "aplicaciones_sanitarias"
ADD CONSTRAINT "aplicaciones_sanitarias_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "aplicaciones_sanitarias_animales"
ADD CONSTRAINT "aplicaciones_sanitarias_animales_aplicacionSanitariaId_fkey"
FOREIGN KEY ("aplicacionSanitariaId") REFERENCES "aplicaciones_sanitarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
