import React, { useState } from 'react';
import { BookOpen, CheckCircle2, FileText, Image as ImageIcon, Link2, LockKeyhole, PlayCircle, ShieldCheck, Wrench } from 'lucide-react';
import type { Resource, StudentProject } from '../types';
import { nextResourceProgress, pendingRequiredResources, resourceIdentity, resourceMastered, resourceRequiresMastery, resourceTypeLabel } from '../domain/resourceLearning';
import { ResourceViewerModal } from './ResourceViewerModal';

interface ResourceLearningGateProps {
  project: StudentProject;
  resources: Resource[];
  updateProject: (updates: Partial<StudentProject>) => Promise<{ success: boolean; error?: string }>;
  title: string;
  description?: string;
  onComplete?: () => void;
}

const icon = (resource: Resource) => resource.type === 'video' ? PlayCircle : resource.type === 'image' ? ImageIcon : resource.type === 'tool' ? Wrench : resource.type === 'link' ? Link2 : FileText;

export function ResourceLearningGate({ project, resources, updateProject, title, description, onComplete }: ResourceLearningGateProps) {
  const [selected, setSelected] = useState<Resource | null>(null);
  const [error, setError] = useState('');
  const required = resources.filter(resourceRequiresMastery);
  const pending = pendingRequiredResources(project, resources);
  const complete = pending.length === 0;

  const recordAttempt = async (resource: Resource, score: number, passed: boolean) => {
    if (!resource.quiz) return false;
    const key = resourceIdentity(resource);
    const current = project.resourceProgress?.[key];
    const progress = nextResourceProgress(resource, current, score, passed ? new Date().toISOString() : '');
    const result = await updateProject({ resourceProgress: { ...(project.resourceProgress || {}), [key]: progress } });
    if (!result.success) { setError(result.error || 'The knowledge-check result could not be saved.'); return false; }
    setError('');
    if (passed) setSelected(null);
    return true;
  };

  return <section className="rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6" aria-labelledby="resource-gate-title">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-800">{complete ? <CheckCircle2 size={17} /> : <LockKeyhole size={17} />} Learning checkpoint</p><h3 id="resource-gate-title" className="mt-1 text-2xl font-black text-slate-950">{title}</h3><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">{description || 'Review every required resource and pass its quick knowledge check before building.'}</p></div><span className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-black ${complete ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>{complete ? 'Ready to continue' : `${required.length - pending.length}/${required.length} checks passed`}</span></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">{resources.map(resource => {
      const Icon = icon(resource);
      const mastered = resourceMastered(project, resource);
      return <button type="button" key={resourceIdentity(resource)} onClick={() => setSelected(resource)} className={`flex min-h-24 items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${mastered ? 'border-emerald-300' : resource.requiredForProgress ? 'border-amber-300' : 'border-slate-200 hover:border-blue-300'}`}><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${mastered ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{mastered ? <CheckCircle2 size={23} /> : <Icon size={23} />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-base font-black text-slate-950">{resource.title}</strong><small className="mt-1 flex items-center gap-1 font-bold text-slate-500">{resource.requiredForProgress ? <><ShieldCheck size={14} /> {mastered ? 'Passed' : 'Required check'}</> : `Optional ${resourceTypeLabel(resource)}`}</small></span></button>;
    })}</div>
    {!resources.length && <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center"><BookOpen className="mx-auto text-slate-300" size={34} /><p className="mt-3 font-black text-slate-800">No resources attached</p></div>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 font-bold text-red-800">{error}</p>}
    {complete && onComplete && <button type="button" onClick={onComplete} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-black text-white shadow-sm transition hover:bg-emerald-700"><CheckCircle2 size={19} /> Continue to the next action</button>}
    {selected && <ResourceViewerModal isOpen resource={selected} mastered={resourceMastered(project, selected)} onClose={() => setSelected(null)} onQuizAttempt={(score, passed) => recordAttempt(selected, score, passed)} />}
  </section>;
}
