import React, { useMemo, useState } from 'react';
import { 
    Award, Activity, Microscope, MessageSquare, AlertTriangle, Play,
    CheckCircle, Target, TrendingUp, X, Save, Zap, Mic, CalendarDays, ShieldCheck
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ClassSession, WorkshopEvaluation } from '../types';
import { formatDate } from '../utils/helpers';
import { evaluateWorkshopSession } from '../services/workshopEvaluator';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useConfirm } from '../context/ConfirmContext';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard
} from '../components/atlas/AtlasSurface';

export const WorkshopQualityView = () => {
    const { teamMembers, workshopEvaluations = [], classSessions } = useAppContext();
    const { currentOrganization } = useAuth();
    const { alert: showAlert, confirm } = useConfirm();
    const evaluatorAvailable = Boolean(import.meta.env.VITE_GOOGLE_API_KEY);

    const stats = useMemo(() => {
        const scoredEvaluations = workshopEvaluations.filter(item => Number.isFinite(Number(item.totalScore)));
        if (scoredEvaluations.length === 0) return { avg: 0, count: 0, latest: 0 };
        const total = scoredEvaluations.reduce((acc: number, val: WorkshopEvaluation) => acc + Number(val.totalScore), 0);
        return {
            avg: Math.round(total / scoredEvaluations.length),
            count: scoredEvaluations.length,
            latest: scoredEvaluations[0]?.totalScore || 0
        };
    }, [workshopEvaluations]);

    const qualityGap = Math.max(0, 90 - stats.avg);

    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    
    // SENTINEL AUDIT STATE
    const [auditTab, setAuditTab] = useState<'pre-flight' | 'execution'>('pre-flight');
    const [isEvaluating, setIsEvaluating] = useState(false);
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todaysSessions = useMemo(() => {
        return classSessions.filter(c => c.date === todayStr);
    }, [classSessions, todayStr]);

    const [selectedSessionId, setSelectedSessionId] = useState('');
    
    // Franchise Input State
    const [predictiveWarned, setPredictiveWarned] = useState(false);

    const [techReady, setTechReady] = useState<boolean | null>(null);
    const [materialStock, setMaterialStock] = useState(3);
    const [safetyZoned, setSafetyZoned] = useState<boolean | null>(null);
    
    const [instructionTime, setInstructionTime] = useState<'< 10 mins' | '10-20 mins' | '> 20 mins'>('10-20 mins');
    const [autonomyLevel, setAutonomyLevel] = useState<'fixed_it' | 'pointed_error' | 'asked_questions'>('asked_questions');
    const [struggleMetric, setStruggleMetric] = useState(3);
    const [deliveryFocus, setDeliveryFocus] = useState<'Final Polish' | 'Iteration & Effort'>('Iteration & Effort');
    const [labRespect, setLabRespect] = useState<boolean | null>(null);
    
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const auditChecksComplete = Boolean(selectedSessionId && techReady !== null && safetyZoned !== null && labRespect !== null && voiceTranscript.trim().length >= 10);

    const openAuditModal = () => {
        if (!evaluatorAvailable || todaysSessions.length === 0) return;
        setIsAuditModalOpen(true);
        setAuditTab('pre-flight');
        setSelectedSessionId('');
        setPredictiveWarned(false);
        setTechReady(null);
        setMaterialStock(3);
        setSafetyZoned(null);
        setInstructionTime('10-20 mins');
        setAutonomyLevel('asked_questions');
        setStruggleMetric(3);
        setDeliveryFocus('Iteration & Effort');
        setLabRespect(null);
        setVoiceTranscript('');
    };

    const submitAudit = async () => {
        if (!selectedSessionId) {
            await showAlert('Select a session', 'Choose one of today\'s sessions before starting the quality audit.', 'warning');
            return;
        }

        const session = todaysSessions.find(s => s.id === selectedSessionId);
        if (!session) {
            await showAlert('Session unavailable', 'This session is no longer available. Refresh the page and choose another session.', 'warning');
            return;
        }

        const orgId = currentOrganization?.id;
        if (!orgId) {
            await showAlert('Organization required', 'Select an organization before submitting a quality audit.', 'warning');
            return;
        }
        if (!evaluatorAvailable) {
            await showAlert('Quality evaluator unavailable', 'The AI evaluator is not configured for this environment.', 'warning');
            return;
        }
        if (techReady === null || safetyZoned === null || labRespect === null) {
            await showAlert('Audit checks incomplete', 'Record the tech, safety, and cleanup checks before submitting.', 'warning');
            return;
        }
        if (voiceTranscript.trim().length < 10) {
            await showAlert('Observation required', 'Add one specific observation of at least 10 characters.', 'warning');
            return;
        }
        const existingAudit = workshopEvaluations.find(item => item.sessionId === session.id && item.date === todayStr);
        if (existingAudit) {
            const approved = await confirm({
                title: 'Add another audit?',
                message: 'This session already has a quality audit today. A new submission will be kept as an additional observation.',
                confirmText: 'Add audit',
                cancelText: 'Review existing',
                variant: 'warning'
            });
            if (!approved) return;
        }

        setIsEvaluating(true);
        
        try {
            const inputs = {
                predictiveFlags: { inventoryWarned: predictiveWarned },
                preFlight: { techReady, materialStock, safetyZoned },
                execution: { instructionTime, autonomyLevel, struggleMetric, deliveryFocus, labRespect },
                voiceTranscript
            };

            const result = await evaluateWorkshopSession(inputs);
            const score = Number(result?.Health_Score);
            if (!Number.isFinite(score) || score < 0 || score > 100) {
                throw new Error('The evaluator returned an invalid quality score.');
            }

            const instructorName = teamMembers.find(t => t.uid === session.instructorId)?.name || session.instructorName || 'Unknown Officer';

            const newEvaluation: Omit<WorkshopEvaluation, 'id'> = {
                organizationId: orgId,
                sessionId: session.id,
                workshopTitle: `${session.title} ${session.subTitle}`,
                instructorId: session.instructorId || '',
                instructorName,
                date: todayStr,
                predictiveFlags: inputs.predictiveFlags,
                preFlight: inputs.preFlight,
                execution: inputs.execution,
                voiceTranscript: voiceTranscript.trim(),
                totalScore: Math.round(score),
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
            await showAlert('Quality audit saved', `${session.title} scored ${Math.round(score)}/100 and the coaching action is now recorded.`, 'success');
        } catch (error) {
            console.error('Error submitting audit:', error);
            await showAlert('Audit could not be completed', error instanceof Error ? error.message : 'The evaluation service did not return a valid result.', 'danger');
        } finally {
            setIsEvaluating(false);
        }
    };

    return (
        <div className="space-y-5 pb-20 animate-in fade-in duration-200">
            <AtlasCommandHeader
                eyebrow="Academic quality"
                title="Workshop quality"
                description="Review today's delivery, capture evidence, and turn each observation into a clear coaching action."
                icon={Award}
                badges={<span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${evaluatorAvailable ? 'border-teal-300/20 bg-teal-300/10 text-teal-200' : 'border-amber-300/20 bg-amber-300/10 text-amber-200'}`}>{evaluatorAvailable ? 'Evaluator ready' : 'Evaluator offline'}</span>}
                actions={<AtlasActionButton icon={Mic} variant="primary" onClick={openAuditModal} disabled={!evaluatorAvailable || todaysSessions.length === 0} title={!evaluatorAvailable ? 'Configure the Google AI key to enable quality audits' : todaysSessions.length === 0 ? 'No sessions are scheduled today' : 'Run quality audit'}>Run quality audit</AtlasActionButton>}
            />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Quality health" value={stats.avg || '--'} detail="Average score out of 100" icon={ShieldCheck} tone={stats.avg >= 80 ? 'emerald' : 'amber'} />
                <AtlasSignalCard label="Audits complete" value={stats.count} detail="Recorded quality reviews" icon={Microscope} tone="teal" />
                <AtlasSignalCard label="Today's sessions" value={todaysSessions.length} detail="Available for review" icon={CalendarDays} tone="blue" />
                <AtlasSignalCard label="Target gap" value={stats.count ? qualityGap : '--'} detail={stats.count ? 'Points to the 90 target' : 'Complete the first audit'} icon={Target} tone={qualityGap === 0 && stats.count ? 'emerald' : 'amber'} />
            </div>

            <div className="space-y-4">
                <AtlasSectionHeader
                    title="Recent quality reviews"
                    description="Latest evidence, root causes, and coaching mandates from workshop delivery."
                    icon={Microscope}
                    meta={stats.count > 0 ? <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold text-slate-400">{stats.count}</span> : undefined}
                />
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {workshopEvaluations.length === 0 ? (
                        <div className="col-span-full">
                            <AtlasEmptyState
                                icon={MessageSquare}
                                title="No quality reviews yet"
                                description="Run the first audit to establish a baseline and create a coaching action."
                                action={<AtlasActionButton icon={Mic} variant="primary" onClick={openAuditModal} disabled={!evaluatorAvailable || todaysSessions.length === 0}>Run first audit</AtlasActionButton>}
                            />
                        </div>
                    ) : (
                        workshopEvaluations.map((evalItem: WorkshopEvaluation) => (
                            <article key={evalItem.id} className="rounded-lg border border-white/10 bg-slate-900/70 p-5 transition-colors hover:border-teal-300/25">
                                <div className="mb-4 flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <h4 className="truncate text-base font-black text-white">{evalItem.workshopTitle}</h4>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">OFFICER {evalItem.instructorName} | {formatDate(evalItem.date)}</p>
                                    </div>
                                    <div className={`flex shrink-0 items-center gap-1 rounded-lg border px-3 py-2 text-lg font-black ${evalItem.totalScore >= 80 ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-300/20 bg-amber-300/10 text-amber-200'}`}>
                                        <Activity size={16} />
                                        {evalItem.totalScore}
                                    </div>
                                </div>
                                
                                <div className="mb-3 border-l-2 border-slate-700 pl-3">
                                    <p className="mb-1 text-[10px] font-black uppercase text-slate-500">Root cause</p>
                                    <p className="text-sm leading-6 text-slate-300">
                                        {evalItem.rootCause || 'No root cause identified.'}
                                    </p>
                                </div>

                                <div className="flex items-start gap-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.06] p-3">
                                    <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-200" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-amber-200">Coaching action</p>
                                        <p className="mt-1 text-sm font-medium leading-5 text-slate-200">
                                            {evalItem.actionableMandate || 'No mandate issued.'}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </div>

            {/* AUDIT MODAL (TABLET UI) */}
            {isAuditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-5">
                    <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-950 shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-950 p-4 sm:px-6">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <Activity className="text-teal-300" />
                                Workshop quality audit
                            </h3>
                            <button aria-label="Close audit" onClick={() => !isEvaluating && setIsAuditModalOpen(false)} disabled={isEvaluating} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Setup Row */}
                        <div className="flex shrink-0 flex-col gap-2 border-b border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:px-6">
                            <label htmlFor="quality-session" className="text-[10px] font-black uppercase text-slate-400">Today's session</label>
                            <select 
                                id="quality-session"
                                className="min-h-10 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none transition-colors focus:border-teal-400/60"
                                value={selectedSessionId}
                                onChange={(e) => setSelectedSessionId(e.target.value)}
                            >
                                <option value="">Choose a session</option>
                                {todaysSessions.map(session => (
                                    <option key={session.id} value={session.id}>
                                        {session.startTime} - {session.title} {session.subTitle} (Officer: {session.instructorName || 'Unassigned'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Tabs */}
                        <div className="flex shrink-0 border-b border-white/10 bg-slate-950 px-4 sm:px-6">
                            <button 
                                onClick={() => setAuditTab('pre-flight')}
                                className={`flex min-h-12 flex-1 items-center justify-center gap-2 border-b-2 text-xs font-black uppercase transition-colors ${auditTab === 'pre-flight' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                            >
                                <CheckCircle size={18} /> Pre-Flight Check
                            </button>
                            <button 
                                onClick={() => setAuditTab('execution')}
                                className={`flex min-h-12 flex-1 items-center justify-center gap-2 border-b-2 text-xs font-black uppercase transition-colors ${auditTab === 'execution' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                            >
                                <Play size={18} /> Execution Audit
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-28">
                            {auditTab === 'pre-flight' ? (
                                <div className="space-y-8 animate-in slide-in-from-right-8 fade-in">
                                    <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${predictiveWarned ? 'border-amber-300/30 bg-amber-300/10' : 'border-white/10 bg-slate-900/70'}`}>
                                        <input type="checkbox" checked={predictiveWarned} onChange={event => setPredictiveWarned(event.target.checked)} className="mt-0.5 h-5 w-5 rounded border-slate-600 text-amber-500 focus:ring-amber-500" />
                                        <span>
                                            <span className="block text-xs font-black uppercase text-slate-200">Earlier inventory warning</span>
                                            <span className="mt-1 block text-xs leading-5 text-slate-500">Enable only when the team received a low-stock warning before this session.</span>
                                        </span>
                                    </label>

                                    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-5">
                                        <h3 className="mb-4 text-xs font-black uppercase text-slate-300">Tech status</h3>
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => setTechReady(true)}
                                                aria-pressed={techReady === true}
                                                className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-black transition-colors ${techReady === true ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-slate-700 text-slate-400'}`}
                                            >
                                                Ready
                                            </button>
                                            <button 
                                                onClick={() => setTechReady(false)}
                                                aria-pressed={techReady === false}
                                                className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-black transition-colors ${techReady === false ? 'border-rose-400/40 bg-rose-400/10 text-rose-300' : 'border-slate-700 text-slate-400'}`}
                                            >
                                                Missing / Uncharged
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-5">
                                        <div className="flex justify-between items-end mb-4">
                                            <h3 className="text-xs font-black uppercase text-slate-300">Material stock</h3>
                                            <span className="rounded-md bg-teal-400/10 px-2 py-1 text-xs font-bold text-teal-300">{materialStock}/5</span>
                                        </div>
                                        <input 
                                            type="range" min="1" max="5" 
                                            value={materialStock} 
                                            onChange={(e) => setMaterialStock(parseInt(e.target.value))}
                                            className="mb-2 w-full accent-teal-500"
                                        />
                                        <div className="flex justify-between text-[10px] uppercase font-black tracking-wider text-slate-400">
                                            <span>1: Missing Items</span>
                                            <span>3: Minimum Met</span>
                                            <span>5: Fully Stocked</span>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-5">
                                        <h3 className="mb-4 text-xs font-black uppercase text-slate-300">Safety zoning</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button type="button" aria-pressed={safetyZoned === true} onClick={() => setSafetyZoned(true)} className={`min-h-11 rounded-lg border px-3 text-sm font-black ${safetyZoned === true ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-slate-700 text-slate-400'}`}>Ready</button>
                                            <button type="button" aria-pressed={safetyZoned === false} onClick={() => setSafetyZoned(false)} className={`min-h-11 rounded-lg border px-3 text-sm font-black ${safetyZoned === false ? 'border-rose-400/40 bg-rose-400/10 text-rose-300' : 'border-slate-700 text-slate-400'}`}>Not ready</button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in slide-in-from-right-8 fade-in">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-5">
                                            <h3 className="mb-4 text-xs font-black uppercase text-slate-300">Instruction time</h3>
                                            <div className="flex flex-col gap-2">
                                                {['< 10 mins', '10-20 mins', '> 20 mins'].map(opt => (
                                                    <label key={opt} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${instructionTime === opt ? 'border-teal-400/50 bg-teal-400/10' : 'border-slate-700 hover:bg-white/[0.03]'}`}>
                                                        <input type="radio" value={opt} checked={instructionTime === opt} onChange={() => setInstructionTime(opt as any)} className="hidden" />
                                                        <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${instructionTime === opt ? 'border-teal-400' : 'border-slate-600'}`}>
                                                            {instructionTime === opt && <div className="h-2.5 w-2.5 rounded-full bg-teal-400"></div>}
                                                        </div>
                                                        <span className={`font-bold ${instructionTime === opt ? 'text-white' : 'text-slate-400'}`}>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-5">
                                            <h3 className="mb-4 text-xs font-black uppercase text-slate-300">Learner autonomy</h3>
                                            <p className="text-xs text-slate-500 mb-3 italic">When kids got stuck, instructors...</p>
                                            <div className="flex flex-col gap-2">
                                                {[
                                                    { id: 'fixed_it', label: 'Fixed it for them' },
                                                    { id: 'pointed_error', label: 'Pointed out the exact error' },
                                                    { id: 'asked_questions', label: 'Asked guiding questions' },
                                                ].map(opt => (
                                                    <label key={opt.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${autonomyLevel === opt.id ? 'border-teal-400/50 bg-teal-400/10' : 'border-slate-700 hover:bg-white/[0.03]'}`}>
                                                        <input type="radio" value={opt.id} checked={autonomyLevel === opt.id} onChange={() => setAutonomyLevel(opt.id as any)} className="hidden" />
                                                        <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${autonomyLevel === opt.id ? 'border-teal-400' : 'border-slate-600'}`}>
                                                            {autonomyLevel === opt.id && <div className="h-2.5 w-2.5 rounded-full bg-teal-400"></div>}
                                                        </div>
                                                        <span className={`text-sm font-bold ${autonomyLevel === opt.id ? 'text-white' : 'text-slate-400'}`}>{opt.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-5">
                                        <div className="flex justify-between items-end mb-4">
                                            <h3 className="text-xs font-black uppercase text-slate-300">Challenge level</h3>
                                            <span className="rounded-md bg-teal-400/10 px-2 py-1 text-xs font-bold text-teal-300">{struggleMetric}/5</span>
                                        </div>
                                        <input 
                                            type="range" min="1" max="5" 
                                            value={struggleMetric} 
                                            onChange={(e) => setStruggleMetric(parseInt(e.target.value))}
                                            className="mb-2 w-full accent-teal-500"
                                        />
                                        <div className="flex justify-between text-[10px] uppercase font-black tracking-wider text-slate-400">
                                            <span>1: Too Easy</span>
                                            <span>3: Healthy Struggle</span>
                                            <span>5: Total Breakdown</span>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-5">
                                        <h3 className="mb-4 text-xs font-black uppercase text-slate-300">Praise focused on</h3>
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => setDeliveryFocus('Final Polish')}
                                                className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-bold transition-colors ${deliveryFocus === 'Final Polish' ? 'border-teal-400/50 bg-teal-400/10 text-teal-200' : 'border-slate-700 text-slate-400'}`}
                                            >
                                                Final Polish
                                            </button>
                                            <button 
                                                onClick={() => setDeliveryFocus('Iteration & Effort')}
                                                className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-bold transition-colors ${deliveryFocus === 'Iteration & Effort' ? 'border-teal-400/50 bg-teal-400/10 text-teal-200' : 'border-slate-700 text-slate-400'}`}
                                            >
                                                Iteration & Effort
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-5">
                                        <h4 className="text-xs font-black uppercase text-slate-200">Learner cleanup</h4>
                                        <p className="mt-1 text-sm font-medium text-slate-500">Did learners clean and sort their own stations?</p>
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <button type="button" aria-pressed={labRespect === true} onClick={() => setLabRespect(true)} className={`min-h-11 rounded-lg border px-3 text-sm font-black ${labRespect === true ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-slate-700 text-slate-400'}`}>Completed</button>
                                            <button type="button" aria-pressed={labRespect === false} onClick={() => setLabRespect(false)} className={`min-h-11 rounded-lg border px-3 text-sm font-black ${labRespect === false ? 'border-amber-300/40 bg-amber-300/10 text-amber-200' : 'border-slate-700 text-slate-400'}`}>Not completed</button>
                                        </div>
                                    </div>

                                    {/* The Context Layer (Voice) */}
                                    <div>
                                        <h3 className="mb-2 flex items-center gap-2 font-black text-white">
                                            <Mic className="text-teal-300" size={20} /> Observation notes
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-3 font-medium">Record a specific moment, blocker, or learner response.</p>
                                        <textarea 
                                            placeholder="Record one specific observation about a student overcoming a challenge or a logistical blocker..."
                                            className="min-h-[150px] w-full resize-none rounded-lg border border-white/10 bg-slate-900 p-4 text-base font-medium text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/60"
                                            value={voiceTranscript}
                                            onChange={(e) => setVoiceTranscript(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 border-t border-white/10 bg-slate-950 p-4 sm:px-6">
                            <p className="hidden text-xs font-bold text-slate-500 sm:block">Sentinel evaluates the evidence after submission.</p>
                            <button 
                                onClick={submitAudit}
                                disabled={isEvaluating || !auditChecksComplete || !evaluatorAvailable}
                                className="ml-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-teal-300/30 bg-teal-500 px-5 py-2.5 text-sm font-black text-slate-950 transition-colors hover:bg-teal-400 disabled:opacity-50"
                            >
                                {isEvaluating ? (
                                    <>
                                        <Zap size={20} />
                                        Evaluating...
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        Submit audit
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
