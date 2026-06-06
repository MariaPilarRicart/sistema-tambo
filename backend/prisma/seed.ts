import 'dotenv/config';
import bcrypt from 'bcrypt';
import {
  CategoriaAnimal,
  EstadoAnimal,
  EstadoLoteLeche,
  EstadoReproductivo,
  EstadoTarea,
  MotivoDescarteLeche,
  Prisma,
  PrismaClient,
  RolUsuario,
  TipoEvento,
  TipoMovimientoStockAlimentacion,
  TipoReglaSanitaria,
  TipoTarea,
  TurnoOrdene,
} from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const SEED_PREFIX = 'Seed demo';
const SEED_FACTURAS = ['F-SEED-0001', 'F-SEED-0002', 'F-SEED-0003'];
const SEED_LOTES_LECHE = ['LT-SEED-001', 'LT-SEED-002', 'LT-SEED-003', 'LT-SEED-004', 'LT-SEED-005'];

const physicalLotes = [
  ['Lote 001', 'Vacas en produccion de alta rotacion'],
  ['Lote 002', 'Vacas en produccion de control'],
  ['Lote 003', 'Animales de baja o salida historica'],
  ['Corral Norte', 'Guachera y controles sanitarios'],
  ['Corral Sur', 'Preparto y recria inicial'],
  ['Potrero 1', 'Vaquillonas y reproductores'],
  ['Potrero 2', 'Terneras y escuelita'],
] as const;

const animals = [
  ['1001', 'Aurora', CategoriaAnimal.VACA_PRODUCCION, EstadoReproductivo.PRENADA, 'Lote 001', true],
  ['1002', 'Brisa', CategoriaAnimal.VACA_PRODUCCION, EstadoReproductivo.VACIA, 'Lote 001', true],
  ['1003', 'Clara', CategoriaAnimal.VACA_PRODUCCION, EstadoReproductivo.INSEMINADA, 'Lote 002', true],
  ['1004', 'Dalia', CategoriaAnimal.VACA_PRODUCCION, EstadoReproductivo.VACIA, 'Lote 002', true],
  ['1005', 'Estrella', CategoriaAnimal.VACA_SECA, EstadoReproductivo.PRENADA, 'Corral Norte', true],
  ['1006', 'Flora', CategoriaAnimal.PREPARTO, EstadoReproductivo.PRENADA, 'Corral Sur', true],
  ['1007', 'Gala', CategoriaAnimal.VACA_PRODUCCION, EstadoReproductivo.RECUPERACION, 'Lote 001', true],
  ['1008', 'Hera', CategoriaAnimal.VACA_PRODUCCION, EstadoReproductivo.PRENADA, 'Lote 002', true],
  ['2001', 'Iris', CategoriaAnimal.VAQUILLONA, EstadoReproductivo.VACIA, 'Potrero 1', true],
  ['2002', 'Jazmin', CategoriaAnimal.VAQUILLONA, EstadoReproductivo.INSEMINADA, 'Potrero 1', true],
  ['3001', 'Kira', CategoriaAnimal.TERNERA, EstadoReproductivo.NO_APLICA, 'Potrero 2', true],
  ['3002', 'Luna', CategoriaAnimal.TERNERA, EstadoReproductivo.NO_APLICA, 'Potrero 2', true],
  ['4001', 'Mora', CategoriaAnimal.GUACHERA, EstadoReproductivo.NO_APLICA, 'Corral Norte', true],
  ['4002', 'Nina', CategoriaAnimal.GUACHERA, EstadoReproductivo.NO_APLICA, 'Corral Norte', true],
  ['5001', 'Olivia', CategoriaAnimal.ESCUELITA, EstadoReproductivo.NO_APLICA, 'Corral Sur', true],
  ['6001', 'Pampa', CategoriaAnimal.TORO, EstadoReproductivo.NO_APLICA, 'Potrero 1', true],
  ['9001', 'Salida historica', CategoriaAnimal.BAJA, EstadoReproductivo.NO_APLICA, 'Lote 003', false],
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
  ['30-70000001-1', 'Lacteos Rosario SA', 'Av. Pellegrini 1234, Rosario', '341-555-1001', 'compras@lacteosrosario.com'],
  ['30-70000002-9', 'Cooperativa Lechera Sur', 'Ruta 18 Km 12, Perez', '341-555-1002', 'administracion@cooplsur.com'],
  ['30-70000003-7', 'Distribuidora La Granja', 'San Martin 847, Funes', '341-555-1003', 'ventas@lagranja.com'],
  ['30-70000004-5', 'Queseria Don Pedro', 'Belgrano 220, Roldan', '341-555-1004', 'pedidos@donpedro.com'],
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
  for (const [nombre, descripcion] of physicalLotes) {
    await prisma.lote.upsert({
      where: { nombre },
      update: { activo: true, descripcion },
      create: { nombre, descripcion, activo: true },
    });
  }
}

async function seedAnimals() {
  const lotes = await prisma.lote.findMany();
  const loteByName = new Map(lotes.map((lote) => [lote.nombre, lote.id]));

  for (const [caravana, nombre, categoriaAnimal, estadoReproductivo, loteNombre, activo] of animals) {
    await prisma.animal.upsert({
      where: { caravana },
      update: {
        nombre,
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
        fechaNacimiento: dateYearsAgo(
          categoriaAnimal === CategoriaAnimal.TERNERA || categoriaAnimal === CategoriaAnimal.GUACHERA ? 1 : 4,
        ),
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
        { venta: { numeroFactura: { in: SEED_FACTURAS } } },
        { loteLeche: { codigo: { in: SEED_LOTES_LECHE } } },
      ],
    },
  });
  await prisma.venta.deleteMany({ where: { numeroFactura: { in: SEED_FACTURAS } } });
  await prisma.produccionAnimal.deleteMany({ where: { loteLeche: { codigo: { in: SEED_LOTES_LECHE } } } });
  await prisma.loteLeche.deleteMany({ where: { codigo: { in: SEED_LOTES_LECHE } } });
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
    ['Silo de maiz', 'KG', 2500, 400],
    ['Balanceado 18%', 'KG', 900, 200],
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
  ] as const;

  for (const [caravana, tipo, days, estado, descripcion] of tareasGenerales) {
    const animal = byCaravana.get(caravana);
    if (!animal) continue;

    await prisma.agendaTarea.create({
      data: {
        animalId: animal.id,
        tipo,
        fechaProgramada: daysFromToday(days),
        estado,
        descripcion: `${SEED_PREFIX}: ${descripcion}`,
      },
    });
  }

  const vacunacionesPendientes = [
    ['1001', -9, 'Aftosa vencida'],
    ['1002', -7, 'Brucelosis vencida'],
    ['1003', -5, 'Clostridial vencida'],
    ['1004', -3, 'Carbunclo vencida'],
    ['1005', -1, 'IBR/BVD vencida'],
    ['1006', 5, 'Aftosa programada'],
    ['1007', 7, 'Brucelosis programada'],
    ['1008', 9, 'Clostridial programada'],
    ['2001', 11, 'Carbunclo programada'],
    ['2002', 13, 'IBR/BVD programada'],
  ] as const;

  for (const [caravana, days, descripcion] of vacunacionesPendientes) {
    const animal = byCaravana.get(caravana);
    if (!animal) continue;

    await prisma.agendaTarea.create({
      data: {
        animalId: animal.id,
        tipo: TipoTarea.VACUNACION,
        fechaProgramada: daysFromToday(days),
        estado: EstadoTarea.PENDIENTE,
        descripcion: `${SEED_PREFIX}: ${descripcion}`,
      },
    });
  }

  const vacunacionesRealizadas = [
    ['3001', -30, 'Aftosa realizada'],
    ['3002', -28, 'Brucelosis realizada'],
    ['4001', -25, 'Clostridial realizada'],
    ['4002', -22, 'Carbunclo realizada'],
    ['5001', -20, 'IBR/BVD realizada'],
  ] as const;

  for (const [caravana, days, observaciones] of vacunacionesRealizadas) {
    const animal = byCaravana.get(caravana);
    if (!animal) continue;

    await prisma.evento.create({
      data: {
        animalId: animal.id,
        usuarioId,
        tipo: TipoEvento.VACUNACION,
        fecha: daysFromToday(days),
        observaciones: `${SEED_PREFIX}: ${observaciones}`,
      },
    });
  }
}

async function seedReglasSanitarias() {
  const reglas = [
    ['Aftosa', 'AFTOSA', TipoReglaSanitaria.VACUNA, 3, 12, 1, 'Campaña anual de marzo.'],
    ['Brucelosis', 'BRUCELOSIS', TipoReglaSanitaria.VACUNA, 3, 12, 1, 'Campaña anual de marzo.'],
    ['Análisis de tuberculina', 'ANALISIS_TUBERCULINA', TipoReglaSanitaria.ANALISIS, null, 12, 1, 'Control anual desde la última realización.'],
    ['Análisis de brucelosis', 'ANALISIS_BRUCELOSIS', TipoReglaSanitaria.ANALISIS, null, 12, 1, 'Control anual desde la última realización.'],
  ] as const;

  for (const [nombre, codigo, tipo, mesFijo, frecuenciaMeses, anticipacionMeses, observaciones] of reglas) {
    await prisma.reglaSanitaria.upsert({
      where: { codigo },
      update: { nombre, tipo, mesFijo, frecuenciaMeses, anticipacionMeses, activo: true, observaciones },
      create: { nombre, codigo, tipo, mesFijo, frecuenciaMeses, anticipacionMeses, activo: true, observaciones },
    });
  }
}

type SeedSanitaryStatus = 'PENDIENTE' | 'VENCIDA' | 'REALIZADA' | 'PROGRAMADA';
type SeedSanitaryType = 'AFTOSA' | 'BRUCELOSIS' | 'ANALISIS_TUBERCULINA' | 'ANALISIS_BRUCELOSIS';
type SeedSanitaryScope = 'ANIMAL' | 'LOTE' | 'CATEGORIA';

async function seedVacunacionSanitaria(usuarioId: number) {
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
    orderBy: { id: 'asc' },
    include: { lote: true },
  });
  const lotes = await prisma.lote.findMany({ where: { activo: true }, orderBy: { id: 'asc' } });
  if (activeAnimals.length === 0) return;

  const targetByStatus: Record<SeedSanitaryStatus, Date[]> = {
    PENDIENTE: [daysFromToday(10), daysFromToday(12), daysFromToday(14), daysFromToday(16), daysFromToday(18)],
    VENCIDA: [daysFromToday(-15), daysFromToday(-45), monthsFromToday(-3), monthsFromToday(-8), monthsFromToday(-13)],
    REALIZADA: [daysFromToday(-7), daysFromToday(-30), monthsFromToday(-2), monthsFromToday(-6), monthsFromToday(-12)],
    PROGRAMADA: [daysFromToday(45), daysFromToday(60), monthsFromToday(3), monthsFromToday(6), monthsFromToday(8)],
  };
  const types: SeedSanitaryType[] = ['AFTOSA', 'BRUCELOSIS', 'ANALISIS_TUBERCULINA', 'ANALISIS_BRUCELOSIS'];
  const statuses: SeedSanitaryStatus[] = ['PENDIENTE', 'VENCIDA', 'REALIZADA'];
  const scopes: SeedSanitaryScope[] = ['ANIMAL', 'LOTE', 'CATEGORIA'];

  let cursor = 0;
  for (const status of statuses) {
    for (let index = 0; index < 5; index += 1) {
      const tipoSanitario = types[index % types.length];
      const scope = scopes[index % scopes.length];
      const grupoSanitarioId = randomUUID();
      const fechaObjetivo = targetByStatus[status][index];
      const fechaProgramada = status === 'PROGRAMADA' ? daysFromToday(20 + index) : monthsFromToday(-1);
      const categoria = activeAnimals[(cursor + index) % activeAnimals.length].categoriaAnimal;
      const lote = lotes[(cursor + index) % Math.max(lotes.length, 1)];
      const animalsForScope = [activeAnimals[(cursor + index) % activeAnimals.length]];
      const selectedAnimals = animalsForScope.length > 0 ? animalsForScope : [activeAnimals[(cursor + index) % activeAnimals.length]];
      const descripcion = `Seed sanitario ${status} ${tipoSanitario} ${index + 1}`;

      for (const animal of selectedAnimals) {
        let eventoCierreId: number | null = null;
        if (status === 'REALIZADA') {
          const evento = await prisma.evento.create({
            data: {
              animalId: animal.id,
              usuarioId,
              tipo: TipoEvento.VACUNACION,
              fecha: fechaProgramada,
              observaciones: descripcion,
              datosJson: { tipoSanitario },
            },
          });
          eventoCierreId = evento.id;
        }

        await prisma.agendaTarea.create({
          data: {
            animalId: animal.id,
            usuarioId,
            tipo: TipoTarea.VACUNACION,
            fechaProgramada,
            fechaObjetivo,
            fechaRealizacion: status === 'REALIZADA' ? fechaProgramada : null,
            estado: status === 'REALIZADA' ? 'REALIZADA' : 'PENDIENTE',
            descripcion,
            tipoSanitario,
            alcanceTipo: scope,
            alcanceLoteId: scope === 'LOTE' ? animal.loteId : null,
            alcanceCategoria: scope === 'CATEGORIA' ? categoria : null,
            grupoSanitarioId,
            cantidadAnimalesAlcanzados: selectedAnimals.length,
            eventoCierreId,
          },
        });
      }
      cursor += 1;
    }
  }
}

async function seedProduccion(usuarioId: number) {
  const lotesLeche = [
    ['LT-SEED-001', -3, 4, EstadoLoteLeche.DISPONIBLE, 'Lote disponible de alta calidad'],
    ['LT-SEED-002', -2, 5, EstadoLoteLeche.DISPONIBLE, 'Lote con descarte por mastitis'],
    ['LT-SEED-003', -1, 6, EstadoLoteLeche.DISPONIBLE, 'Lote disponible para venta parcial'],
    ['LT-SEED-004', -7, 1, EstadoLoteLeche.DISPONIBLE, 'Lote vendido para reportes'],
    ['LT-SEED-005', -12, -2, EstadoLoteLeche.VENCIDO, 'Lote vencido para filtros'],
  ] as const;

  for (const [codigo, prodOffset, vencOffset, estado, observacionesCalidad] of lotesLeche) {
    await prisma.loteLeche.create({
      data: {
        codigo,
        descripcion: `${SEED_PREFIX}: ${observacionesCalidad}`,
        fechaProduccion: daysFromToday(prodOffset, 6),
        fechaVencimiento: daysFromToday(vencOffset, 23),
        estado,
        grasa: toDecimal(3.45),
        proteina: toDecimal(3.18),
        recuentoBacteriano: 35000 + Math.abs(prodOffset) * 1000,
        recuentoCelulasSomaticas: 180000 + Math.abs(prodOffset) * 5000,
        temperatura: toDecimal(3.8),
        observacionesCalidad,
      },
    });
  }

  const lotesByCode = new Map((await prisma.loteLeche.findMany()).map((lote) => [lote.codigo, lote.id]));
  const animalsByCaravana = new Map((await prisma.animal.findMany()).map((animal) => [animal.caravana, animal.id]));
  const registros = [
    ['1001', 'LT-SEED-001', -3, TurnoOrdene.MANANA, 22.5, 0, null],
    ['1002', 'LT-SEED-001', -3, TurnoOrdene.TARDE, 18.2, 1.2, MotivoDescarteLeche.MALA_CALIDAD],
    ['1003', 'LT-SEED-002', -2, TurnoOrdene.MANANA, 20.4, 0, null],
    ['1004', 'LT-SEED-002', -2, TurnoOrdene.TARDE, 17.7, 0.8, MotivoDescarteLeche.MASTITIS],
    ['1007', 'LT-SEED-003', -1, TurnoOrdene.MANANA, 21.3, 0, null],
    ['1008', 'LT-SEED-003', -1, TurnoOrdene.TARDE, 19.8, 0, null],
    ['1001', 'LT-SEED-004', -7, TurnoOrdene.MANANA, 23.1, 0, null],
    ['1002', 'LT-SEED-004', -7, TurnoOrdene.TARDE, 18.9, 0, null],
    ['1003', 'LT-SEED-005', -12, TurnoOrdene.MANANA, 19.5, 1.5, MotivoDescarteLeche.TEMPERATURA_FUERA_DE_RANGO],
  ] as const;

  for (const [caravana, loteCodigo, days, turno, litrosProducidos, litrosDescartados, motivoDescarte] of registros) {
    const animalId = animalsByCaravana.get(caravana);
    const loteLecheId = lotesByCode.get(loteCodigo);
    if (!animalId || !loteLecheId) continue;

    await prisma.produccionAnimal.create({
      data: {
        animalId,
        loteLecheId,
        usuarioId,
        fechaHora: daysFromToday(days, turno === TurnoOrdene.MANANA ? 6 : 17),
        turno,
        litrosProducidos: toDecimal(litrosProducidos),
        litrosDescartados: toDecimal(litrosDescartados),
        motivoDescarte,
        observacionDescarte: motivoDescarte ? `${SEED_PREFIX}: descarte controlado` : null,
      },
    });
  }

  for (const codigo of SEED_LOTES_LECHE) {
    const loteLeche = await prisma.loteLeche.findUnique({ where: { codigo } });
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
        litrosTotales,
        litrosDescartados,
        litrosNetos: litrosTotales.minus(litrosDescartados),
      },
    });
  }
}

async function seedClientes() {
  for (const [cuit, razonSocial, direccion, telefono, email] of clientes) {
    await prisma.cliente.upsert({
      where: { cuit },
      update: {
        razonSocial,
        direccion,
        telefono,
        email,
        activo: true,
      },
      create: {
        cuit,
        razonSocial,
        direccion,
        telefono,
        email,
        activo: true,
      },
    });
  }
}

async function seedVentas(usuarioId: number) {
  const clientesByCuit = new Map((await prisma.cliente.findMany()).map((cliente) => [cliente.cuit, cliente.id]));
  const lotesByCode = new Map((await prisma.loteLeche.findMany()).map((lote) => [lote.codigo, lote]));

  const ventas = [
    ['30-70000001-1', 'F-SEED-0001', -6, 310, [['LT-SEED-004', 42]]],
    ['30-70000002-9', 'F-SEED-0002', -1, 315, [['LT-SEED-001', 20]]],
    ['30-70000003-7', 'F-SEED-0003', 0, 320, [['LT-SEED-003', 25]]],
  ] as const;

  for (const [clienteCuit, numeroFactura, days, precioPorLitroValue, detallesInput] of ventas) {
    const clienteId = clientesByCuit.get(clienteCuit);
    if (!clienteId) continue;

    const precioPorLitro = toDecimal(precioPorLitroValue);
    const detalles = detallesInput.flatMap(([codigo, litros]) => {
      const lote = lotesByCode.get(codigo);
      if (!lote) return [];
      const litrosVendidos = toDecimal(litros);
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
        fechaVenta: daysFromToday(days, 11),
        precioPorLitro,
        totalLitros,
        precioTotal,
        observaciones: `${SEED_PREFIX}: venta de leche para reportes`,
        usuarioId,
        detalles: { create: detalles },
      },
    });
  }

  const soldLote = await prisma.loteLeche.findUnique({ where: { codigo: 'LT-SEED-004' } });
  if (soldLote) {
    await prisma.loteLeche.update({
      where: { id: soldLote.id },
      data: { estado: EstadoLoteLeche.VENDIDO, fechaVenta: daysFromToday(-6, 11) },
    });
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

  const admin = await prisma.usuario.findUniqueOrThrow({ where: { username: 'admin' } });

  await seedAlimentacion(admin.id);
  await seedAgendaEventos(admin.id);
  await seedReglasSanitarias();
  await seedVacunacionSanitaria(admin.id);
  await seedProduccion(admin.id);
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
