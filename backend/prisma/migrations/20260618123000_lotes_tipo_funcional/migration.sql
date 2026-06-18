CREATE TYPE "TipoFuncionalLote" AS ENUM (
  'GUACHERA',
  'ESCUELITA',
  'TERNERA_1',
  'TERNERA_2',
  'TORITOS',
  'TOROS',
  'PRODUCCION',
  'SECAS',
  'PREPARTO',
  'RECUPERACION'
);

ALTER TABLE "lotes"
ADD COLUMN "tipoFuncional" "TipoFuncionalLote";

UPDATE "lotes"
SET "tipoFuncional" = CASE
  WHEN lower("nombre") = 'guachera' THEN 'GUACHERA'::"TipoFuncionalLote"
  WHEN lower("nombre") = 'escuelita' THEN 'ESCUELITA'::"TipoFuncionalLote"
  WHEN lower("nombre") IN ('ternera 1', 'terneras', 'potrero 2') THEN 'TERNERA_1'::"TipoFuncionalLote"
  WHEN lower("nombre") IN ('ternera 2', 'vaquillonas', 'potrero 1') THEN 'TERNERA_2'::"TipoFuncionalLote"
  WHEN lower("nombre") = 'toritos' THEN 'TORITOS'::"TipoFuncionalLote"
  WHEN lower("nombre") = 'toros' THEN 'TOROS'::"TipoFuncionalLote"
  WHEN lower("nombre") IN ('producción', 'produccion', 'lote 001', 'lote 002', 'lecheras') THEN 'PRODUCCION'::"TipoFuncionalLote"
  WHEN lower("nombre") = 'secas' THEN 'SECAS'::"TipoFuncionalLote"
  WHEN lower("nombre") = 'preparto' THEN 'PREPARTO'::"TipoFuncionalLote"
  WHEN lower("nombre") IN ('recuperación', 'recuperacion') THEN 'RECUPERACION'::"TipoFuncionalLote"
  ELSE 'PRODUCCION'::"TipoFuncionalLote"
END;

ALTER TABLE "lotes"
ALTER COLUMN "tipoFuncional" SET NOT NULL,
ALTER COLUMN "tipoFuncional" SET DEFAULT 'PRODUCCION';

CREATE INDEX "lotes_tipoFuncional_idx" ON "lotes"("tipoFuncional");
