import React, { useState } from 'react';
import { Settings, ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { INITIAL_DIETAS, FEED_INVENTORY } from '../data/constants';
import { Badge } from '../components/Common';

const FeedView = () => {
  const [dietas, setDietas] = useState(INITIAL_DIETAS);
  const [editingLote, setEditingLote] = useState(null);

  const startEditing = (loteData) => setEditingLote(JSON.parse(JSON.stringify(loteData)));
  
  const saveDieta = () => {
    setDietas(dietas.map(d => d.lote === editingLote.lote ? editingLote : d));
    setEditingLote(null);
  };

  if (editingLote) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => setEditingLote(null)} className="flex items-center gap-2 text-slate-500 font-bold"><ArrowLeft size={20}/> Volver</button>
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm max-w-2xl">
          <h2 className="text-xl font-bold mb-6">Editar Dieta: {editingLote.lote}</h2>
          {editingLote.components.map((c, idx) => (
            <div key={idx} className="flex gap-4 mb-4 items-end">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Insumo</label>
                <input value={c.item} readOnly className="w-full bg-slate-50 border p-2 rounded-lg text-sm" />
              </div>
              <div className="w-24">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cant.</label>
                <input type="number" value={c.cant} onChange={(e) => {
                  const newC = [...editingLote.components];
                  newC[idx].cant = e.target.value;
                  setEditingLote({...editingLote, components: newC});
                }} className="w-full border p-2 rounded-lg text-sm font-bold" />
              </div>
            </div>
          ))}
          <button onClick={saveDieta} className="w-full mt-6 bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Save size={18}/> Guardar Cambios</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dietas.map((dieta, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">Lote {dieta.lote}</h3>
              <button onClick={() => startEditing(dieta)} className="p-1.5 text-slate-400 hover:text-emerald-600"><Settings size={16}/></button>
            </div>
            {dieta.components.map((c, idx) => (
              <div key={idx} className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">{c.item}</span>
                <span className="font-bold">{c.cant} {c.unit}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="mt-10">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Stock de Insumos</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {FEED_INVENTORY.map((item, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-slate-600">{item.name}</span>
                <Badge type={item.status === 'Bajo' ? 'critical' : 'success'}>{item.status}</Badge>
              </div>
              <p className="text-xl font-black">{item.current} <span className="text-xs font-normal text-slate-400">{item.unit}</span></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeedView;