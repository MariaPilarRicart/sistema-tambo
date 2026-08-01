import 'dotenv/config';
import {
  CategoriaAnimal,
  EstadoEntregaLeche,
  EstadoPendienteSanitario,
  EstadoReproductivo,
  Prisma,
  PrismaClient,
  TipoAlimento,
  TipoCalculoAlimentacion,
  TipoFuncionalLote,
  TipoMovimientoStockAlimentacion,
  TipoReglaSanitaria,
  UnidadAlimento,
} from '@prisma/client';

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

function assertLocalDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL no esta configurada.');

  const url = new URL(databaseUrl);
  const host = url.hostname;
  const port = url.port || '5432';
  const database = url.pathname.replace(/^\//, '');
  const allowedHosts = new Set(['localhost', '127.0.0.1']);

  if (!allowedHosts.has(host) || database !== 'tampo_db' || port !== '5433') {
    throw new Error(`Conexion no local rechazada. host=${host}; port=${port}; database=${database}`);
  }

  return { host, port, database };
}

function startOfDay(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * DAY_MS);
  date.setHours(9, 0, 0, 0);
  return date;
}

function birthDate(yearsAgo: number, monthsAgo = 0) {
  const date = startOfDay();
  date.setFullYear(date.getFullYear() - yearsAgo);
  date.setMonth(date.getMonth() - monthsAgo);
  return date;
}

function money(value: number) {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

function addMonths(value: Date, months: number) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + months);
  return date;
}

async function cleanFunctionalData(tx: Prisma.TransactionClient) {
  await tx.aplicacionSanitariaAnimal.deleteMany();
  await tx.pendienteSanitario.deleteMany();
  await tx.aplicacionSanitaria.deleteMany();
  await tx.reglaSanitariaTipoFuncional.deleteMany();
  await tx.reglaSanitaria.deleteMany();
  await tx.entregaLecheOrdene.deleteMany();
  await tx.entregaLeche.deleteMany();
  await tx.liquidacionLeche.deleteMany();
  await tx.ventaDetalle.deleteMany();
  await tx.venta.deleteMany();
  await tx.detalleAlimentacion.deleteMany();
  await tx.movimientoStockAlimentacion.deleteMany();
  await tx.registroAlimentacion.deleteMany();
  await tx.detalleReglaAlimentacion.deleteMany();
  await tx.reglaAlimentacion.deleteMany();
  await tx.insumoAlimentacion.deleteMany();
  await tx.racion.deleteMany();
  await tx.ordeneDetalle.deleteMany();
  await tx.ordene.deleteMany();
  await tx.produccionAnimal.deleteMany();
  await tx.loteLeche.deleteMany();
  await tx.agendaTarea.deleteMany();
  await tx.evento.deleteMany();
  await tx.animal.deleteMany();
  await tx.lote.deleteMany();
  await tx.cliente.deleteMany();
  await tx.notificacionUsuarioAtendida.deleteMany();
}

async function createLotes(tx: Prisma.TransactionClient) {
  const lotes = await Promise.all(
    [
      ['Guachera Oeste', TipoFuncionalLote.GUACHERA],
      ['Escuelita Norte', TipoFuncionalLote.ESCUELITA],
      ['Ternera 1 Sur', TipoFuncionalLote.TERNERA_1],
      ['Ternera 2 Este', TipoFuncionalLote.TERNERA_2],
      ['Toritos Oeste', TipoFuncionalLote.TORITOS],
      ['Toros Norte', TipoFuncionalLote.TOROS],
      ['Produccion Norte', TipoFuncionalLote.PRODUCCION],
      ['Vacas Secas Este', TipoFuncionalLote.SECAS],
      ['Preparto Sur', TipoFuncionalLote.PREPARTO],
      ['Recuperacion Oeste', TipoFuncionalLote.RECUPERACION],
    ].map(([nombre, tipoFuncional]) =>
      tx.lote.create({
        data: {
          nombre,
          tipoFuncional,
          activo: true,
          descripcion: `Lote de prueba integral ${tipoFuncional}.`,
        },
      }),
    ),
  );

  return Object.fromEntries(lotes.map((lote) => [lote.tipoFuncional, lote]));
}

async function createAnimales(tx: Prisma.TransactionClient, lotes: Record<string, { id: number }>) {
  const animales = [
    ['000001', 'Vaca inseminada', CategoriaAnimal.VACA, EstadoReproductivo.INSEMINADA, birthDate(4, 0), lotes.PRODUCCION.id],
    ['000002', 'Vaca prenada', CategoriaAnimal.VACA, EstadoReproductivo.PRENADA, birthDate(5, 0), lotes.PREPARTO.id],
    ['000003', 'Vaca vacia', CategoriaAnimal.VACA, EstadoReproductivo.VACIA, birthDate(3, 6), lotes.PRODUCCION.id],
    ['000004', 'Vaca seca', CategoriaAnimal.VACA, EstadoReproductivo.SECA, birthDate(6, 0), lotes.SECAS.id],
    ['000005', 'Vaca recuperacion', CategoriaAnimal.VACA, EstadoReproductivo.RECUPERACION, birthDate(4, 8), lotes.RECUPERACION.id],
  ] as const;

  const created = await Promise.all(
    animales.map(([caravana, nombre, categoriaAnimal, estadoReproductivo, fechaNacimiento, loteId]) =>
      tx.animal.create({
        data: {
          caravana,
          nombre,
          categoriaAnimal,
          estadoReproductivo,
          estadoAnimal: 'ACTIVO',
          activo: true,
          fechaNacimiento,
          raza: 'Holando Argentino',
          loteId,
        },
      }),
    ),
  );

  return Object.fromEntries(created.map((animal) => [animal.caravana, animal]));
}

async function createAlimentacion(tx: Prisma.TransactionClient, usuarioId: number, lotes: Record<string, { id: number }>) {
  const [silo, balanceado] = await Promise.all([
    tx.insumoAlimentacion.create({ data: { nombre: 'Silo de maiz', tipoAlimento: TipoAlimento.SILO, unidadMedida: UnidadAlimento.KG, stockActual: 2100, stockMinimo: 400, activo: true } }),
    tx.insumoAlimentacion.create({ data: { nombre: 'Balanceado 18%', tipoAlimento: TipoAlimento.BALANCEADO, unidadMedida: UnidadAlimento.KG, stockActual: 180, stockMinimo: 80, activo: true } }),
  ]);

  const rules = [
    ['Dieta Vacas', CategoriaAnimal.VACA, silo.id, 18, 24],
    ['Dieta Vaquillonas', CategoriaAnimal.VAQUILLONA, balanceado.id, 3, 5],
    ['Dieta Terneras', CategoriaAnimal.TERNERA, balanceado.id, 1, 2],
    ['Dieta Toritos', CategoriaAnimal.TORITO, balanceado.id, 4, 6],
    ['Dieta Toros', CategoriaAnimal.TORO, balanceado.id, 5, 7],
  ] as const;

  await Promise.all(rules.map(([nombre, categoriaAnimal, alimentoId, cantidadMinima, cantidadMaxima]) =>
    tx.reglaAlimentacion.create({
      data: {
        nombre,
        categoriaAnimal,
        activo: true,
        observaciones: 'Dieta de prueba por tipo funcional de lote.',
        detalles: {
          create: {
            alimentoId,
            tipoCalculo: TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA,
            unidad: UnidadAlimento.KG,
            cantidadMinima,
            cantidadMaxima,
            obligatorio: true,
          },
        },
      },
    }),
  ));

  await tx.movimientoStockAlimentacion.createMany({
    data: [
      {
        insumoId: silo.id,
        tipoMovimiento: TipoMovimientoStockAlimentacion.ENTRADA,
        fecha: startOfDay(-7),
        cantidad: 2100,
        observaciones: 'Stock inicial de silo.',
        usuarioId,
      },
    ],
  });

  const alimentaciones = [
    [lotes.PRODUCCION.id, CategoriaAnimal.VACA, 2, silo.id, 48, -1],
    [lotes.PREPARTO.id, CategoriaAnimal.VACA, 1, silo.id, 22, 0],
  ] as const;

  for (const [index, [loteId, categoriaAnimal, cantidadAnimales, insumoId, cantidad, offsetDays]] of alimentaciones.entries()) {
    const registro = await tx.registroAlimentacion.create({
      data: {
        fecha: startOfDay(offsetDays),
        loteId,
        categoriaAnimal,
        cantidadAnimales,
        cantidadKg: cantidad,
        observaciones: 'Registro de alimentacion de prueba.',
        usuarioId,
      },
    });
    await tx.detalleAlimentacion.create({
      data: {
        alimentacionId: registro.id,
        insumoId,
        cantidad,
        unidad: UnidadAlimento.KG,
        cantidadSugeridaMinima: cantidad * 0.9,
        cantidadSugeridaMaxima: cantidad,
      },
    });
    if (index === 0) {
      await tx.movimientoStockAlimentacion.create({
        data: {
          insumoId,
          alimentacionId: registro.id,
          tipoMovimiento: TipoMovimientoStockAlimentacion.CONSUMO,
          fecha: startOfDay(offsetDays),
          cantidad,
          observaciones: 'Consumo de alimentacion.',
          usuarioId,
        },
      });
    }
    await tx.insumoAlimentacion.update({
      where: { id: insumoId },
      data: { stockActual: { decrement: cantidad } },
    });
  }
}

async function createProduccionYVentas(tx: Prisma.TransactionClient, usuarioId: number, animales: Record<string, { id: number }>) {
  const productionAnimals = ['000001', '000003', '000005'].map((key) => animales[key]);
  const ordenesData = [
    [0, 'MANANA', 62.5, 1.2],
    [-2, 'TARDE', 58.4, 0],
    [-6, 'MANANA', 60.1, 0.8],
  ] as const;

  const ordenes = [];
  for (const [offset, turno, litrosBuenos, litrosDescartados] of ordenesData) {
    ordenes.push(await tx.ordene.create({
      data: {
        fecha: startOfDay(offset),
        turno,
        litrosBuenos: money(litrosBuenos),
        litrosDescartados: money(litrosDescartados),
        observaciones: 'Ordene de prueba.',
        usuarioId,
        detalles: {
          create: productionAnimals.map((animal, index) => ({
            animalId: animal.id,
            litros: money([21.2, 20.4, 20.9][index]),
          })),
        },
      },
    }));
  }

  const clientes = await Promise.all([
    tx.cliente.create({ data: { cuit: '30-71000001-1', razonSocial: 'Lacteos Norte SA', direccion: 'Ruta 1 km 10', telefono: '3415550101', email: 'compras@norte.test', activo: true } }),
    tx.cliente.create({ data: { cuit: '30-71000002-9', razonSocial: 'Queseria del Sur', direccion: 'Ruta 2 km 20', telefono: '3415550202', email: 'compras@sur.test', activo: true } }),
  ]);

  const entregas = [];
  for (let index = 0; index < ordenes.length; index += 1) {
    const ordene = ordenes[index];
    entregas.push(await tx.entregaLeche.create({
      data: {
        clienteId: clientes[index % 2].id,
        fechaRetiro: startOfDay(index === 0 ? 0 : -index),
        estado: index < 2 ? EstadoEntregaLeche.LIQUIDADA : EstadoEntregaLeche.PENDIENTE,
        observacion: 'Retiro de leche de prueba.',
        usuarioId,
        ordenes: {
          create: {
            ordeneId: ordene.id,
            litrosEntregados: ordene.litrosBuenos,
          },
        },
      },
    }));
  }

  const currentMonth = startOfDay().getMonth() + 1;
  const currentYear = startOfDay().getFullYear();
  const entregasLiquidadas = entregas.filter((entrega) => entrega.clienteId === clientes[0].id && entrega.estado === EstadoEntregaLeche.LIQUIDADA);
  const litros = entregasLiquidadas.reduce((total, entrega) => {
    const entregaIndex = entregas.findIndex((item) => item.id === entrega.id);
    return total + Number(ordenes[entregaIndex]?.litrosBuenos ?? 0);
  }, 0);
  const liquidacion = await tx.liquidacionLeche.create({
    data: {
      clienteId: clientes[0].id,
      mes: currentMonth,
      anio: currentYear,
      numero: 'LIQ-000001',
      fechaLiquidacion: startOfDay(),
      precioLitro: money(345),
      litrosLiquidados: money(litros),
      importeTotal: money(litros * 345),
      observacion: 'Liquidacion de prueba.',
      usuarioId,
    },
  });
  await tx.entregaLeche.updateMany({
    where: { id: { in: entregasLiquidadas.map((entrega) => entrega.id) } },
    data: { liquidacionId: liquidacion.id },
  });
}

async function createEventosAgendaVacunacion(tx: Prisma.TransactionClient, usuarioId: number, animales: Record<string, { id: number }>) {
  const inseminacion = startOfDay(-25);
  const tacto = startOfDay(-70);
  const partoEstimado = startOfDay(20);

  await tx.evento.createMany({
    data: [
      { animalId: animales['000001'].id, usuarioId, tipo: 'INSEMINACION', fecha: inseminacion, observaciones: 'Inseminacion de prueba.' },
      { animalId: animales['000002'].id, usuarioId, tipo: 'TACTO', fecha: tacto, observaciones: 'Diagnostico positivo de prueba.', datosJson: { resultado: 'POSITIVO' } },
      { animalId: animales['000003'].id, usuarioId, tipo: 'TACTO', fecha: startOfDay(-15), observaciones: 'Diagnostico negativo de prueba.', datosJson: { resultado: 'NEGATIVO' } },
      { animalId: animales['000004'].id, usuarioId, tipo: 'SECADO', fecha: startOfDay(-30), observaciones: 'Secado de prueba.' },
      { animalId: animales['000005'].id, usuarioId, tipo: 'PARTO', fecha: startOfDay(-10), observaciones: 'Parto de prueba.' },
    ],
  });

  await tx.agendaTarea.createMany({
    data: [
      { animalId: animales['000001'].id, usuarioId, tipo: 'TACTO', fechaProgramada: startOfDay(20), estado: 'PENDIENTE', descripcion: 'Tacto post inseminacion de prueba.' },
      { animalId: animales['000002'].id, usuarioId, tipo: 'PARTO', fechaProgramada: partoEstimado, fechaObjetivo: partoEstimado, estado: 'PENDIENTE', descripcion: 'Parto estimado de prueba.' },
      { animalId: animales['000004'].id, usuarioId, tipo: 'PARTO', fechaProgramada: startOfDay(-5), estado: 'PENDIENTE', descripcion: 'Parto vencido de prueba.' },
      { animalId: animales['000005'].id, usuarioId, tipo: 'ALTA_POST_PARTO', fechaProgramada: startOfDay(30), estado: 'PENDIENTE', descripcion: 'Alta post parto de prueba.' },
      { animalId: animales['000003'].id, usuarioId, tipo: 'CONTROL_CLINICO', fechaProgramada: startOfDay(7), estado: 'PENDIENTE', descripcion: 'Control clinico de prueba.' },
    ],
  });

  const rules = [
    ['Aftosa anual', 'AFTOSA', TipoReglaSanitaria.VACUNA, [TipoFuncionalLote.PRODUCCION, TipoFuncionalLote.SECAS, TipoFuncionalLote.PREPARTO, TipoFuncionalLote.RECUPERACION]],
    ['Brucelosis anual', 'BRUCELOSIS', TipoReglaSanitaria.VACUNA, [TipoFuncionalLote.PRODUCCION, TipoFuncionalLote.PREPARTO]],
    ['Tuberculina anual', 'ANALISIS_TUBERCULINA', TipoReglaSanitaria.ANALISIS, [TipoFuncionalLote.PRODUCCION, TipoFuncionalLote.SECAS, TipoFuncionalLote.PREPARTO]],
  ] as const;
  const createdRules: Array<{ id: number; codigo: string; nombre: string }> = [];

  for (const [nombre, codigo, tipo, tiposFuncionales] of rules) {
    const rule = await tx.reglaSanitaria.create({
      data: {
        nombre,
        codigo,
        tipo,
        periodicidad: 'DINAMICA_ANUAL',
        frecuenciaMeses: 12,
        anticipacionMeses: 1,
        activo: true,
        observaciones: 'Regla sanitaria de prueba sin Guachera ni Escuelita.',
        tiposFuncionales: { create: tiposFuncionales.map((tipoFuncional) => ({ tipoFuncional })) },
      },
    });
    createdRules.push(rule);
  }

  await tx.pendienteSanitario.createMany({
    data: [
      { reglaSanitariaId: createdRules[0].id, tipoFuncional: TipoFuncionalLote.PRODUCCION, fechaMaxima: startOfDay(-2), estado: EstadoPendienteSanitario.PENDIENTE },
      { reglaSanitariaId: createdRules[1].id, tipoFuncional: TipoFuncionalLote.PREPARTO, fechaMaxima: startOfDay(7), estado: EstadoPendienteSanitario.PENDIENTE },
      { reglaSanitariaId: createdRules[2].id, tipoFuncional: TipoFuncionalLote.SECAS, fechaMaxima: startOfDay(35), estado: EstadoPendienteSanitario.PENDIENTE },
    ],
  });

  const aplicaciones = [
    [createdRules[0], TipoFuncionalLote.PRODUCCION, startOfDay(-120), startOfDay(-90), animales['000001'], 'Produccion Norte'],
    [createdRules[1], TipoFuncionalLote.PREPARTO, startOfDay(-80), startOfDay(-60), animales['000002'], 'Preparto Sur'],
    [createdRules[2], TipoFuncionalLote.RECUPERACION, startOfDay(-40), startOfDay(-30), animales['000005'], 'Recuperacion Oeste'],
  ] as const;

  for (const [rule, tipoFuncional, fechaRealizacion, fechaMaximaCorrespondiente, animal, loteSnapshot] of aplicaciones) {
    await tx.aplicacionSanitaria.create({
      data: {
        reglaSanitariaId: rule.id,
        tipoFuncional,
        fechaRealizacion,
        fechaMaximaCorrespondiente,
        usuarioId,
        observaciones: `Aplicacion realizada de ${rule.nombre}.`,
        lotesSnapshot: [{ lote: loteSnapshot, tipoFuncional, animales: 1 }],
        animales: {
          create: {
            animalId: animal.id,
            caravanaSnapshot: animal.caravana,
            categoriaSnapshot: CategoriaAnimal.VACA,
            loteSnapshot,
            tipoFuncionalSnapshot: tipoFuncional,
          },
        },
      },
    });
  }
}

async function main() {
  const local = assertLocalDatabase();
  const usuarios = await prisma.usuario.findMany({ orderBy: { id: 'asc' } });
  if (usuarios.length === 0) throw new Error('No hay usuarios para preservar. Abortado.');
  const admin = usuarios.find((usuario) => usuario.rol === 'ADMIN' && usuario.activo) ?? usuarios.find((usuario) => usuario.activo) ?? usuarios[0];

  await prisma.$transaction(async (tx) => {
    await cleanFunctionalData(tx);
    const lotes = await createLotes(tx);
    const animales = await createAnimales(tx, lotes);
    await createAlimentacion(tx, admin.id, lotes);
    await createProduccionYVentas(tx, admin.id, animales);
    await createEventosAgendaVacunacion(tx, admin.id, animales);
  }, { timeout: 60_000 });

  const counts = {
    usuarios: await prisma.usuario.count(),
    lotes: await prisma.lote.count(),
    animales: await prisma.animal.count(),
    clientes: await prisma.cliente.count(),
    ordenes: await prisma.ordene.count(),
    entregasLeche: await prisma.entregaLeche.count(),
    liquidacionesLeche: await prisma.liquidacionLeche.count(),
    reglasAlimentacion: await prisma.reglaAlimentacion.count(),
    insumosAlimentacion: await prisma.insumoAlimentacion.count(),
    reglasSanitarias: await prisma.reglaSanitaria.count(),
    pendientesSanitarios: await prisma.pendienteSanitario.count(),
    eventos: await prisma.evento.count(),
    agendaTareas: await prisma.agendaTarea.count(),
  };

  console.log(JSON.stringify({ entorno: local, usuarioPreservadoParaCarga: admin.username, counts }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
