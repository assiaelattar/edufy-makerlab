import { Bot, Code, Gamepad2, Video, PenTool, Hammer, Zap } from 'lucide-react';
import { StationType } from '../types';

// Configuration for each station's visual identity
export const STATION_THEMES: Record<StationType, {
    label: string;
    colorHex: string;
    icon: any;
    // Tailwind Classes
    bgSoft: string;
    border: string;
    text: string;
    gradient: string;
    kanbanHeader: string;
    color: string;
}> = {
    robotics: {
        label: 'Robotics & Electronics',
        colorHex: '#0ea5e9', // sky-500
        icon: Bot,
        bgSoft: 'bg-sky-950/20',
        border: 'border-sky-500/30',
        text: 'text-sky-400',
        gradient: 'from-sky-600 to-blue-700',
        kanbanHeader: 'border-sky-500',
        color: 'sky'
    },
    coding: {
        label: 'Coding & SaaS',
        colorHex: '#8b5cf6', // violet-500
        icon: Code,
        bgSoft: 'bg-violet-950/20',
        border: 'border-violet-500/30',
        text: 'text-violet-400',
        gradient: 'from-violet-600 to-indigo-700',
        kanbanHeader: 'border-violet-500',
        color: 'violet'
    },
    game_design: {
        label: 'Game Development',
        colorHex: '#f59e0b', // amber-500
        icon: Gamepad2,
        bgSoft: 'bg-amber-950/20',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        gradient: 'from-amber-600 to-orange-700',
        kanbanHeader: 'border-amber-500',
        color: 'amber'
    },
    multimedia: {
        label: 'Video & Multimedia',
        colorHex: '#ec4899', // pink-500
        icon: Video,
        bgSoft: 'bg-pink-950/20',
        border: 'border-pink-500/30',
        text: 'text-pink-400',
        gradient: 'from-pink-600 to-rose-700',
        kanbanHeader: 'border-pink-500',
        color: 'pink'
    },
    branding: {
        label: 'Design & Branding',
        colorHex: '#10b981', // emerald-500
        icon: PenTool,
        bgSoft: 'bg-emerald-950/20',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        gradient: 'from-emerald-600 to-teal-700',
        kanbanHeader: 'border-emerald-500',
        color: 'emerald'
    },
    engineering: {
        label: 'Engineering & DIY',
        colorHex: '#64748b', // slate-500
        icon: Hammer,
        bgSoft: 'bg-slate-800/50',
        border: 'border-slate-600/30',
        text: 'text-slate-300',
        gradient: 'from-slate-600 to-gray-700',
        kanbanHeader: 'border-slate-500',
        color: 'slate'
    },
    general: {
        label: 'General Project',
        colorHex: '#6366f1', // indigo-500
        icon: Zap,
        bgSoft: 'bg-indigo-950/20',
        border: 'border-indigo-500/30',
        text: 'text-indigo-400',
        gradient: 'from-indigo-600 to-blue-700',
        kanbanHeader: 'border-indigo-500',
        color: 'indigo'
    }
};

export const getTheme = (station?: string) => {
    const key = (station && STATION_THEMES[station as StationType]) ? station as StationType : 'general';
    return STATION_THEMES[key];
};

export const getStudentTheme = (age: number | null) => {
    const isKid = age !== null && age < 12;
    if (isKid) {
        return {
            bgApp: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-fuchsia-900',
            bgCard: 'bg-white/10 backdrop-blur-md border border-white/10',
            primaryColor: 'text-yellow-300',
            accentColor: 'text-pink-300',
            font: 'font-sans',
            rounded: 'rounded-3xl',
            label: 'Junior'
        };
    }
    return {
        bgApp: 'bg-slate-950',
        bgCard: 'bg-slate-900 border border-slate-800',
        primaryColor: 'text-indigo-400',
        accentColor: 'text-blue-400',
        font: 'font-sans',
        rounded: 'rounded-xl',
        label: 'Student'
    };
};