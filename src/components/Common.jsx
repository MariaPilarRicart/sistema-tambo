import React from 'react';
import { X } from 'lucide-react';

export const CowIcon = ({ size = 24, className, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M7 21a4 4 0 0 1-4.8-5.2c0-1.5.3-3.8 2.2-5.4L7 8" />
    <path d="M17 21a4 4 0 0 0 4.8-5.2c0-1.5-.3-3.8-2.2-5.4L17 8" />
    <path d="M4 14h16" /><path d="M10 8c-2 0-3-1-3-3s1-2 3-2 3 1 3 2-1 3-3 3z" /><path d="M12 2v4" />
  </svg>
);

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6 max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors mb-1 ${active ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}>
    <Icon size={20} />
    <span>{label}</span>
  </button>
);

export const Badge = ({ children, type }) => {
  const styles = {
    critical: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-emerald-100 text-emerald-700',
    info: 'bg-blue-50 text-blue-700',
    neutral: 'bg-slate-100 text-slate-700',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type] || styles.neutral}`}>{children}</span>;
};