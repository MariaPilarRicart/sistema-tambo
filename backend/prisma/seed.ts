import 'dotenv/config';
import bcrypt from 'bcrypt';
import {
  CategoriaAnimal,
  EstadoAnimal,
  EstadoLoteLeche,
  EstadoReproductivo,
  MotivoDescarteLeche,
  Prisma,
  PrismaClient,
  RolUsuario,
  TipoEvento,
  TipoMovimientoStockAlimentacion,
  TipoTarea,
  TurnoOrdene,
} from '@prisma/client';

const prisma = new PrismaClient();

const physicalLotes = ['Lote 001', 'Lote 002', 'Lote 003', 'Corral Norte', 'Corral Sur', 'Potrero 1', 'Potrero 2'];

const animals = [
  ['1001', CategoriaAnimal.VACA_PRODUCCION, EstadoReproductivo.PRENADA, 'Lote 001', true],
  ['1002', CategoriaAnimal.VACA_PRODUCCION, EstadoReproductivo.VACIA, 'Lote 001', true],
  ['1003', CategoriaAnimal.VACA_PRODUCCION, EstadoReproductivo.INSEMINADA, 'Lote 002', true],
  ['1004', CategoriaAnimal.VACA_PRODUCCION, EstadoReproductivo.VACIA, 'Lote 002', true],
  ['1005', CategoriaAnimal.VACA_SECA, EstadoReproductivo.PRENADA, 'Corral Norte', true],
  ['1006', CategoriaAnimal.PREPARTO, EstadoReproductivo.PRENADA, 'Corral Sur', true],
  ['2001', CategoriaAnimal.VAQUILLONA, EstadoReproductivo.VACIA, 'Potrero 1', true],
  ['2002', CategoriaAnimal.VAQUILLONA, EstadoReproductivo.INSEMINADA, 'Potrero 1', true],
  ['3001', CategoriaAnimal.TERNERA, EstadoReproductivo.NO_APLICA, 'Potrero 2', true],
  ['3002', CategoriaAnimal.TERNERA, EstadoReproductivo.NO_APLICA, 'Potrero 2', true],
  ['4001', CategoriaAnimal.GUACHERA, EstadoReproductivo.NO_APLICA, 'Corral Norte', true],
  ['4002', CategoriaAnimal.GUACHERA, EstadoReproductivo.NO_APLICA, 'Corral Norte', true],
  ['5001', CategoriaAnimal.ESCUELITA, EstadoReproductivo.NO_APLICA, 'Corral Sur', true],
  ['6001', CategoriaAnimal.TORO, EstadoReproductivo.NO_APLICA, 'Potrero 1', true],
  ['9001', CategoriaAnimal.BAJA, EstadoReproductivo.NO_APLICA, 'Lote 003', false],
] as const;

const raciones = [
  [CategoriaAnimal.GUACHERA, 'Dieta GUACHERA'],
  [CategoriaAnimal.ESCUELITA, 'Dieta ESCUELITA'],
  [CategoriaAnimal.TERNERA, 'Dieta TERNERA'],
  [CategoriaAnimal.VAQUILLONA, 'Dieta VAQUILLONA'],
  [CategoriaAnimal.VACA_PRODUCCION, 'Dieta VACA_PRODUCCION'],
  [CategoriaAnimal.VACA_SECA, 'Dieta VACA_SECA'],
  [CategoriaAnimal.PREPARTO, 'Dieta PREPARTO'],
] as const;

function daysFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return date;
}

function dateYearsAgo(years: number) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function seedUsers() {
  const [adminHash, empleadoHash] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('empleado123', 10),
  ]);

  await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: { nombre: 'Administrador', passwordHash: adminHash, rol: RolUsuario.ADMIN, activo: true },
    create: { nombre: 'Administrador', username: 'admin', passwordHash: adminHash, rol: RolUsuario.ADMIN, activo: true },
  });

  await prisma.usuario.upsert({
    where: { username: 'empleado' },
    update: { nombre: 'Empleado', passwordHash: empleadoHash, rol: RolUsuario.EMPLEADO, activo: true },
    create: { nombre: 'Empleado', username: 'empleado', passwordHash: empleadoHash, rol: RolUsuario.EMPLEADO, activo: true },
  });
}

async function seedLotes() {
  for (const nombre of physicalLotes) {
    await prisma.lote.upsert({
      where: { nombre },
      update: { activo: true, descripcion: 'Ubicación física u operativa' },
      create: { nombre, descripcion: 'Ubicación física u operativa', activo: true },
    });
  }
}

async function seedAnimals() {
  const lotes = await prisma.lote.findMany();
  const loteByName = new Map(lotes.map((lote) => [lote.nombre, lote.id]));

  for (const [caravana, categoriaAnimal, estadoReproductivo, loteNombre, activo] of animals) {
    await prisma.animal.upsert({
      where: { caravana },
      update: {
        categoriaAnimal,
        estadoReproductivo,
        estadoAnimal: activo ? EstadoAnimal.ACTIVO : EstadoAnimal.VENDIDO,
        activo,
        loteId: loteByName.get(loteNombre) ?? loteByName.get('Lote 001')!,
      },
      create: {
        caravana,
        nombre: `Animal ${caravana}`,
        fechaNacimiento: dateYearsAgo(categoriaAnimal === CategoriaAnimal.TERNERA ? 1 : 4),
        raza: 'Holando',
        categoriaAnimal,
        estadoReproductivo,
        estadoAnimal: activo ? EstadoAnimal.ACTIVO : EstadoAnimal.VENDIDO,
        activo,
        fechaBaja: activo ? null : daysFromToday(-30),
        observacionesBaja: activo ? null : 'Animal de baja para prueba',
        loteId: loteByName.get(loteNombre) ?? loteByName.get('Lote 001')!,
      },
    });
  }
}

async function seedAlimentacion(usuarioId: number) {
  await prisma.registroAlimentacion.deleteMany({
    where: { observaciones: { in: ['Entrega de prueba para producción'] } },
  });
  await prisma.movimientoStockAlimentacion.deleteMany({
    where: { observaciones: 'Movimiento de prueba' },
  });

  for (const [categoriaAnimal, nombre] of raciones) {
    await prisma.racion.upsert({
      where: { nombre },
      update: { categoriaAnimal, activa: true },
      create: { nombre, categoriaAnimal, descripcion: `Ración base para ${categoriaAnimal}`, activa: true },
    });
  }

  const insumos = [
    ['Silo de maíz', 'KG', 2500, 400],
    ['Balanceado', 'KG', 900, 200],
    ['Rollo de alfalfa', 'UNIDAD', 45, 10],
    ['Harina de soja', 'KG', 350, 120],
    ['Sales minerales', 'KG', 120, 30],
  ] as const;

  for (const [nombre, unidadMedida, stockActual, stockMinimo] of insumos) {
    const insumo = await prisma.insumoAlimentacion.upsert({
      where: { nombre },
      update: { unidadMedida, stockActual, stockMinimo, activo: true },
      create: { nombre, unidadMedida, stockActual, stockMinimo, activo: true },
    });

    await prisma.movimientoStockAlimentacion.create({
      data: {
        insumoId: insumo.id,
        tipoMovimiento: TipoMovimientoStockAlimentacion.ENTRADA,
        fecha: daysFromToday(-2),
        cantidad: 50,
        observaciones: 'Movimiento de prueba',
        usuarioId,
      },
    });
  }

  const produccionRacion = await prisma.racion.findUnique({ where: { nombre: 'Dieta VACA_PRODUCCION' } });
  if (produccionRacion) {
    await prisma.registroAlimentacion.create({
      data: {
        fecha: daysFromToday(0),
        categoriaAnimal: CategoriaAnimal.VACA_PRODUCCION,
        racionId: produccionRacion.id,
        cantidadKg: 450,
        observaciones: 'Entrega de prueba para producción',
        usuarioId,
      },
    });
  }
}

async function seedAgendaEventos(usuarioId: number) {
  await prisma.agendaTarea.deleteMany({
    where: {
      descripcion: {
        in: [
          'Tacto pendiente de prueba',
          'Vaca a secar',
          'Vaca próxima a parir',
          'Revisión post parto',
          'Vacunación vigente',
        ],
      },
    },
  });
  await prisma.evento.deleteMany({
    where: {
      observaciones: {
        in: ['Inseminación de prueba', 'Aftosa vigente'],
      },
    },
  });

  const byCaravana = new Map((await prisma.animal.findMany()).map((animal) => [animal.caravana, animal]));
  const animal1001 = byCaravana.get('1001');
  const animal1002 = byCaravana.get('1002');
  const animal1003 = byCaravana.get('1003');
  const animal1005 = byCaravana.get('1005');
  const animal1006 = byCaravana.get('1006');

  if (animal1002) {
    await prisma.evento.create({
      data: {
        animalId: animal1002.id,
        usuarioId,
        tipo: TipoEvento.INSEMINACION,
        fecha: daysFromToday(-20),
        observaciones: 'Inseminación de prueba',
      },
    });
  }

  const tasks = [
    [animal1003?.id, TipoTarea.TACTO, daysFromToday(7), 'Tacto pendiente de prueba'],
    [animal1005?.id, TipoTarea.SECADO, daysFromToday(4), 'Vaca a secar'],
    [animal1006?.id, TipoTarea.PARTO, daysFromToday(12), 'Vaca próxima a parir'],
    [animal1002?.id, TipoTarea.ALTA_POST_PARTO, daysFromToday(18), 'Revisión post parto'],
    [animal1001?.id, TipoTarea.VACUNACION, daysFromToday(20), 'Vacunación vigente'],
  ] as const;

  for (const [animalId, tipo, fechaProgramada, descripcion] of tasks) {
    if (!animalId) continue;
    await prisma.agendaTarea.create({
      data: { animalId, tipo, fechaProgramada, descripcion, estado: 'PENDIENTE' },
    });
  }

  if (animal1001) {
    await prisma.evento.create({
      data: {
        animalId: animal1001.id,
        usuarioId,
        tipo: TipoEvento.VACUNACION,
        fecha: daysFromToday(-10),
        observaciones: 'Aftosa vigente',
      },
    });
  }
}

async function seedProduccion(usuarioId: number) {
  const lotesLeche = [
    ['LT-0001', daysFromToday(-1), daysFromToday(3), 'Calidad normal'],
    ['LT-0002', daysFromToday(0), daysFromToday(4), 'Lote de prueba con descarte'],
  ] as const;

  for (const [codigo, fechaProduccion, fechaVencimiento, observacionesCalidad] of lotesLeche) {
    await prisma.loteLeche.upsert({
      where: { codigo },
      update: {
        fechaProduccion,
        fechaVencimiento,
        estado: EstadoLoteLeche.DISPONIBLE,
        grasa: new Prisma.Decimal(3.4),
        proteina: new Prisma.Decimal(3.1),
        recuentoBacteriano: 35000,
        recuentoCelulasSomaticas: 180000,
        temperatura: new Prisma.Decimal(3.8),
        observacionesCalidad,
      },
      create: {
        codigo,
        fechaProduccion,
        fechaVencimiento,
        estado: EstadoLoteLeche.DISPONIBLE,
        grasa: new Prisma.Decimal(3.4),
        proteina: new Prisma.Decimal(3.1),
        recuentoBacteriano: 35000,
        recuentoCelulasSomaticas: 180000,
        temperatura: new Prisma.Decimal(3.8),
        observacionesCalidad,
      },
    });
  }

  const [lt1, lt2] = await Promise.all([
    prisma.loteLeche.findUnique({ where: { codigo: 'LT-0001' } }),
    prisma.loteLeche.findUnique({ where: { codigo: 'LT-0002' } }),
  ]);
  const byCaravana = new Map((await prisma.animal.findMany()).map((animal) => [animal.caravana, animal]));

  const registros = [
    ['1001', lt1?.id, daysFromToday(-1), TurnoOrdene.MANANA, 22.5, 0, null],
    ['1002', lt1?.id, daysFromToday(-1), TurnoOrdene.TARDE, 18.2, 1.2, MotivoDescarteLeche.MALA_CALIDAD],
    ['1003', lt2?.id, daysFromToday(0), TurnoOrdene.MANANA, 20.4, 0, null],
    ['1004', lt2?.id, daysFromToday(0), TurnoOrdene.TARDE, 17.7, 0.8, MotivoDescarteLeche.MASTITIS],
  ] as const;

  for (const [caravana, loteLecheId, fechaHora, turno, litrosProducidos, litrosDescartados, motivoDescarte] of registros) {
    const animal = byCaravana.get(caravana);
    if (!animal || !loteLecheId) continue;

    await prisma.produccionAnimal.upsert({
      where: {
        animalId_fechaHora_turno: {
          animalId: animal.id,
          fechaHora,
          turno,
        },
      },
      update: {
        loteLecheId,
        usuarioId,
        litrosProducidos,
        litrosDescartados,
        motivoDescarte,
      },
      create: {
        animalId: animal.id,
        loteLecheId,
        usuarioId,
        fechaHora,
        turno,
        litrosProducidos,
        litrosDescartados,
        motivoDescarte,
      },
    });
  }

  for (const loteLeche of await prisma.loteLeche.findMany()) {
    const totals = await prisma.produccionAnimal.aggregate({
      where: { loteLecheId: loteLeche.id },
      _sum: { litrosProducidos: true, litrosDescartados: true },
    });
    const litrosTotales = totals._sum.litrosProducidos ?? new Prisma.Decimal(0);
    const litrosDescartados = totals._sum.litrosDescartados ?? new Prisma.Decimal(0);
    await prisma.loteLeche.update({
      where: { id: loteLeche.id },
      data: {
        litrosTotales,
        litrosDescartados,
        litrosNetos: litrosTotales.minus(litrosDescartados),
      },
    });
  }
}

async function main() {
  await seedUsers();
  await seedLotes();
  await seedAnimals();

  const admin = await prisma.usuario.findUniqueOrThrow({ where: { username: 'admin' } });
  await seedAlimentacion(admin.id);
  await seedAgendaEventos(admin.id);
  await seedProduccion(admin.id);

  console.log('Seed completed: users, physical lotes, animals, feed, agenda, vaccination and production data are ready.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
