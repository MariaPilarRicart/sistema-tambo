import { EstadoAnimal, EstadoLoteLeche, EstadoTarea, TipoTarea } from '@prisma/client';
import {
  countAnimales,
  countEventosForDashboard,
  countProduccionesForDashboard,
  countRodeoGeneralForDashboard,
  countRegistrosAlimentacionForDashboard,
  countSanitaryTasks,
  countTareas,
  findAgendaTasksForDashboard,
  findAvailableLotesLeche,
  findInsumosForDashboard,
  findLotesLecheByDateRange,
  findProduccionesByDateRange,
  findSanitaryTasksForDashboard,
  findUltimosEventosSanitarios,
  findUltimosEventos,
  findUltimosMovimientosStockForDashboard,
  findUltimosRegistrosAlimentacionForDashboard,
  findVentasByDateRange,
  groupAnimalesByCategoria,
  groupAnimalesByEstadoAnimal,
  groupAnimalesByEstadoReproductivo,
  groupAnimalesByLote,
} from '../repositories/dashboard.repository';

export type DashboardPeriodo = 'hoy' | 'semana' | 'mes' | 'anio';
export type DashboardPeriodoInput = DashboardPeriodo | 'personalizado';

interface CustomDateRange {
  fechaDesde?: Date;
  fechaHasta?: Date;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

function subtractDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() - days);
  return nextDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function resolvePeriodRange(periodo: DashboardPeriodoInput, customRange: CustomDateRange = {}) {
  const now = new Date();

  if (periodo === 'personalizado' && customRange.fechaDesde && customRange.fechaHasta) {
    return {
      fechaDesde: startOfDay(customRange.fechaDesde),
      fechaHasta: endOfDay(customRange.fechaHasta),
    };
  }

  if (periodo === 'semana') {
    return { fechaDesde: startOfDay(subtractDays(now, 6)), fechaHasta: endOfDay(now) };
  }

  if (periodo === 'mes') {
    return { fechaDesde: new Date(now.getFullYear(), now.getMonth(), 1), fechaHasta: endOfDay(now) };
  }

  if (periodo === 'anio') {
    return { fechaDesde: new Date(now.getFullYear(), 0, 1), fechaHasta: endOfDay(now) };
  }

  return { fechaDesde: startOfDay(now), fechaHasta: endOfDay(now) };
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value) || 0;
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function formatSeriesLabel(date: Date, periodo: DashboardPeriodoInput, turno?: string) {
  const dateLabel = formatDateLabel(date);
  if (turno) return `${dateLabel} - ${formatTurno(turno)}`;
  if (periodo === 'anio') return date.toLocaleString('es-AR', { month: 'short' });
  return dateLabel;
}

function formatTurno(turno: string) {
  const labels: Record<string, string> = {
    MANANA: 'Turno mañana',
    TARDE: 'Turno tarde',
    NOCHE: 'Turno noche',
  };
  if (labels[turno]) return labels[turno];
  const readable = turno.toLowerCase().replace(/_/g, ' ');
  return `Turno ${readable}`;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function calculateCoverage(litrosNetos: number, litrosVendidos: number) {
  return Math.max(round(litrosNetos - litrosVendidos), 0);
}

function buildProductionSummary(
  producciones: Awaited<ReturnType<typeof findProduccionesByDateRange>>,
  lotesPeriodo: Awaited<ReturnType<typeof findLotesLecheByDateRange>>,
  periodo: DashboardPeriodoInput,
) {
  const litrosProducidos = producciones.reduce((total, item) => total + toNumber(item.litrosProducidos), 0);
  const litrosDescartados = producciones.reduce((total, item) => total + toNumber(item.litrosDescartados), 0);
  const litrosNetos = Math.max(litrosProducidos - litrosDescartados, 0);
  const animalIds = new Set(producciones.map((item) => item.animalId));
  const seriesMap = new Map<string, { etiqueta: string; litrosProducidos: number; litrosNetos: number; litrosDescartados: number }>();

  for (const item of producciones) {
    const etiqueta = formatSeriesLabel(item.fechaHora, periodo, periodo === 'hoy' ? item.turno : undefined);
    const current = seriesMap.get(etiqueta) ?? { etiqueta, litrosProducidos: 0, litrosNetos: 0, litrosDescartados: 0 };
    const produced = toNumber(item.litrosProducidos);
    const discarded = toNumber(item.litrosDescartados);
    current.litrosProducidos += produced;
    current.litrosDescartados += discarded;
    current.litrosNetos += Math.max(produced - discarded, 0);
    seriesMap.set(etiqueta, current);
  }

  const productionByLote = new Map<number, { codigo: string; litros: number }>();
  for (const item of producciones) {
    const current = productionByLote.get(item.loteLeche.id) ?? { codigo: item.loteLeche.codigo, litros: 0 };
    current.litros += toNumber(item.litrosProducidos);
    productionByLote.set(item.loteLeche.id, current);
  }
  const loteMayorProduccion = Array.from(productionByLote.values()).sort((a, b) => b.litros - a.litros)[0] ?? null;
  const ultimoLote = lotesPeriodo[0] ?? null;
  const series = Array.from(seriesMap.values()).map((item) => ({
    ...item,
    litrosProducidos: round(item.litrosProducidos),
    litrosNetos: round(item.litrosNetos),
    litrosDescartados: round(item.litrosDescartados),
  }));
  const uniqueProductionDays = new Set(producciones.map((item) => item.fechaHora.toISOString().slice(0, 10))).size;
  const promedioDiarioProducido = uniqueProductionDays > 0 ? round(litrosProducidos / uniqueProductionDays) : null;
  const sortedSeries = [...series].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  const firstHalf = sortedSeries.slice(0, Math.max(Math.floor(sortedSeries.length / 2), 1));
  const secondHalf = sortedSeries.slice(Math.max(Math.floor(sortedSeries.length / 2), 1));
  const firstAverage = firstHalf.length > 0 ? firstHalf.reduce((sum, item) => sum + item.litrosProducidos, 0) / firstHalf.length : 0;
  const secondAverage = secondHalf.length > 0 ? secondHalf.reduce((sum, item) => sum + item.litrosProducidos, 0) / secondHalf.length : 0;
  const trendDifference = firstAverage > 0 ? ((secondAverage - firstAverage) / firstAverage) * 100 : 0;
  const tendencia =
    sortedSeries.length < 2 || firstAverage === 0
      ? 'SIN_DATOS'
      : trendDifference > 5
        ? 'EN_ALZA'
        : trendDifference < -5
          ? 'EN_BAJA'
          : 'ESTABLE';
  const diaMayorProduccion = sortedSeries.length > 0
    ? [...sortedSeries].sort((a, b) => b.litrosProducidos - a.litrosProducidos)[0]
    : null;

  return {
    litrosProducidos: round(litrosProducidos),
    litrosNetos: round(litrosNetos),
    litrosDescartados: round(litrosDescartados),
    porcentajeDescarte: litrosProducidos > 0 ? round((litrosDescartados / litrosProducidos) * 100) : 0,
    cantidadRegistros: producciones.length,
    animalesConProduccion: animalIds.size,
    promedioLitrosPorAnimal: animalIds.size > 0 ? round(litrosProducidos / animalIds.size) : null,
    promedioDiarioProducido,
    diaMayorProduccion: diaMayorProduccion
      ? { etiqueta: diaMayorProduccion.etiqueta, litrosProducidos: diaMayorProduccion.litrosProducidos }
      : null,
    tendencia,
    ultimoLote: ultimoLote
      ? {
          id: ultimoLote.id,
          codigo: ultimoLote.codigo,
          fechaProduccion: ultimoLote.fechaProduccion,
          litrosNetos: round(toNumber(ultimoLote.litrosNetos)),
        }
      : null,
    loteMayorProduccion: loteMayorProduccion
      ? {
          codigo: loteMayorProduccion.codigo,
          litrosProducidos: round(loteMayorProduccion.litros),
        }
      : null,
    series,
  };
}

function buildSalesSummary(
  ventas: Awaited<ReturnType<typeof findVentasByDateRange>>,
  litrosProducidos: number,
  periodo: DashboardPeriodoInput,
) {
  const litrosVendidos = ventas.reduce((total, venta) => total + toNumber(venta.totalLitros), 0);
  const facturacion = ventas.reduce((total, venta) => total + toNumber(venta.precioTotal), 0);
  const ultimaVenta = ventas[0] ?? null;
  const seriesMap = new Map<string, { etiqueta: string; litrosVendidos: number; facturacion: number }>();

  for (const venta of ventas) {
    const etiqueta = periodo === 'anio'
      ? venta.fechaVenta.toLocaleString('es-AR', { month: 'short' })
      : formatDateLabel(venta.fechaVenta);
    const current = seriesMap.get(etiqueta) ?? { etiqueta, litrosVendidos: 0, facturacion: 0 };
    current.litrosVendidos += toNumber(venta.totalLitros);
    current.facturacion += toNumber(venta.precioTotal);
    seriesMap.set(etiqueta, current);
  }

  return {
    litrosVendidos: round(litrosVendidos),
    facturacion: round(facturacion),
    precioPromedioLitro: litrosVendidos > 0 ? round(facturacion / litrosVendidos) : null,
    cantidadVentas: ventas.length,
    porcentajeProduccionVendida: litrosProducidos > 0 ? round((litrosVendidos / litrosProducidos) * 100) : 0,
    series: Array.from(seriesMap.values()).map((item) => ({
      etiqueta: item.etiqueta,
      litrosVendidos: round(item.litrosVendidos),
      facturacion: round(item.facturacion),
    })),
    ultimaVenta: ultimaVenta
      ? {
          id: ultimaVenta.id,
          fecha: ultimaVenta.fechaVenta,
          cliente: ultimaVenta.cliente.razonSocial,
          litros: round(toNumber(ultimaVenta.totalLitros)),
          total: round(toNumber(ultimaVenta.precioTotal)),
        }
      : null,
    ultimasVentas: ventas.slice(0, 5).map((venta) => ({
      id: venta.id,
      fecha: venta.fechaVenta,
      factura: venta.numeroFactura,
      cliente: venta.cliente.razonSocial,
      litros: round(toNumber(venta.totalLitros)),
      total: round(toNumber(venta.precioTotal)),
    })),
  };
}

function buildMilkSummary(lotes: Awaited<ReturnType<typeof findAvailableLotesLeche>>, todayStart: Date) {
  const nextFortyEightHours = addDays(new Date(), 2);
  const nextSevenDays = addDays(todayStart, 7);
  const lotesMapped = lotes.map((lote) => {
    const litrosVendidos = lote.ventaDetalles.reduce((total, detalle) => total + toNumber(detalle.litrosVendidos), 0);
    const litrosNetos = toNumber(lote.litrosNetos);
    return {
      id: lote.id,
      codigo: lote.codigo,
      fechaProduccion: lote.fechaProduccion,
      fechaVencimiento: lote.fechaVencimiento,
      litrosNetos: round(litrosNetos),
      litrosVendidos: round(litrosVendidos),
      litrosDisponibles: calculateCoverage(litrosNetos, litrosVendidos),
      estado: lote.estado,
    };
  });
  const lotesConDisponibilidad = lotesMapped.filter((lote) => lote.litrosDisponibles > 0);
  const lotesVencidos = lotesConDisponibilidad.filter(
    (lote) => lote.estado === EstadoLoteLeche.VENCIDO || lote.fechaVencimiento < todayStart,
  );
  const lotesDisponibles = lotesConDisponibilidad.filter(
    (lote) => lote.estado !== EstadoLoteLeche.VENCIDO && lote.fechaVencimiento >= todayStart,
  );
  const vence48Horas = lotesDisponibles.filter((lote) => lote.fechaVencimiento <= nextFortyEightHours);
  const vence7Dias = lotesDisponibles.filter((lote) => lote.fechaVencimiento > nextFortyEightHours && lote.fechaVencimiento <= nextSevenDays);
  const sinRiesgo = lotesDisponibles.filter((lote) => lote.fechaVencimiento > nextSevenDays);
  const summarizeRisk = (items: typeof lotesMapped) => ({
    lotes: items.length,
    litros: round(items.reduce((total, lote) => total + lote.litrosDisponibles, 0)),
  });

  return {
    litrosDisponibles: round(lotesDisponibles.reduce((total, lote) => total + lote.litrosDisponibles, 0)),
    lotesDisponibles: lotesDisponibles.length,
    lotesProximosAVencer: [...vence48Horas, ...vence7Dias].length,
    vencida: {
      lotes: lotesVencidos.length,
      litros: round(lotesVencidos.reduce((total, lote) => total + lote.litrosDisponibles, 0)),
      lotesDetalle: lotesVencidos.slice(0, 5).map((lote) => ({
        id: lote.id,
        codigo: lote.codigo,
        fechaVencimiento: lote.fechaVencimiento,
        litrosDisponibles: lote.litrosDisponibles,
        accionSugerida: 'Retirar de disponibilidad o revisar lote',
      })),
    },
    riesgoVencimiento: {
      vence48Horas: summarizeRisk(vence48Horas),
      vence7Dias: summarizeRisk(vence7Dias),
      sinRiesgo: summarizeRisk(sinRiesgo),
      urgentes: [...vence48Horas, ...vence7Dias]
        .slice(0, 3)
        .map((lote) => ({
          id: lote.id,
          codigo: lote.codigo,
          fechaVencimiento: lote.fechaVencimiento,
          litrosDisponibles: lote.litrosDisponibles,
          accionSugerida: 'Priorizar venta si tiene litros disponibles',
        })),
    },
    lotes: lotesDisponibles.slice(0, 8),
  };
}

function buildFeedingSummary(
  insumos: Awaited<ReturnType<typeof findInsumosForDashboard>>,
  ultimosMovimientos: Awaited<ReturnType<typeof findUltimosMovimientosStockForDashboard>>,
  ultimosRegistros: Awaited<ReturnType<typeof findUltimosRegistrosAlimentacionForDashboard>>,
) {
  const insumosMapped = insumos.map((insumo) => {
    const stockActual = toNumber(insumo.stockActual);
    const stockMinimo = toNumber(insumo.stockMinimo);
    const estado = stockActual === 0 ? 'CRITICO' : stockActual < stockMinimo ? 'BAJO' : 'OK';

    return {
      id: insumo.id,
      alimento: insumo.nombre,
      stockActual: round(stockActual),
      stockMinimo: round(stockMinimo),
      unidad: insumo.unidadMedida,
      estado,
    };
  });

  return {
    insumosActivos: insumos.length,
    insumosBajoMinimo: insumosMapped.filter((insumo) => insumo.estado === 'BAJO').length,
    estadoGeneral: insumosMapped.some((insumo) => insumo.estado === 'CRITICO')
      ? 'Stock crítico'
      : insumosMapped.some((insumo) => insumo.estado === 'BAJO')
        ? 'Revisar compras'
        : 'Stock normal',
    insumosConRiesgo: insumosMapped.filter((insumo) => insumo.estado !== 'OK').slice(0, 5),
    insumos: insumosMapped,
    ultimosMovimientos: ultimosMovimientos.map((movimiento) => ({
      id: movimiento.id,
      fecha: movimiento.fecha,
      tipoMovimiento: movimiento.tipoMovimiento,
      alimento: movimiento.insumo.nombre,
      cantidad: round(movimiento.cantidad),
      unidad: movimiento.insumo.unidadMedida,
    })),
    ultimosRegistros: ultimosRegistros.map((registro) => ({
      id: registro.id,
      fecha: registro.fecha,
      lote: registro.lote?.nombre ?? registro.categoriaAnimal,
      racion: registro.racion?.nombre ?? 'Sin racion',
      cantidadKg: round(registro.cantidadKg),
    })),
  };
}

function buildSanitarySummary(
  tareas: Awaited<ReturnType<typeof findSanitaryTasksForDashboard>>,
  ultimosEventos: Awaited<ReturnType<typeof findUltimosEventosSanitarios>>,
  vencidas: number,
  proximas: number,
) {
  return {
    tareasSanitariasVencidas: vencidas,
    tareasSanitariasProximas: proximas,
    controlesPendientes: vencidas + proximas,
    proximoControlUrgente: tareas[0]
      ? {
          id: tareas[0].id,
          tipo: tareas[0].tipoSanitario ?? tareas[0].tipo,
          fechaObjetivo: tareas[0].fechaObjetivo ?? tareas[0].fechaProgramada,
        }
      : null,
    tipoControlMasRepetido: Object.entries(
      tareas.reduce<Record<string, number>>((counts, tarea) => {
        const key = tarea.tipoSanitario ?? String(tarea.tipo);
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
      }, {}),
    ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    tareas: tareas.map((tarea) => ({
      id: tarea.id,
      tipo: tarea.tipoSanitario ?? tarea.tipo,
      fechaObjetivo: tarea.fechaObjetivo ?? tarea.fechaProgramada,
      alcance: tarea.alcanceTipo ?? 'ANIMAL',
      estado: tarea.estado,
      lote: tarea.alcanceLote?.nombre ?? null,
      categoria: tarea.alcanceCategoria ?? null,
    })),
    ultimosEventos: ultimosEventos.map((evento) => ({
      id: evento.id,
      fecha: evento.fecha,
      tipo: evento.tipo,
      animal: evento.animal?.caravana ?? null,
      observaciones: evento.observaciones,
    })),
  };
}

function buildManagementAlerts(input: {
  tareasVencidas: number;
  litrosDisponibles: number;
  lotesProximosAVencer: number;
  porcentajeDescarte: number;
  insumosBajoMinimo: number;
  insumosAgotados: number;
  controlesSanitariosVencidos: number;
  controlesSanitariosProximos: number;
  litrosProducidos: number;
  cantidadVentas: number;
}) {
  const alerts = [];

  if (input.tareasVencidas > 0) {
    alerts.push({
      codigo: 'TAREAS_VENCIDAS',
      titulo: 'Agenda pendiente',
      detalle: `Hay ${input.tareasVencidas} tareas de agenda vencidas.`,
      severidad: 'CRITICA',
      accionSugerida: 'Revisar agenda y resolver pendientes hoy.',
      accionLabel: 'Ver agenda',
      accionRuta: '/agenda',
    });
  }
  if (input.insumosBajoMinimo > 0 || input.insumosAgotados > 0) {
    const detalleStock = input.insumosBajoMinimo > 0 && input.insumosAgotados > 0
      ? `${input.insumosBajoMinimo} insumos bajo mínimo y ${input.insumosAgotados} agotado${input.insumosAgotados === 1 ? '' : 's'}.`
      : input.insumosBajoMinimo > 0
        ? `${input.insumosBajoMinimo} insumo${input.insumosBajoMinimo === 1 ? '' : 's'} bajo mínimo.`
        : `${input.insumosAgotados} insumo${input.insumosAgotados === 1 ? '' : 's'} agotado${input.insumosAgotados === 1 ? '' : 's'}.`;
    alerts.push({
      codigo: 'STOCK_CRITICO',
      titulo: 'Stock de alimentos',
      detalle: detalleStock,
      severidad: 'CRITICA',
      accionSugerida: input.insumosAgotados > 0 ? 'Reponer alimento de forma urgente.' : 'Planificar reposicion de alimento.',
      accionLabel: 'Ver alimentación',
      accionRuta: '/alimentacion',
    });
  }
  const controlesPendientes = input.controlesSanitariosVencidos + input.controlesSanitariosProximos;
  if (controlesPendientes > 0) {
    alerts.push({
      codigo: 'SANIDAD_PENDIENTE',
      titulo: 'Controles sanitarios',
      detalle: input.controlesSanitariosVencidos > 0
        ? `${input.controlesSanitariosVencidos} controles sanitarios vencidos.`
        : `${input.controlesSanitariosProximos} controles sanitarios próximos.`,
      severidad: input.controlesSanitariosVencidos > 0 ? 'CRITICA' : 'MEDIA',
      accionSugerida: input.controlesSanitariosVencidos > 0 ? 'Revisar vacunación hoy.' : 'Programar o registrar los controles sanitarios.',
      accionLabel: 'Ver vacunación',
      accionRuta: '/vacunacion',
    });
  }
  if (input.litrosDisponibles > 0) {
    alerts.push({
      codigo: 'LECHE_DISPONIBLE',
      titulo: 'Leche disponible para venta',
      detalle: `Hay ${round(input.litrosDisponibles)} litros disponibles para vender.`,
      severidad: 'INFO',
      accionSugerida: 'Evaluar venta o seguimiento de vencimientos.',
      accionLabel: 'Registrar venta',
      accionRuta: '/ventas',
    });
  }
  if (input.lotesProximosAVencer > 0) {
    alerts.push({
      codigo: 'LOTES_POR_VENCER',
      titulo: 'Lotes proximos a vencer',
      detalle: `${input.lotesProximosAVencer} lotes de leche vencen en los proximos 7 dias.`,
      severidad: 'MEDIA',
      accionSugerida: 'Priorizar venta o control de calidad.',
      accionLabel: 'Ver producción',
      accionRuta: '/produccion',
    });
  }
  if (input.porcentajeDescarte >= 10) {
    alerts.push({
      codigo: 'DESCARTE_ELEVADO',
      titulo: 'Descarte elevado',
      detalle: `El descarte representa ${round(input.porcentajeDescarte)}% de la produccion del periodo.`,
      severidad: 'MEDIA',
      accionSugerida: 'Revisar motivos de descarte y sanidad.',
      accionLabel: 'Ver producción',
      accionRuta: '/produccion',
    });
  }
  if (input.litrosProducidos === 0) {
    alerts.push({
      codigo: 'SIN_PRODUCCION',
      titulo: 'Sin produccion registrada',
      detalle: 'No hubo produccion registrada en el periodo.',
      severidad: 'INFO',
      accionSugerida: 'Verificar si falta cargar produccion.',
      accionLabel: 'Ver producción',
      accionRuta: '/produccion',
    });
  }
  if (input.cantidadVentas === 0) {
    alerts.push({
      codigo: 'SIN_VENTAS',
      titulo: 'Sin ventas registradas',
      detalle: 'No hubo ventas registradas en el periodo.',
      severidad: 'INFO',
      accionSugerida: 'Revisar leche disponible y oportunidades de venta.',
      accionLabel: 'Ver ventas',
      accionRuta: '/ventas',
    });
  }

  return alerts.slice(0, 8);
}

function taskDate(task: { fechaObjetivo: Date | null; fechaProgramada: Date }) {
  return task.fechaObjetivo ?? task.fechaProgramada;
}

function mapDashboardTask(task: Awaited<ReturnType<typeof findAgendaTasksForDashboard>>[number]) {
  return {
    id: task.id,
    tipoTarea: task.tipoSanitario ?? task.tipo,
    fechaProyectada: taskDate(task),
    estado: task.estado,
    descripcion: task.descripcion,
    animal: task.animal
      ? {
          id: task.animal.id,
          caravana: task.animal.caravana,
          lote: task.animal.lote,
        }
      : null,
    lote: task.alcanceLote,
  };
}

function buildOperationalAlerts(input: {
  tareasVencidas: number;
  tareasHoy: number;
  produccionesHoy: number;
  registrosAlimentacionHoy: number;
  eventosHoy: number;
  insumosBajoMinimo: number;
  controlesPendientes: number;
  partosPendientes: number;
  secadosPendientes: number;
}) {
  const alerts = [];

  if (input.tareasVencidas > 0) {
    alerts.push({
      titulo: 'Tareas vencidas',
      detalle: 'Hay tareas de agenda para revisar primero.',
      severidad: 'CRITICA',
      accionLabel: 'Ver agenda',
      accionRuta: '/agenda',
    });
  }
  if (input.produccionesHoy === 0) {
    alerts.push({
      titulo: 'Producción pendiente',
      detalle: 'No se registró producción hoy.',
      severidad: 'MEDIA',
      accionLabel: 'Registrar producción',
      accionRuta: '/produccion',
    });
  }
  if (input.registrosAlimentacionHoy === 0) {
    alerts.push({
      titulo: 'Alimentación pendiente',
      detalle: 'No se registró alimentación hoy.',
      severidad: 'MEDIA',
      accionLabel: 'Registrar alimentación',
      accionRuta: '/alimentacion',
    });
  }
  if (input.controlesPendientes > 0) {
    alerts.push({
      titulo: 'Vacunación o control pendiente',
      detalle: 'Hay controles sanitarios próximos o vencidos.',
      severidad: 'MEDIA',
      accionLabel: 'Ver vacunación',
      accionRuta: '/vacunacion',
    });
  }
  if (input.partosPendientes > 0) {
    alerts.push({
      titulo: 'Partos próximos',
      detalle: 'Hay partos pendientes para seguimiento.',
      severidad: 'INFO',
      accionLabel: 'Ver agenda',
      accionRuta: '/agenda',
    });
  }
  if (input.secadosPendientes > 0) {
    alerts.push({
      titulo: 'Secados próximos',
      detalle: 'Hay vacas a preparar para secado.',
      severidad: 'INFO',
      accionLabel: 'Ver agenda',
      accionRuta: '/agenda',
    });
  }
  if (input.insumosBajoMinimo > 0) {
    alerts.push({
      titulo: 'Stock bajo de alimento',
      detalle: 'Avisar al administrador para revisar reposición.',
      severidad: 'MEDIA',
      accionLabel: 'Ver alimentación',
      accionRuta: '/alimentacion',
    });
  }
  if (input.eventosHoy === 0) {
    alerts.push({
      titulo: 'Sin eventos registrados',
      detalle: 'Si hubo novedades, cargarlas durante la jornada.',
      severidad: 'INFO',
      accionLabel: 'Registrar evento',
      accionRuta: '/eventos',
    });
  }

  return alerts.slice(0, 5);
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function mapGroup<T extends string>(items: Array<Record<string, unknown>>, key: string) {
  return items.map((item) => ({
    nombre: String(item[key]),
    total: Number((item._count as { _all: number })._all),
  }));
}

export async function getDashboardResumen(periodo: DashboardPeriodoInput = 'hoy', customRange: CustomDateRange = {}) {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const { fechaDesde, fechaHasta } = resolvePeriodRange(periodo, customRange);
  const nextSanitaryLimit = addDays(todayEnd, 30);
  const nextSevenDaysEnd = endOfDay(addDays(todayStart, 7));
  const agendaTaskTypes = [TipoTarea.TACTO, TipoTarea.SECADO, TipoTarea.PARTO, TipoTarea.ALTA_POST_PARTO];

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
    rodeoGeneral,
    produccionesPeriodo,
    lotesPeriodo,
    ventasPeriodo,
    lotesDisponibles,
    insumos,
    ultimosMovimientosStock,
    ultimosRegistrosAlimentacion,
    tareasSanitarias,
    tareasSanitariasVencidas,
    tareasSanitariasProximas,
    ultimosEventosSanitarios,
    tareasVencidasDetalle,
    tareasHoyDetalle,
    tareasProximos7Dias,
    produccionesHoy,
    registrosAlimentacionHoy,
    eventosHoy,
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
    countRodeoGeneralForDashboard(),
    findProduccionesByDateRange(fechaDesde, fechaHasta),
    findLotesLecheByDateRange(fechaDesde, fechaHasta),
    findVentasByDateRange(fechaDesde, fechaHasta),
    findAvailableLotesLeche(),
    findInsumosForDashboard(),
    findUltimosMovimientosStockForDashboard(),
    findUltimosRegistrosAlimentacionForDashboard(),
    findSanitaryTasksForDashboard(todayStart, nextSanitaryLimit),
    countSanitaryTasks({ estado: EstadoTarea.PENDIENTE, tipoSanitario: { not: null }, fechaObjetivo: { lt: todayStart } }),
    countSanitaryTasks({ estado: EstadoTarea.PENDIENTE, tipoSanitario: { not: null }, fechaObjetivo: { gte: todayStart, lte: nextSanitaryLimit } }),
    findUltimosEventosSanitarios(),
    findAgendaTasksForDashboard({ estado: EstadoTarea.PENDIENTE, tipo: { in: agendaTaskTypes }, tipoSanitario: null, fechaProgramada: { lt: todayStart } }),
    findAgendaTasksForDashboard({ estado: EstadoTarea.PENDIENTE, tipo: { in: agendaTaskTypes }, tipoSanitario: null, fechaProgramada: { gte: todayStart, lte: todayEnd } }),
    findAgendaTasksForDashboard({ estado: EstadoTarea.PENDIENTE, tipo: { in: agendaTaskTypes }, tipoSanitario: null, fechaProgramada: { gt: todayEnd, lte: nextSevenDaysEnd } }),
    countProduccionesForDashboard(todayStart, todayEnd),
    countRegistrosAlimentacionForDashboard(todayStart, todayEnd),
    countEventosForDashboard(todayStart, todayEnd),
  ]);
  const resumenProduccion = buildProductionSummary(produccionesPeriodo, lotesPeriodo, periodo);
  const resumenVentas = buildSalesSummary(ventasPeriodo, resumenProduccion.litrosProducidos, periodo);
  const resumenLeche = buildMilkSummary(lotesDisponibles, todayStart);
  const resumenAlimentacion = buildFeedingSummary(insumos, ultimosMovimientosStock, ultimosRegistrosAlimentacion);
  const resumenSanidad = buildSanitarySummary(tareasSanitarias, ultimosEventosSanitarios, tareasSanitariasVencidas, tareasSanitariasProximas);
  const agendaTareasVencidas = tareasVencidasDetalle.length;
  const agendaTareasHoy = tareasHoyDetalle.length;
  const agendaTareasFuturas = tareasProximos7Dias.length;
  const insumosAgotados = resumenAlimentacion.insumos.filter((insumo) => insumo.estado === 'CRITICO').length;
  const alertasGestion = buildManagementAlerts({
    tareasVencidas: agendaTareasVencidas,
    litrosDisponibles: resumenLeche.litrosDisponibles,
    lotesProximosAVencer: resumenLeche.lotesProximosAVencer,
    porcentajeDescarte: resumenProduccion.porcentajeDescarte,
    insumosBajoMinimo: resumenAlimentacion.insumosBajoMinimo,
    insumosAgotados,
    controlesSanitariosVencidos: resumenSanidad.tareasSanitariasVencidas,
    controlesSanitariosProximos: resumenSanidad.tareasSanitariasProximas,
    litrosProducidos: resumenProduccion.litrosProducidos,
    cantidadVentas: resumenVentas.cantidadVentas,
  });
  const tareasPrioritarias = [
    ...tareasVencidasDetalle,
    ...tareasHoyDetalle,
    ...tareasProximos7Dias,
  ].slice(0, 5).map(mapDashboardTask);
  const alertasOperativas = buildOperationalAlerts({
    tareasVencidas,
    tareasHoy,
    produccionesHoy,
    registrosAlimentacionHoy,
    eventosHoy,
    insumosBajoMinimo: resumenAlimentacion.insumosBajoMinimo,
    controlesPendientes: resumenSanidad.controlesPendientes,
    partosPendientes,
    secadosPendientes,
  });

  return {
    periodo,
    fechaDesde,
    fechaHasta,
    totalAnimales,
    animalesActivos,
    animalesInactivos,
    animalesPorEstadoAnimal: mapGroup(animalesPorEstadoAnimal, 'estadoAnimal'),
    animalesPorEstadoReproductivo: mapGroup(animalesPorEstadoReproductivo, 'estadoReproductivo'),
    animalesPorCategoria: mapGroup(animalesPorCategoria, 'categoriaAnimal'),
    animalesPorLote: animalesPorLote.map((lote) => ({
      id: lote.id,
      nombre: lote.nombre,
      total: lote._count.animales,
    })),
    tareasVencidas: agendaTareasVencidas,
    tareasHoy: agendaTareasHoy,
    tareasFuturas: agendaTareasFuturas,
    tactosPendientes,
    secadosPendientes,
    partosPendientes,
    resumenProduccion,
    resumenVentas,
    resumenLeche,
    resumenAlimentacion,
    resumenSanidad,
    alertasGestion,
    resumenRodeo: {
      vacasProduccion: rodeoGeneral.vacasProduccion,
      vacasSecasPreparto: rodeoGeneral.vacasSecasPreparto,
      vaquillonas: rodeoGeneral.vaquillonas,
    },
    tareasPrioritarias,
    tareasVencidasDetalle: tareasVencidasDetalle.map(mapDashboardTask),
    tareasHoyDetalle: tareasHoyDetalle.map(mapDashboardTask),
    tareasProximos7Dias: tareasProximos7Dias.map(mapDashboardTask),
    proximosTrabajos: {
      partos: tareasProximos7Dias.filter((tarea) => tarea.tipo === TipoTarea.PARTO).slice(0, 3).map(mapDashboardTask),
      secados: tareasProximos7Dias.filter((tarea) => tarea.tipo === TipoTarea.SECADO).slice(0, 3).map(mapDashboardTask),
      tactos: [...tareasVencidasDetalle, ...tareasHoyDetalle, ...tareasProximos7Dias]
        .filter((tarea) => tarea.tipo === TipoTarea.TACTO)
        .slice(0, 3)
        .map(mapDashboardTask),
    },
    alertasOperativas,
    cargaDia: {
      produccionRegistrada: produccionesHoy > 0,
      alimentacionRegistrada: registrosAlimentacionHoy > 0,
      eventosRegistrados: eventosHoy,
    },
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
