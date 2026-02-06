import React from 'react';

export const SidebarItem = ({ onClick, title, subtitle, color, icon: Icon, img }) => (
    <button onClick={onClick} className={`w-full group relative h-16 md:h-12 hover:h-24 md:hover:h-20 bg-gradient-to-r from-${color}-900/40 to-indigo-900/40 rounded-xl border border-${color}-500/20 hover:border-${color}-500/50 hover:bg-${color}-900/60 transition-all flex items-center justify-center md:justify-start px-2 md:px-3 overflow-hidden shadow-sm`}>
        <div className={`absolute inset-0 bg-[url('${img}')] bg-cover bg-center opacity-0 group-hover:opacity-20 transition-opacity mix-blend-overlay`}></div>
        <div className="min-w-[2rem] flex justify-center">
            <Icon className={`w-6 h-6 text-${color}-400 relative z-10 group-hover:scale-110 transition-transform`} />
        </div>
        <div className="text-left relative z-10 hidden group-hover:block ml-3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300">
            <h3 className="font-black text-white text-sm">{title}</h3>
            <p className={`text-${color}-300 text-[9px] font-bold uppercase`}>{subtitle}</p>
        </div>
    </button>
);
