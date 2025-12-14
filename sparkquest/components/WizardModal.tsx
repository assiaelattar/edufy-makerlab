import React from 'react';

interface WizardModalProps {
  title: string;
  subtitle?: string;
  icon?: string;
  color?: 'blue' | 'green' | 'pink' | 'orange' | 'indigo';
  onClose: () => void;
  children: React.ReactNode;
}

export const WizardModal: React.FC<WizardModalProps> = ({ title, subtitle, icon, color = 'blue', onClose, children }) => {
  
  const colorClasses = {
    blue: 'border-blue-100 text-blue-500',
    green: 'border-green-100 text-green-500',
    pink: 'border-pink-100 text-pink-500',
    orange: 'border-orange-100 text-orange-500',
    indigo: 'border-indigo-100 text-indigo-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden relative animate-float border-[8px] border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-white p-8 pb-6 text-center relative border-b-4 border-slate-100 flex-none z-10">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 hover:bg-slate-100 p-3 rounded-full transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          
          <div className="flex flex-col items-center">
              {icon && <div className="text-6xl mb-4 filter drop-shadow-md">{icon}</div>}
              <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tight">{title}</h2>
              {subtitle && <p className={`font-extrabold text-xl mt-2 ${colorClasses[color].split(' ')[1]}`}>{subtitle}</p>}
          </div>
        </div>

        {/* Content Scroll Area */}
        <div className="p-8 overflow-y-auto overflow-x-hidden flex-1 no-scrollbar">
            {children}
        </div>

      </div>
    </div>
  );
};
