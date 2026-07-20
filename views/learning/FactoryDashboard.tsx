import React, { useMemo } from 'react';
import { Plus, TrendingUp, Layers, GraduationCap, Sparkles, Factory } from 'lucide-react';
import { ProjectTemplate, StationType, Program } from '../../types';
import { StationCard } from '../../components/StationCard';
import { STATION_THEMES } from '../../utils/theme';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard } from '../../components/atlas/AtlasSurface';

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
        <div className="space-y-5 pb-8">
            <AtlasCommandHeader
                eyebrow="Curriculum factory"
                title="Project templates"
                description="Build reusable missions, connect them to stations, and keep grade coverage visible."
                icon={Factory}
                actions={<AtlasActionButton variant="primary" icon={Plus} onClick={() => onAddProject()}>Create project</AtlasActionButton>}
            />

            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AtlasSignalCard label="Templates" value={stats.total} detail="Reusable project missions" icon={TrendingUp} tone="teal" />
                <AtlasSignalCard label="Active stations" value={stats.stationCount} detail={`${allStations.length} stations available`} icon={Layers} tone="blue" />
                <AtlasSignalCard label="Grade coverage" value={Object.keys(stats.byGrade).length} detail="Levels with assigned projects" icon={GraduationCap} tone="emerald" />
                <AtlasSignalCard label="Coverage gaps" value={Math.max(allStations.length - stats.stationCount, 0)} detail="Stations without templates" icon={Sparkles} tone={stats.stationCount < allStations.length ? 'amber' : 'slate'} />
            </div>

            {/* Station Cards */}
            <section className="space-y-4">
                <AtlasSectionHeader title="Station catalog" description="Open a station to review its curriculum or create a mission in context." icon={Layers} />
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
            </section>

            {/* Grade Cards */}
            {Object.keys(stats.byGrade).length > 0 && (
                <section className="space-y-4">
                    <AtlasSectionHeader title="Grade coverage" description="Select a grade to start a project already targeted to that level." icon={GraduationCap} />
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {Object.entries(stats.byGrade).map(([grade, count]) => (
                            <div
                                key={grade}
                                className="cursor-pointer rounded-lg border border-white/10 bg-slate-900/80 p-4 transition-colors hover:border-teal-300/40 hover:bg-slate-900"
                                onClick={() => onAddProject(undefined, grade)}
                            >
                                <div className="text-center">
                                    <div className="mb-1 font-mono text-2xl font-black text-teal-300">{count}</div>
                                    <div className="truncate text-sm font-bold text-slate-300">{grade}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Empty State */}
            {stats.total === 0 && (
                <AtlasEmptyState title="Build the first curriculum mission" description="Create a reusable project, choose its station, and connect it to the learners it serves." icon={Sparkles} action={<AtlasActionButton variant="primary" icon={Plus} onClick={() => onAddProject()}>Create first project</AtlasActionButton>} />
            )}
        </div>
    );
};
