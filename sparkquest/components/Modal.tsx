import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode, size?: 'md' | 'lg' | 'xl' | '5xl' | '6xl' }) => {
    if (!isOpen) return null;
    const sizeClasses = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl', '5xl': 'max-w-5xl', '6xl': 'max-w-6xl' };
    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
            <div className={`bg-white border-t md:border border-slate-200 w-full h-full md:h-auto ${sizeClasses[size]} md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-full md:max-h-[90vh]`}>
                <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50 shrink-0 pt-safe-top">
                    <h3 className="font-bold text-[#2D2B6B] text-lg">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-[#2D2B6B] transition-colors p-2 bg-white hover:bg-slate-100 rounded-full border border-slate-200"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar pb-24 md:pb-6">{children}</div>
            </div>
        </div>
    );
};
