import React, { useState } from 'react';
import { LayoutDashboard, Wheat, List, Syringe, Settings, LogOut, Bell } from 'lucide-react';
import { CowIcon, SidebarItem } from './components/Common';
import MainDashboard from './views/MainDashboard';
import HerdView from './views/HerdView';
import FeedView from './views/FeedView';
import LoginView from './views/LoginView';
import SettingsView from './views/SettingsView';
import ListingsView from './views/ListingView';
import VaccinationView from './views/VaccinationView';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <MainDashboard />;
      case 'herd': return <HerdView />;
      case 'listings' : return <ListingsView />;
      case 'vaccination': return <VaccinationView />;
      case 'feed': return <FeedView />;
      case 'settings' : return <SettingsView />;
      default: return <MainDashboard />;
    }
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
       <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 fixed h-full p-6 z-20">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <CowIcon size={24}/>
          </div>
          <span className="text-xl font-black text-slate-800 italic">AgriDairy<span className="text-emerald-600">Pro</span></span>
        </div>
        
        <nav className="space-y-1 flex-1">
          <SidebarItem icon={LayoutDashboard} label="Tablero" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={CowIcon} label="Rodeo" active={activeTab === 'herd'} onClick={() => setActiveTab('herd')} />
          <SidebarItem icon={List} label="Listados" active={activeTab === 'listings'} onClick={() => setActiveTab('listings')} />
          <SidebarItem icon={Wheat} label="Alimentación" active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} />
          <SidebarItem icon={Syringe} label="Vacunación" active={activeTab === 'vaccination'} onClick={() => setActiveTab('vaccination')} />
          <div className="mt-6 mb-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ajustes</div>
          <SidebarItem icon={Settings} label="Configuración" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <button onClick={() => setIsAuthenticated(false)} className="mt-auto flex items-center gap-2 text-slate-400 hover:text-rose-600 text-xs font-bold p-2 uppercase transition-colors">
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </aside>

      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <header className="flex justify-between items-center mb-8 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm sticky top-4 z-10">
           <h1 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h1>
           <div className="flex items-center gap-4">
              <Bell size={20} className="text-slate-400" />
              <div className="flex items-center gap-2">
                 <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">JG</div>
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