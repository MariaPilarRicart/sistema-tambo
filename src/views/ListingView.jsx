import React from 'react';
import { Download, Droplet, Heart } from 'lucide-react';
import { COWS_DRY_OFF, UPCOMING_CALVINGS } from '../data/constants/';
import { Badge } from '../components/Common';

const ListingsView = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Listados Operativos</h2>
          <p className="text-slate-500 text-sm">Animales que requieren acciones programadas próximamente.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-bold shadow-sm transition-all">
          <Download size={18}/> Exportar Todo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sección: Vacas a Secar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
            <h3 className="font-bold text-blue-900 flex items-center gap-2">
              <Droplet size={20} className="text-blue-500"/> Vacas a Secar
            </h3>
            <Badge type="info">{COWS_DRY_OFF.length} Animales</Badge>
          </div>
          <div className="flex-1 overflow-auto max-h-[500px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Caravana</th>
                  <th className="px-6 py-3 text-right">Fecha de Secado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {COWS_DRY_OFF.map((cow, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">#{cow.id}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {cow.dueDates}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección: Próximos Partos */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-pink-50/50 border-b border-pink-100 flex justify-between items-center">
            <h3 className="font-bold text-pink-900 flex items-center gap-2">
              <Heart size={20} className="text-pink-500"/> Próximos Partos
            </h3>
            <Badge type="critical">{UPCOMING_CALVINGS.length} Alertas</Badge>
          </div>
          <div className="flex-1 overflow-auto max-h-[500px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Madre</th>
                  <th className="px-6 py-3 text-center">Toro</th>
                  <th className="px-6 py-3 text-right">Fecha Probable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {UPCOMING_CALVINGS.map((cow, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">#{cow.id}</td>
                    <td className="px-6 py-4 text-center text-slate-500 font-medium">{cow.sire}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                        cow.dueDates === 'Mañana' 
                          ? 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse' 
                          : 'bg-pink-50 text-pink-700 border-pink-100'
                      }`}>
                        {cow.dueDates}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingsView;