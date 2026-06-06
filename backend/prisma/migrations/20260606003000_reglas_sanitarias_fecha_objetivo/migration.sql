CREATE TYPE "TipoReglaSanitaria" AS ENUM ('VACUNA', 'ANALISIS');

CREATE TABLE "reglas_sanitarias" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoReglaSanitaria" NOT NULL,
    "mesFijo" INTEGER,
    "frecuenciaMeses" INTEGER NOT NULL DEFAULT 12,
    "anticipacionMeses" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reglas_sanitarias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reglas_sanitarias_codigo_key" ON "reglas_sanitarias"("codigo");
CREATE INDEX "reglas_sanitarias_activo_idx" ON "reglas_sanitarias"("activo");
CREATE INDEX "reglas_sanitarias_tipo_idx" ON "reglas_sanitarias"("tipo");

ALTER TABLE "agenda_tareas" ADD COLUMN "fechaObjetivo" TIMESTAMP(3);
UPDATE "agenda_tareas" SET "fechaObjetivo" = "fechaProgramada" WHERE "fechaObjetivo" IS NULL;
CREATE INDEX "agenda_tareas_fechaObjetivo_idx" ON "agenda_tareas"("fechaObjetivo");
