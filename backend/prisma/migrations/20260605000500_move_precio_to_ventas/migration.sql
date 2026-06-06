ALTER TABLE "ventas"
  ADD COLUMN "precioPorLitro" DECIMAL(12,2);

UPDATE "ventas"
SET "precioPorLitro" = CASE
  WHEN "totalLitros" > 0 THEN ROUND(("precioTotal" / "totalLitros")::numeric, 2)
  ELSE 0
END;

ALTER TABLE "ventas"
  ALTER COLUMN "precioPorLitro" SET NOT NULL;

ALTER TABLE "lotes_leche"
  DROP COLUMN IF EXISTS "precioPorLitro";
