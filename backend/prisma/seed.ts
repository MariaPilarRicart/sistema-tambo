import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, RolUsuario } from '@prisma/client';

const prisma = new PrismaClient();

const INITIAL_LOTES = [
  'Guachera',
  'Escuelita',
  'Terneras',
  'Vaquillonas',
  'Secas',
  'Producción',
];

async function seedAdminUser() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {
      nombre: 'Administrador',
      passwordHash,
      rol: RolUsuario.ADMIN,
      activo: true,
    },
    create: {
      nombre: 'Administrador',
      username: 'admin',
      passwordHash,
      rol: RolUsuario.ADMIN,
      activo: true,
    },
  });
}

async function seedLotes() {
  await Promise.all(
    INITIAL_LOTES.map((nombre) =>
      prisma.lote.upsert({
        where: { nombre },
        update: { activo: true },
        create: { nombre, activo: true },
      }),
    ),
  );
}

async function main() {
  await seedAdminUser();
  await seedLotes();

  console.log('Seed completed: admin user and initial lotes are ready.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
