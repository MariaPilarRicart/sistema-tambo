import { EstadoLoteLeche, MotivoDescarteLeche, Prisma, TurnoOrdene } from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  createLoteLeche,
  createOrdene,
  deactivateOrdene,
  deactivateLoteLeche,
  findAnimalesHabilitadosParaOrdene,
  findAnimalForProduccion,
  findLoteById,
  findLoteLecheById,
  findLoteLecheWithProducciones,
  findLotesLeche,
  findLotesLecheCodigos,
  findOrdeneById,
  findOrdeneByFechaTurno,
  findOrdenes,
  updateLoteLeche,
  updateOrdene,
  type OrdeneWithRelations,
  type OrdeneFilters,
  type ProduccionAnimalWithRelations,
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

function parseOrdeneDate(value: unknown) {
  if (typeof value !== 'string' || !value) throw new AppError('Fecha es obligatoria.', 400);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Fecha inválida.', 400);
  date.setHours(0, 0, 0, 0);
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

function summarizeOrdenes(ordenes: OrdeneWithRelations[]) {
  const litrosBuenos = ordenes.reduce((total, ordene) => total + toNumber(ordene.litrosBuenos), 0);
  const litrosDescartados = ordenes.reduce((total, ordene) => total + toNumber(ordene.litrosDescartados), 0);
  const totalIndividualCargado = ordenes.reduce(
    (total, ordene) => total + ordene.detalles.reduce((subtotal, detalle) => subtotal + toNumber(detalle.litros), 0),
    0,
  );

  return {
    totalLitrosProducidos: litrosBuenos,
    totalLitrosBuenos: litrosBuenos,
    totalLitrosDescartados: litrosDescartados,
    totalLitrosNetos: litrosBuenos + litrosDescartados,
    totalLitros: litrosBuenos + litrosDescartados,
    promedioPorOrdene: ordenes.length > 0 ? (litrosBuenos + litrosDescartados) / ordenes.length : 0,
    cantidadOrdenes: ordenes.length,
    cantidadRegistros: ordenes.length,
    cantidadAnimalesRegistrados: new Set(ordenes.flatMap((ordene) => ordene.detalles.map((detalle) => detalle.animalId))).size,
    totalIndividualCargado,
    alertaDescarte: litrosDescartados > 0,
  };
}

function produccionNeta(registro: Pick<ProduccionAnimalWithRelations, 'litrosProducidos' | 'litrosDescartados'>) {
  return toNumber(registro.litrosProducidos) - toNumber(registro.litrosDescartados);
}

function defaultFechaVencimiento(fechaProduccion: Date) {
  const fechaVencimiento = new Date(fechaProduccion);
  fechaVencimiento.setDate(fechaVencimiento.getDate() + 3);
  return fechaVencimiento;
}

function promedio(values: number[]) {
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function parseOrdeneFilters(input: Record<string, unknown>): OrdeneFilters {
  return {
    fechaDesde: parseDateFilter(input.fechaDesde),
    fechaHasta: parseDateFilter(input.fechaHasta, true),
    turno: parseTurno(input.turno),
    activo: true,
  };
}

function buildOrdeneEvolution(ordenes: OrdeneWithRelations[]) {
  const grouped = new Map<
    string,
    { fecha: string; litrosBuenos: number; litrosDescartados: number; litrosTotales: number; totalIndividualCargado: number; cantidadOrdenes: number }
  >();

  ordenes.forEach((ordene) => {
    const key = dateKey(ordene.fecha);
    const current = grouped.get(key) ?? {
      fecha: key,
      litrosBuenos: 0,
      litrosDescartados: 0,
      litrosTotales: 0,
      totalIndividualCargado: 0,
      cantidadOrdenes: 0,
    };
    const litrosBuenos = toNumber(ordene.litrosBuenos);
    const litrosDescartados = toNumber(ordene.litrosDescartados);
    current.litrosBuenos += litrosBuenos;
    current.litrosDescartados += litrosDescartados;
    current.litrosTotales += litrosBuenos + litrosDescartados;
    current.totalIndividualCargado += ordene.detalles.reduce((total, detalle) => total + toNumber(detalle.litros), 0);
    current.cantidadOrdenes += 1;
    grouped.set(key, current);
  });

  return Array.from(grouped.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function parseOrdeneDetails(input: unknown) {
  if (input === undefined || input === null || input === '') return [];
  if (!Array.isArray(input)) throw new AppError('El detalle por animal debe ser una lista.', 400);

  const usedAnimalIds = new Set<number>();
  return input
    .filter((detalle) => detalle && typeof detalle === 'object')
    .map((detalle) => {
      const values = detalle as Record<string, unknown>;
      const animalId = parseId(values.animalId, 'animalId');
      if (usedAnimalIds.has(animalId)) throw new AppError('No se puede repetir el mismo animal en el detalle del ordeñe.', 400);
      usedAnimalIds.add(animalId);

      return {
        animalId,
        litros: parseDecimal(values.litros, 'Litros por animal', { required: true, min: 0 })!,
        observaciones: normalizeOptionalString(values.observaciones, 'Observaciones del detalle'),
      };
    });
}

async function validateOrdeneDetails(detalles: Array<{ animalId: number; litros: Prisma.Decimal; observaciones?: string | null }>) {
  if (detalles.length === 0) return;

  const habilitados = await findAnimalesHabilitadosParaOrdene();
  const habilitadosIds = new Set(habilitados.map((animal) => animal.id));
  const invalidDetail = detalles.find((detalle) => !habilitadosIds.has(detalle.animalId));
  if (invalidDetail) {
    throw new AppError('El detalle solo puede incluir vacas activas en lotes de Producción o Recuperación.', 400);
  }
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
  return { registros: await findOrdenes(parseOrdeneFilters(query)) };
}

export async function createNewProduccion(input: Record<string, unknown>, usuarioId?: number) {
  if (!usuarioId) throw new AppError('Usuario no autenticado.', 401);

  const fecha = parseOrdeneDate(input.fecha ?? input.fechaHora);
  const turno = parseRequiredTurno(input.turno);
  const litrosBuenos = parseDecimal(input.litrosBuenos ?? input.litrosProducidos, 'Litros buenos', { required: true, min: 0 })!;
  const litrosDescartados = parseDecimal(input.litrosDescartados ?? 0, 'Litros descartados', { min: 0 }) ?? new Prisma.Decimal(0);

  const existing = await findOrdeneByFechaTurno(fecha, turno);
  if (existing) throw new AppError('Ya existe un ordeñe para esa fecha y turno.', 409);

  try {
    return await createOrdene({
      fecha,
      turno,
      litrosBuenos,
      litrosDescartados,
      observaciones: normalizeOptionalString(input.observaciones, 'Observaciones'),
      usuarioId,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Ya existe un ordeñe para esa fecha y turno.', 409);
    }
    throw error;
  }
}

export async function updateExistingProduccion(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'Id de producción');
  const existingOrdene = await findOrdeneById(id);
  if (!existingOrdene) throw new AppError('Registro de producción no encontrado.', 404);
  if (!existingOrdene.activo) throw new AppError('No se puede editar un ordeñe inactivo.', 400);

  const fecha = parseOrdeneDate(input.fecha ?? input.fechaHora);
  const turno = parseRequiredTurno(input.turno);
  const litrosBuenos = parseDecimal(input.litrosBuenos ?? input.litrosProducidos, 'Litros buenos', { required: true, min: 0 })!;
  const litrosDescartados = parseDecimal(input.litrosDescartados ?? 0, 'Litros descartados', { min: 0 }) ?? new Prisma.Decimal(0);

  const duplicateOrdene = await findOrdeneByFechaTurno(fecha, turno);
  if (duplicateOrdene && duplicateOrdene.id !== id) {
    throw new AppError('Ya existe un ordeñe para esa fecha y turno.', 409);
  }

  try {
    return await updateOrdene(id, {
      fecha,
      turno,
      litrosBuenos,
      litrosDescartados,
      observaciones: normalizeOptionalString(input.observaciones, 'Observaciones'),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Ya existe un ordeñe para esa fecha y turno.', 409);
    }
    throw error;
  }
}

export async function deleteExistingProduccion(idParam: string) {
  const id = parseId(idParam, 'Id de producción');
  const existing = await findOrdeneById(id);
  if (!existing) throw new AppError('Registro de producción no encontrado.', 404);
  if (!existing.activo) return existing;
  return deactivateOrdene(id);
}

export async function getResumenProduccion() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(todayStart);
  const registrosHoy = await findOrdenes({ fechaDesde: todayStart, fechaHasta: todayEnd, activo: true });
  return {
    ...summarizeOrdenes(registrosHoy),
    evolucionDiaria: buildOrdeneEvolution(registrosHoy),
  };
}

export async function getProduccionPorAnimal(idParam: string) {
  const animalId = parseId(idParam, 'animalId');
  const animal = await findAnimalForProduccion(animalId);
  if (!animal) throw new AppError('Animal no encontrado.', 404);

  const ordenes = await findOrdenes({ activo: true });
  const historial = ordenes.filter((ordene) => ordene.detalles.some((detalle) => detalle.animalId === animalId));
  const detalles = historial.flatMap((ordene) =>
    ordene.detalles.filter((detalle) => detalle.animalId === animalId).map((detalle) => ({ ordene, detalle })),
  );
  const litrosTotales = detalles.reduce((total, item) => total + toNumber(item.detalle.litros), 0);
  const orderedByLitros = [...detalles].sort((a, b) => toNumber(a.detalle.litros) - toNumber(b.detalle.litros));

  return {
    animal,
    litrosTotalesProducidos: litrosTotales,
    litrosTotales,
    litrosDescartados: 0,
    litrosNetos: litrosTotales,
    promedioPorOrdene: detalles.length > 0 ? litrosTotales / detalles.length : 0,
    cantidadOrdenes: detalles.length,
    mejorRegistro: orderedByLitros.at(-1)?.ordene ?? null,
    peorRegistro: orderedByLitros[0]?.ordene ?? null,
    grasaPromedio: 0,
    proteinaPromedio: 0,
    recuentoBacterianoPromedio: 0,
    recuentoCelulasSomaticasPromedio: 0,
    temperaturaPromedio: 0,
    historial,
    evolucion: buildOrdeneEvolution(historial),
  };
}

export async function getProduccionPorLote(idParam: string) {
  const loteId = parseId(idParam, 'loteId');
  const lote = await findLoteById(loteId);
  if (!lote) throw new AppError('Lote no encontrado.', 404);

  const ordenes = await findOrdenes({ activo: true });
  const porAnimal = new Map<number, { animal: OrdeneWithRelations['detalles'][number]['animal']; total: number; descartado: number; registros: number }>();

  ordenes.forEach((ordene) => {
    ordene.detalles
      .filter((detalle) => detalle.animal.loteId === loteId)
      .forEach((detalle) => {
        const current = porAnimal.get(detalle.animalId) ?? { animal: detalle.animal, total: 0, descartado: 0, registros: 0 };
        current.total += toNumber(detalle.litros);
        current.registros += 1;
        porAnimal.set(detalle.animalId, current);
      });
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
  const litrosTotales = rankingAnimales.reduce((total, item) => total + item.litrosTotales, 0);
  const ordenesDelLote = ordenes.filter((ordene) => ordene.detalles.some((detalle) => detalle.animal.loteId === loteId));

  return {
    lote,
    litrosTotalesProducidos: litrosTotales,
    litrosTotales,
    litrosDescartados: 0,
    litrosNetos: litrosTotales,
    promedioPorAnimal: rankingAnimales.length > 0 ? litrosTotales / rankingAnimales.length : 0,
    cantidadAnimalesConProduccion: rankingAnimales.length,
    cantidadOrdenes: ordenesDelLote.length,
    rankingAnimales,
    animalesBajoRendimiento: rankingAnimales.filter((item) => promedioRanking > 0 && item.litrosNetos < promedioRanking * 0.7),
    grasaPromedio: 0,
    proteinaPromedio: 0,
    recuentoBacterianoPromedio: 0,
    recuentoCelulasSomaticasPromedio: 0,
    temperaturaPromedio: 0,
    evolucionDiaria: buildOrdeneEvolution(ordenesDelLote),
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
