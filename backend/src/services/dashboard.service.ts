import { EstadoAnimal, EstadoTarea, TipoTarea } from '@prisma/client';
import {
  countAnimales,
  countTareas,
  findUltimosEventos,
  groupAnimalesByCategoria,
  groupAnimalesByEstadoAnimal,
  groupAnimalesByEstadoReproductivo,
  groupAnimalesByLote,
} from '../repositories/dashboard.repository';

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

function mapGroup<T extends string>(items: Array<Record<string, unknown>>, key: string) {
  return items.map((item) => ({
    nombre: String(item[key]),
    total: Number((item._count as { _all: number })._all),
  }));
}

export async function getDashboardResumen() {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

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
  ]);

  return {
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
