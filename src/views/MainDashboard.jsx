import React, { useState } from 'react';
import { Loader2, Sparkles, AlertCircle, Wheat } from 'lucide-react';
import { DASH_METRICS, PROD_CHART_DATA } from '../data/constants';
import { callGeminiAPI } from '../api/gemini';

const MainDashboard = () => {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleIAAnalysis = async () => {
    setIsLoading(true);
    const prompt = `Analiza este estado de un tambo: Producción: 28.500L, Calidad: 180k RCS, Preñez: 68%. Dame un resumen de 2 frases.`;
    const result = await callGeminiAPI(prompt);
    setAiAnalysis(result);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {DASH_METRICS.map((metric, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <div className={`p-2 w-fit rounded-lg bg-${metric.color}-50 text-${metric.color}-600 mb-4`}>
              <metric.icon size={22} />
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
            <button onClick={handleIAAnalysis} disabled={isLoading} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              IA Consultora
            </button>
          </div>
          {aiAnalysis && <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm">{aiAnalysis}</div>}
          <div className="h-48 w-full bg-slate-50 rounded-lg flex items-end p-4 gap-2 border border-slate-100">
            {PROD_CHART_DATA.map((val, i) => (
              <div key={i} className="flex-1 bg-emerald-400 rounded-t-sm" style={{ height: `${(val / 30000) * 100}%` }}></div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Alertas</h3>
          <div className="space-y-3">
             <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex gap-3 text-rose-700 text-xs font-bold">
                <AlertCircle size={18}/> VACUNA VENCIDA
             </div>
             <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3 text-amber-700 text-xs font-bold">
                <Wheat size={18}/> SILO MAÍZ: STOCK BAJO
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;