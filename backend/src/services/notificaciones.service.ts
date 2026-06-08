import { EstadoAnimal, EstadoLoteLeche, EstadoTarea, TipoTarea, type RolUsuario } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { getVaccinationSummary } from './vacunacion.service';

type NotificationPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

interface NotificationItem {
  id: string;
  clave: string;
  firma: string;
  titulo: string;
  descripcion: string;
  modulo: string;
  prioridad: NotificationPriority;
  prioridadOrden: number;
  ruta: string;
}

function todayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function moduleFromRoute(route: string) {
  if (route.startsWith('/alimentacion')) return 'Alimentación';
  if (route.startsWith('/vacunacion')) return 'Vacunación';
  if (route.startsWith('/rodeos')) return 'Rodeo';
  if (route.startsWith('/agenda')) return 'Agenda';
  if (route.startsWith('/produccion')) return 'Producción';
  return 'Sistema';
}

function notification(
  clave: string,
  cantidad: number,
  titulo: string,
  descripcion: string,
  prioridad: NotificationPriority,
  prioridadOrden: number,
  ruta: string,
): NotificationItem {
  const firma = `cantidad:${cantidad}`;
  return {
    id: `${clave}-${cantidad}`,
    clave,
    firma,
    titulo,
    descripcion,
    modulo: moduleFromRoute(ruta),
    prioridad,
    prioridadOrden,
    ruta,
  };
}

function parseRequiredText(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(`${fieldName} es obligatorio.`, 400);
  }
  return value.trim();
}

export async function getSimpleNotifications(usuarioId: number, _rol: RolUsuario) {
  const today = todayStart();
  const nextSevenDays = addDays(today, 7);

  const [vaccinationSummary, stockAgotado, stockBajo, agendaVencidas, partosProximos, lotesLecheVencidos] = await Promise.all([
    getVaccinationSummary(),
    prisma.insumoAlimentacion.count({
      where: {
        activo: true,
        stockActual: { lte: 0 },
      },
    }),
    prisma.insumoAlimentacion.count({
      where: {
        activo: true,
        stockActual: { gt: 0 },
        AND: [{ stockActual: { lte: prisma.insumoAlimentacion.fields.stockMinimo } }],
      },
    }),
    prisma.agendaTarea.count({
      where: {
        estado: EstadoTarea.PENDIENTE,
        tipoSanitario: null,
        OR: [
          { fechaObjetivo: { lt: today } },
          { fechaObjetivo: null, fechaProgramada: { lt: today } },
        ],
      },
    }),
    prisma.agendaTarea.count({
      where: {
        tipo: TipoTarea.PARTO,
        estado: EstadoTarea.PENDIENTE,
        animal: {
          activo: true,
          estadoAnimal: EstadoAnimal.ACTIVO,
        },
        OR: [
          { fechaObjetivo: { gt: today, lte: nextSevenDays } },
          {
            fechaObjetivo: null,
            fechaProgramada: { gt: today, lte: nextSevenDays },
          },
        ],
      },
    }),
    prisma.loteLeche.count({
      where: {
        estado: EstadoLoteLeche.VENCIDO,
      },
    }),
  ]);

  const notifications: NotificationItem[] = [];

  if (stockAgotado > 0) {
    notifications.push(notification(
      'stock-agotado',
      stockAgotado,
      'Stock agotado',
      `Hay ${stockAgotado} insumos agotados.`,
      'ALTA',
      1,
      '/alimentacion?section=stock&estadoStock=AGOTADO',
    ));
  }

  if (vaccinationSummary.vencidas > 0) {
    notifications.push(notification(
      'vacunas-vencidas',
      vaccinationSummary.vencidas,
      'Vacunas vencidas',
      `Tenés ${vaccinationSummary.vencidas} vacunaciones vencidas.`,
      'ALTA',
      2,
      '/vacunacion?section=historial&estado=VENCIDA',
    ));
  }

  if (agendaVencidas > 0) {
    notifications.push(notification(
      'agenda-vencida',
      agendaVencidas,
      'Tareas vencidas',
      `Hay ${agendaVencidas} tareas de agenda vencidas.`,
      'ALTA',
      3,
      '/agenda?estado=VENCIDA',
    ));
  }

  if (partosProximos > 0) {
    notifications.push(notification(
      'partos-proximos',
      partosProximos,
      'Parto próximo',
      `Hay ${partosProximos} partos próximos.`,
      'MEDIA',
      4,
      '/agenda?tipo=PARTO',
    ));
  }

  if (lotesLecheVencidos > 0) {
    notifications.push(notification(
      'lotes-leche-vencidos',
      lotesLecheVencidos,
      'Lotes de leche vencidos',
      `Hay ${lotesLecheVencidos} lotes de leche vencidos.`,
      'ALTA',
      5,
      '/produccion?section=lotesLeche&estado=VENCIDO',
    ));
  }

  if (stockBajo > 0) {
    notifications.push(notification(
      'stock-bajo',
      stockBajo,
      'Stock bajo',
      `Hay ${stockBajo} insumos con stock bajo.`,
      'MEDIA',
      6,
      '/alimentacion?section=stock&estadoStock=BAJO',
    ));
  }

  if (vaccinationSummary.pendientes > 0) {
    notifications.push(notification(
      'vacunas-pendientes',
      vaccinationSummary.pendientes,
      'Vacunas pendientes',
      `Tenés ${vaccinationSummary.pendientes} vacunaciones pendientes.`,
      'BAJA',
      7,
      '/vacunacion?section=pendientes&estado=PENDIENTE',
    ));
  }

  const attended = notifications.length === 0
    ? []
    : await prisma.notificacionUsuarioAtendida.findMany({
        where: {
          usuarioId,
          OR: notifications.map((item) => ({ clave: item.clave, firma: item.firma })),
        },
        select: {
          clave: true,
          firma: true,
        },
      });
  const attendedKeys = new Set(attended.map((item) => `${item.clave}:${item.firma}`));
  const ordered = notifications
    .filter((item) => !attendedKeys.has(`${item.clave}:${item.firma}`))
    .sort((left, right) => left.prioridadOrden - right.prioridadOrden);

  return {
    total: ordered.length,
    notificaciones: ordered.map(({ prioridadOrden, ...item }) => item),
  };
}

export async function attendSimpleNotification(usuarioId: number, input: Record<string, unknown>) {
  const clave = parseRequiredText(input.clave, 'Notificación');
  const firma = parseRequiredText(input.firma, 'Firma de notificación');

  await prisma.notificacionUsuarioAtendida.upsert({
    where: {
      usuarioId_clave_firma: {
        usuarioId,
        clave,
        firma,
      },
    },
    create: {
      usuarioId,
      clave,
      firma,
      estado: 'ATENDIDA',
    },
    update: {
      estado: 'ATENDIDA',
    },
  });

  return { ok: true };
}
