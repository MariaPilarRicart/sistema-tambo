import 'dotenv/config';
import bcrypt from 'bcrypt';
import {
  CategoriaAnimal,
  EstadoAnimal,
  EstadoLoteLeche,
  EstadoPendienteSanitario,
  EstadoReproductivo,
  EstadoTarea,
  MotivoDescarteLeche,
  PeriodicidadReglaSanitaria,
  Prisma,
  PrismaClient,
  RolUsuario,
  TipoAlimento,
  TipoCalculoAlimentacion,
  TipoFuncionalLote,
  TipoEvento,
  TipoMovimientoStockAlimentacion,
  TipoReglaSanitaria,
  TipoTarea,
  TurnoOrdene,
  UnidadAlimento,
} from '@prisma/client';

const prisma = new PrismaClient();

const SEED_PREFIX = 'Seed demo';
const SEED_FACTURA_PREFIX = 'F-SEED-';
const SEED_LOTE_LECHE_PREFIX = 'LT-SEED-';

const physicalLotes = [
  ['Guachera', 'Terneros y terneras desde nacimiento hasta antes de 4 meses', TipoFuncionalLote.GUACHERA],
  ['Escuelita', 'Terneras desde 4 hasta antes de 8 meses', TipoFuncionalLote.ESCUELITA],
  ['Ternera 1', 'Terneras desde 8 hasta antes de 13 meses', TipoFuncionalLote.TERNERA_1],
  ['Ternera 2', 'Vaquillonas desde 13 meses hasta primer parto', TipoFuncionalLote.TERNERA_2],
  ['Producción', 'Vacas en produccion', TipoFuncionalLote.PRODUCCION],
  ['Secas', 'Vacas secas', TipoFuncionalLote.SECAS],
  ['Preparto', 'Vacas en preparto', TipoFuncionalLote.PREPARTO],
  ['Recuperación', 'Vacas en recuperacion post parto', TipoFuncionalLote.RECUPERACION],
  ['Toritos', 'Machos desde 4 hasta antes de 18 meses', TipoFuncionalLote.TORITOS],
  ['Toros', 'Machos desde 18 meses en adelante', TipoFuncionalLote.TOROS],
  ['Lote 001', 'Vacas en produccion de alta rotacion', TipoFuncionalLote.PRODUCCION],
  ['Lote 002', 'Vacas en produccion de control', TipoFuncionalLote.PRODUCCION],
  ['Lote 003', 'Animales de baja o salida historica', TipoFuncionalLote.PRODUCCION],
  ['Corral Norte', 'Guachera y controles sanitarios', TipoFuncionalLote.GUACHERA],
  ['Corral Sur', 'Preparto y recria inicial', TipoFuncionalLote.PREPARTO],
  ['Potrero 1', 'Vaquillonas y reproductores', TipoFuncionalLote.TERNERA_2],
  ['Potrero 2', 'Terneras y escuelita', TipoFuncionalLote.TERNERA_1],
] as const;

const animals = [
  ['1001', 'Aurora', CategoriaAnimal.VACA, EstadoReproductivo.PRENADA, 'Producción', true, 48],
  ['1002', 'Brisa', CategoriaAnimal.VACA, EstadoReproductivo.VACIA, 'Producción', true, 50],
  ['1003', 'Clara', CategoriaAnimal.VACA, EstadoReproductivo.INSEMINADA, 'Producción', true, 52],
  ['1004', 'Dalia', CategoriaAnimal.VACA, EstadoReproductivo.VACIA, 'Producción', true, 46],
  ['1005', 'Estrella', CategoriaAnimal.VACA, EstadoReproductivo.PRENADA, 'Secas', true, 56],
  ['1006', 'Flora', CategoriaAnimal.VACA, EstadoReproductivo.PRENADA, 'Preparto', true, 54],
  ['1007', 'Gala', CategoriaAnimal.VACA, EstadoReproductivo.RECUPERACION, 'Recuperación', true, 49],
  ['1008', 'Hera', CategoriaAnimal.VACA, EstadoReproductivo.PRENADA, 'Producción', true, 51],
  ['2001', 'Iris', CategoriaAnimal.VAQUILLONA, EstadoReproductivo.VACIA, 'Ternera 2', true, 15],
  ['2002', 'Jazmin', CategoriaAnimal.VAQUILLONA, EstadoReproductivo.INSEMINADA, 'Ternera 2', true, 16],
  ['3001', 'Kira', CategoriaAnimal.TERNERA, EstadoReproductivo.NO_APLICA, 'Ternera 1', true, 10],
  ['3002', 'Luna', CategoriaAnimal.TERNERA, EstadoReproductivo.NO_APLICA, 'Escuelita', true, 6],
  ['4001', 'Mora', CategoriaAnimal.TERNERA, EstadoReproductivo.NO_APLICA, 'Guachera', true, 2],
  ['4002', 'Nina', CategoriaAnimal.TERNERO, EstadoReproductivo.NO_APLICA, 'Guachera', true, 2],
  ['5001', 'Olivia', CategoriaAnimal.TORITO, EstadoReproductivo.NO_APLICA, 'Toritos', true, 8],
  ['6001', 'Pampa', CategoriaAnimal.TORO, EstadoReproductivo.NO_APLICA, 'Toros', true, 24],
  ['9001', 'Salida historica', CategoriaAnimal.BAJA, EstadoReproductivo.NO_APLICA, 'Lote 003', false, 60],
] as const;

const raciones = [
  [CategoriaAnimal.GUACHERA, 'Dieta GUACHERA', 95],
  [CategoriaAnimal.ESCUELITA, 'Dieta ESCUELITA', 130],
  [CategoriaAnimal.TERNERA, 'Dieta TERNERA', 170],
  [CategoriaAnimal.VAQUILLONA, 'Dieta VAQUILLONA', 280],
  [CategoriaAnimal.VACA_PRODUCCION, 'Dieta VACA_PRODUCCION', 520],
  [CategoriaAnimal.VACA_SECA, 'Dieta VACA_SECA', 260],
  [CategoriaAnimal.PREPARTO, 'Dieta PREPARTO', 220],
] as const;

const clientes = [
  ['30-70000006-1', 'Alimentos del Litoral', 'Ruta 9 Km 321, Carcarana', '341-555-1006', 'ventas@litoral.com'],
  ['30-70000007-9', 'Lacteos San Martin', 'San Martin 1200, Casilda', '341-555-1007', 'admin@lacteossm.com'],
] as const;

const demoClienteCuitsAEliminar = [
  '30-70000001-1',
  '30-70000002-9',
  '30-70000003-7',
  '30-70000004-5',
  '30-70000005-3',
  '30-70000008-7',
] as const;

function daysFromToday(days: number, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function monthsFromToday(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  date.setHours(9, 0, 0, 0);
  return date;
}

function dateYearsAgo(years: number) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function atDateTime(value: Date, hour = 9) {
  const date = new Date(value);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function dateThisYear(monthIndex: number, day: number, hour = 9) {
  const now = new Date();
  return new Date(now.getFullYear(), monthIndex, day, hour, 0, 0, 0);
}

function dateYearsAgoInMonth(years: number, monthIndex: number, day: number, hour = 9) {
  const now = new Date();
  return new Date(now.getFullYear() - years, monthIndex, day, hour, 0, 0, 0);
}

async function seedUsers() {
  const [adminHash, empleadoHash] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('empleado123', 10),
  ]);

  await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {
      nombre: 'Administrador',
      passwordHash: adminHash,
      rol: RolUsuario.ADMIN,
      activo: true,
    },
    create: {
      nombre: 'Administrador',
      username: 'admin',
      passwordHash: adminHash,
      rol: RolUsuario.ADMIN,
      activo: true,
    },
  });

  await prisma.usuario.upsert({
    where: { username: 'empleado' },
    update: {
      nombre: 'Empleado',
      passwordHash: empleadoHash,
      rol: RolUsuario.EMPLEADO,
      activo: true,
    },
    create: {
      nombre: 'Empleado',
      username: 'empleado',
      passwordHash: empleadoHash,
      rol: RolUsuario.EMPLEADO,
      activo: true,
    },
  });
}

async function seedLotes() {
  for (const [nombre, descripcion, tipoFuncional] of physicalLotes) {
    await prisma.lote.upsert({
      where: { nombre },
      update: { activo: true, descripcion, tipoFuncional },
      create: { nombre, descripcion, tipoFuncional, activo: true },
    });
  }
}

async function seedAnimals() {
  const lotes = await prisma.lote.findMany();
  const loteByName = new Map(lotes.map((lote) => [lote.nombre, lote.id]));

  for (const [caravana, nombre, categoriaAnimal, estadoReproductivo, loteNombre, activo, edadMeses] of animals) {
    await prisma.animal.upsert({
      where: { caravana },
      update: {
        nombre,
        fechaNacimiento: monthsFromToday(-edadMeses),
        raza: 'Holando',
        categoriaAnimal,
        estadoReproductivo,
        estadoAnimal: activo ? EstadoAnimal.ACTIVO : EstadoAnimal.VENDIDO,
        activo,
        fechaBaja: activo ? null : daysFromToday(-45),
        observacionesBaja: activo ? null : `${SEED_PREFIX}: venta historica para reportes`,
        loteId: loteByName.get(loteNombre) ?? loteByName.get('Lote 001')!,
      },
      create: {
        caravana,
        nombre,
        fechaNacimiento: monthsFromToday(-edadMeses),
        raza: 'Holando',
        categoriaAnimal,
        estadoReproductivo,
        estadoAnimal: activo ? EstadoAnimal.ACTIVO : EstadoAnimal.VENDIDO,
        activo,
        fechaBaja: activo ? null : daysFromToday(-45),
        observacionesBaja: activo ? null : `${SEED_PREFIX}: venta historica para reportes`,
        loteId: loteByName.get(loteNombre) ?? loteByName.get('Lote 001')!,
      },
    });
  }
}

async function deleteSeededDemoData() {
  await prisma.ventaDetalle.deleteMany({
    where: {
      OR: [
        { venta: { numeroFactura: { startsWith: SEED_FACTURA_PREFIX } } },
        { loteLeche: { codigo: { startsWith: SEED_LOTE_LECHE_PREFIX } } },
      ],
    },
  });
  await prisma.venta.deleteMany({ where: { numeroFactura: { startsWith: SEED_FACTURA_PREFIX } } });
  await prisma.produccionAnimal.deleteMany({ where: { loteLeche: { codigo: { startsWith: SEED_LOTE_LECHE_PREFIX } } } });
  await prisma.loteLeche.deleteMany({ where: { codigo: { startsWith: SEED_LOTE_LECHE_PREFIX } } });
  await prisma.agendaTarea.deleteMany({ where: { descripcion: { startsWith: SEED_PREFIX } } });
  await prisma.evento.deleteMany({ where: { observaciones: { startsWith: SEED_PREFIX } } });
  await prisma.registroAlimentacion.deleteMany({ where: { observaciones: { startsWith: SEED_PREFIX } } });
  await prisma.movimientoStockAlimentacion.deleteMany({ where: { observaciones: { startsWith: SEED_PREFIX } } });
}

async function seedAlimentacion(usuarioId: number) {
  for (const [categoriaAnimal, nombre] of raciones) {
    await prisma.racion.upsert({
      where: { nombre },
      update: {
        categoriaAnimal,
        descripcion: `Racion base para ${categoriaAnimal}`,
        activa: true,
      },
      create: {
        nombre,
        categoriaAnimal,
        descripcion: `Racion base para ${categoriaAnimal}`,
        activa: true,
      },
    });
  }

  const insumos = [
    ['Silo de maiz', TipoAlimento.SILO, 'KG', 2500, 400],
    ['Balanceado 18%', TipoAlimento.BALANCEADO, 'KG', 900, 200],
    ['Rollo de alfalfa', TipoAlimento.FIBRA, 'ROLLO', 45, 10],
    ['Harina de soja', TipoAlimento.SUPLEMENTO, 'KG', 350, 120],
    ['Sales minerales', TipoAlimento.SALES, 'KG', 120, 30],
  ] as const;

  for (const [nombre, tipoAlimento, unidadMedida, stockActual, stockMinimo] of insumos) {
    const insumo = await prisma.insumoAlimentacion.upsert({
      where: { nombre },
      update: { tipoAlimento, unidadMedida, stockActual, stockMinimo, activo: true },
      create: { nombre, tipoAlimento, unidadMedida, stockActual, stockMinimo, activo: true },
    });

    await prisma.movimientoStockAlimentacion.createMany({
      data: [
        {
          insumoId: insumo.id,
          tipoMovimiento: TipoMovimientoStockAlimentacion.ENTRADA,
          fecha: daysFromToday(-10),
          cantidad: stockActual,
          observaciones: `${SEED_PREFIX}: ingreso inicial de ${nombre}`,
          usuarioId,
        },
        {
          insumoId: insumo.id,
          tipoMovimiento: TipoMovimientoStockAlimentacion.CONSUMO,
          fecha: daysFromToday(-2),
          cantidad: Math.max(10, Math.round(stockMinimo * 0.25)),
          observaciones: `${SEED_PREFIX}: consumo operativo de ${nombre}`,
          usuarioId,
        },
      ],
    });
  }

  const racionesByName = new Map((await prisma.racion.findMany()).map((racion) => [racion.nombre, racion.id]));
  for (const [categoriaAnimal, nombre, cantidadKg] of raciones) {
    const racionId = racionesByName.get(nombre);
    if (!racionId) continue;

    await prisma.registroAlimentacion.create({
      data: {
        fecha: daysFromToday(-1),
        categoriaAnimal,
        racionId,
        cantidadKg,
        observaciones: `${SEED_PREFIX}: entrega diaria para ${categoriaAnimal}`,
        usuarioId,
      },
    });
  }
}

async function seedReglasAlimentacion() {
  const alimentos = [
    ['Silo de Maiz', TipoAlimento.SILO, UnidadAlimento.KG, 5000, 400],
    ['Balanceado Lecheras', TipoAlimento.BALANCEADO, UnidadAlimento.KG, 2000, 250],
    ['Cascarilla de Soja', TipoAlimento.SUPLEMENTO, UnidadAlimento.KG, 1200, 150],
    ['Rollo de Alfalfa', TipoAlimento.FIBRA, UnidadAlimento.ROLLO, 60, 8],
    ['Balanceado Pre-Parto', TipoAlimento.BALANCEADO, UnidadAlimento.KG, 800, 120],
    ['Rollo de Avena o Moha', TipoAlimento.FIBRA, UnidadAlimento.ROLLO, 35, 6],
    ['Sales Anionicas', TipoAlimento.SALES, UnidadAlimento.KG, 180, 40],
    ['Cascarilla de Soja o Expeller de Soja', TipoAlimento.SUPLEMENTO, UnidadAlimento.KG, 600, 100],
    ['Balanceado Vaquillonas o Maiz Molido', TipoAlimento.BALANCEADO, UnidadAlimento.KG, 700, 100],
    ['Balanceado Terneros', TipoAlimento.BALANCEADO, UnidadAlimento.KG, 500, 80],
    ['Balanceado Iniciador', TipoAlimento.BALANCEADO, UnidadAlimento.KG, 250, 50],
  ] as const;

  for (const [nombre, tipoAlimento, unidadMedida, stockActual, stockMinimo] of alimentos) {
    await prisma.insumoAlimentacion.upsert({
      where: { nombre },
      update: { tipoAlimento, unidadMedida, stockActual, stockMinimo, activo: true },
      create: { nombre, tipoAlimento, unidadMedida, stockActual, stockMinimo, activo: true },
    });
  }

  const alimentoByName = new Map((await prisma.insumoAlimentacion.findMany()).map((alimento) => [alimento.nombre, alimento.id]));
  const reglasLegacy = [
    'Vacas lecheras - Silo de Maiz',
    'Vacas lecheras - Balanceado',
    'Vacas lecheras - Cascarilla',
    'Vacas lecheras - Rollos',
    'Vacas lecheras - Rollo de Alfalfa',
    'Preparto - Silo',
    'Preparto - Silo de Maiz',
    'Preparto - Balanceado',
    'Preparto - Rollos',
    'Preparto - Rollo de Avena',
    'Preparto - Sales',
    'Preparto - Sales Anionicas',
    'Vacas secas - Silo',
    'Vacas secas - Silo de Maiz',
    'Vacas secas - Rollos',
    'Vacas secas - Rollo de Avena',
    'Vacas secas - Cascarilla',
    'Vaquillonas - Silo',
    'Vaquillonas - Silo de Maiz',
    'Vaquillonas - Rollos',
    'Vaquillonas - Rollo de Alfalfa',
    'Vaquillonas - Cascarilla',
    'Vaquillonas - Cascarilla o Expeller',
    'Vaquillonas - Balanceado',
    'Vaquillonas - Balanceado o Maiz',
    'Escuelita - Balanceado',
    'Escuelita - Balanceado Terneros',
    'Escuelita - Cascarilla',
    'Escuelita - Rollo',
    'Escuelita - Rollo de Alfalfa',
    'Estaca - Balanceado',
    'Guachera - Balanceado Iniciador',
  ];
  await prisma.reglaAlimentacion.deleteMany({ where: { nombre: { in: reglasLegacy } } });

  const reglas = [
    {
      nombre: 'Vacas lecheras',
      categoriaAnimal: CategoriaAnimal.VACA_PRODUCCION,
      observaciones: 'Dieta base para vacas en produccion.',
      detalles: [
        ['Silo de Maiz', TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA, UnidadAlimento.KG, 15, 18, null, null, null, false, null],
        ['Balanceado Lecheras', TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA, UnidadAlimento.KG, 6, 7, null, null, null, false, null],
        ['Cascarilla de Soja', TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA, UnidadAlimento.KG, 2, 3, null, null, null, false, null],
        ['Rollo de Alfalfa', TipoCalculoAlimentacion.ROLLOS_POR_GRUPO_DURACION, UnidadAlimento.ROLLO, null, null, 50, 10, 4, false, null],
      ],
    },
    {
      nombre: 'Preparto',
      categoriaAnimal: CategoriaAnimal.PREPARTO,
      observaciones: 'Dieta de transicion preparto.',
      detalles: [
        ['Silo de Maiz', TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA, UnidadAlimento.KG, 8, 10, null, null, null, false, null],
        ['Balanceado Pre-Parto', TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA, UnidadAlimento.KG, 4, 5, null, null, null, false, null],
        ['Rollo de Avena o Moha', TipoCalculoAlimentacion.ROLLOS_POR_GRUPO_DURACION, UnidadAlimento.ROLLO, null, null, 10, 1, 7, false, null],
        ['Sales Anionicas', TipoCalculoAlimentacion.OBLIGATORIO_SIN_CANTIDAD, UnidadAlimento.KG, null, null, null, null, null, true, 'A discrecion del operario segun indicacion tecnica.'],
      ],
    },
    {
      nombre: 'Vacas secas',
      categoriaAnimal: CategoriaAnimal.VACA_SECA,
      observaciones: 'Dieta de mantenimiento para vacas secas.',
      detalles: [
        ['Silo de Maiz', TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA, UnidadAlimento.KG, 5, 5, null, null, null, false, null],
        ['Rollo de Avena o Moha', TipoCalculoAlimentacion.ROLLOS_POR_GRUPO_DURACION, UnidadAlimento.ROLLO, null, null, 10, 1, 7, false, null],
        ['Cascarilla de Soja', TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA, UnidadAlimento.KG, 1, 1.5, null, null, null, false, null],
      ],
    },
    {
      nombre: 'Vaquillonas',
      categoriaAnimal: CategoriaAnimal.VAQUILLONA,
      observaciones: 'Dieta para recria de vaquillonas.',
      detalles: [
        ['Silo de Maiz', TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA, UnidadAlimento.KG, 8, 10, null, null, null, false, null],
        ['Rollo de Alfalfa', TipoCalculoAlimentacion.ROLLOS_POR_GRUPO_DURACION, UnidadAlimento.ROLLO, null, null, 10, 1, 4, false, null],
        ['Cascarilla de Soja o Expeller de Soja', TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA, UnidadAlimento.KG, 1.5, 2, null, null, null, false, null],
        ['Balanceado Vaquillonas o Maiz Molido', TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA, UnidadAlimento.KG, 2, 2, null, null, null, false, null],
      ],
    },
    {
      nombre: 'Escuelita',
      categoriaAnimal: CategoriaAnimal.ESCUELITA,
      observaciones: 'Dieta para terneros en escuelita.',
      detalles: [
        ['Balanceado Terneros', TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA, UnidadAlimento.KG, 2.5, 3, null, null, null, false, null],
        ['Cascarilla de Soja', TipoCalculoAlimentacion.KG_POR_ANIMAL_DIA, UnidadAlimento.KG, 0.5, 0.5, null, null, null, false, null],
        ['Rollo de Alfalfa', TipoCalculoAlimentacion.ROLLOS_POR_GRUPO_DURACION, UnidadAlimento.ROLLO, null, null, 10, 1, 15, false, null],
      ],
    },
    {
      nombre: 'Estaca',
      categoriaAnimal: CategoriaAnimal.GUACHERA,
      observaciones: 'Dieta inicial progresiva.',
      detalles: [
        ['Balanceado Iniciador', TipoCalculoAlimentacion.OBLIGATORIO_SIN_CANTIDAD, UnidadAlimento.KG, null, null, null, null, null, true, 'A discrecion / progresivo.'],
      ],
    },
  ] as const;

  for (const regla of reglas) {
    const existing = await prisma.reglaAlimentacion.findUnique({
      where: { categoriaAnimal_nombre: { categoriaAnimal: regla.categoriaAnimal, nombre: regla.nombre } },
    });
    const data = {
      nombre: regla.nombre,
      categoriaAnimal: regla.categoriaAnimal,
      activo: true,
      observaciones: regla.observaciones,
      detalles: {
        create: regla.detalles.flatMap(([alimentoNombre, tipoCalculo, unidad, cantidadMinima, cantidadMaxima, animalesBase, rollosBase, duracionDias, obligatorio, observaciones]) => {
          const alimentoId = alimentoByName.get(alimentoNombre);
          if (!alimentoId) return [];
          return [{
            alimentoId,
            tipoCalculo,
            unidad,
            cantidadMinima,
            cantidadMaxima,
            animalesBase,
            rollosBase,
            duracionDias,
            obligatorio,
            observaciones,
          }];
        }),
      },
    };
    if (existing) {
      await prisma.detalleReglaAlimentacion.deleteMany({ where: { reglaAlimentacionId: existing.id } });
      await prisma.reglaAlimentacion.update({ where: { id: existing.id }, data });
    } else {
      await prisma.reglaAlimentacion.create({ data });
    }
  }
}

async function seedAgendaEventos(usuarioId: number) {
  const byCaravana = new Map((await prisma.animal.findMany()).map((animal) => [animal.caravana, animal]));

  const eventos = [
    ['1002', TipoEvento.INSEMINACION, -28, 'Inseminacion registrada para tacto pendiente'],
    ['1004', TipoEvento.CLINICO, -8, 'Control clinico por renguera leve'],
    ['1005', TipoEvento.TACTO, -40, 'Tacto positivo confirmado', { resultado: 'POSITIVO' }],
    ['1007', TipoEvento.PARTO, -18, 'Parto normal con cria viable'],
    ['9001', TipoEvento.VENTA, -45, 'Venta historica de animal inactivo'],
  ] as const;

  for (const [caravana, tipo, days, observaciones, datosJson] of eventos) {
    const animal = byCaravana.get(caravana);
    if (!animal) continue;

    await prisma.evento.create({
      data: {
        animalId: animal.id,
        usuarioId,
        tipo,
        fecha: daysFromToday(days),
        observaciones: `${SEED_PREFIX}: ${observaciones}`,
        datosJson: datosJson ? (datosJson as Prisma.InputJsonObject) : undefined,
      },
    });
  }

  const tareasGenerales = [
    ['1003', TipoTarea.TACTO, 7, EstadoTarea.PENDIENTE, 'Tacto por inseminacion reciente'],
    ['1005', TipoTarea.SECADO, 4, EstadoTarea.PENDIENTE, 'Secado previsto por gestacion avanzada'],
    ['1006', TipoTarea.PARTO, 12, EstadoTarea.PENDIENTE, 'Parto esperado en preparto'],
    ['1007', TipoTarea.ALTA_POST_PARTO, 18, EstadoTarea.PENDIENTE, 'Alta post parto y control productivo'],
    ['1004', TipoTarea.CONTROL_CLINICO, -1, EstadoTarea.PENDIENTE, 'Control clinico vencido'],
    ['1001', TipoTarea.PARTO, 0, EstadoTarea.PENDIENTE, 'Parto pendiente de hoy para validar estado'],
    ['1002', TipoTarea.TACTO, 0, EstadoTarea.PENDIENTE, 'Tacto pendiente de hoy para validar estado'],
    ['1008', TipoTarea.SECADO, -2, EstadoTarea.PENDIENTE, 'Secado vencido para validar estado'],
    ['1003', TipoTarea.PARTO, -4, EstadoTarea.REALIZADA, 'Parto realizado para validar estado'],
  ] as const;

  for (const [caravana, tipo, days, estado, descripcion] of tareasGenerales) {
    const animal = byCaravana.get(caravana);
    if (!animal) continue;

    await prisma.agendaTarea.create({
      data: {
        animalId: animal.id,
        tipo,
        fechaProgramada: daysFromToday(days),
        fechaRealizacion: estado === EstadoTarea.REALIZADA ? daysFromToday(days + 1) : null,
        estado,
        descripcion: `${SEED_PREFIX}: ${descripcion}`,
      },
    });
  }

}

async function seedReglasSanitarias() {
  const reglas = [
    ['Vacuna Aftosa', 'AFTOSA', TipoReglaSanitaria.VACUNA, PeriodicidadReglaSanitaria.FIJA_MARZO, 3, 12, 1, 'Campaña anual obligatoria de marzo.'],
    ['Vacuna Brucelosis', 'BRUCELOSIS', TipoReglaSanitaria.VACUNA, PeriodicidadReglaSanitaria.FIJA_MARZO, 3, 12, 1, 'Campaña anual obligatoria de marzo.'],
    ['Análisis de tuberculina', 'ANALISIS_TUBERCULINA', TipoReglaSanitaria.ANALISIS, PeriodicidadReglaSanitaria.DINAMICA_ANUAL, null, 12, 1, 'Control anual desde la última realización.'],
    ['Análisis de brucelosis', 'ANALISIS_BRUCELOSIS', TipoReglaSanitaria.ANALISIS, PeriodicidadReglaSanitaria.DINAMICA_ANUAL, null, 12, 1, 'Control anual desde la última realización.'],
  ] as const;
  const tiposFuncionales = [
    TipoFuncionalLote.GUACHERA,
    TipoFuncionalLote.ESCUELITA,
    TipoFuncionalLote.TERNERA_1,
    TipoFuncionalLote.TERNERA_2,
    TipoFuncionalLote.TORITOS,
    TipoFuncionalLote.TOROS,
    TipoFuncionalLote.PRODUCCION,
    TipoFuncionalLote.SECAS,
    TipoFuncionalLote.PREPARTO,
    TipoFuncionalLote.RECUPERACION,
  ];

  for (const [nombre, codigo, tipo, periodicidad, mesFijo, frecuenciaMeses, anticipacionMeses, observaciones] of reglas) {
    const regla = await prisma.reglaSanitaria.upsert({
      where: { codigo },
      update: { nombre, tipo, periodicidad, mesFijo, frecuenciaMeses, anticipacionMeses, activo: true, observaciones },
      create: { nombre, codigo, tipo, periodicidad, mesFijo, frecuenciaMeses, anticipacionMeses, activo: true, observaciones },
    });
    await prisma.reglaSanitariaTipoFuncional.createMany({
      data: tiposFuncionales.map((tipoFuncional) => ({ reglaSanitariaId: regla.id, tipoFuncional })),
      skipDuplicates: true,
    });
  }
}

async function seedVacunacionSanitaria(usuarioId: number) {
  await prisma.aplicacionSanitariaAnimal.deleteMany();
  await prisma.pendienteSanitario.deleteMany();
  await prisma.aplicacionSanitaria.deleteMany();
  await prisma.agendaTarea.deleteMany({
    where: {
      tipo: TipoTarea.VACUNACION,
      OR: [
        { descripcion: { startsWith: 'Seed sanitario' } },
        { descripcion: { startsWith: 'Tarea sanitaria automática' } },
      ],
    },
  });
  await prisma.evento.deleteMany({
    where: {
      tipo: TipoEvento.VACUNACION,
      observaciones: { startsWith: 'Seed sanitario' },
    },
  });

  const activeAnimals = await prisma.animal.findMany({
    where: { activo: true, estadoAnimal: EstadoAnimal.ACTIVO },
    orderBy: [{ lote: { nombre: 'asc' } }, { caravana: 'asc' }],
    include: { lote: true },
  });
  if (activeAnimals.length === 0) return;

  const reglas = await prisma.reglaSanitaria.findMany({
    where: { activo: true },
    include: { tiposFuncionales: true },
  });

  for (const regla of reglas) {
    for (const scope of regla.tiposFuncionales) {
      const year = new Date().getFullYear();
      const fechaMaxima = regla.periodicidad === PeriodicidadReglaSanitaria.FIJA_MARZO
        ? new Date(year, 2, 31, 9, 0, 0, 0)
        : monthsFromToday(6);

      await prisma.pendienteSanitario.create({
        data: {
          reglaSanitariaId: regla.id,
          tipoFuncional: scope.tipoFuncional,
          fechaMaxima,
          estado: EstadoPendienteSanitario.PENDIENTE,
        },
      }).catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null;
        throw error;
      });
    }
  }

  const reglaTuberculina = reglas.find((regla) => regla.codigo === 'ANALISIS_TUBERCULINA');
  if (reglaTuberculina) {
    const tipoFuncional = TipoFuncionalLote.TOROS;
    const animales = activeAnimals.filter((animal) => animal.lote.tipoFuncional === tipoFuncional);
    const lotes = Array.from(new Map(animales.map((animal) => [animal.lote.id, animal.lote])).values());
    if (animales.length > 0) {
      await prisma.aplicacionSanitaria.create({
        data: {
          reglaSanitariaId: reglaTuberculina.id,
          tipoFuncional,
          fechaRealizacion: monthsFromToday(-2),
          fechaMaximaCorrespondiente: monthsFromToday(-2),
          usuarioId,
          observaciones: `${SEED_PREFIX}: análisis anual realizado`,
          lotesSnapshot: lotes.map((lote) => ({
            id: lote.id,
            nombre: lote.nombre,
            tipoFuncional: lote.tipoFuncional,
            animales: animales
              .filter((animal) => animal.loteId === lote.id)
              .map((animal) => ({ id: animal.id, caravana: animal.caravana, categoriaAnimal: animal.categoriaAnimal })),
          })),
          animales: {
            create: animales.map((animal) => ({
              animalId: animal.id,
              caravanaSnapshot: animal.caravana,
              categoriaSnapshot: animal.categoriaAnimal,
              loteSnapshot: animal.lote.nombre,
              tipoFuncionalSnapshot: animal.lote.tipoFuncional,
            })),
          },
        },
      });
    }
  }
}

type ProduccionScenario = {
  codigo: string;
  fecha: Date;
  estado?: EstadoLoteLeche;
  registros: Array<{
    caravana: string;
    turno: TurnoOrdene;
    litrosProducidos: number;
    litrosDescartados: number;
    motivoDescarte: MotivoDescarteLeche | null;
  }>;
};

function buildProduccionScenarios(): ProduccionScenario[] {
  const relativeDays = [0, 0, 0, -1, -2, -3, -5, -10, -15, -20];
  const currentYearMonths = [0, 1, 2, 3, 4];
  const previousYearMonths = [1, 4, 7, 10];
  const historicMonths = [2, 8];
  const dates = [
    ...relativeDays.map((days, index) => daysFromToday(days, 6 + (index % 3))),
    ...currentYearMonths.map((month, index) => dateThisYear(month, 6 + index * 3, 7)),
    ...previousYearMonths.map((month, index) => dateYearsAgoInMonth(1, month, 8 + index * 4, 7)),
    ...historicMonths.map((month, index) => dateYearsAgoInMonth(2, month, 10 + index * 8, 7)),
  ];
  const caravanas = ['1001', '1002', '1003', '1004', '1007', '1008'];
  const turnos = [TurnoOrdene.MANANA, TurnoOrdene.TARDE, TurnoOrdene.NOCHE];
  const motivos = [null, MotivoDescarteLeche.MASTITIS, null, MotivoDescarteLeche.MALA_CALIDAD, null, MotivoDescarteLeche.ANTIBIOTICO, null, MotivoDescarteLeche.OTRO];

  return dates.map((fecha, index) => ({
    codigo: `${SEED_LOTE_LECHE_PREFIX}${String(index + 1).padStart(3, '0')}`,
    fecha,
    estado: index === 8 || index === 15 ? EstadoLoteLeche.VENCIDO : EstadoLoteLeche.DISPONIBLE,
    registros: [0, 1, 2].map((offset) => {
      const motivoDescarte = motivos[(index + offset) % motivos.length];
      return {
        caravana: caravanas[(index + offset) % caravanas.length],
        turno: turnos[offset % turnos.length],
        litrosProducidos: 18 + ((index + offset) % 7) * 1.7,
        litrosDescartados: motivoDescarte ? 0.8 + ((index + offset) % 3) * 0.4 : 0,
        motivoDescarte,
      };
    }),
  }));
}

async function seedProduccion(usuarioIds: number[]) {
  const users = usuarioIds.length > 0 ? usuarioIds : [(await prisma.usuario.findFirstOrThrow()).id];
  const scenarios = buildProduccionScenarios();

  for (const scenario of scenarios) {
    await prisma.loteLeche.create({
      data: {
        codigo: scenario.codigo,
        descripcion: `${SEED_PREFIX}: lote historico ${scenario.codigo}`,
        fechaProduccion: atDateTime(scenario.fecha, 6),
        fechaVencimiento: atDateTime(daysFromToday(0), 23),
        estado: scenario.estado ?? EstadoLoteLeche.DISPONIBLE,
        grasa: toDecimal(3.35 + (Number(scenario.codigo.slice(-1)) % 5) * 0.05),
        proteina: toDecimal(3.1 + (Number(scenario.codigo.slice(-1)) % 4) * 0.04),
        recuentoBacteriano: 32000 + Number(scenario.codigo.slice(-3)) * 350,
        recuentoCelulasSomaticas: 170000 + Number(scenario.codigo.slice(-3)) * 1200,
        temperatura: toDecimal(3.7),
        observacionesCalidad: `${SEED_PREFIX}: calidad para pruebas de reportes`,
      },
    });
  }

  const lotesByCode = new Map((await prisma.loteLeche.findMany()).map((lote) => [lote.codigo, lote.id]));
  const animalsByCaravana = new Map((await prisma.animal.findMany()).map((animal) => [animal.caravana, animal.id]));
  let registroIndex = 0;

  for (const scenario of scenarios) {
    const loteLecheId = lotesByCode.get(scenario.codigo);
    if (!loteLecheId) continue;

    for (const registro of scenario.registros) {
      const animalId = animalsByCaravana.get(registro.caravana);
      if (!animalId) continue;

      await prisma.produccionAnimal.create({
        data: {
          animalId,
          loteLecheId,
          usuarioId: users[registroIndex % users.length],
          fechaHora: atDateTime(scenario.fecha, registro.turno === TurnoOrdene.MANANA ? 6 : registro.turno === TurnoOrdene.TARDE ? 16 : 22),
          turno: registro.turno,
          litrosProducidos: toDecimal(registro.litrosProducidos),
          litrosDescartados: toDecimal(registro.litrosDescartados),
          motivoDescarte: registro.motivoDescarte,
          observacionDescarte: registro.motivoDescarte ? `${SEED_PREFIX}: descarte controlado para pruebas` : null,
        },
      });
      registroIndex += 1;
    }
  }

  for (const scenario of scenarios) {
    const loteLeche = await prisma.loteLeche.findUnique({ where: { codigo: scenario.codigo } });
    if (!loteLeche) continue;

    const totals = await prisma.produccionAnimal.aggregate({
      where: { loteLecheId: loteLeche.id },
      _sum: { litrosProducidos: true, litrosDescartados: true },
    });
    const litrosTotales = totals._sum.litrosProducidos ?? toDecimal(0);
    const litrosDescartados = totals._sum.litrosDescartados ?? toDecimal(0);

    await prisma.loteLeche.update({
      where: { id: loteLeche.id },
      data: {
        fechaVencimiento: atDateTime(new Date(loteLeche.fechaProduccion.getTime() + 8 * 24 * 60 * 60 * 1000), 23),
        litrosTotales,
        litrosDescartados,
        litrosNetos: litrosTotales.minus(litrosDescartados),
      },
    });
  }
}

async function seedClientes() {
  const fechasAlta = [
    daysFromToday(0, 10),
    daysFromToday(-2, 10),
    daysFromToday(-12, 10),
    dateThisYear(0, 12, 10),
    dateThisYear(2, 18, 10),
    dateThisYear(4, 20, 10),
    dateYearsAgoInMonth(1, 5, 14, 10),
    dateYearsAgoInMonth(1, 10, 7, 10),
  ];

  for (const [index, [cuit, razonSocial, direccion, telefono, email]] of clientes.entries()) {
    await prisma.cliente.upsert({
      where: { cuit },
      update: {
        razonSocial,
        direccion,
        telefono,
        email,
        fechaAlta: fechasAlta[index] ?? daysFromToday(-30),
        activo: true,
      },
      create: {
        cuit,
        razonSocial,
        direccion,
        telefono,
        email,
        fechaAlta: fechasAlta[index] ?? daysFromToday(-30),
        activo: true,
      },
    });
  }
}

async function deleteDemoClientesNoDeseados() {
  for (const cuit of demoClienteCuitsAEliminar) {
    const cliente = await prisma.cliente.findUnique({ where: { cuit }, select: { id: true } });
    if (!cliente) continue;

    await prisma.ventaDetalle.deleteMany({ where: { venta: { clienteId: cliente.id } } });
    await prisma.venta.deleteMany({ where: { clienteId: cliente.id } });
    await prisma.entregaLecheOrdene.deleteMany({ where: { entregaLeche: { clienteId: cliente.id } } });
    await prisma.entregaLeche.deleteMany({ where: { clienteId: cliente.id } });
    await prisma.liquidacionLeche.deleteMany({ where: { clienteId: cliente.id } });
    await prisma.cliente.delete({ where: { id: cliente.id } });
  }
}

async function seedVentas(usuarioId: number) {
  const clientesByCuit = new Map((await prisma.cliente.findMany()).map((cliente) => [cliente.cuit, cliente.id]));
  const lotesByCode = new Map((await prisma.loteLeche.findMany()).map((lote) => [lote.codigo, lote]));

  const fechasVenta = [
    daysFromToday(0, 9),
    daysFromToday(0, 11),
    daysFromToday(0, 13),
    daysFromToday(0, 15),
    daysFromToday(-1, 10),
    daysFromToday(-2, 10),
    daysFromToday(-3, 10),
    daysFromToday(-5, 10),
    daysFromToday(-10, 10),
    daysFromToday(-15, 10),
    daysFromToday(-20, 10),
    dateThisYear(0, 12, 10),
    dateThisYear(1, 14, 10),
    dateThisYear(2, 16, 10),
    dateThisYear(3, 18, 10),
    dateThisYear(4, 20, 10),
    dateYearsAgoInMonth(1, 0, 11, 10),
    dateYearsAgoInMonth(1, 3, 17, 10),
    dateYearsAgoInMonth(1, 6, 21, 10),
    dateYearsAgoInMonth(1, 9, 25, 10),
    dateYearsAgoInMonth(2, 2, 13, 10),
    dateYearsAgoInMonth(2, 8, 19, 10),
  ];
  const clienteCuits = clientes.map(([cuit]) => cuit);

  for (const [index, fechaVenta] of fechasVenta.entries()) {
    const clienteCuit = clienteCuits[index % clienteCuits.length];
    const numeroFactura = `${SEED_FACTURA_PREFIX}${String(index + 1).padStart(4, '0')}`;
    const loteCodigo = `${SEED_LOTE_LECHE_PREFIX}${String(index + 1).padStart(3, '0')}`;
    const precioPorLitroValue = 300 + (index % 8) * 12;
    const litrosVenta = 18 + (index % 6) * 3;
    const clienteId = clientesByCuit.get(clienteCuit);
    if (!clienteId) continue;

    const precioPorLitro = toDecimal(precioPorLitroValue);
    const detalles = [loteCodigo].flatMap((codigo) => {
      const lote = lotesByCode.get(codigo);
      if (!lote) return [];
      const litrosVendidos = toDecimal(Math.min(litrosVenta, Math.max(Number(lote.litrosNetos) - 2, 1)));
      return [{
        loteLecheId: lote.id,
        litrosVendidos,
        precioUnitario: precioPorLitro,
        subtotal: litrosVendidos.mul(precioPorLitro).toDecimalPlaces(2),
      }];
    });
    if (detalles.length === 0) continue;

    const totalLitros = detalles.reduce((total, detalle) => total.plus(detalle.litrosVendidos), toDecimal(0));
    const precioTotal = detalles.reduce((total, detalle) => total.plus(detalle.subtotal), toDecimal(0));

    await prisma.venta.create({
      data: {
        clienteId,
        numeroFactura,
        fechaVenta,
        precioPorLitro,
        totalLitros,
        precioTotal,
        observaciones: `${SEED_PREFIX}: venta de leche para reportes`,
        usuarioId,
        detalles: { create: detalles },
      },
    });

    const lote = lotesByCode.get(loteCodigo);
    if (lote && index % 9 === 0) {
      await prisma.loteLeche.update({
        where: { id: lote.id },
        data: { estado: EstadoLoteLeche.VENDIDO, fechaVenta },
      });
    }
  }
}

async function validateSeedCredentials() {
  const [admin, empleado] = await Promise.all([
    prisma.usuario.findUnique({ where: { username: 'admin' } }),
    prisma.usuario.findUnique({ where: { username: 'empleado' } }),
  ]);

  if (!admin || !admin.activo || admin.rol !== RolUsuario.ADMIN || !(await bcrypt.compare('admin123', admin.passwordHash))) {
    throw new Error('El seed no dejo funcional el usuario admin/admin123.');
  }

  if (!empleado || !empleado.activo || empleado.rol !== RolUsuario.EMPLEADO || !(await bcrypt.compare('empleado123', empleado.passwordHash))) {
    throw new Error('El seed no dejo funcional el usuario empleado/empleado123.');
  }
}

async function main() {
  await seedUsers();
  await seedLotes();
  await seedAnimals();
  await deleteSeededDemoData();
  await deleteDemoClientesNoDeseados();

  const [admin, empleado] = await Promise.all([
    prisma.usuario.findUniqueOrThrow({ where: { username: 'admin' } }),
    prisma.usuario.findUniqueOrThrow({ where: { username: 'empleado' } }),
  ]);

  await seedAlimentacion(admin.id);
  await seedReglasAlimentacion();
  await seedAgendaEventos(admin.id);
  await seedReglasSanitarias();
  await seedVacunacionSanitaria(admin.id);
  await seedProduccion([admin.id, empleado.id]);
  await seedClientes();
  await seedVentas(admin.id);
  await validateSeedCredentials();

  console.log('Seed completed: admin/admin123, empleado/empleado123 and demo data are ready.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
