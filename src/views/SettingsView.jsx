import React, { useState } from 'react';
import { 
  Plus, 
  Settings, 
  Trash2, 
  ChevronRight, 
  PlusCircle 
} from 'lucide-react';
import { INITIAL_LOTES, FEED_INVENTORY, VACCINE_RULES } from '../data/constants';
import { Badge } from '../components/Common';

const SettingsView = () => {
  const [activeTab, setActiveTab] = useState('lotes');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row min-h-[600px] overflow-hidden animate-fade-in">
      <aside className="w-full md:w-64 bg-slate-50/50 border-r border-slate-100 p-6">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Administración</h3>
        <nav className="space-y-1">
          <button 
            onClick={() => setActiveTab('lotes')} 
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'lotes' ? 'bg-white text-emerald-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Nombres de Lotes Oficiales <ChevronRight size={14} className={activeTab === 'lotes' ? 'opacity-100' : 'opacity-0'}/>
          </button>
          <button 
            onClick={() => setActiveTab('alimentos')} 
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'alimentos' ? 'bg-white text-emerald-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Alimentos e Insumos <ChevronRight size={14} className={activeTab === 'alimentos' ? 'opacity-100' : 'opacity-0'}/>
          </button>
          <button 
            onClick={() => setActiveTab('vacunas')} 
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'vacunas' ? 'bg-white text-emerald-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Protocolo Sanitario <ChevronRight size={14} className={activeTab === 'vacunas' ? 'opacity-100' : 'opacity-0'}/>
          </button>
        </nav>
      </aside>

      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'lotes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Nombres de Lotes Oficiales</h2>
              <button className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm">
                <Plus size={18}/>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {INITIAL_LOTES.map((l, i) => (
                <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-700">{l}</span>
                  <div className="flex gap-2">
                    <button className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors">
                      <Settings size={14}/>
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'alimentos' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Insumos y Alimentos</h2>
              <button className="p-2 bg-emerald-600 text-white rounded-lg">
                <Plus size={18}/>
              </button>
            </div>
            <div className="space-y-3">
              {FEED_INVENTORY.map((f, i) => (
                <div key={i} className="p-4 bg-white border border-slate-100 rounded-xl flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-bold text-slate-800">{f.name}</p>
                    <p className="text-xs text-slate-400">Capacidad: {f.capacity} {f.unit}</p>
                  </div>
                  <Badge type="info">Stock: {f.current} {f.unit}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'vacunas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Reglas de Vacunación</h2>
              <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all hover:bg-emerald-700">
                <PlusCircle size={18}/> Nueva Vacuna
              </button>
            </div>
            <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b">
                  <tr>
                    <th className="px-6 py-4">Vacuna</th>
                    <th className="px-6 py-4">Dureza (Días)</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {VACCINE_RULES.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{r.name}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{r.frequency} días</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;