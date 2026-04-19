import React, { useMemo } from 'react';
import { 
    Trophy, Target, Star, AlertTriangle, 
    ArrowUpRight, Microscope, Zap,
    Clock, Users, Calendar, MessageSquare,
    TrendingUp, Award, Activity
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { WorkshopEvaluation } from '../types';
import { formatDate } from '../utils/helpers';

export const WorkshopQualityView = () => {
    const { teamMembers, navigateTo } = useAppContext();
    const { currentOrganization } = useAuth();
    
    // In a real app, these would come from AppContext with a listener
    // For now, I'll set up a listener in AppContext or use local state if needed.
    // Assuming I will add 'workshopEvaluations' to AppContext in the next step.
    const { workshopEvaluations = [] } = useAppContext() as any;

    const stats = useMemo(() => {
        if (workshopEvaluations.length === 0) return { avg: 0, count: 0, latest: 0 };
        const total = workshopEvaluations.reduce((acc: number, val: WorkshopEvaluation) => acc + val.totalScore, 0);
        return {
            avg: Math.round(total / workshopEvaluations.length),
            count: workshopEvaluations.length,
            latest: workshopEvaluations[0]?.totalScore || 0
        };
    }, [workshopEvaluations]);

    const pillarAverages = useMemo(() => {
        if (workshopEvaluations.length === 0) return { handsOff: 0, discovery: 0, material: 0, process: 0 };
        const sums = workshopEvaluations.reduce((acc: any, val: WorkshopEvaluation) => {
            acc.handsOff += val.metrics.handsOffIndex;
            acc.discovery += val.metrics.discoveryStruggle;
            acc.material += val.metrics.materialAuthenticity;
            acc.process += val.metrics.processOverProduct;
            return acc;
        }, { handsOff: 0, discovery: 0, material: 0, process: 0 });

        const count = workshopEvaluations.length;
        return {
            handsOff: Math.round((sums.handsOff / (count * 25)) * 100),
            discovery: Math.round((sums.discovery / (count * 25)) * 100),
            material: Math.round((sums.material / (count * 25)) * 100),
            process: Math.round((sums.process / (count * 25)) * 100)
        };
    }, [workshopEvaluations]);

    return (
        <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-500 text-sm font-bold uppercase tracking-wider mb-1">
                        <Award size={16} /> Pedagogical Integrity
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                        Make & Go <span className="text-indigo-600">Quality Assessor</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Monitoring the "Zero Lego" & "Hands-Off" philosophy.</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                    <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Global Quality</h3>
                    <div className="text-4xl font-black text-indigo-600">{stats.avg}%</div>
                    <p className="text-xs text-slate-400 mt-2">Overall workshop score</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                    <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Sessions Evaluated</h3>
                    <div className="text-4xl font-black text-slate-800">{stats.count}</div>
                    <p className="text-xs text-slate-400 mt-2">Total AI assessments</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                    <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Latest Score</h3>
                    <div className="text-4xl font-black text-emerald-500">{stats.latest}%</div>
                    <p className="text-xs text-slate-400 mt-2">Most recent workshop</p>
                </div>
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl">
                    <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Integrity Goal</h3>
                    <div className="text-4xl font-black text-indigo-400">90%</div>
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${stats.avg}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Pillars Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-8 shadow-sm">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                        <Activity className="text-indigo-600" /> The 4 Pillars Performance
                    </h2>
                    <div className="space-y-6">
                        <PillarProgress label="Hands-Off Index" value={pillarAverages.handsOff} color="indigo" description="Instructor resisting the urge to touch projects." />
                        <PillarProgress label="Discovery & Struggle" value={pillarAverages.discovery} color="emerald" description="Kids making mistakes and overcoming them." />
                        <PillarProgress label="Material Authenticity" value={pillarAverages.material} color="amber" description="Safe use of raw materials and real tools." />
                        <PillarProgress label="Process Over Product" value={pillarAverages.process} color="rose" description="Praising resilience over final project aesthetics." />
                    </div>
                </div>

                {/* Recent Feed */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Microscope className="text-indigo-600" /> Recent Evaluations
                    </h2>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                        {workshopEvaluations.length === 0 ? (
                            <div className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center">
                                <MessageSquare size={48} className="text-slate-300 mx-auto mb-4" />
                                <h3 className="font-bold text-slate-700">No reports yet</h3>
                                <p className="text-sm text-slate-400">Instructors need to submit their post-workshop reports.</p>
                            </div>
                        ) : (
                            workshopEvaluations.map((evalItem: WorkshopEvaluation) => (
                                <div key={evalItem.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{evalItem.workshopTitle}</h4>
                                            <p className="text-xs text-slate-400">{evalItem.instructorName} • {formatDate(evalItem.date)}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-black ${evalItem.totalScore >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {evalItem.totalScore}%
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed italic mb-3">
                                        "{evalItem.actionableFeedback}"
                                    </p>
                                    <div className="flex gap-2">
                                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500" style={{ width: `${(evalItem.metrics.handsOffIndex / 25) * 100}%` }}></div>
                                        </div>
                                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${(evalItem.metrics.discoveryStruggle / 25) * 100}%` }}></div>
                                        </div>
                                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500" style={{ width: `${(evalItem.metrics.materialAuthenticity / 25) * 100}%` }}></div>
                                        </div>
                                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-rose-500" style={{ width: `${(evalItem.metrics.processOverProduct / 25) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PillarProgress = ({ label, value, color, description }: { label: string, value: number, color: string, description: string }) => {
    const colorClasses: any = {
        indigo: 'bg-indigo-600 text-indigo-600',
        emerald: 'bg-emerald-500 text-emerald-500',
        amber: 'bg-amber-500 text-amber-500',
        rose: 'bg-rose-500 text-rose-500'
    };
    
    return (
        <div>
            <div className="flex justify-between items-end mb-1">
                <div>
                    <span className="text-sm font-bold text-slate-800">{label}</span>
                    <p className="text-[10px] text-slate-400 leading-tight">{description}</p>
                </div>
                <span className={`text-sm font-black ${colorClasses[color].split(' ')[1]}`}>{value}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${colorClasses[color].split(' ')[0]} transition-all duration-1000`} style={{ width: `${value}%` }}></div>
            </div>
        </div>
    );
};
