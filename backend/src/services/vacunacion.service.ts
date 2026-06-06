import { CategoriaAnimal, Prisma, TipoReglaSanitaria, type ReglaSanitaria } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppError } from '../errors/AppError';
import {
  countAnimalsByIds,
  createAutomaticVaccinationTasks,
  createSanitaryRule,
  createVaccinationTask,
  createVaccinationTasks,
  findActiveAnimalsForVaccination,
  findLatestPerformedVaccinations,
  findOpenVaccinationTasks,
  findPendingVaccinationTasks,
  findSanitaryRuleByCode,
  findSanitaryRuleById,
  findSanitaryRules,
  findVaccinationTaskById,
  findVaccinationTasks,
  markVaccinationTaskAsDone,
  markVaccinationTasksAsDoneBulk,
  updateSanitaryRule,
  type VaccinationTaskWithRelations,
} from '../repositories/vacunacion.repository';

export const tiposSanitarios = ['AFTOSA', 'BRUCELOSIS', 'ANALISIS_TUBERCULINA', 'ANALISIS_BRUCELOSIS', 'OTRA'] as const;
export type TipoSanitario = (typeof tiposSanitarios)[number];
export type EstadoSanitario = 'PROGRAMADA' | 'PENDIENTE' | 'REALIZADA' | 'VENCIDA';
type AlcanceTipo = 'ANIMAL' | 'LOTE' | 'CATEGORIA';

function parseDate(value: unknown, fieldName = 'Fecha programada') {
  if (typeof value !== 'string' || !value) throw new AppError(`${fieldName} es obligatoria.`, 400);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${fieldName} inválida.`, 400);
  date.setHours(9, 0, 0, 0);
  return date;
}

function parseOptionalDate(value: unknown, fieldName: string) {
  if (!value) return undefined;
  return parseDate(value, fieldName);
}

function parseOptionalDateStart(value: unknown, fieldName: string) {
  const date = parseOptionalDate(value, fieldName);
  return date ? startOfDay(date) : undefined;
}

function parseOptionalDateEnd(value: unknown, fieldName: string) {
  const date = parseOptionalDate(value, fieldName);
  return date ? endOfDay(date) : undefined;
}

function parseOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${fieldName} inválida.`, 400);
  return value.trim() || null;
}

function parseRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(`${fieldName} es obligatorio.`, 400);
  return value.trim();
}

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${fieldName} inválido.`, 400);
  return parsed;
}

function parseOptionalId(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return undefined;
  return parseId(value, fieldName);
}

function parsePositiveInteger(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${fieldName} debe ser un número entero positivo.`, 400);
  return parsed;
}

function parseOptionalMonth(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) throw new AppError('Mes fijo inválido.', 400);
  return parsed;
}

function parseCategoria(value: unknown) {
  if (Object.values(CategoriaAnimal).includes(value as CategoriaAnimal)) return value as CategoriaAnimal;
  throw new AppError('Categoría inválida.', 400);
}

function parseOptionalCategoria(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  return parseCategoria(value);
}

function parseAnimalIds(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const ids = value.map((id) => parseId(id, 'animalId'));
  return ids.length > 0 ? Array.from(new Set(ids)) : undefined;
}

function parseVaccinationIds(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) throw new AppError('Debe seleccionar al menos una vacunación.', 400);
  const ids = value.map((id) => parseId(id, 'vacunacionId'));
  return Array.from(new Set(ids));
}

export function parseTipoSanitario(value: unknown): TipoSanitario {
  if (tiposSanitarios.includes(value as TipoSanitario)) return value as TipoSanitario;
  if (typeof value === 'string' && value.trim()) return value.trim().toUpperCase() as TipoSanitario;
  throw new AppError('Tipo sanitario inválido.', 400);
}

function parseTipoRegla(value: unknown) {
  if (value === TipoReglaSanitaria.VACUNA || value === TipoReglaSanitaria.ANALISIS) return value;
  throw new AppError('Tipo de regla sanitaria inválido.', 400);
}

function parseEstadoSanitario(value: unknown) {
  if (!value || value === 'TODOS') return undefined;
  if (value === 'PROGRAMADA' || value === 'PENDIENTE' || value === 'REALIZADA' || value === 'VENCIDA') return value;
  throw new AppError('Estado sanitario inválido.', 400);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function addMonths(value: Date, months: number) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + months);
  return date;
}

function subtractMonths(value: Date, months: number) {
  return addMonths(value, -months);
}

function normalizeRuleCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '_');
}

function getTaskTargetDate(task: Pick<VaccinationTaskWithRelations, 'fechaProgramada' | 'fechaObjetivo'>) {
  return task.fechaObjetivo ?? task.fechaProgramada;
}

export function calculateEstadoSanitario(task: Pick<VaccinationTaskWithRelations, 'estado' | 'fechaProgramada' | 'fechaObjetivo'>): EstadoSanitario {
  if (task.estado === 'REALIZADA') return 'REALIZADA';
  const today = startOfDay(new Date());
  const fechaProgramada = startOfDay(task.fechaProgramada);
  const fechaObjetivo = startOfDay(getTaskTargetDate(task));
  if (today < fechaProgramada) return 'PROGRAMADA';
  if (today > fechaObjetivo) return 'VENCIDA';
  return 'PENDIENTE';
}

export function getNextSanitaryDate(tipoSanitario: TipoSanitario, fechaRealizada: Date) {
  if (tipoSanitario === 'AFTOSA' || tipoSanitario === 'BRUCELOSIS') {
    return new Date(fechaRealizada.getFullYear() + 1, 2, 1, 9, 0, 0, 0);
  }
  return addMonths(fechaRealizada, 12);
}

function calculateNextTargetDate(rule: ReglaSanitaria, fechaRealizada: Date) {
  if (rule.mesFijo) {
    const monthIndex = rule.mesFijo - 1;
    let target = new Date(fechaRealizada.getFullYear(), monthIndex, 1, 9, 0, 0, 0);
    while (target <= fechaRealizada) {
      target = addMonths(target, rule.frecuenciaMeses);
    }
    return target;
  }
  return addMonths(fechaRealizada, rule.frecuenciaMeses);
}

function metadataTipoSanitario(task: VaccinationTaskWithRelations): TipoSanitario {
  if (task.tipoSanitario) return task.tipoSanitario as TipoSanitario;
  const source = `${task.descripcion ?? ''} ${task.eventoCierre?.tipo ?? ''}`.toUpperCase();
  if (source.includes('AFTOSA')) return 'AFTOSA';
  if (source.includes('TUBERCULINA')) return 'ANALISIS_TUBERCULINA';
  if (source.includes('BRUCELOSIS') && source.includes('ANALISIS')) return 'ANALISIS_BRUCELOSIS';
  if (source.includes('BRUCELOSIS')) return 'BRUCELOSIS';
  return 'OTRA';
}

function mapIndividualTasks(tasks: VaccinationTaskWithRelations[]) {
  return tasks.map((task) => {
    const estado = calculateEstadoSanitario(task);
    const tipoSanitario = metadataTipoSanitario(task);
    const alcanceTipo = (task.alcanceTipo as AlcanceTipo | null) ?? 'ANIMAL';
    const fechaRealizada = task.fechaRealizacion ?? task.eventoCierre?.fecha ?? null;
    return {
      id: `task-${task.id}`,
      tareaIds: [task.id],
      fechaProgramada: task.fechaProgramada,
      fechaObjetivo: getTaskTargetDate(task),
      fechaRealizada,
      tipoSanitario,
      estado,
      alcance: {
        tipo: alcanceTipo,
        lote: task.alcanceLote ?? task.animal.lote ?? null,
        categoriaAnimal: task.alcanceCategoria,
      },
      cantidadAnimales: 1,
      usuario: task.eventoCierre?.usuario ?? task.usuario ?? null,
      observaciones: task.descripcion,
      animal: task.animal,
      animales: [task.animal],
      tareas: [task],
    };
  });
}

async function ensureAutomaticSanitaryTasks() {
  const [rules, latestPerformed, openTasks] = await Promise.all([
    findSanitaryRules({ onlyActive: true }),
    findLatestPerformedVaccinations(),
    findOpenVaccinationTasks(),
  ]);
  const ruleByCode = new Map(rules.map((rule) => [rule.codigo, rule]));
  const openKeySet = new Set(openTasks.map((task) => `${task.animalId}:${task.tipoSanitario}`));
  const seenLatest = new Set<string>();
  const tasksToCreate: Array<{
    animalId: number;
    fechaProgramada: Date;
    fechaObjetivo: Date;
    descripcion: string;
    tipoSanitario: string;
  }> = [];

  for (const task of latestPerformed) {
    if (!task.fechaRealizacion || !task.tipoSanitario) continue;
    const key = `${task.animalId}:${task.tipoSanitario}`;
    if (seenLatest.has(key) || openKeySet.has(key)) continue;
    seenLatest.add(key);
    const rule = ruleByCode.get(task.tipoSanitario);
    if (!rule) continue;
    const fechaObjetivo = calculateNextTargetDate(rule, task.fechaRealizacion);
    tasksToCreate.push({
      animalId: task.animalId,
      fechaObjetivo,
      fechaProgramada: subtractMonths(fechaObjetivo, rule.anticipacionMeses),
      descripcion: `Tarea sanitaria automática: ${rule.nombre}`,
      tipoSanitario: rule.codigo,
    });
    openKeySet.add(key);
  }

  await createAutomaticVaccinationTasks(tasksToCreate);
}

export async function listPendingVaccinations() {
  await ensureAutomaticSanitaryTasks();
  const tasks = await findPendingVaccinationTasks();
  return mapIndividualTasks(tasks)
    .filter((item) => item.estado === 'PENDIENTE')
    .flatMap((item) => item.tareas);
}

export async function listVaccinationEvents() {
  await ensureAutomaticSanitaryTasks();
  const tasks = await findVaccinationTasks({});
  return mapIndividualTasks(tasks).filter((task) => task.estado === 'REALIZADA');
}

export async function listVaccinationHistory(query: Record<string, unknown>) {
  await ensureAutomaticSanitaryTasks();
  const estado = parseEstadoSanitario(query.estado);
  let tipoSanitario = query.tipo ? parseTipoSanitario(query.tipo) : undefined;
  const tipoSanitarioId = parseOptionalId(query.tipoSanitarioId, 'tipoSanitarioId');
  if (tipoSanitarioId) {
    const rule = await findSanitaryRuleById(tipoSanitarioId);
    if (!rule) throw new AppError('Tipo sanitario no encontrado.', 404);
    tipoSanitario = rule.codigo as TipoSanitario;
  }
  const tasks = await findVaccinationTasks({
    tipoSanitario,
    fechaProgramadaDesde: parseOptionalDateStart(query.fechaProgramadaDesde ?? query.fechaDesde, 'Fecha programada desde'),
    fechaProgramadaHasta: parseOptionalDateEnd(query.fechaProgramadaHasta ?? query.fechaHasta, 'Fecha programada hasta'),
    fechaObjetivoDesde: parseOptionalDateStart(query.fechaObjetivoDesde, 'Fecha objetivo desde'),
    fechaObjetivoHasta: parseOptionalDateEnd(query.fechaObjetivoHasta, 'Fecha objetivo hasta'),
    fechaRealizadaDesde: parseOptionalDateStart(query.fechaRealizadaDesde, 'Fecha realizada desde'),
    fechaRealizadaHasta: parseOptionalDateEnd(query.fechaRealizadaHasta, 'Fecha realizada hasta'),
    loteId: parseOptionalId(query.loteId, 'loteId'),
    categoriaAnimal: parseOptionalCategoria(query.categoriaId ?? query.categoriaAnimal ?? query.categoria),
  });
  const history = mapIndividualTasks(tasks).filter((item) => !estado || item.estado === estado);
  const resumen = buildSummary(history);
  return { registros: history, resumen };
}

function buildSummary(history: Array<{ estado: EstadoSanitario }>) {
  return {
    pendientes: history.filter((item) => item.estado === 'PENDIENTE').length,
    vencidas: history.filter((item) => item.estado === 'VENCIDA').length,
    realizadas: history.filter((item) => item.estado === 'REALIZADA').length,
    programadas: history.filter((item) => item.estado === 'PROGRAMADA').length,
    todas: history.length,
  };
}

export async function getVaccinationSummary() {
  await ensureAutomaticSanitaryTasks();
  const tasks = await findVaccinationTasks({});
  return buildSummary(mapIndividualTasks(tasks));
}

export async function scheduleVaccination(input: Record<string, unknown>, usuarioId?: number) {
  const tipoSanitario = parseTipoSanitario(input.tipoSanitario ?? input.tipo);
  const rule = await findSanitaryRuleByCode(String(tipoSanitario));
  if (!rule || !rule.activo) throw new AppError('El tipo sanitario no tiene una regla activa configurada.', 400);
  const fechaObjetivo = parseDate(input.fechaObjetivo ?? input.fechaProgramada, 'Fecha objetivo');
  const fechaProgramada = input.fechaProgramada
    ? parseDate(input.fechaProgramada, 'Fecha programada')
    : subtractMonths(fechaObjetivo, rule.anticipacionMeses);
  const descripcion = parseOptionalString(input.descripcion, 'Observaciones');
  const animalIds = parseAnimalIds(input.animalIds);
  const loteId = input.loteId ? parseId(input.loteId, 'loteId') : undefined;
  const categoriaAnimal = input.categoriaAnimal || input.categoria ? parseCategoria(input.categoriaAnimal ?? input.categoria) : undefined;

  const selectedScopes = [Boolean(animalIds), Boolean(loteId), Boolean(categoriaAnimal)].filter(Boolean).length;
  if (selectedScopes === 0) throw new AppError('Debe seleccionar al menos un animal, lote o categoría.', 400);
  if (selectedScopes > 1) throw new AppError('Debe seleccionar un solo alcance: animales, lote o categoría.', 400);

  const alcanceTipo: AlcanceTipo = animalIds ? 'ANIMAL' : loteId ? 'LOTE' : 'CATEGORIA';
  const animals = await findActiveAnimalsForVaccination({ animalIds, loteId, categoriaAnimal });

  if (animalIds) {
    const existingCount = await countAnimalsByIds(animalIds);
    if (existingCount !== animalIds.length || animals.length !== animalIds.length) {
      throw new AppError('Todos los animales seleccionados deben existir y estar activos.', 400);
    }
  }

  if (animals.length === 0) throw new AppError('No se encontraron animales activos para programar la vacunación.', 400);

  const uniqueAnimalIds = Array.from(new Set(animals.map((animal) => animal.id)));
  const result = await createVaccinationTasks({
    animalIds: uniqueAnimalIds,
    fechaProgramada,
    fechaObjetivo,
    descripcion,
    tipoSanitario,
    alcanceTipo,
    alcanceLoteId: alcanceTipo === 'LOTE' ? loteId : null,
    alcanceCategoria: alcanceTipo === 'CATEGORIA' ? categoriaAnimal : null,
    grupoSanitarioId: randomUUID(),
    usuarioId: usuarioId ?? null,
  });

  return { tareasCreadas: result.count };
}

export async function markVaccinationAsPerformed(idParam: string, input: Record<string, unknown>, usuarioId?: number) {
  if (!usuarioId) throw new AppError('Usuario no autenticado.', 401);
  const id = parseId(idParam, 'id');
  const task = await findVaccinationTaskById(id);
  if (!task || task.tipo !== 'VACUNACION') throw new AppError('Tarea sanitaria no encontrada.', 404);
  if (task.estado === 'REALIZADA') throw new AppError('La vacunación ya fue registrada como realizada.', 409);
  if (!task.tipoSanitario) throw new AppError('La tarea no tiene tipo sanitario asociado.', 400);

  const rule = await findSanitaryRuleByCode(task.tipoSanitario);
  if (!rule || !rule.activo) throw new AppError('El tipo sanitario no tiene una regla activa configurada.', 400);
  const fechaRealizada = parseDate(input.fechaRealizada ?? new Date().toISOString().slice(0, 10), 'Fecha realizada');
  const observaciones = parseOptionalString(input.observaciones ?? task.descripcion, 'Observaciones');
  const updatedTask = await markVaccinationTaskAsDone({
    taskId: task.id,
    animalId: task.animalId,
    usuarioId,
    fechaRealizada,
    observaciones,
    tipoSanitario: task.tipoSanitario,
  });

  const openTasks = await findOpenVaccinationTasks();
  const hasNextOpen = openTasks.some((openTask) => openTask.animalId === task.animalId && openTask.tipoSanitario === task.tipoSanitario);
  if (!hasNextOpen) {
    const fechaObjetivo = calculateNextTargetDate(rule, fechaRealizada);
    await createVaccinationTask({
      animalId: task.animalId,
      fechaObjetivo,
      fechaProgramada: subtractMonths(fechaObjetivo, rule.anticipacionMeses),
      descripcion: `Tarea sanitaria automática: ${rule.nombre}`,
      tipoSanitario: rule.codigo,
      usuarioId,
    });
  }

  return updatedTask;
}

export async function markVaccinationsAsPerformedBulk(input: Record<string, unknown>, usuarioId?: number) {
  if (!usuarioId) throw new AppError('Usuario no autenticado.', 401);

  const ids = parseVaccinationIds(input.vacunacionIds);
  const fechaRealizada = parseDate(input.fechaRealizada ?? new Date().toISOString().slice(0, 10), 'Fecha realizada');
  const observaciones = parseOptionalString(input.observaciones, 'Observaciones');
  const tasks = await Promise.all(ids.map((id) => findVaccinationTaskById(id)));

  if (tasks.some((task) => !task || task.tipo !== 'VACUNACION')) {
    throw new AppError('Una o más vacunaciones seleccionadas no existen.', 404);
  }

  const vaccinationTasks = tasks as VaccinationTaskWithRelations[];
  if (vaccinationTasks.some((task) => task.estado === 'REALIZADA')) {
    throw new AppError('Una o más vacunaciones ya fueron registradas como realizadas.', 409);
  }
  if (vaccinationTasks.some((task) => !task.tipoSanitario)) {
    throw new AppError('Una o más vacunaciones no tienen tipo sanitario asociado.', 400);
  }

  const rules = await Promise.all(vaccinationTasks.map((task) => findSanitaryRuleByCode(task.tipoSanitario!)));
  if (rules.some((rule) => !rule || !rule.activo)) {
    throw new AppError('Una o más vacunaciones no tienen una regla sanitaria activa configurada.', 400);
  }

  const selectedIds = new Set(ids);
  const openTasks = await findOpenVaccinationTasks();
  const openKeySet = new Set(
    openTasks
      .filter((task) => !selectedIds.has(task.id))
      .map((task) => `${task.animalId}:${task.tipoSanitario}`),
  );
  const nextTaskKeys = new Set<string>();
  const nextTasks = vaccinationTasks.flatMap((task, index) => {
    const key = `${task.animalId}:${task.tipoSanitario}`;
    const rule = rules[index]!;
    if (openKeySet.has(key) || nextTaskKeys.has(key)) return [];
    nextTaskKeys.add(key);
    const fechaObjetivo = calculateNextTargetDate(rule, fechaRealizada);
    return [{
      animalId: task.animalId,
      fechaObjetivo,
      fechaProgramada: subtractMonths(fechaObjetivo, rule.anticipacionMeses),
      descripcion: `Tarea sanitaria automática: ${rule.nombre}`,
      tipoSanitario: rule.codigo,
      usuarioId,
    }];
  });

  const updatedTasks = await markVaccinationTasksAsDoneBulk({
    tasks: vaccinationTasks.map((task) => ({
      taskId: task.id,
      animalId: task.animalId,
      tipoSanitario: task.tipoSanitario!,
    })),
    nextTasks,
    usuarioId,
    fechaRealizada,
    observaciones,
  });

  return {
    tareasActualizadas: updatedTasks.length,
    proximasTareasCreadas: nextTasks.length,
  };
}

export async function listSanitaryRules() {
  return findSanitaryRules();
}

export async function createNewSanitaryRule(input: Record<string, unknown>) {
  const codigo = normalizeRuleCode(parseRequiredString(input.codigo, 'Código'));
  const existingRule = await findSanitaryRuleByCode(codigo);
  if (existingRule) throw new AppError('Ya existe una regla sanitaria con ese código.', 409);
  try {
    return await createSanitaryRule({
      nombre: parseRequiredString(input.nombre, 'Nombre'),
      codigo,
      tipo: parseTipoRegla(input.tipo),
      mesFijo: parseOptionalMonth(input.mesFijo),
      frecuenciaMeses: parsePositiveInteger(input.frecuenciaMeses ?? 12, 'Frecuencia en meses'),
      anticipacionMeses: parsePositiveInteger(input.anticipacionMeses ?? 1, 'Anticipación en meses'),
      activo: input.activo === undefined ? true : Boolean(input.activo),
      observaciones: parseOptionalString(input.observaciones, 'Observaciones'),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Ya existe una regla sanitaria con ese código.', 409);
    }
    throw error;
  }
}

export async function updateExistingSanitaryRule(idParam: string, input: Record<string, unknown>) {
  const id = parseId(idParam, 'id');
  const existingRule = await findSanitaryRuleById(id);
  if (!existingRule) throw new AppError('Regla sanitaria no encontrada.', 404);

  const data: Prisma.ReglaSanitariaUpdateInput = {};
  if (input.nombre !== undefined) data.nombre = parseRequiredString(input.nombre, 'Nombre');
  if (input.codigo !== undefined) data.codigo = normalizeRuleCode(parseRequiredString(input.codigo, 'Código'));
  if (input.tipo !== undefined) data.tipo = parseTipoRegla(input.tipo);
  if (input.mesFijo !== undefined) data.mesFijo = parseOptionalMonth(input.mesFijo);
  if (input.frecuenciaMeses !== undefined) data.frecuenciaMeses = parsePositiveInteger(input.frecuenciaMeses, 'Frecuencia en meses');
  if (input.anticipacionMeses !== undefined) data.anticipacionMeses = parsePositiveInteger(input.anticipacionMeses, 'Anticipación en meses');
  if (input.activo !== undefined) data.activo = Boolean(input.activo);
  if (input.observaciones !== undefined) data.observaciones = parseOptionalString(input.observaciones, 'Observaciones');

  try {
    return await updateSanitaryRule(id, data);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Ya existe una regla sanitaria con ese código.', 409);
    }
    throw error;
  }
}
