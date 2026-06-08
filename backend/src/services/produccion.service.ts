import { EstadoLoteLeche, MotivoDescarteLeche, Prisma, TurnoOrdene } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  createLoteLeche,
  createProduccionAnimal,
  deactivateLoteLeche,
  deactivateProduccionAnimal,
  findAnimalForProduccion,
  findLoteById,
  findLoteLecheById,
  findLoteLecheWithProducciones,
  findLotesLeche,
  findLotesLecheCodigos,
  findProduccionAnimalById,
  findProduccionesAnimales,
  findProduccionesAnimalesAsc,
  updateLoteLeche,
  type ProduccionAnimalWithRelations,
  type ProduccionFilters,
} from '../repositories/produccion.repository';

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${fieldName} inválido.`, 400);
  return parsed;
}

function parseOptionalId(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return undefined;
  return parseId(value, fieldName);
}

function parseDateTime(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value) throw new AppError(`${fieldName} es obligatorio.`, 400);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${fieldName} inválido.`, 400);
  return date;
}

function parseDateFilter(value: unknown, endOfDay = false) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new AppError('Fecha de filtro inválida.', 400);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Fecha de filtro inválida.', 400);
  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date;
}

function parseTurno(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (value !== TurnoOrdene.MANANA && value !== TurnoOrdene.TARDE && value !== TurnoOrdene.NOCHE) {
    throw new AppError('Turno inválido.', 400);
  }
  return value;
}

function parseOptionalNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new AppError(`${fieldName} inválido.`, 400);
  return parsed;
}

function parseRequiredTurno(value: unknown) {
  const turno = parseTurno(value);
  if (!turno) throw new AppError('Turno es obligatorio.', 400);
  return turno;
}

function parseEstadoLoteLeche(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (
    value !== EstadoLoteLeche.DISPONIBLE &&
    value !== EstadoLoteLeche.VENDIDO &&
    value !== EstadoLoteLeche.VENCIDO &&
    value !== EstadoLoteLeche.INACTIVO
  ) {
    throw new AppError('Estado del lote de leche inválido.', 400);
  }
  return value;
}

function parseMotivoDescarte(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const validValues: string[] = [
    MotivoDescarteLeche.MASTITIS,
    MotivoDescarteLeche.ANTIBIOTICO,
    MotivoDescarteLeche.ANTIBIOTICOS,
    MotivoDescarteLeche.CALOSTRO,
    MotivoDescarteLeche.MALA_CALIDAD,
    MotivoDescarteLeche.CONTAMINACION,
    MotivoDescarteLeche.PROBLEMA_SANITARIO,
    MotivoDescarteLeche.TEMPERATURA_FUERA_DE_RANGO,
    MotivoDescarteLeche.OTRO,
  ];
  if (typeof value !== 'string' || !validValues.includes(value)) throw new AppError('Motivo de descarte inválido.', 400);
  return value as MotivoDescarteLeche;
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
  if (!Number.isInteger(parsed) || parsed < 0) throw new AppError(`${fieldName} debe ser un número entero mayor o igual a 0.`, 400);
  return parsed;
}

function normalizeOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${fieldName} inválido.`, 400);
  return value.trim() || null;
}

function normalizeRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(`${fieldName} es obligatorio.`, 400);
  return value.trim();
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

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0);
}

function defaultFechaVencimiento(fechaProduccion: Date) {
  const fechaVencimiento = new Date(fechaProduccion);
  fechaVencimiento.setDate(fechaVencimiento.getDate() + 3);
  return fechaVencimiento;
}

function produccionNeta(registro: Pick<ProduccionAnimalWithRelations, 'litrosProducidos' | 'litrosDescartados'>) {
  return toNumber(registro.litrosProducidos) - toNumber(registro.litrosDescartados);
}

function promedio(values: number[]) {
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function buildDailyEvolution(registros: ProduccionAnimalWithRelations[]) {
  const grouped = new Map<string, { fecha: string; litrosNetos: number; litrosProducidos: number; litrosDescartados: number }>();

  registros.forEach((registro) => {
    const key = dateKey(registro.fechaHora);
    const current = grouped.get(key) ?? { fecha: key, litrosNetos: 0, litrosProducidos: 0, litrosDescartados: 0 };
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

function qualityFromLotes(registros: ProduccionAnimalWithRelations[]) {
  const lotes = Array.from(new Map(registros.map((registro) => [registro.loteLeche.id, registro.loteLeche])).values());
  return {
    grasaPromedio: promedio(lotes.map((lote) => toNumber(lote.grasa)).filter((value) => value > 0)),
    proteinaPromedio: promedio(lotes.map((lote) => toNumber(lote.proteina)).filter((value) => value > 0)),
    recuentoBacterianoPromedio: promedio(lotes.map((lote) => lote.recuentoBacteriano ?? 0).filter((value) => value > 0)),
    recuentoCelulasSomaticasPromedio: promedio(lotes.map((lote) => lote.recuentoCelulasSomaticas ?? 0).filter((value) => value > 0)),
    temperaturaPromedio: promedio(lotes.map((lote) => toNumber(lote.temperatura)).filter((value) => value > 0)),
  };
}

function parseFilters(input: Record<string, unknown>): ProduccionFilters {
  return {
    fechaDesde: parseDateFilter(input.fechaDesde),
    fechaHasta: parseDateFilter(input.fechaHasta, true),
    animalId: parseOptionalId(input.animalId, 'animalId'),
    loteId: parseOptionalId(input.loteId, 'loteId'),
    loteLecheId: parseOptionalId(input.loteLecheId, 'loteLecheId'),
    turno: parseTurno(input.turno),
    descartadosMayorA: parseOptionalNumber(input.descartadosMayorA, 'descartadosMayorA'),
  };
}

export async function listLotesLeche() {
  const lotesLeche = await findLotesLeche();
  return {
    lotesLeche: lotesLeche.map((loteLeche) => {
      const litrosVendidos = loteLeche.ventaDetalles.reduce((total, detalle) => total + toNumber(detalle.litrosVendidos), 0);
      return {
        ...loteLeche,
        litrosVendidos,
        litrosDisponibles: Math.max(toNumber(loteLeche.litrosNetos) - litrosVendidos, 0),
      };
    }),
  };
}

export async function getSiguienteCodigoLoteLeche() {
  const lotes = await findLotesLecheCodigos();
  const max = lotes.reduce((currentMax, lote) => {
    const match = /^LT-(\d+)$/.exec(lote.codigo);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);

  return { codigo: `LT-${String(max + 1).padStart(4, '0')}` };
}

export async function createNewLoteLeche(input: Record<string, unknown>) {
  const codigo = normalizeRequiredString(input.codigo, 'Código');
  const fechaProduccion = new Date();
  const fechaVencimiento = defaultFechaVencimiento(fechaProduccion);

  try {
    return await createLoteLeche({
      codigo,
      descripcion: normalizeOptionalString(input.descripcion, 'Descripción'),
      fechaProduccion,
      fechaVencimiento,
      estado: EstadoLoteLeche.DISPONIBLE,
      litrosTotales: 0,
      litrosDescartados: 0,
      litrosNetos: 0,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Ya existe un lote de leche con ese código.', 409);
    }
    throw error;
  }
}

export async function updateExistingLoteLeche(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'Id de lote de leche');
  const existing = await findLoteLecheById(id);
  if (!existing) throw new AppError('Lote de leche no encontrado.', 404);

  const fechaVencimiento =
    input.fechaVencimiento !== undefined ? parseDateTime(input.fechaVencimiento, 'Fecha de vencimiento') : existing.fechaVencimiento;
  if (fechaVencimiento < existing.fechaProduccion) {
    throw new AppError('La fecha de vencimiento no puede ser anterior a la fecha de producción.', 400);
  }

  const litrosDescartados =
    input.litrosDescartados !== undefined
      ? parseDecimal(input.litrosDescartados, 'Litros descartados', { min: 0 }) ?? new Prisma.Decimal(0)
      : existing.litrosDescartados;
  if (litrosDescartados.gt(existing.litrosTotales)) {
    throw new AppError('Litros descartados no puede superar litros totales.', 400);
  }

  const motivoDescarte = input.motivoDescarte !== undefined ? parseMotivoDescarte(input.motivoDescarte) : undefined;
  const finalMotivoDescarte = input.motivoDescarte !== undefined ? motivoDescarte : existing.motivoDescarte;
  if (litrosDescartados.gt(0) && !finalMotivoDescarte) {
    throw new AppError('Motivo de descarte es obligatorio si hay litros descartados.', 400);
  }

  return updateLoteLeche(id, {
    descripcion: input.descripcion !== undefined ? normalizeOptionalString(input.descripcion, 'Descripción') : undefined,
    fechaVencimiento: input.fechaVencimiento !== undefined ? fechaVencimiento : undefined,
    fechaVenta: input.fechaVenta !== undefined ? (input.fechaVenta ? parseDateTime(input.fechaVenta, 'Fecha de venta') : null) : undefined,
    estado: parseEstadoLoteLeche(input.estado),
    litrosDescartados: input.litrosDescartados !== undefined ? litrosDescartados : undefined,
    litrosNetos: input.litrosDescartados !== undefined ? new Prisma.Decimal(existing.litrosTotales).minus(litrosDescartados) : undefined,
    motivoDescarte,
    observacionDescarte:
      input.observacionDescarte !== undefined ? normalizeOptionalString(input.observacionDescarte, 'Observación de descarte') : undefined,
    grasa: input.grasa !== undefined ? parseDecimal(input.grasa, 'Grasa', { min: 0 }) : undefined,
    proteina: input.proteina !== undefined ? parseDecimal(input.proteina, 'Proteína', { min: 0 }) : undefined,
    recuentoBacteriano: input.recuentoBacteriano !== undefined ? parseOptionalInt(input.recuentoBacteriano, 'Recuento bacteriano') : undefined,
    recuentoCelulasSomaticas:
      input.recuentoCelulasSomaticas !== undefined ? parseOptionalInt(input.recuentoCelulasSomaticas, 'Recuento de células somáticas') : undefined,
    temperatura: input.temperatura !== undefined ? parseDecimal(input.temperatura, 'Temperatura', { min: 0 }) : undefined,
    observacionesCalidad:
      input.observacionesCalidad !== undefined ? normalizeOptionalString(input.observacionesCalidad, 'Observaciones de calidad') : undefined,
  });
}

export async function deleteExistingLoteLeche(idParam: string) {
  const id = parseId(idParam, 'Id de lote de leche');
  const existing = await findLoteLecheById(id);
  if (!existing) throw new AppError('Lote de leche no encontrado.', 404);
  if (existing.estado === EstadoLoteLeche.INACTIVO) return existing;
  return deactivateLoteLeche(id);
}

export async function listProducciones(query: Record<string, unknown>) {
  return { registros: await findProduccionesAnimales(parseFilters(query)) };
}

export async function createNewProduccion(input: Record<string, unknown>, usuarioId?: number) {
  if (!usuarioId) throw new AppError('Usuario no autenticado.', 401);

  const animalId = parseId(input.animalId, 'animalId');
  const loteLecheId = parseId(input.loteLecheId, 'loteLecheId');
  const fechaHora = parseDateTime(input.fechaHora, 'Fecha y hora del ordeñe');
  const turno = parseRequiredTurno(input.turno);
  const litrosProducidos = parseDecimal(input.litrosProducidos, 'Litros producidos', { required: true, min: 0 })!;
  const litrosDescartados = parseDecimal(input.litrosDescartados ?? 0, 'Litros descartados', { min: 0 }) ?? new Prisma.Decimal(0);
  const motivoDescarte = parseMotivoDescarte(input.motivoDescarte);

  if (litrosDescartados.gt(litrosProducidos)) throw new AppError('Litros descartados no puede superar litros producidos.', 400);
  if (litrosDescartados.gt(0) && !motivoDescarte) throw new AppError('Motivo de descarte es obligatorio si hay litros descartados.', 400);

  const [animal, loteLeche] = await Promise.all([findAnimalForProduccion(animalId), findLoteLecheById(loteLecheId)]);
  if (!animal) throw new AppError('Animal no encontrado.', 404);
  if (!animal.activo || animal.estadoAnimal !== 'ACTIVO') throw new AppError('Solo se puede cargar producción a animales activos.', 400);
  if (animal.categoriaAnimal !== 'VACA_PRODUCCION') throw new AppError('Solo se puede cargar ordeñe a animales en categoría VACA_PRODUCCION.', 400);
  if (!loteLeche) throw new AppError('Lote de leche no encontrado.', 404);
  if (loteLeche.estado !== EstadoLoteLeche.DISPONIBLE) throw new AppError('El lote de leche debe estar disponible.', 400);

  try {
    return await createProduccionAnimal({
      animalId,
      loteLecheId,
      usuarioId,
      fechaHora,
      turno,
      litrosProducidos,
      litrosDescartados,
      motivoDescarte,
      observacionDescarte: normalizeOptionalString(input.observacionDescarte, 'Observación de descarte'),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Ya existe un registro para ese animal, fecha y hora y turno.', 409);
    }
    throw error;
  }
}

export async function deleteExistingProduccion(idParam: string) {
  const id = parseId(idParam, 'Id de producción');
  const existing = await findProduccionAnimalById(id);
  if (!existing) throw new AppError('Registro de producción no encontrado.', 404);
  if (!existing.activo) return existing;
  return deactivateProduccionAnimal(id);
}

export async function getResumenProduccion() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(todayStart);
  const registrosHoy = await findProduccionesAnimales({ fechaDesde: todayStart, fechaHasta: todayEnd, activo: true });
  return {
    ...summarizeRecords(registrosHoy),
    alertaDescarte: registrosHoy.some((item) => toNumber(item.litrosDescartados) > 0),
    evolucionDiaria: buildDailyEvolution(registrosHoy),
  };
}

export async function getProduccionPorAnimal(idParam: string) {
  const animalId = parseId(idParam, 'animalId');
  const animal = await findAnimalForProduccion(animalId);
  if (!animal) throw new AppError('Animal no encontrado.', 404);

  const historial = await findProduccionesAnimalesAsc({ animalId, activo: true });
  const resumen = summarizeRecords(historial);
  const quality = qualityFromLotes(historial);
  const orderedByNet = [...historial].sort((a, b) => produccionNeta(a) - produccionNeta(b));

  return {
    animal,
    litrosTotalesProducidos: resumen.totalLitrosProducidos,
    litrosTotales: resumen.totalLitrosProducidos,
    litrosDescartados: resumen.totalLitrosDescartados,
    litrosNetos: resumen.totalLitrosNetos,
    promedioPorOrdene: historial.length > 0 ? resumen.totalLitrosNetos / historial.length : 0,
    cantidadOrdenes: historial.length,
    mejorRegistro: orderedByNet.at(-1) ?? null,
    peorRegistro: orderedByNet[0] ?? null,
    grasaPromedio: quality.grasaPromedio,
    proteinaPromedio: quality.proteinaPromedio,
    recuentoBacterianoPromedio: quality.recuentoBacterianoPromedio,
    recuentoCelulasSomaticasPromedio: quality.recuentoCelulasSomaticasPromedio,
    temperaturaPromedio: quality.temperaturaPromedio,
    historial,
    evolucion: buildDailyEvolution(historial),
  };
}

export async function getProduccionPorLote(idParam: string) {
  const loteId = parseId(idParam, 'loteId');
  const lote = await findLoteById(loteId);
  if (!lote) throw new AppError('Lote no encontrado.', 404);

  const registros = await findProduccionesAnimalesAsc({ loteId, activo: true });
  const resumen = summarizeRecords(registros);
  const quality = qualityFromLotes(registros);
  const porAnimal = new Map<number, { animal: ProduccionAnimalWithRelations['animal']; total: number; descartado: number; registros: number }>();

  registros.forEach((registro) => {
    const current = porAnimal.get(registro.animalId) ?? { animal: registro.animal, total: 0, descartado: 0, registros: 0 };
    current.total += toNumber(registro.litrosProducidos);
    current.descartado += toNumber(registro.litrosDescartados);
    current.registros += 1;
    porAnimal.set(registro.animalId, current);
  });

  const rankingAnimales = Array.from(porAnimal.values())
    .map((item) => ({
      animal: item.animal,
      litrosTotales: item.total,
      litrosDescartados: item.descartado,
      litrosNetos: item.total - item.descartado,
      promedioPorOrdene: item.registros > 0 ? (item.total - item.descartado) / item.registros : 0,
    }))
    .sort((a, b) => b.litrosNetos - a.litrosNetos);
  const promedioRanking = promedio(rankingAnimales.map((item) => item.litrosNetos));

  return {
    lote,
    litrosTotalesProducidos: resumen.totalLitrosProducidos,
    litrosTotales: resumen.totalLitrosProducidos,
    litrosDescartados: resumen.totalLitrosDescartados,
    litrosNetos: resumen.totalLitrosNetos,
    promedioPorAnimal: resumen.promedioPorAnimal,
    cantidadAnimalesConProduccion: resumen.cantidadAnimalesRegistrados,
    cantidadOrdenes: resumen.cantidadRegistros,
    rankingAnimales,
    animalesBajoRendimiento: rankingAnimales.filter((item) => promedioRanking > 0 && item.litrosNetos < promedioRanking * 0.7),
    grasaPromedio: quality.grasaPromedio,
    proteinaPromedio: quality.proteinaPromedio,
    recuentoBacterianoPromedio: quality.recuentoBacterianoPromedio,
    recuentoCelulasSomaticasPromedio: quality.recuentoCelulasSomaticasPromedio,
    temperaturaPromedio: quality.temperaturaPromedio,
    evolucionDiaria: buildDailyEvolution(registros),
  };
}

export async function getProduccionPorLoteLeche(idParam: string) {
  const loteLecheId = parseId(idParam, 'loteLecheId');
  const loteLeche = await findLoteLecheWithProducciones(loteLecheId);
  if (!loteLeche) throw new AppError('Lote de leche no encontrado.', 404);

  const litrosPorAnimal = new Map<
    number,
    { animal: ProduccionAnimalWithRelations['animal']; litrosTotales: number; litrosDescartados: number; litrosNetos: number }
  >();
  loteLeche.producciones.forEach((registro) => {
    const current = litrosPorAnimal.get(registro.animalId) ?? {
      animal: registro.animal,
      litrosTotales: 0,
      litrosDescartados: 0,
      litrosNetos: 0,
    };
    current.litrosTotales += toNumber(registro.litrosProducidos);
    current.litrosDescartados += toNumber(registro.litrosDescartados);
    current.litrosNetos += produccionNeta(registro);
    litrosPorAnimal.set(registro.animalId, current);
  });
  const sortedLitrosPorAnimal = Array.from(litrosPorAnimal.values()).sort((a, b) => b.litrosNetos - a.litrosNetos);
  const litrosVendidos = loteLeche.ventaDetalles.reduce((total, detalle) => total + toNumber(detalle.litrosVendidos), 0);

  return {
    loteLeche,
    produccionesAsociadas: loteLeche.producciones,
    ventasAsociadas: loteLeche.ventaDetalles.map((detalle) => detalle.venta),
    clientesCompradores: Array.from(new Map(loteLeche.ventaDetalles.map((detalle) => [detalle.venta.cliente.id, detalle.venta.cliente])).values()),
    facturasRelacionadas: Array.from(new Set(loteLeche.ventaDetalles.map((detalle) => detalle.venta.numeroFactura))),
    animales: sortedLitrosPorAnimal,
    litrosPorAnimal: sortedLitrosPorAnimal,
    calidad: {
      grasa: loteLeche.grasa,
      proteina: loteLeche.proteina,
      temperatura: loteLeche.temperatura,
      recuentoBacteriano: loteLeche.recuentoBacteriano,
      recuentoCelulasSomaticas: loteLeche.recuentoCelulasSomaticas,
      observacionesCalidad: loteLeche.observacionesCalidad,
    },
    litrosTotales: toNumber(loteLeche.litrosTotales),
    litrosDescartados: toNumber(loteLeche.litrosDescartados),
    litrosNetos: toNumber(loteLeche.litrosNetos),
    litrosVendidos,
    litrosDisponibles: Math.max(toNumber(loteLeche.litrosNetos) - litrosVendidos, 0),
  };
}
