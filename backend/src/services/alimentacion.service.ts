import {
  CategoriaAnimal,
  Prisma,
  TipoAlimento,
  TipoCalculoAlimentacion,
  TipoMovimientoStockAlimentacion,
  UnidadAlimento,
} from '@prisma/client';
import { AppError } from '../errors/AppError';
import {
  countLotesAlimentadosHoy,
  countRegistrosHoy,
  createAlimento,
  createMovimientoStockManual,
  createReglaAlimentacion,
  createRegistroAlimentacionTransaccional,
  findActiveRulesByCategoria,
  findAlimentoById,
  findAlimentoByNombre,
  findAlimentosAlimentacion,
  findHistorialAlimentacion,
  findLoteWithAnimales,
  findMovimientosStockAlimentacion,
  findReglaAlimentacionById,
  findReglasAlimentacion,
  updateAlimentoWithMovimiento,
  updateReglaAlimentacion,
} from '../repositories/alimentacion.repository';

type Query = Record<string, unknown>;

type RuleDetailInput = {
  alimentoId: number;
  tipoCalculo: TipoCalculoAlimentacion;
  unidad: UnidadAlimento;
  cantidadMinima: number | null;
  cantidadMaxima: number | null;
  animalesBase: number | null;
  rollosBase: number | null;
  duracionDias: number | null;
  obligatorio: boolean;
  observaciones: string | null;
};

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${fieldName} invalido.`, 400);
  return parsed;
}

function parseOptionalId(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return undefined;
  return parseId(value, fieldName);
}

function parseDate(value: unknown, fieldName = 'Fecha') {
  if (typeof value !== 'string' || !value) throw new AppError(`${fieldName} es obligatoria.`, 400);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${fieldName} invalida.`, 400);
  return date;
}

function parseOptionalDate(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return undefined;
  return parseDate(value, fieldName);
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function todayRange() {
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  return { desde, hasta: endOfDay(desde) };
}

function normalizeOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${fieldName} invalido.`, 400);
  return value.trim() || null;
}

function parsePositiveNumber(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new AppError(`${fieldName} debe ser mayor a 0.`, 400);
  return parsed;
}

function parseNonNegativeNumber(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new AppError(`${fieldName} debe ser mayor o igual a 0.`, 400);
  return parsed;
}

function parseOptionalPositiveNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;
  return parsePositiveNumber(value, fieldName);
}

function parseOptionalNonNegativeNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;
  return parseNonNegativeNumber(value, fieldName);
}

function parseEnum<T extends string>(value: unknown, values: readonly T[], fieldName: string): T {
  if (values.includes(value as T)) return value as T;
  throw new AppError(`${fieldName} invalido.`, 400);
}

function parseCategoriaAnimal(value: unknown) {
  return parseEnum(value, Object.values(CategoriaAnimal), 'Categoria');
}

function parseTipoAlimento(value: unknown) {
  return parseEnum(value, Object.values(TipoAlimento), 'Tipo de alimento');
}

function parseUnidad(value: unknown) {
  return parseEnum(value, Object.values(UnidadAlimento), 'Unidad');
}

function parseTipoCalculo(value: unknown) {
  return parseEnum(value, Object.values(TipoCalculoAlimentacion), 'Tipo de calculo');
}

function parseTipoMovimiento(value: unknown) {
  const tipo = parseEnum(value, Object.values(TipoMovimientoStockAlimentacion), 'Tipo de movimiento');
  if (tipo !== 'ENTRADA' && tipo !== 'BAJA') {
    throw new AppError('Solo se permiten movimientos manuales ENTRADA o BAJA.', 400);
  }
  return tipo;
}

function getStockEstado(alimento: { stockActual: number; stockMinimo: number }) {
  if (alimento.stockActual <= 0) return 'AGOTADO';
  if (alimento.stockActual <= alimento.stockMinimo) return 'BAJO';
  return 'NORMAL';
}

function getPredominantCategoria(animales: Array<{ categoriaAnimal: CategoriaAnimal }>) {
  const counts = new Map<CategoriaAnimal, number>();
  for (const animal of animales) counts.set(animal.categoriaAnimal, (counts.get(animal.categoriaAnimal) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function calculateSuggested(
  detail: Awaited<ReturnType<typeof findActiveRulesByCategoria>>[number]['detalles'][number],
  cantidadAnimales: number,
) {
  if (detail.tipoCalculo === 'KG_POR_ANIMAL_DIA') {
    return {
      cantidadSugeridaMinima: detail.cantidadMinima === null ? null : cantidadAnimales * Number(detail.cantidadMinima),
      cantidadSugeridaMaxima: detail.cantidadMaxima === null ? null : cantidadAnimales * Number(detail.cantidadMaxima),
    };
  }

  if (detail.tipoCalculo === 'ROLLOS_POR_GRUPO_DURACION') {
    if (!detail.animalesBase || !detail.rollosBase || !detail.duracionDias) {
      return { cantidadSugeridaMinima: null, cantidadSugeridaMaxima: null };
    }
    const total = (cantidadAnimales / detail.animalesBase) * (Number(detail.rollosBase) / detail.duracionDias);
    return { cantidadSugeridaMinima: total, cantidadSugeridaMaxima: total };
  }

  return { cantidadSugeridaMinima: null, cantidadSugeridaMaxima: null };
}

function validateRuleDetail(input: Record<string, unknown>, index: number): RuleDetailInput {
  const tipoCalculo = parseTipoCalculo(input.tipoCalculo);
  const unidad = parseUnidad(input.unidad);
  const observaciones = normalizeOptionalString(input.observaciones, `Observaciones del alimento ${index + 1}`);
  const data: RuleDetailInput = {
    alimentoId: parseId(input.alimentoId, `alimentoId del alimento ${index + 1}`),
    tipoCalculo,
    unidad,
    cantidadMinima: parseOptionalNonNegativeNumber(input.cantidadMinima, `Cantidad minima del alimento ${index + 1}`),
    cantidadMaxima: parseOptionalNonNegativeNumber(input.cantidadMaxima, `Cantidad maxima del alimento ${index + 1}`),
    animalesBase: parseOptionalPositiveNumber(input.animalesBase, `Animales base del alimento ${index + 1}`),
    rollosBase: parseOptionalPositiveNumber(input.rollosBase, `Rollos base del alimento ${index + 1}`),
    duracionDias: parseOptionalPositiveNumber(input.duracionDias, `Duracion dias del alimento ${index + 1}`),
    obligatorio: Boolean(input.obligatorio),
    observaciones,
  };

  if (tipoCalculo === 'KG_POR_ANIMAL_DIA') {
    if (unidad !== 'KG') throw new AppError('Las reglas por animal por dia deben usar unidad KG.', 400);
    if (data.cantidadMinima === null || data.cantidadMaxima === null) {
      throw new AppError('Cantidad minima y maxima son obligatorias para KG por animal por dia.', 400);
    }
    if (data.cantidadMaxima < data.cantidadMinima) {
      throw new AppError('La cantidad maxima no puede ser menor a la minima.', 400);
    }
  }

  if (tipoCalculo === 'ROLLOS_POR_GRUPO_DURACION') {
    if (unidad !== 'ROLLO') throw new AppError('Las reglas por rollos deben usar unidad ROLLO.', 400);
    if (!data.animalesBase || !data.rollosBase || !data.duracionDias) {
      throw new AppError('Animales base, rollos base y duracion son obligatorios para rollos por grupo.', 400);
    }
  }

  if (tipoCalculo === 'OBLIGATORIO_SIN_CANTIDAD' && !observaciones) {
    throw new AppError('Las reglas obligatorias sin cantidad requieren observaciones.', 400);
  }

  return data;
}

function validateRulePayload(input: Record<string, unknown>, existingActive = true) {
  const nombre = String(input.nombre ?? '').trim();
  if (!nombre) throw new AppError('Nombre de la regla es obligatorio.', 400);

  const categoriaAnimal = parseCategoriaAnimal(input.categoriaAnimal);
  const detallesInput = Array.isArray(input.detalles) ? input.detalles : [];
  if (detallesInput.length === 0) throw new AppError('La regla debe incluir al menos un alimento.', 400);

  const detalles = detallesInput.map((detalle, index) => validateRuleDetail(detalle as Record<string, unknown>, index));
  const alimentoIds = new Set<number>();
  for (const detalle of detalles) {
    if (alimentoIds.has(detalle.alimentoId)) {
      throw new AppError('No se puede repetir el mismo alimento dentro de la regla.', 400);
    }
    alimentoIds.add(detalle.alimentoId);
  }

  return {
    nombre,
    categoriaAnimal,
    activo: input.activo === undefined ? existingActive : Boolean(input.activo),
    observaciones: normalizeOptionalString(input.observaciones, 'Observaciones'),
    detalles,
  };
}

export async function listAlimentos(query: Query = {}) {
  const where: Prisma.InsumoAlimentacionWhereInput = {};
  if (typeof query.buscar === 'string' && query.buscar.trim()) {
    where.nombre = { contains: query.buscar.trim(), mode: 'insensitive' };
  }
  if (query.tipoAlimento) where.tipoAlimento = parseTipoAlimento(query.tipoAlimento);
  if (query.unidad) where.unidadMedida = String(query.unidad).trim().toUpperCase();
  if (query.activo !== undefined && query.activo !== '') where.activo = String(query.activo) === 'true';

  const alimentos = await findAlimentosAlimentacion(where);
  return alimentos.map((alimento) => ({ ...alimento, estado: getStockEstado(alimento) }));
}

export async function listStock(query: Query = {}) {
  const alimentos = await listAlimentos(query);
  const estado = typeof query.estado === 'string' && query.estado ? query.estado : 'TODOS';
  if (estado === 'TODOS') return alimentos;
  if (estado !== 'NORMAL' && estado !== 'BAJO' && estado !== 'AGOTADO') throw new AppError('Estado de stock invalido.', 400);
  return alimentos.filter((alimento) => alimento.estado === estado);
}

export async function createNewAlimento(input: Record<string, unknown>) {
  const nombre = String(input.nombre ?? '').trim();
  if (!nombre) throw new AppError('Nombre del alimento es obligatorio.', 400);
  if (await findAlimentoByNombre(nombre)) throw new AppError('Ya existe un alimento con ese nombre.', 409);

  return createAlimento({
    nombre,
    descripcion: normalizeOptionalString(input.observaciones ?? input.descripcion, 'Observaciones'),
    tipoAlimento: parseTipoAlimento(input.tipoAlimento),
    unidadMedida: parseUnidad(input.unidad ?? input.unidadMedida),
    stockActual: input.stockActual === undefined ? 0 : parseNonNegativeNumber(input.stockActual, 'Stock actual'),
    stockMinimo: input.puntoStockMinimo === undefined && input.stockMinimo === undefined
      ? 0
      : parseNonNegativeNumber(input.puntoStockMinimo ?? input.stockMinimo, 'Punto de stock minimo'),
    activo: input.activo === undefined ? true : Boolean(input.activo),
  });
}

export async function updateExistingAlimento(idParam: string, input: Record<string, unknown>, usuarioId?: number) {
  const alimentoId = parseId(idParam, 'alimentoId');
  const existing = await findAlimentoById(alimentoId);
  if (!existing) throw new AppError('Alimento no encontrado.', 404);

  const data: Prisma.InsumoAlimentacionUpdateInput = {};
  if (input.nombre !== undefined) {
    const nombre = String(input.nombre).trim();
    if (!nombre) throw new AppError('Nombre no puede estar vacio.', 400);
    data.nombre = nombre;
  }
  if (input.tipoAlimento !== undefined) data.tipoAlimento = parseTipoAlimento(input.tipoAlimento);
  if (input.unidad !== undefined || input.unidadMedida !== undefined) data.unidadMedida = parseUnidad(input.unidad ?? input.unidadMedida);
  if (input.stockActual !== undefined) data.stockActual = parseNonNegativeNumber(input.stockActual, 'Stock actual');
  if (input.puntoStockMinimo !== undefined || input.stockMinimo !== undefined) {
    data.stockMinimo = parseNonNegativeNumber(input.puntoStockMinimo ?? input.stockMinimo, 'Punto de stock minimo');
  }
  if (input.activo !== undefined) data.activo = Boolean(input.activo);
  if (input.observaciones !== undefined || input.descripcion !== undefined) {
    data.descripcion = normalizeOptionalString(input.observaciones ?? input.descripcion, 'Observaciones');
  }

  return updateAlimentoWithMovimiento({
    alimentoId,
    update: data,
    fecha: input.fecha ? parseDate(input.fecha, 'Fecha') : new Date(),
    observaciones: normalizeOptionalString(input.observacionesMovimiento, 'Observacion del cambio') ?? 'Modificacion de alimento.',
    usuarioId: usuarioId ?? null,
  });
}

export function listReglas() {
  return findReglasAlimentacion();
}

export async function createNewRegla(input: Record<string, unknown>) {
  return createReglaAlimentacion(validateRulePayload({ ...input, activo: true }, true));
}

export async function updateExistingRegla(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'Id de regla');
  const existing = await findReglaAlimentacionById(id);
  if (!existing) throw new AppError('Regla de alimentacion no encontrada.', 404);
  return updateReglaAlimentacion(id, validateRulePayload(input, existing.activo));
}

export async function getSugerenciaAlimentacion(query: Query) {
  const loteId = parseId(query.loteId, 'loteId');
  const lote = await findLoteWithAnimales(loteId);
  if (!lote || !lote.activo) throw new AppError('Lote no encontrado o inactivo.', 404);

  const cantidadAnimales = lote.animales.length;
  if (cantidadAnimales === 0) {
    return {
      lote: { id: lote.id, nombre: lote.nombre },
      cantidadAnimales,
      categoriaPredominante: null,
      categorias: [],
      advertencia: 'El lote no tiene animales activos.',
      detalles: [],
    };
  }

  const categoriaPredominante = getPredominantCategoria(lote.animales);
  if (!categoriaPredominante) throw new AppError('No se pudo detectar categoria del lote.', 400);
  const categorias = [...new Set(lote.animales.map((animal) => animal.categoriaAnimal))];
  const reglas = await findActiveRulesByCategoria(categoriaPredominante);
  const detalles = reglas.flatMap((regla) =>
    regla.detalles
      .filter((detalle) => detalle.alimento.activo)
      .map((detalle) => ({
        reglaId: regla.id,
        reglaNombre: regla.nombre,
        detalleReglaId: detalle.id,
        alimentoId: detalle.alimentoId,
        alimento: detalle.alimento.nombre,
        tipoAlimento: detalle.alimento.tipoAlimento,
        unidad: detalle.unidad,
        stockDisponible: detalle.alimento.stockActual,
        obligatorio: detalle.obligatorio,
        tipoCalculo: detalle.tipoCalculo,
        observacionesRegla: detalle.observaciones ?? regla.observaciones,
        ...calculateSuggested(detalle, cantidadAnimales),
      })),
  );

  return {
    lote: { id: lote.id, nombre: lote.nombre },
    cantidadAnimales,
    categoriaPredominante,
    categorias,
    advertencia: categorias.length > 1 ? 'El lote tiene animales de distintas categorias. Se usa la categoria predominante.' : null,
    detalles,
  };
}

export async function registrarAlimentacion(input: Record<string, unknown>, usuarioId?: number) {
  if (!usuarioId) throw new AppError('Usuario no autenticado.', 401);
  const loteId = parseId(input.loteId, 'loteId');
  const sugerencia = await getSugerenciaAlimentacion({ loteId });
  if (!sugerencia.categoriaPredominante) throw new AppError('El lote no tiene categoria predominante.', 400);

  const detallesInput = Array.isArray(input.detalles) ? input.detalles : [];
  if (detallesInput.length === 0) throw new AppError('Debe cargar al menos un alimento entregado.', 400);

  const sugeridos = new Map(sugerencia.detalles.map((detalle) => [detalle.alimentoId, detalle]));
  const detalles = detallesInput
    .map((detalle) => {
      const item = detalle as Record<string, unknown>;
      const alimentoId = parseId(item.alimentoId, 'alimentoId');
      const cantidadReal = parseNonNegativeNumber(item.cantidadReal ?? item.cantidad, 'Cantidad real entregada');
      const sugerido = sugeridos.get(alimentoId);
      return {
        alimentoId,
        cantidadReal,
        unidad: String(item.unidad ?? sugerido?.unidad ?? 'KG'),
        cantidadSugeridaMinima: item.cantidadSugeridaMinima === undefined
          ? sugerido?.cantidadSugeridaMinima ?? null
          : parseOptionalNonNegativeNumber(item.cantidadSugeridaMinima, 'Cantidad sugerida minima'),
        cantidadSugeridaMaxima: item.cantidadSugeridaMaxima === undefined
          ? sugerido?.cantidadSugeridaMaxima ?? null
          : parseOptionalNonNegativeNumber(item.cantidadSugeridaMaxima, 'Cantidad sugerida maxima'),
        observaciones: normalizeOptionalString(item.observaciones, 'Observaciones'),
      };
    })
    .filter((detalle) => detalle.cantidadReal > 0);

  if (detalles.length === 0) throw new AppError('Debe ingresar al menos una cantidad real mayor a 0.', 400);

  const result = await createRegistroAlimentacionTransaccional({
    fecha: parseDate(input.fecha),
    loteId,
    categoriaAnimal: parseCategoriaAnimal(input.categoriaAnimal ?? sugerencia.categoriaPredominante),
    cantidadAnimales: Number(input.cantidadAnimales ?? sugerencia.cantidadAnimales),
    observaciones: normalizeOptionalString(input.observaciones, 'Observaciones'),
    usuarioId,
    detalles,
  });

  if (!result) throw new AppError('No se pudo registrar la alimentacion.', 500);
  if ('error' in result && result.error === 'INSUFFICIENT_STOCK') {
    throw new AppError(
      `Stock insuficiente para ${result.alimento.nombre}. Disponible: ${result.alimento.stockActual} ${result.alimento.unidadMedida}. Solicitado: ${result.solicitado} ${result.alimento.unidadMedida}.`,
      400,
    );
  }
  if ('error' in result) throw new AppError('No se pudo registrar la alimentacion por datos invalidos.', 400);
  return result;
}

export async function createMovimientoStock(input: Record<string, unknown>, usuarioId?: number) {
  if (!usuarioId) throw new AppError('Usuario no autenticado.', 401);
  const result = await createMovimientoStockManual({
    alimentoId: parseId(input.alimentoId ?? input.insumoId, 'alimentoId'),
    tipoMovimiento: parseTipoMovimiento(input.tipoMovimiento),
    fecha: parseDate(input.fecha),
    cantidad: parsePositiveNumber(input.cantidad, 'Cantidad'),
    observaciones: normalizeOptionalString(input.observaciones, 'Observaciones'),
    usuarioId,
  });
  if (!result) throw new AppError('Alimento no encontrado.', 404);
  if ('error' in result && result.error === 'INACTIVE') throw new AppError('No se puede mover stock de un alimento inactivo.', 400);
  if ('error' in result && result.error === 'INSUFFICIENT_STOCK') {
    throw new AppError(`Stock insuficiente para ${result.alimento.nombre}.`, 400);
  }
  return result;
}

export function listMovimientos(query: Query = {}) {
  const where: Prisma.MovimientoStockAlimentacionWhereInput = {};
  const fechaDesde = parseOptionalDate(query.fechaDesde, 'Fecha desde');
  const fechaHasta = parseOptionalDate(query.fechaHasta, 'Fecha hasta');
  if (fechaDesde || fechaHasta) where.fecha = { ...(fechaDesde ? { gte: fechaDesde } : {}), ...(fechaHasta ? { lte: endOfDay(fechaHasta) } : {}) };
  const alimentoId = parseOptionalId(query.alimentoId ?? query.insumoId, 'alimentoId');
  if (alimentoId) where.insumoId = alimentoId;
  const usuarioId = parseOptionalId(query.usuarioId, 'usuarioId');
  if (usuarioId) where.usuarioId = usuarioId;
  if (query.tipoMovimiento && query.tipoMovimiento !== 'TODOS') {
    where.tipoMovimiento = parseEnum(query.tipoMovimiento, Object.values(TipoMovimientoStockAlimentacion), 'Tipo de movimiento');
  }
  return findMovimientosStockAlimentacion(where);
}

export function listHistorial(query: Query = {}) {
  const where: Prisma.RegistroAlimentacionWhereInput = {};
  const fechaDesde = parseOptionalDate(query.fechaDesde, 'Fecha desde');
  const fechaHasta = parseOptionalDate(query.fechaHasta, 'Fecha hasta');
  if (fechaDesde || fechaHasta) where.fecha = { ...(fechaDesde ? { gte: fechaDesde } : {}), ...(fechaHasta ? { lte: endOfDay(fechaHasta) } : {}) };
  const loteId = parseOptionalId(query.loteId, 'loteId');
  if (loteId) where.loteId = loteId;
  if (query.categoriaAnimal || query.categoriaId) where.categoriaAnimal = parseCategoriaAnimal(query.categoriaAnimal ?? query.categoriaId);
  const usuarioId = parseOptionalId(query.usuarioId, 'usuarioId');
  if (usuarioId) where.usuarioId = usuarioId;
  return findHistorialAlimentacion(where);
}

export async function getResumenAlimentacion() {
  const { desde, hasta } = todayRange();
  const [alimentacionesHoy, lotesAlimentados, stock] = await Promise.all([
    countRegistrosHoy(desde, hasta),
    countLotesAlimentadosHoy(desde, hasta),
    listStock({ activo: 'true' }),
  ]);

  return {
    alimentacionesRegistradasHoy: alimentacionesHoy,
    lotesAlimentadosHoy: lotesAlimentados.length,
    insumosStockBajo: stock.filter((alimento) => alimento.estado === 'BAJO').length,
    insumosAgotados: stock.filter((alimento) => alimento.estado === 'AGOTADO').length,
  };
}
