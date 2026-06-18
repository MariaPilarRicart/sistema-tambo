import type { Animal, CategoriaAnimal } from '../types/animales';
import type { TipoEvento } from '../types/eventos';

export const nonReproductiveEventOptions: TipoEvento[] = ['CLINICO', 'CAMBIO_LOTE', 'VENTA', 'MUERTE'];

const legacyCowCategoryMap: Partial<Record<CategoriaAnimal, CategoriaAnimal>> = {
  VACA_PRODUCCION: 'VACA',
  VACA_SECA: 'VACA',
  PREPARTO: 'VACA',
};

function localDateInput(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateAgeMonths(fechaNacimiento: string) {
  const birthDate = new Date(`${fechaNacimiento}T09:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
  months += today.getMonth() - birthDate.getMonth();
  if (today.getDate() < birthDate.getDate()) months -= 1;
  return Math.max(months, 0);
}

export function toFunctionalEventCategory(category: CategoriaAnimal): CategoriaAnimal {
  if (category === 'GUACHERA' || category === 'ESCUELITA') return 'TERNERA';
  return legacyCowCategoryMap[category] ?? category;
}

export function isReproductiveAnimal(animal: Animal | null) {
  if (!animal || !animal.activo || animal.estadoAnimal !== 'ACTIVO') return false;
  const category = toFunctionalEventCategory(animal.categoriaAnimal);
  const ageMonths = calculateAgeMonths(localDateInput(animal.fechaNacimiento));
  return (category === 'VAQUILLONA' || category === 'VACA') && ageMonths !== null && ageMonths >= 13;
}

export function getAvailableEventOptions(animal: Animal | null): TipoEvento[] {
  const options = [...nonReproductiveEventOptions];
  if (!animal || !isReproductiveAnimal(animal)) return options;

  if (animal.estadoReproductivo === 'VACIA') {
    options.unshift('CELO', 'INSEMINACION');
  }

  if (animal.estadoReproductivo === 'INSEMINADA') {
    options.unshift('TACTO');
  }

  if (animal.estadoReproductivo === 'PRENADA') {
    options.unshift('ABORTO');
    const category = toFunctionalEventCategory(animal.categoriaAnimal);
    if (category === 'VACA') options.unshift('SECADO');
    options.unshift('PARTO');
  }

  if (animal.estadoReproductivo === 'RECUPERACION') {
    options.unshift('CLINICO');
  }

  return options.filter((option, index) => options.indexOf(option) === index);
}

export function isEventOptionAvailable(animal: Animal | null, tipo: TipoEvento | '') {
  return Boolean(tipo) && getAvailableEventOptions(animal).includes(tipo as TipoEvento);
}
