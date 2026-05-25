import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Wheat, 
  Bell, 
  Search, 
  Plus, 
  Filter, 
  AlertTriangle, 
  Droplet, 
  Calendar, 
  Menu,
  X,
  Thermometer,
  ClipboardList,
  MoreVertical,
  PlusCircle, 
  FileText,
  ArrowRightLeft,
  Syringe,
  Heart,
  Download,
  User,
  ChevronDown,
  History,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Cloud,
  Sun,
  Wind,
  List,
  Settings,
  Save,
  Trash2,
  ChevronRight,
  Sparkles,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Info,
  ArrowRight,
  Baby,
  Scale,
  ArrowLeft,
  CheckSquare,
  Lock, // Agregado para el login
  LogIn, // Agregado para el login
  PieChart // Aseguramos que esté para el dashboard
} from 'lucide-react';

// --- Configuración de la API Gemini ---
const apiKey = ""; 

const callGeminiAPI = async (prompt) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  const delays = [1000, 2000, 4000, 8000, 16000];
  
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Error HTTP! status: ${response.status}`);
      
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar una respuesta.";
    } catch (error) {
      if (i === 4) return "Error de conexión con la IA. Por favor, intente más tarde.";
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};

// --- Íconos Personalizados ---

const Cow = ({ size = 24, className, ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className} 
    {...props}
  >
    <path d="M7 21a4 4 0 0 1-4.8-5.2c0-1.5.3-3.8 2.2-5.4L7 8" />
    <path d="M17 21a4 4 0 0 0 4.8-5.2c0-1.5-.3-3.8-2.2-5.4L17 8" />
    <path d="M4 14h16" />
    <path d="M10 8c-2 0-3-1-3-3s1-2 3-2 3 1 3 2-1 3-3 3z" />
    <path d="M12 2v4" />
  </svg>
);

// --- Datos Maestros y Mock ---

const INITIAL_LOTES = [
  "Guachera",
  "Escuelita",
  "Terneras",
  "Vaquillonas",
  "Secas",
  "Producción"
];

const INITIAL_DIETAS = [
  { lote: "Guachera", components: [{ item: "Leche", cant: 4, unit: "L" }, { item: "Balanceado Iniciador", cant: 0.5, unit: "kg" }] },
  { lote: "Escuelita", components: [{ item: "Balanceado", cant: 2, unit: "kg" }, { item: "Rollos de Alfa", cant: 3, unit: "kg" }] },
  { lote: "Terneras", components: [{ item: "Balanceado Recría", cant: 3, unit: "kg" }, { item: "Silaje de Maíz", cant: 5, unit: "kg" }] },
  { lote: "Vaquillonas", components: [{ item: "Silaje de Maíz", cant: 15, unit: "kg" }, { item: "Harina de Soja", cant: 1.5, unit: "kg" }, { item: "Sales Minerales", cant: 0.1, unit: "kg" }] },
  { lote: "Secas", components: [{ item: "Heno de Alfalfa", cant: 6, unit: "kg" }, { item: "Silaje de Maíz", cant: 10, unit: "kg" }] },
  { lote: "Producción", components: [{ item: "Silaje de Maíz", cant: 25, unit: "kg" }, { item: "Balanceado Alta Prod.", cant: 6, unit: "kg" }, { item: "Harina de Soja", cant: 2, unit: "kg" }] }
];

const FEED_INVENTORY = [
  { name: 'Silaje de Maíz', current: 120, capacity: 500, unit: 'Tons', status: 'Bajo' },
  { name: 'Balanceado', current: 85, capacity: 100, unit: 'Tons', status: 'Bien' },
  { name: 'Harina de Soja', current: 15, capacity: 40, unit: 'Tons', status: 'Alerta' },
  { name: 'Rollos de Alfa', current: 200, capacity: 500, unit: 'Unid', status: 'Bien' },
];

const HERD_DATA = [
  { id: '1001', breed: 'Holando', category: 'Vaca', batch: 'Producción', reproductiveStatus: 'Preñada', productiveStatus: 'En Ordeño', birthDate: '12/05/2019', sire: 'Thunder', dam: 'Molly (992)' },
  { id: '1002', breed: 'Jersey', category: 'Vaca', batch: 'Producción', reproductiveStatus: 'Vacía', productiveStatus: 'En Ordeño', birthDate: '01/02/2020', sire: 'Patriot', dam: 'Luna (102)' },
  { id: '1045', breed: 'Holando', category: 'Vaca', batch: 'Secas', reproductiveStatus: 'Preñada', productiveStatus: 'Seca', birthDate: '15/08/2018', sire: 'Magnum', dam: 'Estrella (45)' },
  { id: '1102', breed: 'Holando', category: 'Ternera', batch: 'Guachera', reproductiveStatus: 'N/A', productiveStatus: 'Cria', birthDate: '05/10/2025', sire: 'Sexado', dam: 'Celia (1001)' },
];

const VACCINE_RULES = [
  { id: 1, name: 'Fiebre Aftosa', frequency: 180, senasa: true, warningDays: 30 },
  { id: 2, name: 'Brucelosis', frequency: 365, senasa: true, warningDays: 45 },
  { id: 3, name: 'Carbunclo', frequency: 365, senasa: true, warningDays: 30 },
  { id: 4, name: 'IBR / DVB (Respiratoria)', frequency: 180, senasa: false, warningDays: 15 },
  { id: 5, name: 'Rotavirus (J5)', frequency: 365, senasa: false, warningDays: 7 },
];

const VACCINATION_HISTORY = [
  { id: 1, date: '20/01/2026', vaccine: 'Fiebre Aftosa', batch: 'Producción', count: 450, user: 'Juan G.' },
  { id: 2, date: '15/01/2026', vaccine: 'IBR / DVB', batch: 'Guachera', count: 12, user: 'Pedro L.' },
  { id: 3, date: '10/01/2026', vaccine: 'Carbunclo', batch: 'Vaquillonas', count: 85, user: 'Juan G.' },
  { id: 4, date: '05/01/2026', vaccine: 'Brucelosis', batch: 'Terneras', count: 32, user: 'Maria V.' },
];

const COWS_DRY_OFF = [
  { id: 'AR-292', daysInMilk: 305, dueDates: '12 Oct' },
  { id: 'AR-104', daysInMilk: 310, dueDates: '14 Oct' },
  { id: 'AR-992', daysInMilk: 301, dueDates: '15 Oct' },
  { id: 'AR-101', daysInMilk: 298, dueDates: '20 Oct' },
];

const UPCOMING_CALVINGS = [
  { id: 'AR-442', sire: 'Thunder', dueDates: 'Mañana' },
  { id: 'AR-331', sire: 'Patriot', dueDates: '14 Oct' },
  { id: 'AR-112', sire: 'Magnum', dueDates: '18 Oct' },
  { id: 'AR-889', sire: 'Legacy', dueDates: '25 Oct' },
];

const DASH_METRICS = [
  { title: 'Producción Diaria', value: '28,500 L', trend: 'up', percent: '+2.5%', icon: Droplet, color: 'emerald' },
  { title: 'Promedio por Vaca', value: '24.5 L', trend: 'down', percent: '-0.5 L', icon: Activity, color: 'blue' },
  { title: 'Calidad (RCS)', value: '180 k', trend: 'up', percent: 'Óptimo', icon: ShieldCheck, color: 'indigo' },
  { title: 'Tasa de Preñez', value: '68%', trend: 'up', percent: '+1.2%', icon: Heart, color: 'pink' },
];

const PROD_CHART_DATA = [26500, 26800, 27000, 26900, 27200, 27500, 27400, 27800, 28000, 28100, 28300, 28000, 27900, 28200, 28500];

// --- Componentes Reutilizables ---

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        <div className="p-6 max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 mb-1 ${
      active 
        ? 'bg-emerald-50 text-emerald-700 font-medium' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    <Icon size={20} />
    <span>{label}</span>
  </button>
);

const Badge = ({ children, type }) => {
  const styles = {
    critical: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-emerald-100 text-emerald-700',
    info: 'bg-blue-50 text-blue-700',
    neutral: 'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type] || styles.neutral}`}>
      {children}
    </span>
  );
};

// --- Vistas ---

const MainDashboard = () => {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleIAAnalysis = async () => {
    setIsLoading(true);
    const prompt = `Analiza este estado de un tambo: Producción: 28.500L, Calidad: 180k RCS, Preñez: 68%. Alertas: Silaje bajo. Dame un resumen de 2 frases y 3 consejos prioritarios en español.`;
    const result = await callGeminiAPI(prompt);
    setAiAnalysis(result);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {DASH_METRICS.map((metric, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-${metric.color}-50 text-${metric.color}-600`}>
                <metric.icon size={22} />
              </div>
              <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${metric.trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {metric.percent}
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">{metric.title}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{metric.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Producción (Últimos 30 Días)</h3>
            <button onClick={handleIAAnalysis} disabled={isLoading} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              IA Consultora
            </button>
          </div>
          {aiAnalysis && (
            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-900 animate-fade-in">
              <p className="whitespace-pre-wrap">{aiAnalysis}</p>
            </div>
          )}
          <div className="h-48 w-full bg-slate-50 rounded-lg flex items-end p-4 gap-2 border border-slate-100">
            {PROD_CHART_DATA.map((val, i) => (
              <div key={i} className="flex-1 bg-emerald-400 rounded-t-sm" style={{ height: `${(val / 30000) * 100}%` }}></div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 text-center border-b pb-2">Alertas Operativas</h3>
          <div className="space-y-3">
             <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex gap-3">
                <AlertCircle className="text-rose-600" size={18}/>
                <p className="text-xs font-bold text-rose-700">VACUNA VENCIDA (Guachera)</p>
             </div>
             <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
                <Wheat className="text-amber-600" size={18}/>
                <p className="text-xs font-bold text-amber-700">SILO MAÍZ: STOCK BAJO</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HerdView = () => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isAltaModalOpen, setIsAltaModalOpen] = useState(false);

  const handleAction = (animal, type) => {
    setSelectedAnimal(animal);
    setOpenMenuId(null);
    if (type === 'ficha') setIsFichaOpen(true);
    if (type === 'evento') setIsEventModalOpen(true);
    if (type === 'mover') setIsMoveModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestión del Rodeo</h2>
        <button 
          onClick={() => setIsAltaModalOpen(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm hover:bg-emerald-700 transition-all"
        >
          <Plus size={18}/> Alta Animal
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Animal</th>
              <th className="px-6 py-4">Lote</th>
              <th className="px-6 py-4">Est. Repro</th>
              <th className="px-6 py-4">Est. Prod</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {HERD_DATA.map((animal) => (
              <tr key={animal.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">#{animal.id}</span>
                    <span className="text-xs text-slate-400">{animal.breed}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 font-medium">{animal.batch}</td>
                <td className="px-6 py-4">
                  <Badge type={animal.reproductiveStatus === 'Preñada' ? 'success' : animal.reproductiveStatus === 'Vacía' ? 'warning' : 'neutral'}>
                    {animal.reproductiveStatus}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  <Badge type={animal.productiveStatus === 'En Ordeño' ? 'info' : 'neutral'}>
                    {animal.productiveStatus}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right relative">
                  <button onClick={() => setOpenMenuId(openMenuId === animal.id ? null : animal.id)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                    <MoreVertical size={18}/>
                  </button>
                  {openMenuId === animal.id && (
                    <div className="absolute right-6 top-10 w-48 bg-white border border-slate-100 shadow-xl rounded-lg z-50 py-1 text-left ring-1 ring-black/5">
                       <button onClick={() => handleAction(animal, 'evento')} className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition-colors"><PlusCircle size={14}/> Registrar Evento</button>
                       <button onClick={() => handleAction(animal, 'ficha')} className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"><FileText size={14}/> Ver Ficha</button>
                       <button onClick={() => handleAction(animal, 'mover')} className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"><ArrowRightLeft size={14}/> Cambiar Lote</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isAltaModalOpen} onClose={() => setIsAltaModalOpen(false)} title="Alta de Nuevo Animal">
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Caravana</label>
                    <input placeholder="ID Caravana" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Lote</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white">
                        {INITIAL_LOTES.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
              </div>
              <button className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold">Guardar Animal</button>
          </div>
      </Modal>

      {/* Modales extras agregados para que no den error al invocar handleAction */}
      <Modal isOpen={isFichaOpen} onClose={() => setIsFichaOpen(false)} title={`Ficha Técnica - #${selectedAnimal?.id}`}>
          <div className="space-y-2 text-sm text-slate-600">
            <p><strong>Raza:</strong> {selectedAnimal?.breed}</p>
            <p><strong>Categoría:</strong> {selectedAnimal?.category}</p>
            <p><strong>Estado:</strong> {selectedAnimal?.productiveStatus}</p>
          </div>
      </Modal>
      
      <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title={`Registrar Evento - #${selectedAnimal?.id}`}>
          <div className="space-y-4">
            <select className="w-full p-2 border rounded-lg"><option>Parto</option><option>IA</option><option>Secado</option></select>
            <button className="w-full py-2 bg-emerald-600 text-white rounded-lg">Cargar Evento</button>
          </div>
      </Modal>

      <Modal isOpen={isMoveModalOpen} onClose={() => setIsMoveModalOpen(false)} title={`Cambiar Lote - #${selectedAnimal?.id}`}>
          <div className="space-y-4">
            <select className="w-full p-2 border rounded-lg">{INITIAL_LOTES.map(l => <option key={l}>{l}</option>)}</select>
            <button className="w-full py-2 bg-emerald-600 text-white rounded-lg">Confirmar Movimiento</button>
          </div>
      </Modal>
    </div>
  );
};

const VaccinationView = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Historial de Vacunación</h2>
          <p className="text-slate-500 text-sm">Registro de aplicaciones sanitarias por lote.</p>
        </div>
        <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm transition-all hover:bg-emerald-700">
          <Plus size={18}/> Nueva Aplicación
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Vacuna / Insumo</th>
              <th className="px-6 py-4">Lote Destino</th>
              <th className="px-6 py-4 text-center">Cant. Animales</th>
              <th className="px-6 py-4 text-right">Operador</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {VACCINATION_HISTORY.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-700">{v.date}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                      <Syringe size={14}/>
                    </div>
                    <span className="font-bold text-slate-800">{v.vaccine}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge type="neutral">{v.batch}</Badge>
                </td>
                <td className="px-6 py-4 text-center font-mono text-slate-600">{v.count}</td>
                <td className="px-6 py-4 text-right text-slate-500">{v.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SettingsView = () => {
  const [activeTab, setActiveTab] = useState('lotes');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row min-h-[600px] overflow-hidden animate-fade-in">
      <aside className="w-full md:w-64 bg-slate-50/50 border-r border-slate-100 p-6">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Administración</h3>
        <nav className="space-y-1">
          <button onClick={() => setActiveTab('lotes')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'lotes' ? 'bg-white text-emerald-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}>Nombres de Lotes <ChevronRight size={14} className={activeTab === 'lotes' ? 'opacity-100' : 'opacity-0'}/></button>
          <button onClick={() => setActiveTab('alimentos')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'alimentos' ? 'bg-white text-emerald-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}>Alimentos e Insumos <ChevronRight size={14} className={activeTab === 'alimentos' ? 'opacity-100' : 'opacity-0'}/></button>
          <button onClick={() => setActiveTab('vacunas')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'vacunas' ? 'bg-white text-emerald-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}>Protocolo Sanitario <ChevronRight size={14} className={activeTab === 'vacunas' ? 'opacity-100' : 'opacity-0'}/></button>
        </nav>
      </aside>
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'lotes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Nombres de Lotes Oficiales</h2>
              <button className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm"><Plus size={18}/></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {INITIAL_LOTES.map((l, i) => (
                <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center"><span className="font-bold text-slate-700">{l}</span><div className="flex gap-2"><button className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"><Settings size={14}/></button><button className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={14}/></button></div></div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'alimentos' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">Insumos y Alimentos</h2><button className="p-2 bg-emerald-600 text-white rounded-lg"><Plus size={18}/></button></div>
            <div className="space-y-3">{FEED_INVENTORY.map((f, i) => (<div key={i} className="p-4 bg-white border border-slate-100 rounded-xl flex justify-between items-center shadow-sm"><div><p className="font-bold text-slate-800">{f.name}</p><p className="text-xs text-slate-400">Capacidad: {f.capacity} {f.unit}</p></div><Badge type="info">Stock: {f.current} {f.unit}</Badge></div>))}</div>
          </div>
        )}
        {activeTab === 'vacunas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100"><h2 className="text-xl font-bold text-slate-800">Reglas de Vacunación</h2><button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all hover:bg-emerald-700"><PlusCircle size={18}/> Nueva Vacuna</button></div>
            <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm"><table className="w-full text-sm text-left"><thead className="bg-slate-50/80 text-slate-500 font-bold border-b"><tr><th className="px-6 py-4">Vacuna</th><th className="px-6 py-4">Dureza (Días)</th><th className="px-6 py-4 text-right">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{VACCINE_RULES.map((r) => (<tr key={r.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-4 font-bold text-slate-800">{r.name}</td><td className="px-6 py-4 text-slate-500 font-medium">{r.frequency} días</td><td className="px-6 py-4 text-right"><button className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div>
          </div>
        )}
      </div>
    </div>
  );
};

const ListingsView = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-slate-800">Listados Operativos</h2><p className="text-slate-500 text-sm">Animales que requieren acciones programadas próximamente.</p></div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-bold shadow-sm transition-all"><Download size={18}/> Exportar Todo</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center"><h3 className="font-bold text-blue-900 flex items-center gap-2"><Droplet size={20} className="text-blue-500"/> Vacas a Secar</h3><Badge type="info">{COWS_DRY_OFF.length} Animales</Badge></div>
          <div className="flex-1 overflow-auto max-h-[500px]"><table className="w-full text-sm text-left"><thead className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100"><tr><th className="px-6 py-3">Caravana</th><th className="px-6 py-3 text-right">Fecha de Secado</th></tr></thead><tbody className="divide-y divide-slate-50">{COWS_DRY_OFF.map((cow, i) => (<tr key={i} className="hover:bg-slate-50/80 transition-colors"><td className="px-6 py-4 font-bold text-slate-800">#{cow.id}</td><td className="px-6 py-4 text-right"><span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">{cow.dueDates}</span></td></tr>))}</tbody></table></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-pink-50/50 border-b border-pink-100 flex justify-between items-center"><h3 className="font-bold text-pink-900 flex items-center gap-2"><Heart size={20} className="text-pink-500"/> Próximos Partos</h3><Badge type="critical">{UPCOMING_CALVINGS.length} Alertas</Badge></div>
          <div className="flex-1 overflow-auto max-h-[500px]"><table className="w-full text-sm text-left"><thead className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100"><tr><th className="px-6 py-3">Madre</th><th className="px-6 py-3 text-center">Toro</th><th className="px-6 py-3 text-right">Fecha Probable</th></tr></thead><tbody className="divide-y divide-slate-50">{UPCOMING_CALVINGS.map((cow, i) => (<tr key={i} className="hover:bg-slate-50/80 transition-colors"><td className="px-6 py-4 font-bold text-slate-800">#{cow.id}</td><td className="px-6 py-4 text-center text-slate-500 font-medium">{cow.sire}</td><td className="px-6 py-4 text-right"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${cow.dueDates === 'Mañana' ? 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse' : 'bg-pink-50 text-pink-700 border-pink-100'}`}>{cow.dueDates}</span></td></tr>))}</tbody></table></div>
        </div>
      </div>
    </div>
  );
};

const FeedView = () => {
  const [dietas, setDietas] = useState(INITIAL_DIETAS);
  const [editingLote, setEditingLote] = useState(null);

  const startEditing = (loteData) => setEditingLote(JSON.parse(JSON.stringify(loteData)));

  const handleUpdateKilos = (index, value) => {
    const newComponents = [...editingLote.components];
    newComponents[index].cant = parseFloat(value) || 0;
    setEditingLote({ ...editingLote, components: newComponents });
  };

  const removeComponent = (index) => {
      const newComponents = editingLote.components.filter((_, i) => i !== index);
      setEditingLote({ ...editingLote, components: newComponents });
  };

  const addComponent = () => {
      const newComponents = [...editingLote.components, { item: "Balanceado", cant: 0, unit: "kg" }];
      setEditingLote({ ...editingLote, components: newComponents });
  }

  const saveDieta = () => {
    const newDietas = dietas.map(d => d.lote === editingLote.lote ? editingLote : d);
    setDietas(newDietas);
    setEditingLote(null);
  };

  if (editingLote) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4"><button onClick={() => setEditingLote(null)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 shadow-sm"><ArrowLeft size={20} /></button><div><h2 className="text-2xl font-bold text-slate-800">Modificar Dieta: {editingLote.lote}</h2></div></div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 max-w-3xl"><div className="space-y-6">{editingLote.components.map((c, idx) => (<div key={idx} className="flex flex-col md:flex-row items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border group"><div className="flex-1 w-full"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Alimento</label><select value={c.item} onChange={(e) => { const newC = [...editingLote.components]; newC[idx].item = e.target.value; setEditingLote({ ...editingLote, components: newC }); }} className="w-full bg-white border rounded-xl px-4 py-2 text-sm font-medium outline-none"><option>Leche</option><option>Balanceado</option><option>Silaje de Maíz</option></select></div><div className="w-full md:w-32"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cantidad</label><div className="relative"><input type="number" value={c.cant} onChange={(e) => handleUpdateKilos(idx, e.target.value)} className="w-full bg-white border rounded-xl px-4 py-2 text-sm font-bold outline-none"/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">{c.unit}</span></div></div><button onClick={() => removeComponent(idx)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button></div>))}<button onClick={addComponent} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 flex items-center justify-center gap-2 text-sm font-bold"><Plus size={18}/> Agregar Insumo</button><div className="pt-6 border-t border-slate-100 flex gap-4"><button onClick={saveDieta} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Save size={18}/> Guardar Cambios</button></div></div></div></div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-800">Alimentación por Lote</h2><p className="text-slate-500 text-sm">Gestione las raciones diarias de cada categoría de animales.</p></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{dietas.map((dieta, i) => (<div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all"><div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center gap-2"><div className="w-2 h-5 bg-emerald-500 rounded-full"></div>Lote {dieta.lote}</h3><button onClick={() => startEditing(dieta)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors shadow-sm"><Settings size={16}/></button></div><div className="p-5 flex-1 space-y-3">{dieta.components.map((c, idx) => (<div key={idx} className="flex justify-between items-center text-sm"><span className="text-slate-600 font-medium">{c.item}</span><div className="flex items-baseline gap-1"><span className="font-bold text-slate-800">{c.cant}</span><span className="text-[10px] font-bold text-slate-400 uppercase">{c.unit}</span></div></div>))}</div><div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center"><span className="text-[10px] text-slate-400 font-bold uppercase">Estado nutricional</span><Badge type="info">Balanceado</Badge></div></div>))}</div>
      <div className="mt-10"><h3 className="text-lg font-bold text-slate-800 mb-4">Stock de Insumos</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{FEED_INVENTORY.map((item, idx) => (<div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"><div className="flex justify-between items-start mb-3"><h4 className="font-bold text-slate-700 text-sm">{item.name}</h4><Badge type={item.status === 'Bajo' ? 'critical' : 'success'}>{item.status}</Badge></div><div className="flex justify-between items-end mt-2"><span className="text-xl font-bold text-slate-800">{item.current} <span className="text-xs text-slate-400 font-normal">{item.unit}</span></span></div><div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden"><div className={`h-full bg-emerald-500`} style={{ width: `${(item.current/item.capacity)*100}%`}}></div></div></div>))}</div></div>
    </div>
  );
};

// --- COMPONENTE LOGIN ---

const LoginView = ({ onLogin }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user === 'admin' && pass === 'admin') onLogin();
    else { setError(true); setTimeout(() => setError(false), 3000); }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4"><Cow size={40} /></div>
          <h1 className="text-2xl font-black text-slate-800 italic uppercase">AgriDairy<span className="text-emerald-600">Pro</span></h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Control de Acceso</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" value={user} onChange={(e) => setUser(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all" placeholder="admin" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all" placeholder="admin" />
            </div>
          </div>
          {error && <div className="bg-rose-50 text-rose-600 text-xs font-bold p-3 rounded-lg flex items-center gap-2 animate-bounce"><AlertCircle size={14} /> Credenciales incorrectas</div>}
          <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><LogIn size={20} /> INGRESAR</button>
        </form>
      </div>
    </div>
  );
};

// --- Layout Principal (App) ---

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <MainDashboard />;
      case 'herd': return <HerdView />;
      case 'feed': return <FeedView />;
      case 'listings': return <ListingsView />;
      case 'vaccination': return <VaccinationView />;
      case 'settings': return <SettingsView />;
      default: return <MainDashboard />;
    }
  };

  const getTitle = (tab) => {
    const titles = { 
        dashboard: 'Resumen General', 
        herd: 'Gestión del Rodeo', 
        feed: 'Alimentación',
        listings: 'Listados Operativos',
        vaccination: 'Control de Vacunación',
        settings: 'Configuración del Sistema'
    };
    return titles[tab] || 'AgriDairy Pro';
  };

  // SI NO ESTÁ AUTENTICADO, MUESTRA LOGIN
  if (!isAuthenticated) {
    return <LoginView onLogin={() => setIsAuthenticated(true)} />;
  }

  // SI ESTÁ AUTENTICADO, MUESTRA TODO EL DASHBOARD ORIGINAL
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 fixed h-full z-20 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Cow size={24}/>
          </div>
          <span className="text-xl font-black tracking-tight text-slate-800 italic">AgriDairy<span className="text-emerald-600">Pro</span></span>
        </div>
        <nav className="space-y-1 flex-1">
          <SidebarItem icon={LayoutDashboard} label="Tablero" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Cow} label="Rodeo" active={activeTab === 'herd'} onClick={() => setActiveTab('herd')} />
          <SidebarItem icon={List} label="Listados" active={activeTab === 'listings'} onClick={() => setActiveTab('listings')} />
          <SidebarItem icon={Wheat} label="Alimentación" active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} />
          <SidebarItem icon={Syringe} label="Vacunación" active={activeTab === 'vaccination'} onClick={() => setActiveTab('vaccination')} />
          
          <div className="mt-6 mb-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ajustes</div>
          <SidebarItem icon={Settings} label="Configuración" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        
        {/* Botón Logout agregado al sidebar original */}
        <button onClick={() => setIsAuthenticated(false)} className="mt-auto flex items-center gap-2 text-slate-400 hover:text-rose-600 text-xs font-bold p-2 uppercase tracking-widest transition-colors"><X size={16} /> Cerrar Sesión</button>
      </aside>

      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <header className="flex justify-between items-center mb-8 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm sticky top-4 z-10">
           <h1 className="text-xl font-bold text-slate-800">{getTitle(activeTab)}</h1>
           <div className="flex items-center gap-4">
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm text-slate-400 relative hover:text-slate-600 cursor-pointer transition-colors">
                 <Bell size={20}/>
                 <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">JG</div>
                 <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-700 leading-none">Juan Granjero</span>
                    <span className="text-[10px] text-slate-400">Administrador</span>
                 </div>
              </div>
           </div>
        </header>

        <div className="pb-10">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;