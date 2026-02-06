import React, { useState } from 'react';
import { User, Lock, LogIn, AlertCircle } from 'lucide-react';
import { CowIcon } from '../components/Common';

const LoginView = ({ onLogin }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user === 'admin' && pass === 'admin') {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
            <CowIcon size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 italic uppercase">AgriDairy<span className="text-emerald-600">Pro</span></h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input type="text" value={user} onChange={(e) => setUser(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Usuario (admin)" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Contraseña (admin)" />
          </div>
          {error && <div className="text-rose-600 text-xs font-bold flex items-center gap-2"><AlertCircle size={14} /> Credenciales incorrectas</div>}
          <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 uppercase">
            <LogIn size={20} /> Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;