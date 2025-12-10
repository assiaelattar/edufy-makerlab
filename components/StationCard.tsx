import React from 'react';
import { Plus } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { StationType } from '../types';
import { getTheme } from '../utils/theme';

interface StationCardProps {
    station: StationType;
    projectCount: number;
    onAddProject: () => void;
    onClick: () => void;
}

export const StationCard: React.FC<StationCardProps> = ({
    station,
    projectCount,
    onAddProject,
    onClick
}) => {
    const theme = getTheme(station);
    const IconComponent = (LucideIcons as any)[theme.icon] || LucideIcons.Circle;

    return (
        <div
            className="group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer"
            style={{
                borderColor: `${theme.colorHex}40`,
                background: `linear-gradient(135deg, ${theme.colorHex}10 0%, ${theme.colorHex}05 100%)`
            }}
            onClick={onClick}
        >
            {/* Background Pattern */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `radial-gradient(circle at 20% 50%, ${theme.colorHex} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px'
                }}
            />

            {/* Content */}
            <div className="relative p-6">
                {/* Icon */}
                <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${theme.colorHex}20` }}
                >
                    <IconComponent size={32} style={{ color: theme.colorHex }} />
                </div>

                {/* Station Name */}
                <h3 className="text-xl font-bold mb-2" style={{ color: theme.colorHex }}>
                    {theme.label}
                </h3>

                {/* Project Count */}
                <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold text-slate-800">{projectCount}</span>
                    <span className="text-slate-500 text-sm">
                        {projectCount === 1 ? 'project' : 'projects'}
                    </span>
                </div>

                {/* Add Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddProject();
                    }}
                    className="w-full py-2 px-4 rounded-lg font-medium text-white transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                    style={{
                        backgroundColor: theme.colorHex,
                        boxShadow: `0 4px 12px ${theme.colorHex}40`
                    }}
                >
                    <Plus size={18} />
                    Add Project
                </button>
            </div>

            {/* Hover Glow */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at center, ${theme.colorHex} 0%, transparent 70%)`
                }}
            />
        </div>
    );
};
