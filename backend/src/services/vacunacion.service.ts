import { CategoriaAnimal } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppError } from '../errors/AppError';
import {
  countAnimalsByIds,
  createVaccinationTasks,
  findActiveAnimalsForVaccination,
  findPendingVaccinationTasks,
  findVaccinationTasks,
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
  return date;
}

function parseOptionalDate(value: unknown, fieldName: string) {
  if (!value) return undefined;
  return parseDate(value, fieldName);
}

function parseOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${fieldName} inválida.`, 400);
  return value.trim() || null;
}

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${fieldName} inválido.`, 400);
  return parsed;
}

function parseCategoria(value: unknown) {
  if (Object.values(CategoriaAnimal).includes(value as CategoriaAnimal)) return value as CategoriaAnimal;
  throw new AppError('Categoría inválida.', 400);
}

function parseAnimalIds(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const ids = value.map((id) => parseId(id, 'animalId'));
  return ids.length > 0 ? Array.from(new Set(ids)) : undefined;
}

export function parseTipoSanitario(value: unknown): TipoSanitario {
  if (tiposSanitarios.includes(value as TipoSanitario)) return value as TipoSanitario;
  throw new AppError('Tipo sanitario inválido.', 400);
}

function parseEstadoSanitario(value: unknown) {
  if (!value) return undefined;
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

export function calculateEstadoSanitario(task: Pick<VaccinationTaskWithRelations, 'estado' | 'fechaProgramada'>): EstadoSanitario {
  if (task.estado === 'REALIZADA') return 'REALIZADA';
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  if (task.fechaProgramada > todayEnd) return 'PROGRAMADA';
  if (task.fechaProgramada < todayStart) return 'VENCIDA';
  return 'PENDIENTE';
}

export function getNextSanitaryDate(tipoSanitario: TipoSanitario, fechaRealizada: Date) {
  if (tipoSanitario === 'AFTOSA' || tipoSanitario === 'BRUCELOSIS') {
    return new Date(fechaRealizada.getFullYear() + 1, 2, 1);
  }
  const next = new Date(fechaRealizada);
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

function metadataTipoSanitario(task: VaccinationTaskWithRelations): TipoSanitario {
  if (tiposSanitarios.includes(task.tipoSanitario as TipoSanitario)) return task.tipoSanitario as TipoSanitario;
  const source = `${task.descripcion ?? ''} ${task.eventoCierre?.tipo ?? ''}`.toUpperCase();
  if (source.includes('AFTOSA')) return 'AFTOSA';
  if (source.includes('TUBERCULINA')) return 'ANALISIS_TUBERCULINA';
  if (source.includes('BRUCELOSIS') && source.includes('ANALISIS')) return 'ANALISIS_BRUCELOSIS';
  if (source.includes('BRUCELOSIS')) return 'BRUCELOSIS';
  return 'OTRA';
}

function groupTasks(tasks: VaccinationTaskWithRelations[]) {
  const groups = new Map<string, VaccinationTaskWithRelations[]>();
  for (const task of tasks) {
    const key = task.grupoSanitarioId ?? `task-${task.id}`;
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return Array.from(groups.entries()).map(([grupoSanitarioId, group]) => {
    const first = group[0];
    const estado = calculateEstadoSanitario(first);
    const tipoSanitario = metadataTipoSanitario(first);
    const alcanceTipo = (first.alcanceTipo as AlcanceTipo | null) ?? 'ANIMAL';
    const fechaRealizada = first.fechaRealizacion ?? first.eventoCierre?.fecha ?? null;
    return {
      id: grupoSanitarioId,
      tareaIds: group.map((task) => task.id),
      fechaProgramada: first.fechaProgramada,
      fechaRealizada,
      tipoSanitario,
      estado,
      alcance: {
        tipo: alcanceTipo,
        lote: first.alcanceLote ?? first.animal.lote ?? null,
        categoriaAnimal: first.alcanceCategoria,
      },
      cantidadAnimales: first.cantidadAnimalesAlcanzados ?? group.length,
      usuario: first.eventoCierre?.usuario ?? first.usuario ?? null,
      observaciones: first.descripcion,
      animales: group.map((task) => task.animal),
      tareas: group,
    };
  });
}

export function listPendingVaccinations() {
  return findPendingVaccinationTasks().then((tasks) =>
    groupTasks(tasks)
      .filter((item) => item.estado === 'PENDIENTE')
      .flatMap((item) => item.tareas),
  );
}

export async function listVaccinationEvents() {
  const tasks = await findVaccinationTasks({});
  return groupTasks(tasks).filter((task) => task.estado === 'REALIZADA');
}

export async function listVaccinationHistory(query: Record<string, unknown>) {
  const estado = parseEstadoSanitario(query.estado);
  const tipoSanitario = query.tipo ? parseTipoSanitario(query.tipo) : undefined;
  const tasks = await findVaccinationTasks({
    tipoSanitario,
    fechaDesde: parseOptionalDate(query.fechaDesde, 'Fecha desde'),
    fechaHasta: query.fechaHasta ? endOfDay(parseDate(query.fechaHasta, 'Fecha hasta')) : undefined,
  });
  const history = groupTasks(tasks).filter((item) => !estado || item.estado === estado);
  const resumen = {
    pendientes: history.filter((item) => item.estado === 'PENDIENTE').length,
    vencidas: history.filter((item) => item.estado === 'VENCIDA').length,
    realizadas: history.filter((item) => item.estado === 'REALIZADA').length,
    programadas: history.filter((item) => item.estado === 'PROGRAMADA').length,
    todas: history.length,
  };
  return { registros: history, resumen };
}

export async function getVaccinationSummary() {
  const tasks = await findVaccinationTasks({});
  const history = groupTasks(tasks);
  return {
    pendientes: history.filter((item) => item.estado === 'PENDIENTE').length,
    vencidas: history.filter((item) => item.estado === 'VENCIDA').length,
    realizadas: history.filter((item) => item.estado === 'REALIZADA').length,
    programadas: history.filter((item) => item.estado === 'PROGRAMADA').length,
    todas: history.length,
  };
}

export async function scheduleVaccination(input: Record<string, unknown>, usuarioId?: number) {
  const fechaProgramada = parseDate(input.fechaProgramada);
  const tipoSanitario = parseTipoSanitario(input.tipoSanitario ?? input.tipo);
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
    descripcion,
    tipoSanitario,
    alcanceTipo,
    alcanceLoteId: alcanceTipo === 'LOTE' ? loteId : null,
    alcanceCategoria: alcanceTipo === 'CATEGORIA' ? categoriaAnimal : null,
    grupoSanitarioId: randomUUID(),
    usuarioId: usuarioId ?? null,
  });

  return {
    tareasCreadas: result.count,
  };
}
