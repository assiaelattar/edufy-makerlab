import React from 'react';

export const SidebarItem = ({ onClick, title, subtitle, color, icon: Icon, img }) => (
    <button onClick={onClick} className={`w-full group relative h-20 bg-gradient-to-r from-${color}-900/40 to-indigo-900/40 rounded-2xl border border-${color}-500/20 hover:border-${color}-500/50 hover:bg-${color}-900/60 transition-all flex items-center px-4 overflow-hidden`}>
        <div className={`absolute inset-0 bg-[url('${img}')] bg-cover bg-center opacity-20 group-hover:opacity-40 transition-opacity mix-blend-overlay`}></div>
        <Icon className={`w-8 h-8 text-${color}-400 mr-4 relative z-10 group-hover:scale-110 transition-transform`} />
        <div className="text-left relative z-10">
            <h3 className="font-black text-white text-lg">{title}</h3>
            <p className={`text-${color}-300 text-[10px] font-bold uppercase`}>{subtitle}</p>
        </div>
    </button>
);
