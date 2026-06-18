import { CategoriaAnimal, EstadoReproductivo, TipoEvento } from '@prisma/client';
import { AppError } from '../errors/AppError';

export const RODEO_LOTES = {
  GUACHERA: 'Guachera',
  ESCUELITA: 'Escuelita',
  TERNERA_1: 'Ternera 1',
  TERNERA_2: 'Ternera 2',
  PRODUCCION: 'Producción',
  SECAS: 'Secas',
  PREPARTO: 'Preparto',
  RECUPERACION: 'Recuperación',
  TORITOS: 'Toritos',
  TOROS: 'Toros',
} as const;

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
  CategoriaAnimal.VACA_PRODUCCION,
  CategoriaAnimal.VACA_SECA,
  CategoriaAnimal.PREPARTO,
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

const lotesVaca = [
  RODEO_LOTES.PRODUCCION,
  RODEO_LOTES.SECAS,
  RODEO_LOTES.PREPARTO,
  RODEO_LOTES.RECUPERACION,
];

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

  if (
    categoriaAnimal === CategoriaAnimal.VACA_PRODUCCION ||
    categoriaAnimal === CategoriaAnimal.VACA_SECA ||
    categoriaAnimal === CategoriaAnimal.PREPARTO
  ) {
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
  loteNombre?: string | null;
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
        loteNombre: RODEO_LOTES.GUACHERA,
      };
    }

    if (edadMeses < 18) {
      return {
        categoriaAnimal: CategoriaAnimal.TORITO,
        estadoReproductivo: EstadoReproductivo.NO_APLICA,
        loteNombre: RODEO_LOTES.TORITOS,
      };
    }

    return {
      categoriaAnimal: CategoriaAnimal.TORO,
      estadoReproductivo: EstadoReproductivo.NO_APLICA,
      loteNombre: RODEO_LOTES.TOROS,
    };
  }

  if (edadMeses < 13 && input.estadoReproductivo !== EstadoReproductivo.NO_APLICA) {
    throw new AppError('Una ternera menor a 13 meses no puede tener estado reproductivo.', 400);
  }

  if (edadMeses < 4) {
    if (input.loteNombre && input.loteNombre !== RODEO_LOTES.GUACHERA) {
      throw new AppError('La Guachera solo admite terneros y terneras menores de 4 meses.', 400);
    }

    return {
      categoriaAnimal: CategoriaAnimal.TERNERA,
      estadoReproductivo: EstadoReproductivo.NO_APLICA,
      loteNombre: RODEO_LOTES.GUACHERA,
    };
  }

  if (edadMeses < 8) {
    return {
      categoriaAnimal: CategoriaAnimal.TERNERA,
      estadoReproductivo: EstadoReproductivo.NO_APLICA,
      loteNombre: RODEO_LOTES.ESCUELITA,
    };
  }

  if (edadMeses < 13) {
    return {
      categoriaAnimal: CategoriaAnimal.TERNERA,
      estadoReproductivo: EstadoReproductivo.NO_APLICA,
      loteNombre: RODEO_LOTES.TERNERA_1,
    };
  }

  if (categoria === CategoriaAnimal.TERNERA) {
    return {
      categoriaAnimal: CategoriaAnimal.VAQUILLONA,
      estadoReproductivo: input.estadoReproductivo === EstadoReproductivo.NO_APLICA
        ? EstadoReproductivo.VACIA
        : input.estadoReproductivo,
      loteNombre: RODEO_LOTES.TERNERA_2,
    };
  }

  if (categoria === CategoriaAnimal.VACA) {
    if (input.estadoReproductivo === EstadoReproductivo.NO_APLICA) {
      throw new AppError('Solo Vaquillona y Vaca pueden tener estado reproductivo.', 400);
    }

    if (input.categoriaAnimal === CategoriaAnimal.VACA_PRODUCCION) {
      return {
        categoriaAnimal: CategoriaAnimal.VACA,
        estadoReproductivo: input.estadoReproductivo,
        loteNombre: RODEO_LOTES.PRODUCCION,
      };
    }

    if (input.categoriaAnimal === CategoriaAnimal.VACA_SECA) {
      return {
        categoriaAnimal: CategoriaAnimal.VACA,
        estadoReproductivo: input.estadoReproductivo,
        loteNombre: RODEO_LOTES.SECAS,
      };
    }

    if (input.categoriaAnimal === CategoriaAnimal.PREPARTO) {
      return {
        categoriaAnimal: CategoriaAnimal.VACA,
        estadoReproductivo: input.estadoReproductivo,
        loteNombre: RODEO_LOTES.PREPARTO,
      };
    }

    if (input.loteNombre && !lotesVaca.includes(input.loteNombre as typeof lotesVaca[number])) {
      throw new AppError('Una vaca solo puede estar en Producción, Secas, Preparto o Recuperación.', 400);
    }

    return {
      categoriaAnimal: CategoriaAnimal.VACA,
      estadoReproductivo: input.estadoReproductivo,
      loteNombre: input.loteNombre ?? RODEO_LOTES.PRODUCCION,
    };
  }

  if (input.estadoReproductivo === EstadoReproductivo.NO_APLICA) {
    throw new AppError('Solo Vaquillona y Vaca pueden tener estado reproductivo.', 400);
  }

  return {
    categoriaAnimal: CategoriaAnimal.VAQUILLONA,
    estadoReproductivo: input.estadoReproductivo,
    loteNombre: RODEO_LOTES.TERNERA_2,
  };
}

export function validarConsistenciaAnimal(input: {
  categoriaAnimal: CategoriaAnimal;
  fechaNacimiento: Date;
  estadoReproductivo: EstadoReproductivo;
  loteNombre?: string | null;
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

  if (
    !categoriasConEstadoReproductivo.includes(categoria) ||
    edadMeses < 13 ||
    animal.estadoReproductivo === EstadoReproductivo.NO_APLICA
  ) {
    throw new AppError(
      'El animal debe ser Vaquillona o Vaca y tener al menos 13 meses para registrar eventos reproductivos.',
      400,
    );
  }
}

export function getLotePostEvento(tipo: TipoEvento) {
  if (tipo === TipoEvento.SECADO) return RODEO_LOTES.SECAS;
  if (tipo === TipoEvento.PARTO) return RODEO_LOTES.RECUPERACION;
  return null;
}
