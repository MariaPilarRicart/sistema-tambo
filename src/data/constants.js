import { Droplet, Activity, ShieldCheck, Heart } from 'lucide-react';

export const INITIAL_LOTES = ["Guachera", "Escuelita", "Terneras", "Vaquillonas", "Secas", "Producción"];

export const INITIAL_DIETAS = [
  { lote: "Guachera", components: [{ item: "Leche", cant: 4, unit: "L" }, { item: "Balanceado Iniciador", cant: 0.5, unit: "kg" }] },
  { lote: "Escuelita", components: [{ item: "Balanceado", cant: 2, unit: "kg" }, { item: "Rollos de Alfa", cant: 3, unit: "kg" }] },
  { lote: "Terneras", components: [{ item: "Balanceado Recría", cant: 3, unit: "kg" }, { item: "Silaje de Maíz", cant: 5, unit: "kg" }] },
  { lote: "Vaquillonas", components: [{ item: "Silaje de Maíz", cant: 15, unit: "kg" }, { item: "Harina de Soja", cant: 1.5, unit: "kg" }, { item: "Sales Minerales", cant: 0.1, unit: "kg" }] },
  { lote: "Secas", components: [{ item: "Heno de Alfalfa", cant: 6, unit: "kg" }, { item: "Silaje de Maíz", cant: 10, unit: "kg" }] },
  { lote: "Producción", components: [{ item: "Silaje de Maíz", cant: 25, unit: "kg" }, { item: "Balanceado Alta Prod.", cant: 6, unit: "kg" }, { item: "Harina de Soja", cant: 2, unit: "kg" }] }
];

export const FEED_INVENTORY = [
  { name: 'Silaje de Maíz', current: 120, capacity: 500, unit: 'Tons', status: 'Bajo' },
  { name: 'Balanceado', current: 85, capacity: 100, unit: 'Tons', status: 'Bien' },
  { name: 'Harina de Soja', current: 15, capacity: 40, unit: 'Tons', status: 'Alerta' },
  { name: 'Rollos de Alfa', current: 200, capacity: 500, unit: 'Unid', status: 'Bien' },
];

export const HERD_DATA = [
  { id: '1001', breed: 'Holando', category: 'Vaca', batch: 'Producción', reproductiveStatus: 'Preñada', productiveStatus: 'En Ordeño', birthDate: '12/05/2019', sire: 'Thunder', dam: 'Molly (992)' },
  { id: '1002', breed: 'Jersey', category: 'Vaca', batch: 'Producción', reproductiveStatus: 'Vacía', productiveStatus: 'En Ordeño', birthDate: '01/02/2020', sire: 'Patriot', dam: 'Luna (102)' },
  { id: '1045', breed: 'Holando', category: 'Vaca', batch: 'Secas', reproductiveStatus: 'Preñada', productiveStatus: 'Seca', birthDate: '15/08/2018', sire: 'Magnum', dam: 'Estrella (45)' },
  { id: '1102', breed: 'Holando', category: 'Ternera', batch: 'Guachera', reproductiveStatus: 'N/A', productiveStatus: 'Cria', birthDate: '05/10/2025', sire: 'Sexado', dam: 'Celia (1001)' },
];

export const VACCINE_RULES = [
  { id: 1, name: 'Fiebre Aftosa', frequency: 180, senasa: true, warningDays: 30 },
  { id: 2, name: 'Brucelosis', frequency: 365, senasa: true, warningDays: 45 },
  { id: 3, name: 'Carbunclo', frequency: 365, senasa: true, warningDays: 30 },
  { id: 4, name: 'IBR / DVB (Respiratoria)', frequency: 180, senasa: false, warningDays: 15 },
  { id: 5, name: 'Rotavirus (J5)', frequency: 365, senasa: false, warningDays: 7 },
];

export const VACCINATION_HISTORY = [
  { id: 1, date: '20/01/2026', vaccine: 'Fiebre Aftosa', batch: 'Producción', count: 450, user: 'Juan G.' },
  { id: 2, date: '15/01/2026', vaccine: 'IBR / DVB', batch: 'Guachera', count: 12, user: 'Pedro L.' },
  { id: 3, date: '10/01/2026', vaccine: 'Carbunclo', batch: 'Vaquillonas', count: 85, user: 'Juan G.' },
  { id: 4, date: '05/01/2026', vaccine: 'Brucelosis', batch: 'Terneras', count: 32, user: 'Maria V.' },
];

export const COWS_DRY_OFF = [
  { id: 'AR-292', daysInMilk: 305, dueDates: '12 Oct' },
  { id: 'AR-104', daysInMilk: 310, dueDates: '14 Oct' },
  { id: 'AR-992', daysInMilk: 301, dueDates: '15 Oct' },
  { id: 'AR-101', daysInMilk: 298, dueDates: '20 Oct' },
];

export const UPCOMING_CALVINGS = [
  { id: 'AR-442', sire: 'Thunder', dueDates: 'Mañana' },
  { id: 'AR-331', sire: 'Patriot', dueDates: '14 Oct' },
  { id: 'AR-112', sire: 'Magnum', dueDates: '18 Oct' },
  { id: 'AR-889', sire: 'Legacy', dueDates: '25 Oct' },
];

export const DASH_METRICS = [
  { title: 'Producción Diaria', value: '28,500 L', trend: 'up', percent: '+2.5%', icon: Droplet, color: 'emerald' },
  { title: 'Promedio por Vaca', value: '24.5 L', trend: 'down', percent: '-0.5 L', icon: Activity, color: 'blue' },
  { title: 'Calidad (RCS)', value: '180 k', trend: 'up', percent: 'Óptimo', icon: ShieldCheck, color: 'indigo' },
  { title: 'Tasa de Preñez', value: '68%', trend: 'up', percent: '+1.2%', icon: Heart, color: 'pink' },
];

export const PROD_CHART_DATA = [26500, 26800, 27000, 26900, 27200, 27500, 27400, 27800, 28000, 28100, 28300, 28000, 27900, 28200, 28500];