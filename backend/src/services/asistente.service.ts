import {
  EstadoAnimal,
  EstadoLoteLeche,
  EstadoReproductivo,
  EstadoTarea,
  RolUsuario,
  TipoTarea,
} from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { generateAssistantResponse } from './openai.service';

interface ChatAction {
  label: string;
  url: string;
}

interface ChatContext {
  intencion: string;
  datosUsados: unknown[];
  acciones: ChatAction[];
}

const restrictedPatterns = [
  'venta',
  'ventas',
  'cliente',
  'clientes',
  'usuario',
  'usuarios',
  'configuracion',
  'configuración',
  'movimiento de stock',
  'movimientos de stock',
  'contraseña',
  'password',
  'permiso',
  'permisos',
];

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(normalize(word)));
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function monthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function buildStockContext(text: string): Promise<ChatContext> {
  const asksAgotado = hasAny(text, ['agotado', 'agotados', 'sin stock']);
  const insumos = await prisma.insumoAlimentacion.findMany({
    where: { activo: true },
    orderBy: [{ stockActual: 'asc' }, { nombre: 'asc' }],
    select: {
      id: true,
      nombre: true,
      tipoAlimento: true,
      unidadMedida: true,
      stockActual: true,
      stockMinimo: true,
    },
  });

  const filtrados = insumos
    .filter((insumo) => {
      if (asksAgotado) return insumo.stockActual <= 0;
      return insumo.stockActual > 0 && insumo.stockActual <= insumo.stockMinimo;
    })
    .slice(0, 20)
    .map((insumo) => ({
      ...insumo,
      estadoStock: insumo.stockActual <= 0 ? 'AGOTADO' : 'BAJO',
    }));

  return {
    intencion: asksAgotado ? 'stock agotado' : 'stock bajo o compra de insumos',
    datosUsados: filtrados,
    acciones: [{
      label: asksAgotado ? 'Ver stock agotado' : 'Ver stock bajo',
      url: `/alimentacion?section=stock&estadoStock=${asksAgotado ? 'AGOTADO' : 'BAJO'}`,
    }],
  };
}

async function buildVaccinationContext(text: string): Promise<ChatContext> {
  const asksVencidas = hasAny(text, ['vencida', 'vencidas', 'vencido', 'priorizar']);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = await prisma.agendaTarea.findMany({
    where: {
      estado: EstadoTarea.PENDIENTE,
      tipoSanitario: { not: null },
      ...(asksVencidas
        ? {
            OR: [
              { fechaObjetivo: { lt: today } },
              { fechaObjetivo: null, fechaProgramada: { lt: today } },
            ],
          }
        : {}),
    },
    orderBy: [{ fechaObjetivo: 'asc' }, { fechaProgramada: 'asc' }],
    take: 20,
    select: {
      id: true,
      tipoSanitario: true,
      fechaProgramada: true,
      fechaObjetivo: true,
      descripcion: true,
      animal: {
        select: {
          caravana: true,
          categoriaAnimal: true,
          lote: { select: { nombre: true } },
        },
      },
    },
  });

  return {
    intencion: asksVencidas ? 'vacunas vencidas' : 'vacunas pendientes',
    datosUsados: tasks,
    acciones: [{
      label: asksVencidas ? 'Ver vacunas vencidas' : 'Ver vacunas pendientes',
      url: asksVencidas
        ? '/vacunacion?section=historial&estado=VENCIDA'
        : '/vacunacion?section=pendientes',
    }],
  };
}

async function buildHerdContext(text: string): Promise<ChatContext> {
  if (hasAny(text, ['vender', 'descarte', 'descartar', 'rindiendo', 'revisar'])) {
    const candidates = await prisma.animal.findMany({
      where: {
        activo: true,
        estadoAnimal: EstadoAnimal.ACTIVO,
        OR: [
          { estadoReproductivo: { in: [EstadoReproductivo.VACIA, EstadoReproductivo.SECA, EstadoReproductivo.RECUPERACION] } },
          { categoriaAnimal: { in: ['VACA_SECA', 'BAJA'] } },
        ],
      },
      orderBy: [{ fechaNacimiento: 'asc' }],
      take: 12,
      select: {
        id: true,
        caravana: true,
        nombre: true,
        fechaNacimiento: true,
        categoriaAnimal: true,
        estadoReproductivo: true,
        estadoAnimal: true,
        lote: { select: { nombre: true } },
        producciones: {
          orderBy: { fechaHora: 'desc' },
          take: 10,
          select: { fechaHora: true, litrosProducidos: true, litrosDescartados: true },
        },
        tareas: {
          where: { tipoSanitario: { not: null } },
          orderBy: { fechaProgramada: 'desc' },
          take: 5,
          select: { tipoSanitario: true, estado: true, fechaProgramada: true },
        },
      },
    });

    return {
      intencion: 'animales para revisar o posible venta',
      datosUsados: candidates.map((animal) => ({
        ...animal,
        producciones: animal.producciones.map((item) => ({
          fechaHora: item.fechaHora,
          litrosProducidos: toNumber(item.litrosProducidos),
          litrosDescartados: toNumber(item.litrosDescartados),
        })),
      })),
      acciones: [{ label: 'Ver animales', url: '/rodeos?section=animales' }],
    };
  }

  const [totalAnimales, animalesActivos, prenadas, inseminadas, vacias, secasRecuperacion] = await Promise.all([
    prisma.animal.count(),
    prisma.animal.count({ where: { activo: true, estadoAnimal: EstadoAnimal.ACTIVO } }),
    prisma.animal.count({ where: { estadoReproductivo: EstadoReproductivo.PRENADA } }),
    prisma.animal.count({ where: { estadoReproductivo: EstadoReproductivo.INSEMINADA } }),
    prisma.animal.count({ where: { estadoReproductivo: EstadoReproductivo.VACIA } }),
    prisma.animal.count({
      where: {
        OR: [
          { estadoReproductivo: { in: [EstadoReproductivo.SECA, EstadoReproductivo.RECUPERACION] } },
          { categoriaAnimal: 'VACA_SECA' },
        ],
      },
    }),
  ]);

  return {
    intencion: 'resumen de rodeo',
    datosUsados: [{ totalAnimales, animalesActivos, prenadas, inseminadas, vacias, secasRecuperacion }],
    acciones: [{ label: 'Ver rodeo', url: '/rodeos?section=animales' }],
  };
}

async function buildProductionContext(text: string): Promise<ChatContext> {
  if (hasAny(text, ['leche', 'lote', 'lotes', 'vencer', 'vencido', 'vencidos'])) {
    const now = new Date();
    const nextWeek = daysFromNow(7);
    const lotes = await prisma.loteLeche.findMany({
      where: {
        OR: [
          { estado: EstadoLoteLeche.VENCIDO },
          { estado: EstadoLoteLeche.DISPONIBLE, fechaVencimiento: { lte: nextWeek } },
        ],
      },
      orderBy: { fechaVencimiento: 'asc' },
      take: 20,
      select: {
        id: true,
        codigo: true,
        estado: true,
        fechaProduccion: true,
        fechaVencimiento: true,
        litrosTotales: true,
        litrosDescartados: true,
        litrosNetos: true,
      },
    });

    return {
      intencion: 'lotes de leche vencidos o por vencer',
      datosUsados: lotes.map((lote) => ({
        ...lote,
        estadoCalculado: lote.estado === EstadoLoteLeche.VENCIDO || lote.fechaVencimiento < now ? 'VENCIDO' : 'POR_VENCER',
        litrosTotales: toNumber(lote.litrosTotales),
        litrosDescartados: toNumber(lote.litrosDescartados),
        litrosNetos: toNumber(lote.litrosNetos),
      })),
      acciones: [{ label: 'Ver lotes de leche', url: '/produccion?section=lotesLeche' }],
    };
  }

  const registros = await prisma.produccionAnimal.findMany({
    where: { fechaHora: { gte: daysAgo(7) } },
    orderBy: { fechaHora: 'desc' },
    take: 30,
    select: {
      fechaHora: true,
      turno: true,
      litrosProducidos: true,
      litrosDescartados: true,
      animal: { select: { caravana: true, categoriaAnimal: true } },
      loteLeche: { select: { codigo: true } },
    },
  });

  return {
    intencion: 'producción reciente',
    datosUsados: registros.map((item) => ({
      ...item,
      litrosProducidos: toNumber(item.litrosProducidos),
      litrosDescartados: toNumber(item.litrosDescartados),
    })),
    acciones: [{ label: 'Ver producción', url: '/produccion?section=historial' }],
  };
}

async function buildAgendaContext(text: string): Promise<ChatContext> {
  const isPartos = hasAny(text, ['parto', 'partos', 'parir']);
  const today = new Date();
  const next = daysFromNow(isPartos ? 30 : 14);

  const tasks = await prisma.agendaTarea.findMany({
    where: {
      estado: EstadoTarea.PENDIENTE,
      ...(isPartos ? { tipo: TipoTarea.PARTO } : {}),
      fechaProgramada: { gte: today, lte: next },
    },
    orderBy: { fechaProgramada: 'asc' },
    take: 20,
    select: {
      id: true,
      tipo: true,
      fechaProgramada: true,
      fechaObjetivo: true,
      descripcion: true,
      animal: {
        select: {
          caravana: true,
          categoriaAnimal: true,
          lote: { select: { nombre: true } },
        },
      },
    },
  });

  return {
    intencion: isPartos ? 'partos próximos' : 'tareas de agenda próximas',
    datosUsados: tasks,
    acciones: [{ label: isPartos ? 'Ver partos próximos' : 'Ver agenda', url: isPartos ? '/agenda?tipo=PARTO' : '/agenda' }],
  };
}

async function buildSalesContext(): Promise<ChatContext> {
  const { start, end } = monthRange();
  const [summary, topClients] = await Promise.all([
    prisma.venta.aggregate({
      where: { fechaVenta: { gte: start, lt: end } },
      _count: { _all: true },
      _sum: { totalLitros: true, precioTotal: true },
    }),
    prisma.venta.findMany({
      where: { fechaVenta: { gte: start, lt: end } },
      orderBy: { precioTotal: 'desc' },
      take: 8,
      select: {
        fechaVenta: true,
        totalLitros: true,
        precioTotal: true,
        cliente: { select: { cuit: true, razonSocial: true } },
      },
    }),
  ]);

  return {
    intencion: 'ventas del mes',
    datosUsados: [{
      cantidadVentas: summary._count._all,
      litrosVendidos: toNumber(summary._sum.totalLitros),
      facturacion: toNumber(summary._sum.precioTotal),
      ventasPrincipales: topClients.map((venta) => ({
        fechaVenta: venta.fechaVenta,
        litros: toNumber(venta.totalLitros),
        importe: toNumber(venta.precioTotal),
        cliente: venta.cliente,
      })),
    }],
    acciones: [{ label: 'Ver ventas', url: '/ventas' }],
  };
}

async function buildUsersContext(): Promise<ChatContext> {
  const [activos, inactivos, pendientesCambioPassword] = await Promise.all([
    prisma.usuario.count({ where: { activo: true } }),
    prisma.usuario.count({ where: { activo: false } }),
    prisma.usuario.count({ where: { debeCambiarPassword: true } }),
  ]);

  return {
    intencion: 'usuarios',
    datosUsados: [{ activos, inactivos, pendientesCambioPassword }],
    acciones: [{ label: 'Ver usuarios', url: '/usuarios' }],
  };
}

async function buildContext(message: string, rol: RolUsuario): Promise<ChatContext> {
  const text = normalize(message);
  const asksRestricted = restrictedPatterns.some((pattern) => text.includes(normalize(pattern)));

  if (rol !== RolUsuario.ADMIN && asksRestricted) {
    throw new AppError('No tenés permisos para consultar esa información.', 403);
  }

  if (hasAny(text, ['stock', 'insumo', 'alimento', 'comprar', 'agotado', 'riesgo'])) return buildStockContext(text);
  if (hasAny(text, ['vacuna', 'vacunacion', 'sanitaria', 'sanitario'])) return buildVaccinationContext(text);
  if (hasAny(text, ['parto', 'partos', 'parir', 'agenda', 'tarea', 'tareas'])) return buildAgendaContext(text);
  if (hasAny(text, ['produccion', 'ordeñe', 'ordene', 'ordeñes', 'ordenes', 'leche', 'lote de leche', 'lotes de leche'])) return buildProductionContext(text);
  if (hasAny(text, ['venta', 'ventas', 'cliente', 'clientes', 'vendimos', 'facturacion', 'facturación'])) {
    if (rol !== RolUsuario.ADMIN) throw new AppError('No tenés permisos para consultar esa información.', 403);
    return buildSalesContext();
  }
  if (hasAny(text, ['usuario', 'usuarios', 'password', 'contraseña'])) {
    if (rol !== RolUsuario.ADMIN) throw new AppError('No tenés permisos para consultar esa información.', 403);
    return buildUsersContext();
  }

  return buildHerdContext(text);
}

export async function chatWithAssistant(usuario: { id: number; rol: RolUsuario } | undefined, input: Record<string, unknown>) {
  if (!usuario) throw new AppError('Token de autenticación requerido.', 401);

  const mensaje = typeof input.mensaje === 'string' ? input.mensaje.trim() : '';
  if (!mensaje) throw new AppError('El mensaje es obligatorio.', 400);
  if (mensaje.length > 800) throw new AppError('El mensaje es demasiado largo.', 400);

  let context: ChatContext;

  try {
    context = await buildContext(mensaje, usuario.rol);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 403) {
      return {
        respuesta: error.message,
        datosUsados: [],
        acciones: [],
      };
    }

    throw error;
  }

  const respuesta = await generateAssistantResponse({
    mensaje,
    rol: usuario.rol,
    intencion: context.intencion,
    datosUsados: context.datosUsados,
  });

  return {
    respuesta,
    datosUsados: context.datosUsados,
    acciones: context.acciones,
  };
}
