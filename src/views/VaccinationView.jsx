import React from 'react';
import { Plus, Syringe } from 'lucide-react';
import { VACCINATION_HISTORY } from '../data/constants';
import { Badge } from '../components/Common';

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

export default VaccinationView;