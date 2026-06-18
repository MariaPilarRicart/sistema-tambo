import { CategoriaAnimal, EstadoReproductivo, TipoEvento, TipoFuncionalLote } from '@prisma/client';
import { AppError } from '../errors/AppError';

const categoriasMacho: CategoriaAnimal[] = [
  CategoriaAnimal.TERNERO,
  CategoriaAnimal.TORITO,
  CategoriaAnimal.TORO,
];

const categoriasHembra: CategoriaAnimal[] = [
  CategoriaAnimal.TERNERA,
  CategoriaAnimal.VAQUILLONA,
  CategoriaAnimal.VACA,
  CategoriaAnimal.GUACHERA,
  CategoriaAnimal.ESCUELITA,
];

const categoriasConEstadoReproductivo: CategoriaAnimal[] = [
  CategoriaAnimal.VAQUILLONA,
  CategoriaAnimal.VACA,
];

const eventosReproductivos: TipoEvento[] = [
  TipoEvento.CELO,
  TipoEvento.INSEMINACION,
  TipoEvento.TACTO,
  TipoEvento.SECADO,
  TipoEvento.PARTO,
  TipoEvento.ABORTO,
];

const lotesVaca: TipoFuncionalLote[] = [
  TipoFuncionalLote.PRODUCCION,
  TipoFuncionalLote.SECAS,
  TipoFuncionalLote.PREPARTO,
  TipoFuncionalLote.RECUPERACION,
];

// Compatibilidad: categorias viejas de vaca se convierten a VACA + lote canonico.
const lotesCompatibilidadVacaLegacy: Partial<Record<CategoriaAnimal, TipoFuncionalLote>> = {
  [CategoriaAnimal.VACA_PRODUCCION]: TipoFuncionalLote.PRODUCCION,
  [CategoriaAnimal.VACA_SECA]: TipoFuncionalLote.SECAS,
  [CategoriaAnimal.PREPARTO]: TipoFuncionalLote.PREPARTO,
};

function getLoteCompatibilidadVacaLegacy(categoriaAnimal: CategoriaAnimal) {
  return lotesCompatibilidadVacaLegacy[categoriaAnimal] ?? null;
}

function esCategoriaLegacyVaca(categoriaAnimal: CategoriaAnimal) {
  return Boolean(getLoteCompatibilidadVacaLegacy(categoriaAnimal));
}

export function calcularEdadMeses(fechaNacimiento: Date, referencia = new Date()) {
  let meses = (referencia.getFullYear() - fechaNacimiento.getFullYear()) * 12;
  meses += referencia.getMonth() - fechaNacimiento.getMonth();

  if (referencia.getDate() < fechaNacimiento.getDate()) {
    meses -= 1;
  }

  return Math.max(meses, 0);
}

export function esEventoReproductivo(tipo: TipoEvento) {
  return eventosReproductivos.includes(tipo);
}

export function esCategoriaReproductiva(categoriaAnimal: CategoriaAnimal) {
  return categoriasConEstadoReproductivo.includes(normalizarCategoriaFuncional(categoriaAnimal));
}

export function normalizarCategoriaFuncional(categoriaAnimal: CategoriaAnimal) {
  if (categoriaAnimal === CategoriaAnimal.GUACHERA || categoriaAnimal === CategoriaAnimal.ESCUELITA) {
    return CategoriaAnimal.TERNERA;
  }

  if (esCategoriaLegacyVaca(categoriaAnimal)) {
    return CategoriaAnimal.VACA;
  }

  return categoriaAnimal;
}

function getSexoFuncional(categoriaAnimal: CategoriaAnimal) {
  const categoria = normalizarCategoriaFuncional(categoriaAnimal);

  if (categoriasMacho.includes(categoria)) return 'MACHO';
  if (categoriasHembra.includes(categoria)) return 'HEMBRA';

  throw new AppError('Categoria invalida para el modulo Rodeo.', 400);
}

function estadoNoAplica(categoriaAnimal: CategoriaAnimal) {
  return !esCategoriaReproductiva(categoriaAnimal);
}

export function normalizarCategoriaLoteEstado(input: {
  categoriaAnimal: CategoriaAnimal;
  fechaNacimiento: Date;
  estadoReproductivo: EstadoReproductivo;
  loteTipoFuncional?: TipoFuncionalLote | null;
}) {
  const edadMeses = calcularEdadMeses(input.fechaNacimiento);
  const sexo = getSexoFuncional(input.categoriaAnimal);
  const categoria = normalizarCategoriaFuncional(input.categoriaAnimal);

  if (sexo === 'MACHO') {
    if (input.estadoReproductivo !== EstadoReproductivo.NO_APLICA) {
      throw new AppError('Un animal macho no puede tener estado preñada.', 400);
    }

    if (edadMeses < 4) {
      return {
        categoriaAnimal: CategoriaAnimal.TERNERO,
        estadoReproductivo: EstadoReproductivo.NO_APLICA,
        loteTipoFuncional: TipoFuncionalLote.GUACHERA,
      };
    }

    if (edadMeses < 18) {
      return {
        categoriaAnimal: CategoriaAnimal.TORITO,
        estadoReproductivo: EstadoReproductivo.NO_APLICA,
        loteTipoFuncional: TipoFuncionalLote.TORITOS,
      };
    }

    return {
      categoriaAnimal: CategoriaAnimal.TORO,
      estadoReproductivo: EstadoReproductivo.NO_APLICA,
      loteTipoFuncional: TipoFuncionalLote.TOROS,
    };
  }

  if (edadMeses < 13 && input.estadoReproductivo !== EstadoReproductivo.NO_APLICA) {
    throw new AppError('Una ternera menor a 13 meses no puede tener estado reproductivo.', 400);
  }

  if (edadMeses < 4) {
    if (input.loteTipoFuncional && input.loteTipoFuncional !== TipoFuncionalLote.GUACHERA) {
      throw new AppError('La Guachera solo admite terneros y terneras menores de 4 meses.', 400);
    }

    return {
      categoriaAnimal: CategoriaAnimal.TERNERA,
      estadoReproductivo: EstadoReproductivo.NO_APLICA,
      loteTipoFuncional: TipoFuncionalLote.GUACHERA,
    };
  }

  if (edadMeses < 8) {
    return {
      categoriaAnimal: CategoriaAnimal.TERNERA,
      estadoReproductivo: EstadoReproductivo.NO_APLICA,
      loteTipoFuncional: TipoFuncionalLote.ESCUELITA,
    };
  }

  if (edadMeses < 13) {
    return {
      categoriaAnimal: CategoriaAnimal.TERNERA,
      estadoReproductivo: EstadoReproductivo.NO_APLICA,
      loteTipoFuncional: TipoFuncionalLote.TERNERA_1,
    };
  }

  if (categoria === CategoriaAnimal.TERNERA) {
    return {
      categoriaAnimal: CategoriaAnimal.VAQUILLONA,
      estadoReproductivo: input.estadoReproductivo === EstadoReproductivo.NO_APLICA
        ? EstadoReproductivo.VACIA
        : input.estadoReproductivo,
      loteTipoFuncional: TipoFuncionalLote.TERNERA_2,
    };
  }

  if (categoria === CategoriaAnimal.VACA) {
    if (input.estadoReproductivo === EstadoReproductivo.NO_APLICA) {
      throw new AppError('Solo Vaquillona y Vaca pueden tener estado reproductivo.', 400);
    }

    const loteLegacy = getLoteCompatibilidadVacaLegacy(input.categoriaAnimal);
    if (loteLegacy) {
      return {
        categoriaAnimal: CategoriaAnimal.VACA,
        estadoReproductivo: input.estadoReproductivo,
        loteTipoFuncional: loteLegacy,
      };
    }

    if (input.loteTipoFuncional && !lotesVaca.includes(input.loteTipoFuncional)) {
      throw new AppError('Una vaca solo puede estar en Producción, Secas, Preparto o Recuperación.', 400);
    }

    return {
      categoriaAnimal: CategoriaAnimal.VACA,
      estadoReproductivo: input.estadoReproductivo,
      loteTipoFuncional: input.loteTipoFuncional ?? TipoFuncionalLote.PRODUCCION,
    };
  }

  if (input.estadoReproductivo === EstadoReproductivo.NO_APLICA) {
    throw new AppError('Solo Vaquillona y Vaca pueden tener estado reproductivo.', 400);
  }

  return {
    categoriaAnimal: CategoriaAnimal.VAQUILLONA,
    estadoReproductivo: input.estadoReproductivo,
    loteTipoFuncional: TipoFuncionalLote.TERNERA_2,
  };
}

export function validarConsistenciaAnimal(input: {
  categoriaAnimal: CategoriaAnimal;
  fechaNacimiento: Date;
  estadoReproductivo: EstadoReproductivo;
  loteTipoFuncional?: TipoFuncionalLote | null;
}) {
  return normalizarCategoriaLoteEstado(input);
}

export function validarEventoCompatibleConAnimal(animal: {
  categoriaAnimal: CategoriaAnimal;
  fechaNacimiento: Date;
  estadoReproductivo: EstadoReproductivo;
}, tipo: TipoEvento) {
  if (!esEventoReproductivo(tipo)) return;

  const categoria = normalizarCategoriaFuncional(animal.categoriaAnimal);
  const edadMeses = calcularEdadMeses(animal.fechaNacimiento);

  if (!categoriasConEstadoReproductivo.includes(categoria)) {
    throw new AppError('Solo se pueden registrar eventos reproductivos en vacas o vaquillonas.', 400);
  }

  if (edadMeses < 13) {
    throw new AppError('El animal debe tener al menos 13 meses para registrar eventos reproductivos.', 400);
  }

  switch (tipo) {
    case TipoEvento.PARTO:
      if (animal.estadoReproductivo !== EstadoReproductivo.PRENADA) {
        throw new AppError('Solo se puede registrar un parto en animales preñados.', 400);
      }
      return;

    case TipoEvento.ABORTO:
      if (animal.estadoReproductivo !== EstadoReproductivo.PRENADA) {
        throw new AppError('Solo se puede registrar un aborto en animales preñados.', 400);
      }
      return;

    case TipoEvento.INSEMINACION:
      if (animal.estadoReproductivo !== EstadoReproductivo.VACIA) {
        throw new AppError('Solo se puede registrar una inseminación en animales vacíos.', 400);
      }
      return;

    case TipoEvento.CELO:
      if (animal.estadoReproductivo !== EstadoReproductivo.VACIA) {
        throw new AppError('Solo se puede registrar celo en animales vacíos.', 400);
      }
      return;

    case TipoEvento.TACTO:
      if (animal.estadoReproductivo !== EstadoReproductivo.INSEMINADA) {
        throw new AppError('Solo se puede registrar tacto en animales inseminados.', 400);
      }
      return;

    case TipoEvento.SECADO:
      if (categoria !== CategoriaAnimal.VACA || animal.estadoReproductivo !== EstadoReproductivo.PRENADA) {
        throw new AppError('Solo se puede registrar secado en vacas preñadas.', 400);
      }
      return;
  }
}

export function getLotePostEvento(tipo: TipoEvento) {
  if (tipo === TipoEvento.SECADO) return TipoFuncionalLote.SECAS;
  if (tipo === TipoEvento.PARTO) return TipoFuncionalLote.RECUPERACION;
  return null;
}
