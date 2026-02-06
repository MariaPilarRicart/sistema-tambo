import React, { useState } from 'react';
import { Plus, MoreVertical, PlusCircle, FileText, ArrowRightLeft } from 'lucide-react';
import { HERD_DATA, INITIAL_LOTES } from '../data/constants';
import { Badge, Modal } from '../components/Common';

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
                    <label className="text-xs font-bold text-slate-500 uppercase">Caravana</label>
                    <input placeholder="ID Caravana" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Lote</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                        {INITIAL_LOTES.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
              </div>
              <button className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold">Guardar Animal</button>
          </div>
      </Modal>

      <Modal isOpen={isFichaOpen} onClose={() => setIsFichaOpen(false)} title={`Ficha Técnica - #${selectedAnimal?.id}`}>
          <div className="space-y-2 text-sm text-slate-600">
            <p><strong>Raza:</strong> {selectedAnimal?.breed}</p>
            <p><strong>Categoría:</strong> {selectedAnimal?.category}</p>
            <p><strong>Padre:</strong> {selectedAnimal?.sire}</p>
            <p><strong>Madre:</strong> {selectedAnimal?.dam}</p>
          </div>
      </Modal>
    </div>
  );
};

export default HerdView;