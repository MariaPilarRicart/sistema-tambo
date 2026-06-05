ALTER TYPE "MotivoDescarteLeche" ADD VALUE IF NOT EXISTS 'ANTIBIOTICOS';
ALTER TYPE "MotivoDescarteLeche" ADD VALUE IF NOT EXISTS 'PROBLEMA_SANITARIO';
ALTER TYPE "MotivoDescarteLeche" ADD VALUE IF NOT EXISTS 'TEMPERATURA_FUERA_DE_RANGO';

ALTER TABLE "lotes_leche"
  ADD COLUMN "descripcion" TEXT,
  ADD COLUMN "motivoDescarte" "MotivoDescarteLeche",
  ADD COLUMN "observacionDescarte" TEXT;
