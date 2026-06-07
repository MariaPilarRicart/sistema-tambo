import { EstadoAnimal, EstadoTarea, TipoTarea } from '@prisma/client';
import {
  countAnimales,
  countSanitaryTasks,
  countTareas,
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

function resolvePeriodRange(periodo: DashboardPeriodo) {
  const now = new Date();

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

function formatSeriesLabel(date: Date, periodo: DashboardPeriodo, turno?: string) {
  if (periodo === 'hoy' && turno) return turno;
  if (periodo === 'anio') return date.toLocaleString('es-AR', { month: 'short' });
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function calculateCoverage(litrosNetos: number, litrosVendidos: number) {
  return Math.max(round(litrosNetos - litrosVendidos), 0);
}

function buildProductionSummary(
  producciones: Awaited<ReturnType<typeof findProduccionesByDateRange>>,
  lotesPeriodo: Awaited<ReturnType<typeof findLotesLecheByDateRange>>,
  periodo: DashboardPeriodo,
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

  return {
    litrosProducidos: round(litrosProducidos),
    litrosNetos: round(litrosNetos),
    litrosDescartados: round(litrosDescartados),
    porcentajeDescarte: litrosProducidos > 0 ? round((litrosDescartados / litrosProducidos) * 100) : 0,
    cantidadRegistros: producciones.length,
    animalesConProduccion: animalIds.size,
    promedioLitrosPorAnimal: animalIds.size > 0 ? round(litrosProducidos / animalIds.size) : null,
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
    series: Array.from(seriesMap.values()).map((item) => ({
      ...item,
      litrosProducidos: round(item.litrosProducidos),
      litrosNetos: round(item.litrosNetos),
      litrosDescartados: round(item.litrosDescartados),
    })),
  };
}

function buildSalesSummary(ventas: Awaited<ReturnType<typeof findVentasByDateRange>>) {
  const litrosVendidos = ventas.reduce((total, venta) => total + toNumber(venta.totalLitros), 0);
  const facturacion = ventas.reduce((total, venta) => total + toNumber(venta.precioTotal), 0);

  return {
    litrosVendidos: round(litrosVendidos),
    facturacion: round(facturacion),
    precioPromedioLitro: litrosVendidos > 0 ? round(facturacion / litrosVendidos) : null,
    cantidadVentas: ventas.length,
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

  return {
    litrosDisponibles: round(lotesMapped.reduce((total, lote) => total + lote.litrosDisponibles, 0)),
    lotesDisponibles: lotesMapped.length,
    lotesProximosAVencer: lotesMapped.filter((lote) => lote.fechaVencimiento <= nextSevenDays).length,
    lotes: lotesMapped.slice(0, 8),
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
    const estado = stockActual <= 0 ? 'CRITICO' : stockActual <= stockMinimo ? 'BAJO' : 'OK';

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
    insumosBajoMinimo: insumosMapped.filter((insumo) => insumo.estado !== 'OK').length,
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
  controlesPendientes: number;
  litrosProducidos: number;
  cantidadVentas: number;
}) {
  const alerts = [];

  if (input.tareasVencidas > 0) {
    alerts.push({
      titulo: 'Tareas vencidas',
      detalle: `Hay ${input.tareasVencidas} tareas vencidas pendientes.`,
      severidad: 'CRITICA',
      accionSugerida: 'Revisar agenda y resolver pendientes hoy.',
    });
  }
  if (input.insumosBajoMinimo > 0) {
    alerts.push({
      titulo: 'Stock critico de alimentos',
      detalle: `${input.insumosBajoMinimo} insumos estan en minimo o por debajo.`,
      severidad: 'CRITICA',
      accionSugerida: 'Planificar reposicion de alimento.',
    });
  }
  if (input.controlesPendientes > 0) {
    alerts.push({
      titulo: 'Controles sanitarios pendientes',
      detalle: `${input.controlesPendientes} controles sanitarios requieren atencion.`,
      severidad: 'MEDIA',
      accionSugerida: 'Programar o registrar los controles sanitarios.',
    });
  }
  if (input.litrosDisponibles > 0) {
    alerts.push({
      titulo: 'Leche disponible para venta',
      detalle: `Hay ${round(input.litrosDisponibles)} litros disponibles para vender.`,
      severidad: 'INFO',
      accionSugerida: 'Evaluar venta o seguimiento de vencimientos.',
    });
  }
  if (input.lotesProximosAVencer > 0) {
    alerts.push({
      titulo: 'Lotes proximos a vencer',
      detalle: `${input.lotesProximosAVencer} lotes de leche vencen en los proximos 7 dias.`,
      severidad: 'MEDIA',
      accionSugerida: 'Priorizar venta o control de calidad.',
    });
  }
  if (input.porcentajeDescarte >= 10) {
    alerts.push({
      titulo: 'Descarte elevado',
      detalle: `El descarte representa ${round(input.porcentajeDescarte)}% de la produccion del periodo.`,
      severidad: 'MEDIA',
      accionSugerida: 'Revisar motivos de descarte y sanidad.',
    });
  }
  if (input.litrosProducidos === 0) {
    alerts.push({
      titulo: 'Sin produccion registrada',
      detalle: 'No hubo produccion registrada en el periodo.',
      severidad: 'INFO',
      accionSugerida: 'Verificar si falta cargar produccion.',
    });
  }
  if (input.cantidadVentas === 0) {
    alerts.push({
      titulo: 'Sin ventas registradas',
      detalle: 'No hubo ventas registradas en el periodo.',
      severidad: 'INFO',
      accionSugerida: 'Revisar leche disponible y oportunidades de venta.',
    });
  }

  return alerts.slice(0, 8);
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

export async function getDashboardResumen(periodo: DashboardPeriodo = 'hoy') {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const { fechaDesde, fechaHasta } = resolvePeriodRange(periodo);
  const nextSanitaryLimit = addDays(todayEnd, 30);

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
  ]);
  const resumenProduccion = buildProductionSummary(produccionesPeriodo, lotesPeriodo, periodo);
  const resumenVentas = buildSalesSummary(ventasPeriodo);
  const resumenLeche = buildMilkSummary(lotesDisponibles, todayStart);
  const resumenAlimentacion = buildFeedingSummary(insumos, ultimosMovimientosStock, ultimosRegistrosAlimentacion);
  const resumenSanidad = buildSanitarySummary(tareasSanitarias, ultimosEventosSanitarios, tareasSanitariasVencidas, tareasSanitariasProximas);
  const alertasGestion = buildManagementAlerts({
    tareasVencidas,
    litrosDisponibles: resumenLeche.litrosDisponibles,
    lotesProximosAVencer: resumenLeche.lotesProximosAVencer,
    porcentajeDescarte: resumenProduccion.porcentajeDescarte,
    insumosBajoMinimo: resumenAlimentacion.insumosBajoMinimo,
    controlesPendientes: resumenSanidad.controlesPendientes,
    litrosProducidos: resumenProduccion.litrosProducidos,
    cantidadVentas: resumenVentas.cantidadVentas,
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
    tareasVencidas,
    tareasHoy,
    tareasFuturas,
    tactosPendientes,
    secadosPendientes,
    partosPendientes,
    resumenProduccion,
    resumenVentas,
    resumenLeche,
    resumenAlimentacion,
    resumenSanidad,
    alertasGestion,
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
