CREATE TABLE IF NOT EXISTS "notificaciones_usuario_atendidas" (
  "id" SERIAL NOT NULL,
  "usuarioId" INTEGER NOT NULL,
  "clave" TEXT NOT NULL,
  "firma" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'ATENDIDA',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notificaciones_usuario_atendidas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notificaciones_usuario_atendidas_usuarioId_clave_firma_key"
  ON "notificaciones_usuario_atendidas"("usuarioId", "clave", "firma");

CREATE INDEX IF NOT EXISTS "notificaciones_usuario_atendidas_usuarioId_idx"
  ON "notificaciones_usuario_atendidas"("usuarioId");

CREATE INDEX IF NOT EXISTS "notificaciones_usuario_atendidas_clave_idx"
  ON "notificaciones_usuario_atendidas"("clave");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notificaciones_usuario_atendidas_usuarioId_fkey'
  ) THEN
    ALTER TABLE "notificaciones_usuario_atendidas"
      ADD CONSTRAINT "notificaciones_usuario_atendidas_usuarioId_fkey"
      FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
