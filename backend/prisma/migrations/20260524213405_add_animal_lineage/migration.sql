-- AlterTable
ALTER TABLE "animales" ADD COLUMN     "madreId" INTEGER,
ADD COLUMN     "padreNombre" TEXT;

-- CreateIndex
CREATE INDEX "animales_madreId_idx" ON "animales"("madreId");

-- AddForeignKey
ALTER TABLE "animales" ADD CONSTRAINT "animales_madreId_fkey" FOREIGN KEY ("madreId") REFERENCES "animales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
