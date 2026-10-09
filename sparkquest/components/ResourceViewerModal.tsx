import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle2, Download, ExternalLink, FileText, Image as ImageIcon, Link2, Puzzle, RotateCcw, ShieldCheck, Video, Wrench } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { SparkbookDialog } from './SparkbookDialog';
import type { Resource } from '../types';
import { resourceHasValidQuiz, scoreResourceQuiz } from '../domain/resourceLearning';

interface ResourceViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    resource: Resource | null;
    mastered?: boolean;
    onQuizAttempt?: (score: number, passed: boolean) => boolean | void | Promise<boolean | void>;
}

export const ResourceViewerModal: React.FC<ResourceViewerModalProps> = ({ isOpen, onClose, resource, mastered = false, onQuizAttempt }) => {
    const { startSession } = useSession();
    const [mounted, setMounted] = useState(false);
    const [quizOpen, setQuizOpen] = useState(false);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
    useEffect(() => { setQuizOpen(false); setAnswers({}); setResult(null); setSaveError(''); }, [resource?.id]);

    if (!resource || !isOpen || !mounted) return null;

    const isPdf = resource.url.toLowerCase().includes('.pdf') || (resource.type === 'file' && resource.mimeType === 'application/pdf');
    const isImage = resource.type === 'image' || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(resource.url);
    const isVideo = resource.type === 'video' || resource.url.includes('youtube.com') || resource.url.includes('youtu.be');
    const isTool = resource.type === 'tool';
    const canEmbed = !isTool && (isPdf || isImage || isVideo);
    const validQuiz = resourceHasValidQuiz(resource);
    const icon = isTool ? resource.toolAccess === 'plugin' ? <Puzzle /> : <Wrench /> : isPdf ? <FileText /> : isVideo ? <Video /> : isImage ? <ImageIcon /> : <Link2 />;
    const toolAction = resource.toolAccess === 'download' ? 'Open installation page' : resource.toolAccess === 'plugin' ? 'Open plugin page' : 'Launch tool';
    const embedUrl = resource.url.includes('youtube.com/watch?v=')
        ? resource.url.replace('watch?v=', 'embed/')
        : resource.url.includes('youtu.be/')
            ? resource.url.replace('youtu.be/', 'youtube.com/embed/')
            : resource.url;

    const openResource = () => {
        if ((window as any).electron) { startSession(resource.url, 30, resource.title); return; }
        window.open(resource.url, '_blank', 'noopener,noreferrer');
    };
    const submitQuiz = async () => {
        if (!resource.quiz || resource.quiz.questions.some(question => answers[question.id] === undefined)) return;
        const scored = scoreResourceQuiz(resource, answers);
        setResult(scored);
        setSaveError('');
        setSaving(true);
        try {
            const saved = await onQuizAttempt?.(scored.score, scored.passed);
            if (saved === false) setSaveError('Your score was calculated, but it could not be saved. Check your connection and try again before continuing.');
        } catch {
            setSaveError('Your score was calculated, but it could not be saved. Check your connection and try again before continuing.');
        } finally { setSaving(false); }
    };

    return ReactDOM.createPortal(
        <SparkbookDialog
            isOpen
            onClose={onClose}
            eyebrow={mastered ? 'Knowledge check passed' : resource.requiredForProgress ? 'Required mission resource' : 'Learning resource'}
            title={resource.title}
            description={resource.description || (canEmbed ? 'Review this reference without losing your place in the mission.' : 'This reference opens in a separate browser tab.')}
            icon={mastered ? <CheckCircle2 /> : icon}
            tone={mastered ? 'lime' : 'blue'}
            size="full"
            bodyClassName="sq-resource-viewer"
            footer={<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span>{mastered ? 'You passed this knowledge check. You can review it again any time.' : validQuiz ? 'Review the item, then prove what you understood.' : isTool ? 'Use this tool while building your project.' : 'This is an optional reference with no knowledge check.'}</span><div className="flex flex-wrap gap-2"><button type="button" className="sq-action sq-action--quiet" onClick={openResource}>{isTool && resource.toolAccess === 'download' ? <Download size={17} /> : <ExternalLink size={17} />} {isTool ? toolAction : 'Open separately'}</button>{validQuiz && !mastered && <button type="button" className="sq-action sq-action--primary" onClick={() => setQuizOpen(true)}><ShieldCheck size={17} /> {quizOpen ? 'Knowledge check below' : 'Start knowledge check'}</button>}</div></div>}
        >
            <div className="space-y-5">
                {canEmbed ? <div className="sq-resource-stage">{isVideo ? <iframe src={embedUrl} title={resource.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : isImage ? <img src={resource.url} alt={resource.title} /> : <iframe src={embedUrl} title={resource.title} />}</div> : <div className="sq-resource-empty">{isTool ? <Wrench /> : <Link2 />}<strong>{isTool ? `${toolAction} when you are ready to build.` : 'This link opens in a separate browser tab.'}</strong><span>{isTool ? 'Return to SparkQuest when you are ready to continue the mission.' : 'Come back here after reviewing it to complete the knowledge check.'}</span><button type="button" className="sq-action sq-action--primary" onClick={openResource}>{isTool && resource.toolAccess === 'download' ? <Download size={17} /> : <ExternalLink size={17} />} {isTool ? toolAction : 'Open resource'}</button></div>}

                {resource.requiredForProgress && !validQuiz && <div role="alert" className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">This resource is marked as required, but its knowledge check is incomplete. Ask your instructor to repair it before continuing.</div>}

                {(quizOpen || result || mastered) && validQuiz && resource.quiz && <section className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-4 sm:p-6" aria-labelledby="resource-quiz-title">
                    <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white"><ShieldCheck size={22} /></span><div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">Quick comprehension check</p><h3 id="resource-quiz-title" className="mt-1 text-2xl font-black text-slate-950">Show what you understood</h3><p className="mt-1 text-sm font-semibold text-slate-600">Pass {resource.quiz.passingScore}% to unlock the next learning action.</p></div></div>
                    <div className="mt-5 space-y-5">{resource.quiz.questions.map((question, questionIndex) => <fieldset key={question.id} className="rounded-2xl border border-emerald-200 bg-white p-4"><legend className="px-2 text-base font-black text-slate-900">{questionIndex + 1}. {question.prompt}</legend><div className="mt-3 grid gap-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 font-bold transition ${answers[question.id] === optionIndex ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => { setAnswers(current => ({ ...current, [question.id]: optionIndex })); setResult(null); }} /><span>{option}</span></label>)}</div>{result && question.explanation && <p className="mt-3 text-sm font-semibold text-slate-600">{question.explanation}</p>}</fieldset>)}</div>
                    {result && <div role="status" className={`mt-5 rounded-2xl border-2 p-4 ${result.passed ? 'border-emerald-300 bg-emerald-100 text-emerald-950' : 'border-amber-300 bg-amber-100 text-amber-950'}`}><p className="text-lg font-black">{result.passed ? 'Passed — the next action is unlocked.' : `You scored ${result.score}%. Review the resource and try again.`}</p></div>}
                    {saveError && <p role="alert" className="mt-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 font-bold text-red-900">{saveError}</p>}
                    <div className="mt-5 flex justify-end">{result && !result.passed ? <button type="button" onClick={() => { setAnswers({}); setResult(null); }} className="sq-action sq-action--primary"><RotateCcw size={17} /> Try again</button> : !mastered && <button type="button" onClick={() => void submitQuiz()} disabled={saving || resource.quiz.questions.some(question => answers[question.id] === undefined)} className="sq-action sq-action--primary disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 size={17} /> {saving ? 'Saving result…' : 'Check my answers'}</button>}</div>
                </section>}
            </div>
        </SparkbookDialog>,
        document.body,
    );
};
