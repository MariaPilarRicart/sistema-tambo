import { EstadoAnimal, EstadoTarea, TipoTarea } from '@prisma/client';
import {
  countAnimales,
  countTareas,
  findActiveInsumosAlimentacion,
  findLotesWithActiveAnimals,
  findSanitaryEvents,
  findTareasDetalle,
  findUltimosEventos,
  groupAnimalesByCategoria,
  groupAnimalesByEstadoAnimal,
  groupAnimalesByEstadoReproductivo,
  groupAnimalesByLote,
} from '../repositories/dashboard.repository';

type SeveridadAlerta = 'CRITICA' | 'MEDIA' | 'INFO';
type EstadoCobertura = 'CRITICO' | 'ATENCION' | 'OK' | 'SIN_CALCULO';
type EstadoSanitario = 'VENCIDA' | 'PROXIMA' | 'OK' | 'PENDIENTE';
type UnidadCobertura = 'KG' | 'ROLLO' | 'UNIDAD';
type TipoControlSanitario = 'ANTIAFTOSA' | 'BRUCELOSIS' | 'TUBERCULINA' | 'ANALISIS_BRUCELOSIS';

interface AlertaPrioritaria {
  titulo: string;
  detalle: string;
  severidad: SeveridadAlerta;
  accionSugerida: string;
}

interface CoberturaAlimento {
  alimento: string;
  stockActual: number;
  unidad: UnidadCobertura;
  consumoDiarioEstimado: number;
  diasCobertura: number | null;
  estado: EstadoCobertura;
}

interface AlertaAlimentacion {
  alimento: string;
  lote?: string;
  mensaje: string;
  severidad: SeveridadAlerta;
  diasCobertura?: number;
}

interface AlertaSanitaria {
  tipo: TipoControlSanitario;
  mensaje: string;
  fechaLimite: string | null;
  ultimaAplicacion: string | null;
  estado: EstadoSanitario;
}

interface SanitaryControl {
  tipo: TipoControlSanitario;
  nombre: string;
  ultimaAplicacion: string | null;
  proximaFechaEsperada: string | null;
  estado: 'OK' | 'PROXIMO' | 'PENDIENTE' | 'VENCIDO';
}

interface FoodRule {
  lote: string;
  alimento: string;
  consumoPorAnimalDia: number | null;
  unidad: UnidadCobertura;
  obligatorio?: boolean;
}

const FOOD_RULES: FoodRule[] = [
  { lote: 'VACAS LECHERAS', alimento: 'Silo de Maiz', consumoPorAnimalDia: 16.5, unidad: 'KG' },
  { lote: 'VACAS LECHERAS', alimento: 'Balanceado lecheras', consumoPorAnimalDia: 6.5, unidad: 'KG' },
  { lote: 'VACAS LECHERAS', alimento: 'Cascarilla de soja', consumoPorAnimalDia: 2.5, unidad: 'KG' },
  { lote: 'VACAS LECHERAS', alimento: 'Rollo de Alfalfa', consumoPorAnimalDia: 0.05, unidad: 'ROLLO' },
  { lote: 'PRE-PARTO', alimento: 'Silo de Maiz', consumoPorAnimalDia: 9, unidad: 'KG' },
  { lote: 'PRE-PARTO', alimento: 'Balanceado Pre-Parto', consumoPorAnimalDia: 4.5, unidad: 'KG' },
  { lote: 'PRE-PARTO', alimento: 'Rollo de avena o moa', consumoPorAnimalDia: 0.014, unidad: 'ROLLO' },
  { lote: 'PRE-PARTO', alimento: 'Sales Anionicas', consumoPorAnimalDia: null, unidad: 'KG', obligatorio: true },
  { lote: 'VACAS SECAS', alimento: 'Silo de Maiz', consumoPorAnimalDia: 5, unidad: 'KG' },
  { lote: 'VACAS SECAS', alimento: 'Rollo avena o moa', consumoPorAnimalDia: 0.014, unidad: 'ROLLO' },
  { lote: 'VACAS SECAS', alimento: 'Cascarilla de soja', consumoPorAnimalDia: 1.25, unidad: 'KG' },
  { lote: 'VAQUILLONAS', alimento: 'Silo de Maiz', consumoPorAnimalDia: 9, unidad: 'KG' },
  { lote: 'VAQUILLONAS', alimento: 'Rollo de Alfalfa', consumoPorAnimalDia: 0.025, unidad: 'ROLLO' },
  { lote: 'VAQUILLONAS', alimento: 'Cascarilla de soja o expeller de soja', consumoPorAnimalDia: 1.75, unidad: 'KG' },
  { lote: 'VAQUILLONAS', alimento: 'Balanceado para vaquillonas o maiz molido', consumoPorAnimalDia: 2, unidad: 'KG' },
  { lote: 'ESCUELITA', alimento: 'Balanceado terneros', consumoPorAnimalDia: 2.75, unidad: 'KG' },
  { lote: 'ESCUELITA', alimento: 'Cascarilla de Soja', consumoPorAnimalDia: 0.5, unidad: 'KG' },
  { lote: 'ESCUELITA', alimento: 'Rollo de alfalfa', consumoPorAnimalDia: 0.0067, unidad: 'ROLLO' },
  { lote: 'ESTACA', alimento: 'Balanceado iniciador', consumoPorAnimalDia: null, unidad: 'KG' },
];

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addYears(date: Date, years: number) {
  const nextDate = new Date(date);
  nextDate.setFullYear(nextDate.getFullYear() + years);
  return nextDate;
}

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeName(value: string) {
  return stripAccents(value).toLowerCase();
}

function namesMatch(source: string, expected: string) {
  const normalizedSource = normalizeName(source);
  const tokens = normalizeName(expected)
    .split(/\s+|\/|-/)
    .filter((token) => token.length > 2 && token !== 'para');

  return tokens.some((token) => normalizedSource.includes(token)) || normalizedSource.includes(normalizeName(expected));
}

function mapUnidad(value: string): UnidadCobertura {
  const normalized = normalizeName(value);
  if (normalized.includes('roll')) return 'ROLLO';
  if (normalized.includes('unid')) return 'UNIDAD';
  return 'KG';
}

function mapCoverageState(days: number | null): EstadoCobertura {
  if (days === null) return 'SIN_CALCULO';
  if (days <= 5) return 'CRITICO';
  if (days <= 10) return 'ATENCION';
  return 'OK';
}

function buildFoodCoverage(
  lotes: Awaited<ReturnType<typeof findLotesWithActiveAnimals>>,
  insumos: Awaited<ReturnType<typeof findActiveInsumosAlimentacion>>,
) {
  const consumptionByFood = new Map<string, { alimento: string; unidad: UnidadCobertura; total: number }>();
  const alertas: AlertaAlimentacion[] = [];

  for (const lote of lotes) {
    const animalCount = lote.animales.length;
    const rules = FOOD_RULES.filter((rule) => namesMatch(lote.nombre, rule.lote));

    for (const rule of rules) {
      const insumo = insumos.find((item) => namesMatch(item.nombre, rule.alimento));
      const configuredStock = insumo?.stockActual ?? 0;

      if (rule.obligatorio && configuredStock <= 0) {
        alertas.push({
          alimento: rule.alimento,
          lote: lote.nombre,
          mensaje: `Lote ${lote.nombre} sin ${rule.alimento} cargadas.`,
          severidad: 'CRITICA',
        });
      }

      if (rule.consumoPorAnimalDia === null || animalCount === 0) continue;

      const current = consumptionByFood.get(rule.alimento) ?? {
        alimento: rule.alimento,
        unidad: insumo ? mapUnidad(insumo.unidadMedida) : rule.unidad,
        total: 0,
      };
      current.total += animalCount * rule.consumoPorAnimalDia;
      consumptionByFood.set(rule.alimento, current);
    }
  }

  const calculatedFoods = Array.from(consumptionByFood.values());
  const cobertura = calculatedFoods.map<CoberturaAlimento>((item) => {
    const insumo = insumos.find((stockItem) => namesMatch(stockItem.nombre, item.alimento));
    const hasStock = Boolean(insumo);
    const stockActual = insumo?.stockActual ?? 0;
    const diasCobertura = hasStock && item.total > 0 ? Number((stockActual / item.total).toFixed(1)) : null;
    const estado = mapCoverageState(diasCobertura);

    if (diasCobertura !== null && estado !== 'OK') {
      alertas.push({
        alimento: insumo?.nombre ?? item.alimento,
        mensaje: `${estado === 'CRITICO' ? 'Stock critico' : 'Stock bajo'} de ${insumo?.nombre ?? item.alimento}: cobertura estimada ${diasCobertura} dias.`,
        severidad: estado === 'CRITICO' ? 'CRITICA' : 'MEDIA',
        diasCobertura,
      });
    }

    return {
      alimento: insumo?.nombre ?? item.alimento,
      stockActual,
      unidad: insumo ? mapUnidad(insumo.unidadMedida) : item.unidad,
      consumoDiarioEstimado: Number(item.total.toFixed(2)),
      diasCobertura,
      estado,
    };
  });

  const missingConfiguredCoverage = FOOD_RULES
    .filter((rule) => rule.consumoPorAnimalDia === null)
    .map<CoberturaAlimento>((rule) => {
      const insumo = insumos.find((stockItem) => namesMatch(stockItem.nombre, rule.alimento));
      return {
        alimento: insumo?.nombre ?? rule.alimento,
        stockActual: insumo?.stockActual ?? 0,
        unidad: insumo ? mapUnidad(insumo.unidadMedida) : rule.unidad,
        consumoDiarioEstimado: 0,
        diasCobertura: null,
        estado: 'SIN_CALCULO',
      };
    });

  return {
    coberturaAlimentos: [...cobertura, ...missingConfiguredCoverage],
    alertasAlimentacion: alertas,
  };
}

function textFromEvent(event: Awaited<ReturnType<typeof findSanitaryEvents>>[number]) {
  return `${event.observaciones ?? ''} ${event.datosJson ? JSON.stringify(event.datosJson) : ''}`;
}

function findLastSanitaryDate(events: Awaited<ReturnType<typeof findSanitaryEvents>>, keywords: string[]) {
  return events.find((event) => keywords.some((keyword) => normalizeName(textFromEvent(event)).includes(keyword)))?.fecha ?? null;
}

function buildAnnualMarchControl(
  type: Extract<TipoControlSanitario, 'ANTIAFTOSA' | 'BRUCELOSIS'>,
  name: string,
  events: Awaited<ReturnType<typeof findSanitaryEvents>>,
  today: Date,
): SanitaryControl {
  const keywords = type === 'ANTIAFTOSA' ? ['aftosa', 'antiaftosa'] : ['brucelosis'];
  const year = today.getFullYear();
  const currentMarchEvent = events.find((event) => {
    const eventDate = event.fecha;
    return eventDate.getFullYear() === year && eventDate.getMonth() === 2 && keywords.some((keyword) => normalizeName(textFromEvent(event)).includes(keyword));
  });
  const lastDate = currentMarchEvent?.fecha ?? findLastSanitaryDate(events, keywords);
  const expectedDate = new Date(year, 2, 31);

  let estado: SanitaryControl['estado'] = 'OK';
  if (!currentMarchEvent) {
    estado = today.getMonth() <= 2 ? 'PENDIENTE' : 'VENCIDO';
  }

  return {
    tipo: type,
    nombre: name,
    ultimaAplicacion: lastDate ? lastDate.toISOString() : null,
    proximaFechaEsperada: expectedDate.toISOString(),
    estado,
  };
}

function buildYearlyControl(
  type: Extract<TipoControlSanitario, 'TUBERCULINA' | 'ANALISIS_BRUCELOSIS'>,
  name: string,
  keywords: string[],
  events: Awaited<ReturnType<typeof findSanitaryEvents>>,
  today: Date,
): SanitaryControl {
  const lastDate = findLastSanitaryDate(events, keywords);

  if (!lastDate) {
    return {
      tipo: type,
      nombre: name,
      ultimaAplicacion: null,
      proximaFechaEsperada: null,
      estado: 'PENDIENTE',
    };
  }

  const nextDate = addYears(lastDate, 1);
  const daysUntilDue = Math.ceil((nextDate.getTime() - today.getTime()) / 86_400_000);
  const estado = daysUntilDue < 0 ? 'VENCIDO' : daysUntilDue <= 30 ? 'PROXIMO' : 'OK';

  return {
    tipo: type,
    nombre: name,
    ultimaAplicacion: lastDate.toISOString(),
    proximaFechaEsperada: nextDate.toISOString(),
    estado,
  };
}

function buildSanitaryControls(events: Awaited<ReturnType<typeof findSanitaryEvents>>, today: Date) {
  const controlesSanitarios = [
    buildAnnualMarchControl('ANTIAFTOSA', 'Vacuna antiaftosa', events, today),
    buildAnnualMarchControl('BRUCELOSIS', 'Vacuna brucelosis', events, today),
    buildYearlyControl('TUBERCULINA', 'Analisis de tuberculina', ['tuberculina'], events, today),
    buildYearlyControl('ANALISIS_BRUCELOSIS', 'Analisis de brucelosis', ['analisis brucelosis', 'analisis de brucelosis'], events, today),
  ];

  const alertasSanitarias: AlertaSanitaria[] = controlesSanitarios
    .filter((control) => control.estado !== 'OK')
    .map((control) => ({
      tipo: control.tipo,
      mensaje: `${control.nombre} ${control.estado === 'PROXIMO' ? 'proximo a vencer' : control.estado.toLowerCase()}.`,
      fechaLimite: control.proximaFechaEsperada,
      ultimaAplicacion: control.ultimaAplicacion,
      estado: control.estado === 'VENCIDO' ? 'VENCIDA' : control.estado === 'PROXIMO' ? 'PROXIMA' : 'PENDIENTE',
    }));

  return { controlesSanitarios, alertasSanitarias };
}

function mapTareaDetalle(tarea: Awaited<ReturnType<typeof findTareasDetalle>>[number]) {
  return {
    id: tarea.id,
    tipoTarea: tarea.tipo,
    fechaProyectada: tarea.fechaProgramada,
    estado: tarea.estado,
    descripcion: tarea.descripcion,
    animal: tarea.animal
      ? {
          id: tarea.animal.id,
          caravana: tarea.animal.caravana,
          lote: tarea.animal.lote,
        }
      : null,
  };
}

function buildPriorityAlerts(
  alertasAlimentacion: AlertaAlimentacion[],
  alertasSanitarias: AlertaSanitaria[],
  tareasVencidas: number,
): AlertaPrioritaria[] {
  const foodAlerts = alertasAlimentacion.map((alerta) => ({
    titulo: alerta.alimento,
    detalle: alerta.mensaje,
    severidad: alerta.severidad,
    accionSugerida: alerta.severidad === 'CRITICA' ? 'Revisar stock y compra/ingreso de alimento.' : 'Planificar reposicion.',
  }));
  const sanitaryAlerts = alertasSanitarias.map((alerta) => ({
    titulo: alerta.tipo,
    detalle: alerta.mensaje,
    severidad: (alerta.estado === 'VENCIDA' || alerta.estado === 'PENDIENTE' ? 'CRITICA' : 'MEDIA') as SeveridadAlerta,
    accionSugerida: 'Programar o registrar el control sanitario correspondiente.',
  }));
  const agendaAlerts =
    tareasVencidas > 0
      ? [
          {
            titulo: 'Tareas vencidas de agenda',
            detalle: `Hay ${tareasVencidas} tareas vencidas pendientes.`,
            severidad: 'CRITICA' as const,
            accionSugerida: 'Revisar la agenda operativa y registrar o reprogramar tareas.',
          },
        ]
      : [];

  return [...agendaAlerts, ...foodAlerts, ...sanitaryAlerts];
}

function mapGroup<T extends string>(items: Array<Record<string, unknown>>, key: string) {
  return items.map((item) => ({
    nombre: String(item[key]),
    total: Number((item._count as { _all: number })._all),
  }));
}

export async function getDashboardResumen() {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const nextSevenDaysEnd = addDays(todayEnd, 7);

  const [
    totalAnimales,
    animalesActivos,
    animalesInactivos,
    animalesPorEstadoAnimal,
    animalesPorEstadoReproductivo,
    animalesPorCategoria,
    animalesPorLote,
    tareasVencidas,
    tareasHoy,
    tareasFuturas,
    tactosPendientes,
    secadosPendientes,
    partosPendientes,
    ultimosEventos,
    lotesWithActiveAnimals,
    insumosAlimentacion,
    sanitaryEvents,
    tareasHoyDetalle,
    tareasProximos7Dias,
  ] = await Promise.all([
    countAnimales(),
    countAnimales({ activo: true, estadoAnimal: EstadoAnimal.ACTIVO }),
    countAnimales({ activo: false }),
    groupAnimalesByEstadoAnimal(),
    groupAnimalesByEstadoReproductivo(),
    groupAnimalesByCategoria(),
    groupAnimalesByLote(),
    countTareas({ estado: EstadoTarea.PENDIENTE, fechaProgramada: { lt: todayStart } }),
    countTareas({ estado: EstadoTarea.PENDIENTE, fechaProgramada: { gte: todayStart, lte: todayEnd } }),
    countTareas({ estado: EstadoTarea.PENDIENTE, fechaProgramada: { gt: todayEnd } }),
    countTareas({ estado: EstadoTarea.PENDIENTE, tipo: TipoTarea.TACTO }),
    countTareas({ estado: EstadoTarea.PENDIENTE, tipo: TipoTarea.SECADO }),
    countTareas({ estado: EstadoTarea.PENDIENTE, tipo: TipoTarea.PARTO }),
    findUltimosEventos(),
    findLotesWithActiveAnimals(),
    findActiveInsumosAlimentacion(),
    findSanitaryEvents(),
    findTareasDetalle({ estado: EstadoTarea.PENDIENTE, fechaProgramada: { lte: todayEnd } }),
    findTareasDetalle({ estado: EstadoTarea.PENDIENTE, fechaProgramada: { gt: todayEnd, lte: nextSevenDaysEnd } }),
  ]);
  const { coberturaAlimentos, alertasAlimentacion } = buildFoodCoverage(lotesWithActiveAnimals, insumosAlimentacion);
  const { controlesSanitarios, alertasSanitarias } = buildSanitaryControls(sanitaryEvents, todayStart);
  const alertasPrioritarias = buildPriorityAlerts(alertasAlimentacion, alertasSanitarias, tareasVencidas);

  return {
    totalAnimales,
    animalesActivos,
    animalesInactivos,
    animalesPorEstadoAnimal: mapGroup(animalesPorEstadoAnimal, 'estadoAnimal'),
    animalesPorEstadoReproductivo: mapGroup(animalesPorEstadoReproductivo, 'estadoReproductivo'),
    animalesPorCategoria: mapGroup(animalesPorCategoria, 'categoria'),
    animalesPorLote: animalesPorLote.map((lote) => ({
      id: lote.id,
      nombre: lote.nombre,
      total: lote._count.animales,
    })),
    tareasVencidas,
    tareasHoy,
    tareasFuturas,
    tactosPendientes,
    secadosPendientes,
    partosPendientes,
    alertasAlimentacion,
    alertasSanitarias,
    alertasPrioritarias,
    coberturaAlimentos,
    controlesSanitarios,
    tareasHoyDetalle: tareasHoyDetalle.map(mapTareaDetalle),
    tareasProximos7Dias: tareasProximos7Dias.map(mapTareaDetalle),
    ultimosEventos: ultimosEventos.map((evento) => ({
      id: evento.id,
      fecha: evento.fecha,
      tipo: evento.tipo,
      observaciones: evento.observaciones,
      animal: evento.animal
        ? {
            id: evento.animal.id,
            caravana: evento.animal.caravana,
            lote: evento.animal.lote,
          }
        : null,
    })),
  };
}
