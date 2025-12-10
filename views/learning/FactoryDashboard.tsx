import React, { useMemo } from 'react';
import { Plus, TrendingUp, Layers, GraduationCap, Sparkles } from 'lucide-react';
import { ProjectTemplate, StationType, Program } from '../../types';
import { StationCard } from '../../components/StationCard';
import { STATION_THEMES } from '../../utils/theme';
import { STUDIO_THEME, studioClass } from '../../utils/studioTheme';

interface FactoryDashboardProps {
    projectTemplates: ProjectTemplate[];
    stations: any[];
    programs: Program[];
    onAddProject: (station?: StationType, grade?: string) => void;
    onViewStation: (station: StationType) => void;
}

export const FactoryDashboard: React.FC<FactoryDashboardProps> = ({
    projectTemplates,
    stations,
    programs,
    onAddProject,
    onViewStation
}) => {
    // Calculate stats
    const stats = useMemo(() => {
        const byStation = projectTemplates.reduce((acc, p) => {
            acc[p.station] = (acc[p.station] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const byGrade = projectTemplates.reduce((acc, p) => {
            p.targetAudience?.grades?.forEach(g => {
                acc[g] = (acc[g] || 0) + 1;
            });
            return acc;
        }, {} as Record<string, number>);

        return {
            total: projectTemplates.length,
            byStation,
            byGrade,
            stationCount: Object.keys(byStation).length
        };
    }, [projectTemplates]);

    // Get all unique stations
    const allStations: StationType[] = Object.keys(STATION_THEMES) as StationType[];

    return (
        <div className={studioClass("min-h-screen p-8", STUDIO_THEME.background.main)}>
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Sparkles className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className={studioClass("text-4xl font-bold", STUDIO_THEME.text.primary)}>
                            The Factory
                        </h1>
                        <p className={STUDIO_THEME.text.secondary}>
                            Build amazing learning experiences for your students
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Total Projects */}
                <div className={studioClass(STUDIO_THEME.background.card, STUDIO_THEME.rounded.lg, "p-6 border", STUDIO_THEME.border.light, STUDIO_THEME.shadow.card)}>
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="text-indigo-600" size={24} />
                        <span className="text-4xl font-bold text-indigo-600">{stats.total}</span>
                    </div>
                    <p className={studioClass("font-medium", STUDIO_THEME.text.secondary)}>Total Projects</p>
                </div>

                {/* Stations */}
                <div className={studioClass(STUDIO_THEME.background.card, STUDIO_THEME.rounded.lg, "p-6 border border-blue-100 shadow-lg shadow-blue-100/50")}>
                    <div className="flex items-center justify-between mb-2">
                        <Layers className="text-blue-600" size={24} />
                        <span className="text-4xl font-bold text-blue-600">{stats.stationCount}</span>
                    </div>
                    <p className={studioClass("font-medium", STUDIO_THEME.text.secondary)}>Active Stations</p>
                </div>

                {/* Grades */}
                <div className={studioClass(STUDIO_THEME.background.card, STUDIO_THEME.rounded.lg, "p-6 border border-emerald-100 shadow-lg shadow-emerald-100/50")}>
                    <div className="flex items-center justify-between mb-2">
                        <GraduationCap className="text-emerald-600" size={24} />
                        <span className="text-4xl font-bold text-emerald-600">{Object.keys(stats.byGrade).length}</span>
                    </div>
                    <p className={studioClass("font-medium", STUDIO_THEME.text.secondary)}>Grade Levels</p>
                </div>

                {/* Quick Add */}
                <button
                    onClick={() => onAddProject()}
                    className={studioClass(
                        "bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white",
                        STUDIO_THEME.rounded.lg,
                        "p-6 shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 flex flex-col items-center justify-center gap-2"
                    )}
                >
                    <Plus size={32} />
                    <p className="font-bold">Create Project</p>
                </button>
            </div>

            {/* Station Cards */}
            <div className="mb-8">
                <h2 className={studioClass("text-2xl font-bold mb-4 flex items-center gap-2", STUDIO_THEME.text.primary)}>
                    <Layers size={24} className="text-indigo-600" />
                    By Station
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {allStations.map(station => (
                        <StationCard
                            key={station}
                            station={station}
                            projectCount={stats.byStation[station] || 0}
                            onAddProject={() => onAddProject(station)}
                            onClick={() => onViewStation(station)}
                        />
                    ))}
                </div>
            </div>

            {/* Grade Cards */}
            {Object.keys(stats.byGrade).length > 0 && (
                <div>
                    <h2 className={studioClass("text-2xl font-bold mb-4 flex items-center gap-2", STUDIO_THEME.text.primary)}>
                        <GraduationCap size={24} className="text-indigo-600" />
                        By Grade
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {Object.entries(stats.byGrade).map(([grade, count]) => (
                            <div
                                key={grade}
                                className={studioClass(
                                    STUDIO_THEME.background.card,
                                    STUDIO_THEME.rounded.md,
                                    "p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105"
                                )}
                                onClick={() => onAddProject(undefined, grade)}
                            >
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-indigo-600 mb-1">{count}</div>
                                    <div className="text-sm text-slate-600 font-medium">{grade}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {stats.total === 0 && (
                <div className={studioClass(STUDIO_THEME.glass.light, STUDIO_THEME.rounded.xl, "p-12 text-center border-2 border-dashed border-indigo-200")}>
                    <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="text-indigo-600" size={48} />
                    </div>
                    <h3 className={studioClass("text-2xl font-bold mb-2", STUDIO_THEME.text.primary)}>
                        Start Building Your Curriculum
                    </h3>
                    <p className={studioClass("mb-6 max-w-md mx-auto", STUDIO_THEME.text.secondary)}>
                        Create your first project template and bring amazing learning experiences to your students!
                    </p>
                    <button
                        onClick={() => onAddProject()}
                        className={studioClass(
                            "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white",
                            "px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 inline-flex items-center gap-2"
                        )}
                    >
                        <Plus size={20} />
                        Create Your First Project
                    </button>
                </div>
            )}
        </div>
    );
};
