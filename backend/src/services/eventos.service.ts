import {
  CategoriaAnimal,
  EstadoAnimal,
  EstadoReproductivo,
  Prisma,
  TipoEvento,
  TipoFuncionalLote,
  TipoTarea,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { findEventoById, findEventos } from '../repositories/eventos.repository';
import {
  getLotePostEvento,
  validarConsistenciaAnimal,
  validarEventoCompatibleConAnimal,
} from './rodeo-rules.service';
import { getNextSanitaryDate, parseTipoSanitario, type TipoSanitario } from './vacunacion.service';

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function inferTipoSanitario(value?: string | null): TipoSanitario {
  const source = (value ?? '').toUpperCase();
  if (source.includes('AFTOSA')) return 'AFTOSA';
  if (source.includes('TUBERCULINA')) return 'ANALISIS_TUBERCULINA';
  if (source.includes('BRUCELOSIS') && source.includes('ANALISIS')) return 'ANALISIS_BRUCELOSIS';
  if (source.includes('BRUCELOSIS')) return 'BRUCELOSIS';
  return 'OTRA';
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

function asObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getPartoPayload(datosJson: unknown) {
  const root = asObject(datosJson);
  const parto = asObject(root?.parto);

  if (!parto) {
    throw new AppError('PARTO debe recibir datosJson.parto con el detalle de crias.', 400);
  }

  const cantidadCrias = Number(parto.cantidadCrias);
  const criasSource = Array.isArray(parto.crias) ? parto.crias : [];
  const guacheraLoteId = parto.guacheraLoteId === undefined || parto.guacheraLoteId === null || parto.guacheraLoteId === ''
    ? null
    : parseId(parto.guacheraLoteId, 'guacheraLoteId');

  if (![1, 2, 3].includes(cantidadCrias)) {
    throw new AppError('La cantidad de crias debe ser 1, 2 o 3.', 400);
  }

  if (criasSource.length !== cantidadCrias) {
    throw new AppError('La cantidad seleccionada debe coincidir con la cantidad de crias cargadas.', 400);
  }

  const crias = criasSource.map((item, index) => {
    const cria = asObject(item);
    const categoria = cria?.categoria;
    const estadoNacimiento = cria?.estadoNacimiento;
    const caravana = parseOptionalString(cria?.caravana);
    const observacion = parseOptionalString(cria?.observacion);

    if (categoria !== CategoriaAnimal.TERNERO && categoria !== CategoriaAnimal.TERNERA) {
      throw new AppError('Cada cria debe ser Ternero o Ternera.', 400);
    }

    if (estadoNacimiento !== 'VIVA' && estadoNacimiento !== 'MUERTA') {
      throw new AppError('Cada cria debe tener estado al nacer Viva o Muerta.', 400);
    }

    if (estadoNacimiento === 'VIVA' && !caravana) {
      throw new AppError('La caravana es obligatoria para crias nacidas vivas.', 400);
    }

    return {
      numero: index + 1,
      categoria,
      estadoNacimiento,
      caravana: caravana || null,
      observacion: observacion || null,
    };
  });

  const caravanasVivas = crias
    .filter((cria) => cria.estadoNacimiento === 'VIVA')
    .map((cria) => cria.caravana)
    .filter((caravana): caravana is string => Boolean(caravana));
  const caravanasUnicas = new Set(caravanasVivas);

  if (caravanasUnicas.size !== caravanasVivas.length) {
    throw new AppError('No puede repetir caravanas entre crias nacidas vivas.', 400);
  }

  return { cantidadCrias, crias, guacheraLoteId };
}

function getCambioLotePayload(datosJson: unknown) {
  const root = asObject(datosJson);
  const cambioLote = asObject(root?.cambioLote);

  if (!cambioLote) {
    throw new AppError('CAMBIO_LOTE debe recibir datosJson.cambioLote.', 400);
  }

  return {
    loteDestinoId: parseId(cambioLote.loteDestinoId, 'loteDestinoId'),
    motivo: parseOptionalString(cambioLote.motivo) || null,
  };
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

async function findActiveLoteByIdOrThrow(tx: Prisma.TransactionClient, loteId: number) {
  const lote = await tx.lote.findFirst({
    where: {
      id: loteId,
      activo: true,
    },
  });

  if (!lote) {
    throw new AppError('El lote destino debe existir y estar activo.', 400);
  }

  return lote;
}

async function findActiveLoteByTipoFuncionalOrThrow(tx: Prisma.TransactionClient, tipoFuncional: TipoFuncionalLote) {
  const lote = await tx.lote.findFirst({
    where: {
      tipoFuncional,
      activo: true,
    },
    orderBy: { id: 'asc' },
  });

  if (!lote) {
    throw new AppError(`Debe existir un lote activo de tipo funcional ${tipoFuncional}.`, 400);
  }

  return lote;
}

async function closePendingTaskIfExists(
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

  if (!task) return;

  await tx.agendaTarea.update({
    where: { id: task.id },
    data: {
      estado: 'REALIZADA',
      fechaRealizacion: new Date(),
      eventoCierreId,
    },
  });
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
    validarEventoCompatibleConAnimal(animal, tipo);
    let datosJsonFinal = datosJson;
    let partoPayload: ReturnType<typeof getPartoPayload> | null = null;
    let cambioLotePayload: ReturnType<typeof getCambioLotePayload> | null = null;

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

    if (tipo === TipoEvento.PARTO) {
      partoPayload = getPartoPayload(datosJson);
      const vivas = partoPayload.crias.filter((cria) => cria.estadoNacimiento === 'VIVA');

      if (vivas.length > 0 && !partoPayload.guacheraLoteId) {
        throw new AppError('Debe seleccionar un lote Guachera activo para registrar crias vivas.', 400);
      }

      if (partoPayload.guacheraLoteId) {
        const guachera = await findActiveLoteByIdOrThrow(tx, partoPayload.guacheraLoteId);
        if (guachera.tipoFuncional !== TipoFuncionalLote.GUACHERA) {
          throw new AppError('El lote de crias vivas debe ser de tipo funcional GUACHERA.', 400);
        }
      }

      if (vivas.length > 0) {
        const existing = await tx.animal.findMany({
          where: { caravana: { in: vivas.map((cria) => cria.caravana!) } },
          select: { caravana: true },
        });

        if (existing.length > 0) {
          throw new AppError('Ya existe un animal con la caravana de una cria viva.', 409);
        }
      }
    }

    if (tipo === TipoEvento.CAMBIO_LOTE) {
      cambioLotePayload = getCambioLotePayload(datosJson);
      const loteDestino = await findActiveLoteByIdOrThrow(tx, cambioLotePayload.loteDestinoId);
      const consistencia = validarConsistenciaAnimal({
        categoriaAnimal: animal.categoriaAnimal,
        fechaNacimiento: animal.fechaNacimiento,
        estadoReproductivo: animal.estadoReproductivo,
        loteTipoFuncional: loteDestino.tipoFuncional,
      });

      if (loteDestino.tipoFuncional !== consistencia.loteTipoFuncional) {
        throw new AppError('El lote destino no es compatible con la edad, categoria y estado del animal.', 400);
      }

      datosJsonFinal = {
        cambioLote: {
          loteAnterior: {
            id: animal.loteId,
          },
          loteNuevo: {
            id: loteDestino.id,
            nombre: loteDestino.nombre,
            tipoFuncional: loteDestino.tipoFuncional,
          },
          motivo: cambioLotePayload.motivo,
        },
      };
    }

    const evento = await tx.evento.create({
      data: {
        animalId,
        usuarioId,
        tipo,
        fecha,
        observaciones,
        datosJson: datosJsonFinal,
      },
    });

    switch (tipo) {
      case TipoEvento.CELO:
      case TipoEvento.CLINICO:
        break;

      case TipoEvento.CAMBIO_LOTE: {
        if (!cambioLotePayload) break;

        const loteAnterior = await tx.lote.findUnique({ where: { id: animal.loteId } });
        const loteDestino = await findActiveLoteByIdOrThrow(tx, cambioLotePayload.loteDestinoId);
        await tx.animal.update({
          where: { id: animalId },
          data: { loteId: loteDestino.id },
        });
        await tx.evento.update({
          where: { id: evento.id },
          data: {
            datosJson: {
              cambioLote: {
                loteAnterior: loteAnterior
                  ? {
                      id: loteAnterior.id,
                      nombre: loteAnterior.nombre,
                      tipoFuncional: loteAnterior.tipoFuncional,
                    }
                  : { id: animal.loteId },
                loteNuevo: {
                  id: loteDestino.id,
                  nombre: loteDestino.nombre,
                  tipoFuncional: loteDestino.tipoFuncional,
                },
                motivo: cambioLotePayload.motivo,
              },
            },
          },
        });
        break;
      }

      case TipoEvento.VACUNACION: {
        const pendingVaccination = await tx.agendaTarea.findFirst({
          where: { animalId, tipo: 'VACUNACION', estado: 'PENDIENTE' },
          orderBy: { fechaProgramada: 'asc' },
        });

        if (pendingVaccination) {
          await tx.agendaTarea.update({
            where: { id: pendingVaccination.id },
            data: {
              estado: 'REALIZADA',
              fechaRealizacion: fecha,
              eventoCierreId: evento.id,
            },
          });
          const tipoSanitario = pendingVaccination.tipoSanitario
            ? parseTipoSanitario(pendingVaccination.tipoSanitario)
            : inferTipoSanitario(pendingVaccination.descripcion);
          if (tipoSanitario !== 'OTRA') {
            await tx.agendaTarea.create({
              data: {
                animalId,
                tipo: 'VACUNACION',
                fechaProgramada: getNextSanitaryDate(tipoSanitario, fecha),
                estado: 'PENDIENTE',
                descripcion: pendingVaccination.descripcion,
                tipoSanitario,
                alcanceTipo: pendingVaccination.alcanceTipo ?? 'ANIMAL',
                alcanceLoteId: pendingVaccination.alcanceLoteId,
                alcanceCategoria: pendingVaccination.alcanceCategoria,
                grupoSanitarioId: randomUUID(),
                cantidadAnimalesAlcanzados: pendingVaccination.cantidadAnimalesAlcanzados,
                usuarioId,
                eventoOrigenId: evento.id,
              },
            });
          }
        }
        break;
      }

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
        const loteSecas = await findActiveLoteByTipoFuncionalOrThrow(tx, getLotePostEvento(tipo)!);
        await tx.animal.update({
          where: { id: animalId },
          data: {
            estadoReproductivo: EstadoReproductivo.SECA,
            categoriaAnimal: CategoriaAnimal.VACA,
            loteId: loteSecas.id,
          },
        });
        break;
      }

      case TipoEvento.PARTO:
        await closePendingTaskIfExists(tx, animalId, 'PARTO', evento.id);
        const loteRecuperacion = await findActiveLoteByTipoFuncionalOrThrow(tx, getLotePostEvento(tipo)!);
        await tx.animal.update({
          where: { id: animalId },
          data: {
            estadoReproductivo: EstadoReproductivo.RECUPERACION,
            categoriaAnimal: CategoriaAnimal.VACA,
            loteId: loteRecuperacion.id,
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
        if (partoPayload) {
          const criasConResultado = [];

          for (const cria of partoPayload.crias) {
            if (cria.estadoNacimiento === 'MUERTA') {
              criasConResultado.push({ ...cria, agregadaARodeo: false, animalId: null });
              continue;
            }

            const nuevaCria = await tx.animal.create({
              data: {
                caravana: cria.caravana!,
                nombre: null,
                fechaNacimiento: fecha,
                raza: null,
                categoriaAnimal: cria.categoria,
                estadoReproductivo: EstadoReproductivo.NO_APLICA,
                estadoAnimal: EstadoAnimal.ACTIVO,
                activo: true,
                loteId: partoPayload.guacheraLoteId!,
                madreId: animalId,
                padreNombre: null,
              },
            });
            criasConResultado.push({ ...cria, agregadaARodeo: true, animalId: nuevaCria.id });
          }

          await tx.evento.update({
            where: { id: evento.id },
            data: {
              datosJson: {
                parto: {
                  cantidadCrias: partoPayload.cantidadCrias,
                  guacheraLoteId: partoPayload.guacheraLoteId,
                  crias: criasConResultado,
                },
              },
            },
          });
        }
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
            categoriaAnimal: true,
            estadoReproductivo: true,
            lote: {
              select: {
                id: true,
                nombre: true,
                tipoFuncional: true,
              },
            },
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
