ALTER TYPE "CategoriaAnimal" ADD VALUE IF NOT EXISTS 'TERNERO';
ALTER TYPE "CategoriaAnimal" ADD VALUE IF NOT EXISTS 'VACA';
ALTER TYPE "CategoriaAnimal" ADD VALUE IF NOT EXISTS 'TORITO';

INSERT INTO "lotes" ("nombre", "descripcion", "activo", "createdAt", "updatedAt")
VALUES
  ('Guachera', 'Terneros y terneras desde nacimiento hasta antes de 4 meses', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Escuelita', 'Terneras desde 4 hasta antes de 8 meses', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Ternera 1', 'Terneras desde 8 hasta antes de 13 meses', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Ternera 2', 'Vaquillonas desde 13 meses hasta primer parto', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Producción', 'Vacas en producción', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Secas', 'Vacas secas', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Preparto', 'Vacas en preparto', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Recuperación', 'Vacas en recuperación post parto', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Toritos', 'Machos desde 4 hasta antes de 18 meses', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Toros', 'Machos desde 18 meses en adelante', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nombre") DO UPDATE
SET "activo" = true,
    "descripcion" = EXCLUDED."descripcion",
    "updatedAt" = CURRENT_TIMESTAMP;
