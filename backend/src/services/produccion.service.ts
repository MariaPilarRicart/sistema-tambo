import { MotivoDescarteLeche, Prisma, TurnoOrdene } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  createProduccionAnimal,
  deleteProduccionAnimal,
  findAnimalForProduccion,
  findAnimalesProductivos,
  findLoteById,
  findProduccionAnimalById,
  findProduccionesAnimales,
  findProduccionesAnimalesAsc,
  type ProduccionAnimalWithRelations,
  type ProduccionFilters,
} from '../repositories/produccion.repository';

const QUALITY_LIMITS = {
  temperaturaMaxima: 4,
  grasaMinima: 2.8,
  proteinaMinima: 2.8,
  celulasSomaticasMaximas: 400000,
  bacteriasMaximas: 100000,
};

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${fieldName} inválido.`, 400);
  return parsed;
}

function parseOptionalId(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return undefined;
  return parseId(value, fieldName);
}

function parseDateTime(value: unknown) {
  if (typeof value !== 'string' || !value) throw new AppError('Fecha y hora del ordeñe es obligatoria.', 400);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Fecha y hora del ordeñe inválida.', 400);
  return date;
}

function parseDateFilter(value: unknown, endOfDay = false) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new AppError('Fecha de filtro inválida.', 400);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Fecha de filtro inválida.', 400);
  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseTurno(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (value !== TurnoOrdene.MANANA && value !== TurnoOrdene.TARDE && value !== TurnoOrdene.NOCHE) {
    throw new AppError('Turno inválido.', 400);
  }
  return value;
}

function parseRequiredTurno(value: unknown) {
  const turno = parseTurno(value);
  if (!turno) throw new AppError('Turno es obligatorio.', 400);
  return turno;
}

function parseMotivoDescarte(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  if (
    value !== MotivoDescarteLeche.MASTITIS &&
    value !== MotivoDescarteLeche.ANTIBIOTICO &&
    value !== MotivoDescarteLeche.CALOSTRO &&
    value !== MotivoDescarteLeche.MALA_CALIDAD &&
    value !== MotivoDescarteLeche.CONTAMINACION &&
    value !== MotivoDescarteLeche.OTRO
  ) {
    throw new AppError('Motivo de descarte inválido.', 400);
  }
  return value;
}

function parseDecimal(value: unknown, fieldName: string, options: { required?: boolean; min?: number } = {}) {
  if (value === undefined || value === null || value === '') {
    if (options.required) throw new AppError(`${fieldName} es obligatorio.`, 400);
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new AppError(`${fieldName} inválido.`, 400);
  if (options.min !== undefined && parsed < options.min) {
    throw new AppError(`${fieldName} debe ser mayor o igual a ${options.min}.`, 400);
  }

  return new Prisma.Decimal(parsed);
}

function parseOptionalInt(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError(`${fieldName} debe ser un número entero mayor o igual a 0.`, 400);
  }
  return parsed;
}

function normalizeOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${fieldName} inválida.`, 400);
  return value.trim() || null;
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0);
}

function produccionNeta(registro: Pick<ProduccionAnimalWithRelations, 'litrosProducidos' | 'litrosDescartados'>) {
  return toNumber(registro.litrosProducidos) - toNumber(registro.litrosDescartados);
}

function isProductionLote(nombre: string) {
  const normalized = nombre.trim().toLocaleLowerCase('es-AR');
  return normalized === 'produccion' || normalized === 'producción' || normalized === 'lecheras';
}

function canRegisterAnimal(animal: Awaited<ReturnType<typeof findAnimalForProduccion>>) {
  return Boolean(
    animal &&
      animal.activo &&
      animal.estadoAnimal === 'ACTIVO' &&
      (animal.categoria === 'VACA' || isProductionLote(animal.lote.nombre)),
  );
}

function getQualityWarnings(record: {
  temperaturaTanque?: Prisma.Decimal | number | string | null;
  grasa?: Prisma.Decimal | number | string | null;
  proteina?: Prisma.Decimal | number | string | null;
  recuentoCelulasSomaticas?: number | null;
  recuentoBacteriano?: number | null;
}) {
  const warnings: string[] = [];
  if (record.temperaturaTanque !== null && record.temperaturaTanque !== undefined && toNumber(record.temperaturaTanque) > QUALITY_LIMITS.temperaturaMaxima) {
    warnings.push('Temperatura del tanque alta');
  }
  if (record.grasa !== null && record.grasa !== undefined && toNumber(record.grasa) < QUALITY_LIMITS.grasaMinima) {
    warnings.push('Grasa baja');
  }
  if (record.proteina !== null && record.proteina !== undefined && toNumber(record.proteina) < QUALITY_LIMITS.proteinaMinima) {
    warnings.push('Proteína baja');
  }
  if ((record.recuentoCelulasSomaticas ?? 0) > QUALITY_LIMITS.celulasSomaticasMaximas) {
    warnings.push('Recuento de células somáticas alto');
  }
  if ((record.recuentoBacteriano ?? 0) > QUALITY_LIMITS.bacteriasMaximas) {
    warnings.push('Recuento bacteriano alto');
  }
  return warnings;
}

function buildDailyEvolution(registros: ProduccionAnimalWithRelations[]) {
  const grouped = new Map<string, { fecha: string; litrosNetos: number; litrosProducidos: number; litrosDescartados: number }>();

  registros.forEach((registro) => {
    const key = dateKey(registro.fecha);
    const current = grouped.get(key) ?? {
      fecha: key,
      litrosNetos: 0,
      litrosProducidos: 0,
      litrosDescartados: 0,
    };
    current.litrosNetos += produccionNeta(registro);
    current.litrosProducidos += toNumber(registro.litrosProducidos);
    current.litrosDescartados += toNumber(registro.litrosDescartados);
    grouped.set(key, current);
  });

  return Array.from(grouped.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function summarizeRecords(registros: ProduccionAnimalWithRelations[]) {
  const totalLitrosProducidos = registros.reduce((total, item) => total + toNumber(item.litrosProducidos), 0);
  const totalLitrosDescartados = registros.reduce((total, item) => total + toNumber(item.litrosDescartados), 0);
  const totalLitrosNetos = totalLitrosProducidos - totalLitrosDescartados;
  const animales = new Set(registros.map((item) => item.animalId));

  return {
    totalLitrosProducidos,
    totalLitrosDescartados,
    totalLitrosNetos,
    promedioPorAnimal: animales.size > 0 ? totalLitrosNetos / animales.size : 0,
    cantidadAnimalesRegistrados: animales.size,
    cantidadRegistros: registros.length,
  };
}

function parseFilters(input: Record<string, unknown>): ProduccionFilters {
  return {
    fechaDesde: parseDateFilter(input.fechaDesde),
    fechaHasta: parseDateFilter(input.fechaHasta, true),
    animalId: parseOptionalId(input.animalId, 'animalId'),
    loteId: parseOptionalId(input.loteId, 'loteId'),
    turno: parseTurno(input.turno),
  };
}

async function getAlertasBajoRendimiento() {
  const registros = await findProduccionesAnimalesAsc({});
  const byLote = new Map<number, Map<number, ProduccionAnimalWithRelations[]>>();

  registros.forEach((registro) => {
    const loteId = registro.animal.loteId;
    const loteMap = byLote.get(loteId) ?? new Map<number, ProduccionAnimalWithRelations[]>();
    const animalRecords = loteMap.get(registro.animalId) ?? [];
    animalRecords.push(registro);
    loteMap.set(registro.animalId, animalRecords);
    byLote.set(loteId, loteMap);
  });

  const alertas: Array<{ animalId: number; caravana: string; loteId: number; loteNombre: string; mensaje: string }> = [];

  byLote.forEach((animalMap, loteId) => {
    const loteRecords = Array.from(animalMap.values()).flat();
    const promedioLote =
      loteRecords.length > 0
        ? loteRecords.reduce((total, item) => total + produccionNeta(item), 0) / loteRecords.length
        : 0;

    if (promedioLote <= 0) return;

    animalMap.forEach((animalRecords) => {
      const lastThree = animalRecords.slice(-3);
      if (lastThree.length < 3) return;

      const bajo = lastThree.every((item) => produccionNeta(item) < promedioLote * 0.7);
      if (!bajo) return;

      const animal = lastThree[0].animal;
      alertas.push({
        animalId: animal.id,
        caravana: animal.caravana,
        loteId,
        loteNombre: animal.lote.nombre,
        mensaje: `La vaca #${animal.caravana} viene rindiendo por debajo del promedio del lote`,
      });
    });
  });

  return alertas;
}

async function getAlertasFaltantesDeHoy() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(todayStart);
  const [animalesProductivos, registrosHoy] = await Promise.all([
    findAnimalesProductivos(),
    findProduccionesAnimales({ fechaDesde: todayStart, fechaHasta: todayEnd }),
  ]);
  const animalesConRegistro = new Set(registrosHoy.map((registro) => registro.animalId));

  return animalesProductivos
    .filter((animal) => !animalesConRegistro.has(animal.id))
    .map((animal) => ({
      animalId: animal.id,
      caravana: animal.caravana,
      loteId: animal.loteId,
      loteNombre: animal.lote.nombre,
      mensaje: `Falta cargar producción para la vaca #${animal.caravana}`,
    }));
}

export async function listProducciones(query: Record<string, unknown>) {
  const filters = parseFilters(query);
  return {
    registros: await findProduccionesAnimales(filters),
  };
}

export async function createNewProduccion(input: Record<string, unknown>, usuarioId?: number) {
  const animalId = parseId(input.animalId, 'animalId');
  const fechaHora = parseDateTime(input.fechaHora);
  const fecha = startOfDay(fechaHora);
  const turno = parseRequiredTurno(input.turno);
  const litrosProducidos = parseDecimal(input.litrosProducidos, 'Litros producidos', { required: true, min: 0 })!;
  const litrosDescartados = parseDecimal(input.litrosDescartados ?? 0, 'Litros descartados', { min: 0 }) ?? new Prisma.Decimal(0);
  const motivoDescarte = parseMotivoDescarte(input.motivoDescarte);

  if (litrosDescartados.gt(litrosProducidos)) {
    throw new AppError('Litros descartados no puede ser mayor a litros producidos.', 400);
  }

  if (litrosDescartados.gt(0) && !motivoDescarte) {
    throw new AppError('Motivo de descarte es obligatorio si hay litros descartados.', 400);
  }

  const animal = await findAnimalForProduccion(animalId);
  if (!animal) throw new AppError('Animal no encontrado.', 404);
  if (!canRegisterAnimal(animal)) {
    throw new AppError('Solo se puede cargar producción a vacas activas o animales del lote Producción/Lecheras.', 400);
  }

  try {
    return await createProduccionAnimal({
      animalId,
      fechaHora,
      fecha,
      turno,
      litrosProducidos,
      litrosDescartados,
      motivoDescarte,
      observacionDescarte: normalizeOptionalString(input.observacionDescarte, 'Observación de descarte'),
      temperaturaTanque: parseDecimal(input.temperaturaTanque, 'Temperatura del tanque', { min: 0 }),
      grasa: parseDecimal(input.grasa, 'Grasa', { min: 0 }),
      proteina: parseDecimal(input.proteina, 'Proteína', { min: 0 }),
      recuentoCelulasSomaticas: parseOptionalInt(input.recuentoCelulasSomaticas, 'Recuento de células somáticas'),
      recuentoBacteriano: parseOptionalInt(input.recuentoBacteriano, 'Recuento bacteriano'),
      observacionesCalidad: normalizeOptionalString(input.observacionesCalidad, 'Observaciones de calidad'),
      usuarioId: usuarioId ?? null,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Ya existe un registro para ese animal, fecha y turno.', 409);
    }
    throw error;
  }
}

export async function deleteExistingProduccion(idParam: string) {
  const id = parseId(idParam, 'Id de producción');
  const existing = await findProduccionAnimalById(id);
  if (!existing) throw new AppError('Registro de producción no encontrado.', 404);
  return deleteProduccionAnimal(id);
}

export async function getResumenProduccion() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(todayStart);
  const registrosHoy = await findProduccionesAnimales({ fechaDesde: todayStart, fechaHasta: todayEnd });
  const resumen = summarizeRecords(registrosHoy);
  const [alertasBajoRendimiento, alertasFaltantes] = await Promise.all([
    getAlertasBajoRendimiento(),
    getAlertasFaltantesDeHoy(),
  ]);
  const alertasCalidad = registrosHoy.flatMap((item) => getQualityWarnings(item));

  return {
    ...resumen,
    alertasBajoRendimiento,
    alertasFaltantes,
    alertaDescarte: registrosHoy.some((item) => toNumber(item.litrosDescartados) > 0),
    alertasCalidad: Array.from(new Set(alertasCalidad)),
    evolucionDiaria: buildDailyEvolution(registrosHoy),
  };
}

export async function getProduccionPorAnimal(idParam: string) {
  const animalId = parseId(idParam, 'animalId');
  const animal = await findAnimalForProduccion(animalId);
  if (!animal) throw new AppError('Animal no encontrado.', 404);

  const historial = await findProduccionesAnimalesAsc({ animalId });
  const resumen = summarizeRecords(historial);
  const dias = new Set(historial.map((item) => dateKey(item.fecha)));
  const recordsWithNet = historial.map((registro) => ({ registro, neta: produccionNeta(registro) }));
  const mejor = recordsWithNet.reduce((best, item) => (!best || item.neta > best.neta ? item : best), null as null | typeof recordsWithNet[number]);
  const peor = recordsWithNet.reduce((worst, item) => (!worst || item.neta < worst.neta ? item : worst), null as null | typeof recordsWithNet[number]);
  const alertasBajoRendimiento = (await getAlertasBajoRendimiento()).filter((alerta) => alerta.animalId === animalId);

  return {
    animal,
    historial,
    totalProducido: resumen.totalLitrosNetos,
    promedioDiario: dias.size > 0 ? resumen.totalLitrosNetos / dias.size : 0,
    promedioPorOrdene: historial.length > 0 ? resumen.totalLitrosNetos / historial.length : 0,
    mejorRegistro: mejor?.registro ?? null,
    peorRegistro: peor?.registro ?? null,
    litrosDescartadosTotales: resumen.totalLitrosDescartados,
    evolucion: buildDailyEvolution(historial),
    bajoRendimiento: alertasBajoRendimiento.length > 0,
  };
}

export async function getProduccionPorLote(idParam: string) {
  const loteId = parseId(idParam, 'loteId');
  const lote = await findLoteById(loteId);
  if (!lote) throw new AppError('Lote no encontrado.', 404);

  const registros = await findProduccionesAnimalesAsc({ loteId });
  const resumen = summarizeRecords(registros);
  const porAnimal = new Map<number, { animal: ProduccionAnimalWithRelations['animal']; total: number; registros: number }>();

  registros.forEach((registro) => {
    const current = porAnimal.get(registro.animalId) ?? {
      animal: registro.animal,
      total: 0,
      registros: 0,
    };
    current.total += produccionNeta(registro);
    current.registros += 1;
    porAnimal.set(registro.animalId, current);
  });

  const rankingAnimales = Array.from(porAnimal.values())
    .map((item) => ({
      animal: item.animal,
      totalProducido: item.total,
      promedioPorOrdene: item.registros > 0 ? item.total / item.registros : 0,
    }))
    .sort((a, b) => b.totalProducido - a.totalProducido);

  const alertasBajoRendimiento = (await getAlertasBajoRendimiento()).filter((alerta) => alerta.loteId === loteId);

  return {
    lote,
    totalProducido: resumen.totalLitrosNetos,
    promedioPorAnimal: resumen.promedioPorAnimal,
    rankingAnimales,
    animalesBajoRendimiento: alertasBajoRendimiento,
    evolucionDiaria: buildDailyEvolution(registros),
  };
}
