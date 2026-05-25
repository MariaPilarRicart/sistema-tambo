import {
  CategoriaAnimal,
  EstadoAnimal,
  EstadoReproductivo,
  Prisma,
  TipoEvento,
  TipoTarea,
} from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { findEventoById, findEventos } from '../repositories/eventos.repository';

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function parseId(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} invalido.`, 400);
  }

  return parsed;
}

function parseDate(value: unknown) {
  if (!value) return new Date();
  if (typeof value !== 'string') throw new AppError('Fecha invalida.', 400);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Fecha invalida.', 400);

  return date;
}

function parseTipoEvento(value: unknown) {
  if (Object.values(TipoEvento).includes(value as TipoEvento)) {
    return value as TipoEvento;
  }

  throw new AppError('Tipo de evento invalido.', 400);
}

function parseOptionalDate(value: unknown, fieldName: string) {
  if (!value) return undefined;
  if (typeof value !== 'string') throw new AppError(`${fieldName} invalida.`, 400);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${fieldName} invalida.`, 400);

  return date;
}

function parseDatosJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('datosJson debe ser un objeto.', 400);
  }

  return value as Prisma.InputJsonObject;
}

function getTactoResultado(datosJson: unknown) {
  if (!datosJson || typeof datosJson !== 'object' || Array.isArray(datosJson)) {
    throw new AppError('TACTO debe recibir datosJson.resultado.', 400);
  }

  const resultado = (datosJson as { resultado?: unknown }).resultado;

  if (resultado !== 'POSITIVO' && resultado !== 'NEGATIVO') {
    throw new AppError('Resultado de TACTO invalido. Debe ser POSITIVO o NEGATIVO.', 400);
  }

  return resultado;
}

async function findActiveAnimalOrThrow(tx: Prisma.TransactionClient, animalId: number) {
  const animal = await tx.animal.findUnique({
    where: { id: animalId },
  });

  if (!animal) throw new AppError('Animal no encontrado.', 404);
  if (!animal.activo || animal.estadoAnimal !== EstadoAnimal.ACTIVO) {
    throw new AppError('El animal debe estar activo para registrar eventos.', 400);
  }

  return animal;
}

async function closePendingTaskOrThrow(
  tx: Prisma.TransactionClient,
  animalId: number,
  tipo: TipoTarea,
  eventoCierreId: number,
) {
  const task = await tx.agendaTarea.findFirst({
    where: {
      animalId,
      tipo,
      estado: 'PENDIENTE',
    },
    orderBy: { fechaProgramada: 'asc' },
  });

  if (!task) {
    throw new AppError(`No existe tarea ${tipo} pendiente para este animal.`, 400);
  }

  await tx.agendaTarea.update({
    where: { id: task.id },
    data: {
      estado: 'REALIZADA',
      fechaRealizacion: new Date(),
      eventoCierreId,
    },
  });
}

export async function listEventos(query: Record<string, unknown>) {
  return findEventos({
    animalId: query.animalId ? parseId(query.animalId, 'animalId') : undefined,
    tipo: query.tipo ? parseTipoEvento(query.tipo) : undefined,
    fechaDesde: parseOptionalDate(query.fechaDesde, 'fechaDesde'),
    fechaHasta: parseOptionalDate(query.fechaHasta, 'fechaHasta'),
  });
}

export async function getEvento(idParam: string) {
  const id = parseId(idParam, 'Id de evento');
  const evento = await findEventoById(id);

  if (!evento) throw new AppError('Evento no encontrado.', 404);

  return evento;
}

export async function createEvento(input: Record<string, unknown>, usuarioId: number) {
  const animalId = parseId(input.animalId, 'animalId');
  const tipo = parseTipoEvento(input.tipo);
  const fecha = parseDate(input.fecha);
  const datosJson = parseDatosJson(input.datosJson);
  const observaciones = typeof input.observaciones === 'string' ? input.observaciones.trim() || null : null;

  return prisma.$transaction(async (tx) => {
    const animal = await findActiveAnimalOrThrow(tx, animalId);

    if (
      tipo === TipoEvento.INSEMINACION &&
      ([
        EstadoReproductivo.PRENADA,
        EstadoReproductivo.SECA,
        EstadoReproductivo.RECUPERACION,
      ] as EstadoReproductivo[]).includes(animal.estadoReproductivo)
    ) {
      throw new AppError('No se puede inseminar un animal preñado, seco o en recuperacion.', 400);
    }

    if (tipo === TipoEvento.TACTO) {
      getTactoResultado(datosJson);

      const pendingTacto = await tx.agendaTarea.findFirst({
        where: { animalId, tipo: 'TACTO', estado: 'PENDIENTE' },
      });

      if (!pendingTacto) {
        throw new AppError('No existe tarea TACTO pendiente para este animal.', 400);
      }
    }

    const evento = await tx.evento.create({
      data: {
        animalId,
        usuarioId,
        tipo,
        fecha,
        observaciones,
        datosJson,
      },
    });

    switch (tipo) {
      case TipoEvento.CELO:
      case TipoEvento.CLINICO:
      case TipoEvento.VACUNACION:
      case TipoEvento.CAMBIO_LOTE:
        break;

      case TipoEvento.INSEMINACION:
        await tx.animal.update({
          where: { id: animalId },
          data: { estadoReproductivo: EstadoReproductivo.INSEMINADA },
        });
        await tx.agendaTarea.updateMany({
          where: { animalId, tipo: 'TACTO', estado: 'PENDIENTE' },
          data: { estado: 'CANCELADA' },
        });
        await tx.agendaTarea.create({
          data: {
            animalId,
            tipo: 'TACTO',
            fechaProgramada: addDays(fecha, 35),
            estado: 'PENDIENTE',
            eventoOrigenId: evento.id,
          },
        });
        break;

      case TipoEvento.TACTO: {
        const resultado = getTactoResultado(datosJson);
        await closePendingTaskOrThrow(tx, animalId, 'TACTO', evento.id);

        if (resultado === 'POSITIVO') {
          const fechaDesde = addDays(fecha, -90);
          const inseminacion = await tx.evento.findFirst({
            where: {
              animalId,
              tipo: 'INSEMINACION',
              fecha: {
                gte: fechaDesde,
                lte: fecha,
              },
            },
            orderBy: { fecha: 'desc' },
          });

          if (!inseminacion) {
            throw new AppError('No existe una inseminacion reciente para confirmar el tacto positivo.', 400);
          }

          await tx.animal.update({
            where: { id: animalId },
            data: { estadoReproductivo: EstadoReproductivo.PRENADA },
          });
          await tx.agendaTarea.createMany({
            data: [
              {
                animalId,
                tipo: 'SECADO',
                fechaProgramada: addDays(inseminacion.fecha, 210),
                estado: 'PENDIENTE',
                eventoOrigenId: evento.id,
              },
              {
                animalId,
                tipo: 'PARTO',
                fechaProgramada: addDays(inseminacion.fecha, 268),
                estado: 'PENDIENTE',
                eventoOrigenId: evento.id,
              },
            ],
          });
        } else {
          await tx.animal.update({
            where: { id: animalId },
            data: { estadoReproductivo: EstadoReproductivo.VACIA },
          });
        }
        break;
      }

      case TipoEvento.SECADO: {
        await closePendingTaskOrThrow(tx, animalId, 'SECADO', evento.id);
        const loteSecas = await tx.lote.findFirst({ where: { nombre: 'Secas', activo: true } });
        await tx.animal.update({
          where: { id: animalId },
          data: {
            estadoReproductivo: EstadoReproductivo.SECA,
            ...(loteSecas ? { loteId: loteSecas.id } : {}),
          },
        });
        break;
      }

      case TipoEvento.PARTO:
        await closePendingTaskOrThrow(tx, animalId, 'PARTO', evento.id);
        await tx.animal.update({
          where: { id: animalId },
          data: {
            estadoReproductivo: EstadoReproductivo.RECUPERACION,
            ...(animal.categoria === CategoriaAnimal.VAQUILLONA
              ? { categoria: CategoriaAnimal.VACA }
              : {}),
          },
        });
        await tx.agendaTarea.create({
          data: {
            animalId,
            tipo: 'ALTA_POST_PARTO',
            fechaProgramada: addDays(fecha, 30),
            estado: 'PENDIENTE',
            eventoOrigenId: evento.id,
          },
        });
        break;

      case TipoEvento.ABORTO:
        await tx.animal.update({
          where: { id: animalId },
          data: { estadoReproductivo: EstadoReproductivo.VACIA },
        });
        await tx.agendaTarea.updateMany({
          where: { animalId, tipo: { in: ['SECADO', 'PARTO'] }, estado: 'PENDIENTE' },
          data: { estado: 'CANCELADA' },
        });
        await tx.agendaTarea.create({
          data: {
            animalId,
            tipo: 'TACTO',
            fechaProgramada: fecha,
            estado: 'PENDIENTE',
            eventoOrigenId: evento.id,
          },
        });
        break;

      case TipoEvento.VENTA:
      case TipoEvento.MUERTE:
        await tx.animal.update({
          where: { id: animalId },
          data: {
            activo: false,
            estadoAnimal: tipo === TipoEvento.VENTA ? EstadoAnimal.VENDIDO : EstadoAnimal.MUERTO,
            fechaBaja: fecha,
            observacionesBaja: observaciones,
          },
        });
        await tx.agendaTarea.updateMany({
          where: { animalId, estado: 'PENDIENTE' },
          data: { estado: 'CANCELADA' },
        });
        break;
    }

    return tx.evento.findUnique({
      where: { id: evento.id },
      include: {
        animal: {
          select: {
            id: true,
            caravana: true,
            categoria: true,
            estadoReproductivo: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            username: true,
            rol: true,
          },
        },
      },
    });
  });
}
