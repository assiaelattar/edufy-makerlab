import React, { useMemo, useState } from 'react';
import { 
    Award, Activity, Microscope, MessageSquare, AlertTriangle, Play,
    CheckCircle, Target, TrendingUp, X, Save, Zap, Mic
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ClassSession, WorkshopEvaluation } from '../types';
import { formatDate } from '../utils/helpers';
import { evaluateWorkshopSession } from '../services/workshopEvaluator';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export const WorkshopQualityView = () => {
    const { teamMembers } = useAppContext();
    const { currentOrganization } = useAuth();
    
    // The AppContext already listens to 'workshop_evaluations'
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

    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    
    // SENTINEL AUDIT STATE
    const [auditTab, setAuditTab] = useState<'pre-flight' | 'execution'>('pre-flight');
    const [isEvaluating, setIsEvaluating] = useState(false);
    
    const { classSessions } = useAppContext();
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysSessions = useMemo(() => {
        return classSessions.filter(c => c.date === todayStr);
    }, [classSessions, todayStr]);

    const [selectedSessionId, setSelectedSessionId] = useState('');
    
    // Franchise Input State
    const [predictiveWarned, setPredictiveWarned] = useState(false);
    
    const [techReady, setTechReady] = useState(true);
    const [materialStock, setMaterialStock] = useState(3);
    const [safetyZoned, setSafetyZoned] = useState(true);
    
    const [instructionTime, setInstructionTime] = useState<'< 10 mins' | '10-20 mins' | '> 20 mins'>('10-20 mins');
    const [autonomyLevel, setAutonomyLevel] = useState<'fixed_it' | 'pointed_error' | 'asked_questions'>('asked_questions');
    const [struggleMetric, setStruggleMetric] = useState(3);
    const [deliveryFocus, setDeliveryFocus] = useState<'Final Polish' | 'Iteration & Effort'>('Iteration & Effort');
    const [labRespect, setLabRespect] = useState(true);
    
    const [voiceTranscript, setVoiceTranscript] = useState('');

    const openAuditModal = () => {
        setIsAuditModalOpen(true);
        setAuditTab('pre-flight');
        setPredictiveWarned(Math.random() > 0.7); // Mock predictive flag
    };

    const submitAudit = async () => {
        if (!selectedSessionId) {
            alert('Please select a session to audit.');
            return;
        }

        const session = todaysSessions.find(s => s.id === selectedSessionId);
        if (!session) {
            alert('Session not found.');
            return;
        }

        const orgId = currentOrganization?.id;
        if (!orgId) return;

        setIsEvaluating(true);
        
        try {
            const inputs = {
                predictiveFlags: { inventoryWarned: predictiveWarned },
                preFlight: { techReady, materialStock, safetyZoned },
                execution: { instructionTime, autonomyLevel, struggleMetric, deliveryFocus, labRespect },
                voiceTranscript
            };

            const result = await evaluateWorkshopSession(inputs);

            const instructorName = teamMembers.find(t => t.uid === instructorId)?.name || 'Unknown Officer';

            const newEvaluation: Omit<WorkshopEvaluation, 'id'> = {
                organizationId: orgId,
                sessionId: session.id,
                workshopTitle: `${session.title} ${session.subTitle}`,
                instructorId: session.instructorId || '',
                instructorName: session.instructorName || 'Unassigned',
                date: todayStr,
                predictiveFlags: inputs.predictiveFlags,
                preFlight: inputs.preFlight,
                execution: inputs.execution,
                voiceTranscript,
                totalScore: result.Health_Score,
                breakdown: {
                    setup: result.Phase_Breakdown?.setup || '',
                    instruction: result.Phase_Breakdown?.instruction || '',
                    execution: result.Phase_Breakdown?.execution || ''
                },
                rootCause: result.Root_Cause || '',
                actionableMandate: result.Actionable_Mandate || '',
                createdAt: serverTimestamp() as any
            };

            await addDoc(collection(db, 'workshop_evaluations'), newEvaluation);
            
            setIsAuditModalOpen(false);
            setSelectedSessionId('');
            setVoiceTranscript('');
            
        } catch (error) {
            console.error('Error submitting audit:', error);
            alert('The Sentinel AI failed to evaluate. Check your API key.');
        } finally {
            setIsEvaluating(false);
        }
    };

    return (
        <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-500 text-sm font-bold uppercase tracking-wider mb-1">
                        <Award size={16} /> Sentinel HQ
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                        Quality <span className="text-indigo-600">Assessor</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Franchise execution tracking and pedagogical AI auditing.</p>
                </div>
                <button 
                    onClick={openAuditModal}
                    className="flex justify-center items-center gap-2 px-6 py-3 bg-slate-900 border-2 border-slate-800 hover:border-indigo-400 text-white rounded-xl font-bold shadow-lg transition-all hover:scale-105 group"
                >
                    <Mic className="text-indigo-400 group-hover:animate-pulse" size={20} />
                    Execute Audit
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                    <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Franchise Quality</h3>
                    <div className="text-4xl font-black text-indigo-600">{stats.avg}</div>
                    <p className="text-xs text-slate-400 mt-2">Overall Health Score (0-100)</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                    <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Sessions Audited</h3>
                    <div className="text-4xl font-black text-slate-800">{stats.count}</div>
                    <p className="text-xs text-slate-400 mt-2">Total sentinel patrols</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                    <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Latest Operation</h3>
                    <div className="text-4xl font-black text-emerald-500">{stats.latest}</div>
                    <p className="text-xs text-slate-400 mt-2">Score of most recent audit</p>
                </div>
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl">
                    <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Integrity Goal</h3>
                    <div className="text-4xl font-black text-indigo-400">90+</div>
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `\${Math.min(stats.avg, 100)}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Recent Feed */}
            <div className="space-y-6">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Microscope className="text-indigo-600" /> Recent Operations Log
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {workshopEvaluations.length === 0 ? (
                        <div className="col-span-full bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center">
                            <MessageSquare size={48} className="text-slate-300 mx-auto mb-4" />
                            <h3 className="font-bold text-slate-700">No audits yet</h3>
                            <p className="text-sm text-slate-400">Patrols will appear here once submitted.</p>
                        </div>
                    ) : (
                        workshopEvaluations.map((evalItem: WorkshopEvaluation) => (
                            <div key={evalItem.id} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-black text-slate-800 text-lg leading-tight">{evalItem.workshopTitle}</h4>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">OFFICER {evalItem.instructorName} • {formatDate(evalItem.date)}</p>
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl text-xl font-black flex items-center gap-1 \${evalItem.totalScore >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        <Activity size={20} />
                                        {evalItem.totalScore}
                                    </div>
                                </div>
                                
                                <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-sm font-bold text-slate-800 mb-1">Root Cause</p>
                                    <p className="text-sm text-slate-600 italic">
                                        "{evalItem.rootCause || 'No root cause identified.'}"
                                    </p>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-black uppercase text-amber-700 tracking-wider">Actionable Mandate</p>
                                        <p className="text-sm text-amber-900 font-medium">
                                            {evalItem.actionableMandate || 'No mandate issued.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* AUDIT MODAL (TABLET UI) */}
            {isAuditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-50 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border-2 border-slate-800 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-slate-900 p-5 pl-8 flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <Activity className="text-indigo-400" /> 
                                The Universal Tablet
                            </h3>
                            <button onClick={() => setIsAuditModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Setup Row */}
                        <div className="bg-slate-800 p-4 px-8 border-b border-slate-700 flex gap-4 shrink-0 items-center">
                            <span className="text-white font-bold opacity-80 uppercase text-sm tracking-wider">Select Active Session:</span>
                            <select 
                                className="flex-1 bg-slate-900 text-white border-2 border-slate-700 rounded-xl px-4 py-2 font-bold outline-none focus:border-indigo-500 transition-colors"
                                value={selectedSessionId}
                                onChange={(e) => setSelectedSessionId(e.target.value)}
                            >
                                <option value="">-- Choose Today's Patrol --</option>
                                {todaysSessions.map(session => (
                                    <option key={session.id} value={session.id}>
                                        {session.startTime} - {session.title} {session.subTitle} (Officer: {session.instructorName || 'Unassigned'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-white border-b border-slate-200 shrink-0">
                            <button 
                                onClick={() => setAuditTab('pre-flight')}
                                className={`flex-1 py-4 font-black uppercase text-sm tracking-wider flex justify-center items-center gap-2 border-b-4 transition-colors \${auditTab === 'pre-flight' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600 bg-slate-50'}`}
                            >
                                <CheckCircle size={18} /> Pre-Flight Check
                            </button>
                            <button 
                                onClick={() => setAuditTab('execution')}
                                className={`flex-1 py-4 font-black uppercase text-sm tracking-wider flex justify-center items-center gap-2 border-b-4 transition-colors \${auditTab === 'execution' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600 bg-slate-50'}`}
                            >
                                <Play size={18} /> Execution Audit
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 pb-32">
                            {auditTab === 'pre-flight' ? (
                                <div className="space-y-8 animate-in slide-in-from-right-8 fade-in">
                                    {/* Mock Predictive Warning */}
                                    {predictiveWarned && (
                                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-4">
                                            <div className="bg-red-500 p-2 rounded-lg text-white">
                                                <AlertTriangle size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-red-900">Predictive Hub Warning</h4>
                                                <p className="text-sm text-red-700 font-medium">Headquarters warned this location 7 days ago about low material stock.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                        <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs mb-4">Tech Status</h3>
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => setTechReady(true)}
                                                className={`flex-1 py-4 rounded-xl font-black uppercase tracking-wider text-sm border-2 transition-all \${techReady ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400'}`}
                                            >
                                                Ready
                                            </button>
                                            <button 
                                                onClick={() => setTechReady(false)}
                                                className={`flex-1 py-4 rounded-xl font-black uppercase tracking-wider text-sm border-2 transition-all \${!techReady ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-400'}`}
                                            >
                                                Missing / Uncharged
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                        <div className="flex justify-between items-end mb-4">
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs">Material Stock</h3>
                                            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">{materialStock}/5</span>
                                        </div>
                                        <input 
                                            type="range" min="1" max="5" 
                                            value={materialStock} 
                                            onChange={(e) => setMaterialStock(parseInt(e.target.value))}
                                            className="w-full accent-indigo-600 mb-2"
                                        />
                                        <div className="flex justify-between text-[10px] uppercase font-black tracking-wider text-slate-400">
                                            <span>1: Missing Items</span>
                                            <span>3: Minimum Met</span>
                                            <span>5: Fully Stocked</span>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                        <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs mb-4">Safety Zoning</h3>
                                        <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={safetyZoned}
                                                onChange={(e) => setSafetyZoned(e.target.checked)}
                                                className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                            />
                                            <span className="font-bold text-slate-700">Safety gear placed & zones firmly established (Clean vs Dirty)</span>
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in slide-in-from-right-8 fade-in">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs mb-4">The Spark (Instruction Time)</h3>
                                            <div className="flex flex-col gap-2">
                                                {['< 10 mins', '10-20 mins', '> 20 mins'].map(opt => (
                                                    <label key={opt} className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors \${instructionTime === opt ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                                                        <input type="radio" value={opt} checked={instructionTime === opt} onChange={() => setInstructionTime(opt as any)} className="hidden" />
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center \${instructionTime === opt ? 'border-indigo-500' : 'border-slate-300'}`}>
                                                            {instructionTime === opt && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>}
                                                        </div>
                                                        <span className={`font-bold \${instructionTime === opt ? 'text-indigo-900' : 'text-slate-600'}`}>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs mb-4">The "Zero Lego" Autonomy</h3>
                                            <p className="text-xs text-slate-500 mb-3 italic">When kids got stuck, instructors...</p>
                                            <div className="flex flex-col gap-2">
                                                {[
                                                    { id: 'fixed_it', label: 'Fixed it for them' },
                                                    { id: 'pointed_error', label: 'Pointed out the exact error' },
                                                    { id: 'asked_questions', label: 'Asked guiding questions' },
                                                ].map(opt => (
                                                    <label key={opt.id} className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors \${autonomyLevel === opt.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                                                        <input type="radio" value={opt.id} checked={autonomyLevel === opt.id} onChange={() => setAutonomyLevel(opt.id as any)} className="hidden" />
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center \${autonomyLevel === opt.id ? 'border-indigo-500' : 'border-slate-300'}`}>
                                                            {autonomyLevel === opt.id && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>}
                                                        </div>
                                                        <span className={`font-bold text-sm \${autonomyLevel === opt.id ? 'text-indigo-900' : 'text-slate-600'}`}>{opt.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                        <div className="flex justify-between items-end mb-4">
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs">The Struggle Metric</h3>
                                            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">{struggleMetric}/5</span>
                                        </div>
                                        <input 
                                            type="range" min="1" max="5" 
                                            value={struggleMetric} 
                                            onChange={(e) => setStruggleMetric(parseInt(e.target.value))}
                                            className="w-full accent-indigo-600 mb-2"
                                        />
                                        <div className="flex justify-between text-[10px] uppercase font-black tracking-wider text-slate-400">
                                            <span>1: Too Easy</span>
                                            <span>3: Healthy Struggle</span>
                                            <span>5: Total Breakdown</span>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                        <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs mb-4">Praise Delivery Focused On</h3>
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => setDeliveryFocus('Final Polish')}
                                                className={`flex-1 py-4 rounded-xl font-bold text-sm border-2 transition-all \${deliveryFocus === 'Final Polish' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-400'}`}
                                            >
                                                Final Polish
                                            </button>
                                            <button 
                                                onClick={() => setDeliveryFocus('Iteration & Effort')}
                                                className={`flex-1 py-4 rounded-xl font-bold text-sm border-2 transition-all \${deliveryFocus === 'Iteration & Effort' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-400'}`}
                                            >
                                                Iteration & Effort
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                checked={labRespect}
                                                onChange={(e) => setLabRespect(e.target.checked)}
                                                className="w-6 h-6 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                            />
                                            <div className="group-hover:text-amber-800 transition-colors">
                                                <h4 className="font-black text-slate-700 uppercase tracking-wider text-xs">Lab Respect</h4>
                                                <p className="text-sm font-medium text-slate-500">Instructors ensured kids cleaned and sorted their own stations.</p>
                                            </div>
                                        </label>
                                    </div>

                                    {/* The Context Layer (Voice) */}
                                    <div>
                                        <h3 className="font-black text-slate-800 flex items-center gap-2 mb-2">
                                            <Mic className="text-indigo-500" size={20} /> The Context Layer 
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-3 font-medium tracking-wide">(Simulated Voice-to-Text Transcription)</p>
                                        <textarea 
                                            placeholder="Record one specific observation about a student overcoming a challenge or a logistical blocker..."
                                            className="w-full p-6 text-xl font-bold text-slate-700 bg-indigo-50 border-2 border-indigo-100 rounded-3xl outline-none focus:border-indigo-400 focus:bg-white transition-colors min-h-[160px] resize-none"
                                            value={voiceTranscript}
                                            onChange={(e) => setVoiceTranscript(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex justify-between items-center z-10 rounded-b-[2rem]">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Edufy Sentinel AI Engine</p>
                            <button 
                                onClick={submitAudit}
                                disabled={isEvaluating}
                                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-3"
                            >
                                {isEvaluating ? (
                                    <>
                                        <Zap className="animate-pulse" size={20} />
                                        Analyzing Data...
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        Submit for AI Audit
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
