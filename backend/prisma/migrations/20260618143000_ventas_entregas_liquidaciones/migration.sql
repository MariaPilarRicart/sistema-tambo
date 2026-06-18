DO $$ BEGIN
  CREATE TYPE "EstadoEntregaLeche" AS ENUM ('PENDIENTE', 'LIQUIDADA', 'ANULADA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "entregas_leche" (
  "id" SERIAL NOT NULL,
  "clienteId" INTEGER NOT NULL,
  "fechaRetiro" TIMESTAMP(3) NOT NULL,
  "observacion" TEXT,
  "estado" "EstadoEntregaLeche" NOT NULL DEFAULT 'PENDIENTE',
  "liquidacionId" INTEGER,
  "usuarioId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "entregas_leche_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "entregas_leche_ordenes" (
  "id" SERIAL NOT NULL,
  "entregaLecheId" INTEGER NOT NULL,
  "ordeneId" INTEGER NOT NULL,
  "litrosEntregados" DECIMAL(10,2) NOT NULL,

  CONSTRAINT "entregas_leche_ordenes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "liquidaciones_leche" (
  "id" SERIAL NOT NULL,
  "clienteId" INTEGER NOT NULL,
  "mes" INTEGER NOT NULL,
  "anio" INTEGER NOT NULL,
  "numero" TEXT NOT NULL,
  "fechaLiquidacion" TIMESTAMP(3) NOT NULL,
  "precioLitro" DECIMAL(12,2) NOT NULL,
  "litrosLiquidados" DECIMAL(10,2) NOT NULL,
  "importeTotal" DECIMAL(12,2) NOT NULL,
  "observacion" TEXT,
  "usuarioId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "liquidaciones_leche_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "entregas_leche_ordenes_ordeneId_key" ON "entregas_leche_ordenes"("ordeneId");
CREATE UNIQUE INDEX "liquidaciones_leche_clienteId_mes_anio_key" ON "liquidaciones_leche"("clienteId", "mes", "anio");

CREATE INDEX "entregas_leche_clienteId_idx" ON "entregas_leche"("clienteId");
CREATE INDEX "entregas_leche_fechaRetiro_idx" ON "entregas_leche"("fechaRetiro");
CREATE INDEX "entregas_leche_estado_idx" ON "entregas_leche"("estado");
CREATE INDEX "entregas_leche_liquidacionId_idx" ON "entregas_leche"("liquidacionId");
CREATE INDEX "entregas_leche_usuarioId_idx" ON "entregas_leche"("usuarioId");
CREATE INDEX "entregas_leche_ordenes_entregaLecheId_idx" ON "entregas_leche_ordenes"("entregaLecheId");
CREATE INDEX "liquidaciones_leche_clienteId_idx" ON "liquidaciones_leche"("clienteId");
CREATE INDEX "liquidaciones_leche_mes_anio_idx" ON "liquidaciones_leche"("mes", "anio");
CREATE INDEX "liquidaciones_leche_usuarioId_idx" ON "liquidaciones_leche"("usuarioId");

ALTER TABLE "entregas_leche" ADD CONSTRAINT "entregas_leche_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entregas_leche" ADD CONSTRAINT "entregas_leche_liquidacionId_fkey" FOREIGN KEY ("liquidacionId") REFERENCES "liquidaciones_leche"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "entregas_leche" ADD CONSTRAINT "entregas_leche_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "entregas_leche_ordenes" ADD CONSTRAINT "entregas_leche_ordenes_entregaLecheId_fkey" FOREIGN KEY ("entregaLecheId") REFERENCES "entregas_leche"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entregas_leche_ordenes" ADD CONSTRAINT "entregas_leche_ordenes_ordeneId_fkey" FOREIGN KEY ("ordeneId") REFERENCES "ordenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidaciones_leche" ADD CONSTRAINT "liquidaciones_leche_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidaciones_leche" ADD CONSTRAINT "liquidaciones_leche_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
