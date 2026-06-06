ALTER TABLE "agenda_tareas"
  ADD COLUMN IF NOT EXISTS "usuarioId" INTEGER,
  ADD COLUMN IF NOT EXISTS "tipoSanitario" TEXT,
  ADD COLUMN IF NOT EXISTS "alcanceTipo" TEXT,
  ADD COLUMN IF NOT EXISTS "alcanceLoteId" INTEGER,
  ADD COLUMN IF NOT EXISTS "alcanceCategoria" "CategoriaAnimal",
  ADD COLUMN IF NOT EXISTS "grupoSanitarioId" TEXT,
  ADD COLUMN IF NOT EXISTS "cantidadAnimalesAlcanzados" INTEGER;

CREATE INDEX IF NOT EXISTS "agenda_tareas_usuarioId_idx" ON "agenda_tareas"("usuarioId");
CREATE INDEX IF NOT EXISTS "agenda_tareas_alcanceLoteId_idx" ON "agenda_tareas"("alcanceLoteId");
CREATE INDEX IF NOT EXISTS "agenda_tareas_tipoSanitario_idx" ON "agenda_tareas"("tipoSanitario");
CREATE INDEX IF NOT EXISTS "agenda_tareas_grupoSanitarioId_idx" ON "agenda_tareas"("grupoSanitarioId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'agenda_tareas_usuarioId_fkey'
      AND table_name = 'agenda_tareas'
  ) THEN
    ALTER TABLE "agenda_tareas"
      ADD CONSTRAINT "agenda_tareas_usuarioId_fkey"
      FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'agenda_tareas_alcanceLoteId_fkey'
      AND table_name = 'agenda_tareas'
  ) THEN
    ALTER TABLE "agenda_tareas"
      ADD CONSTRAINT "agenda_tareas_alcanceLoteId_fkey"
      FOREIGN KEY ("alcanceLoteId") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
