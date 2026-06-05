CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "cuit" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ventas" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "numeroFactura" TEXT NOT NULL,
    "fechaVenta" TIMESTAMP(3) NOT NULL,
    "totalLitros" DECIMAL(10,2) NOT NULL,
    "precioTotal" DECIMAL(12,2) NOT NULL,
    "observaciones" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "venta_detalles" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "loteLecheId" INTEGER NOT NULL,
    "litrosVendidos" DECIMAL(10,2) NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "venta_detalles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clientes_cuit_key" ON "clientes"("cuit");
CREATE INDEX "clientes_activo_idx" ON "clientes"("activo");

CREATE UNIQUE INDEX "ventas_numeroFactura_key" ON "ventas"("numeroFactura");
CREATE INDEX "ventas_clienteId_idx" ON "ventas"("clienteId");
CREATE INDEX "ventas_usuarioId_idx" ON "ventas"("usuarioId");
CREATE INDEX "ventas_fechaVenta_idx" ON "ventas"("fechaVenta");

CREATE INDEX "venta_detalles_ventaId_idx" ON "venta_detalles"("ventaId");
CREATE INDEX "venta_detalles_loteLecheId_idx" ON "venta_detalles"("loteLecheId");

ALTER TABLE "ventas" ADD CONSTRAINT "ventas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "venta_detalles" ADD CONSTRAINT "venta_detalles_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "venta_detalles" ADD CONSTRAINT "venta_detalles_loteLecheId_fkey" FOREIGN KEY ("loteLecheId") REFERENCES "lotes_leche"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
