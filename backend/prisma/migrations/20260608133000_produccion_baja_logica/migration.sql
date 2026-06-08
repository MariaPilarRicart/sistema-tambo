-- Baja logica para lotes de leche y registros individuales de produccion.
ALTER TYPE "EstadoLoteLeche" ADD VALUE IF NOT EXISTS 'INACTIVO';

ALTER TABLE "producciones_animales"
ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "producciones_animales_activo_idx" ON "producciones_animales"("activo");
