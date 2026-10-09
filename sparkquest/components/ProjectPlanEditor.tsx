import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, ClipboardList, GripVertical, LockKeyhole, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Reorder } from 'framer-motion';
import type { ProjectStep, ProjectStepReviewState } from '../types';
import { appendParsedPlanSteps, createPlanStep, normalizePlanOrder, parsePlanText, stepHasProtectedWork } from '../domain/projectPlan';

interface ProjectPlanEditorProps {
  steps: ProjectStep[];
  onChange: (steps: ProjectStep[]) => void;
  stepReviews?: Record<string, ProjectStepReviewState>;
  disabled?: boolean;
  audience?: 'learner' | 'instructor';
}

const inputClass = 'w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500';

export function ProjectPlanEditor({ steps, onChange, stepReviews = {}, disabled = false, audience = 'learner' }: ProjectPlanEditorProps) {
  const [newTitle, setNewTitle] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const parsed = useMemo(() => parsePlanText(bulkText), [bulkText]);
  const existingTitles = useMemo(() => new Set(steps.map(step => step.title.trim().toLocaleLowerCase())), [steps]);
  const newParsedCount = parsed.filter(step => !existingTitles.has(step.title.toLocaleLowerCase())).length;

  const changeStep = (id: string, patch: Partial<ProjectStep>) => onChange(normalizePlanOrder(steps.map(step => step.id === id ? { ...step, ...patch } : step)));
  const addOne = () => {
    if (!newTitle.trim() || disabled) return;
    const next = createPlanStep(newTitle);
    onChange(normalizePlanOrder([...steps, next]));
    setNewTitle('');
    setExpandedId(next.id);
  };
  const remove = (step: ProjectStep) => {
    if (disabled || stepHasProtectedWork(step, stepReviews[step.id])) return;
    onChange(normalizePlanOrder(steps.filter(item => item.id !== step.id)));
  };
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (disabled || target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(normalizePlanOrder(next));
  };
  const addBulk = () => {
    if (!newParsedCount || disabled) return;
    onChange(appendParsedPlanSteps(steps, parsed));
    setBulkText('');
    setBulkOpen(false);
  };

  return <section className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-slate-50 shadow-sm" aria-label="Project step plan editor">
    <div className="border-b-2 border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Build roadmap</p>
          <h3 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">Shape the project step by step</h3>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-600">Reorder freely. Proof and feedback stay attached to their original step.</p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">{steps.length} {steps.length === 1 ? 'step' : 'steps'}</span>
      </div>

      {!disabled && <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="sr-only" htmlFor={`new-plan-step-${audience}`}>New step title</label>
        <input id={`new-plan-step-${audience}`} className={inputClass} value={newTitle} onChange={event => setNewTitle(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addOne(); }} placeholder="Add one step, for example: Test the prototype" />
        <button type="button" onClick={addOne} disabled={!newTitle.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={18} /> Add step</button>
        <button type="button" onClick={() => setBulkOpen(value => !value)} aria-expanded={bulkOpen} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 font-black text-slate-800 transition hover:border-blue-300 hover:bg-blue-50"><ClipboardList size={18} /> Paste a list</button>
      </div>}

      {disabled && <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-5 text-amber-900"><LockKeyhole className="mt-0.5 shrink-0" size={18} /> Published projects are frozen so their portfolio record and review history stay reliable.</div>}

      {bulkOpen && !disabled && <div className="mt-4 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start justify-between gap-3"><div><h4 className="flex items-center gap-2 font-black text-slate-950"><Sparkles size={18} className="text-blue-600" /> Paste the whole plan</h4><p className="mt-1 text-sm font-semibold leading-5 text-slate-600">One line becomes one step. Bullets, numbers, checkboxes, and “title: detail” are cleaned automatically.</p></div><button type="button" onClick={() => setBulkOpen(false)} className="grid min-h-10 min-w-10 place-items-center rounded-xl text-slate-500 hover:bg-white" aria-label="Close bulk step entry"><X size={18} /></button></div>
        <textarea className={`${inputClass} mt-3 min-h-40 resize-y font-medium`} value={bulkText} onChange={event => setBulkText(event.target.value)} placeholder={'1. Research the idea\n2. Sketch: Draw two possible solutions\n- Build the prototype\n- Test — Record what changed'} />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-bold text-slate-700">{bulkText.trim() ? `${parsed.length} recognized · ${newParsedCount} new` : 'Paste a list to see the preview count.'}</p><button type="button" onClick={addBulk} disabled={!newParsedCount} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Check size={18} /> Insert {newParsedCount || ''} {newParsedCount === 1 ? 'step' : 'steps'}</button></div>
      </div>}
    </div>

    <Reorder.Group axis="y" values={steps} onReorder={next => !disabled && onChange(normalizePlanOrder(next))} className="space-y-3 p-3 sm:p-5">
      {steps.map((step, index) => {
        const protectedWork = stepHasProtectedWork(step, stepReviews[step.id]);
        const expanded = expandedId === step.id;
        return <Reorder.Item key={step.id} value={step} dragListener={!disabled} className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
            <div className={`grid min-h-11 min-w-9 place-items-center rounded-xl text-slate-400 ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}`} aria-hidden="true"><GripVertical size={21} /></div>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">{index + 1}</span>
            <input aria-label={`Step ${index + 1} title`} className={`${inputClass} min-w-0 border-0 bg-transparent px-1 text-base shadow-none focus:bg-blue-50 focus:ring-0 sm:text-lg`} value={step.title} disabled={disabled} onChange={event => changeStep(step.id, { title: event.target.value })} />
            <div className="hidden items-center gap-1 sm:flex">
              <button type="button" onClick={() => move(index, -1)} disabled={disabled || index === 0} className="grid min-h-10 min-w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-25" aria-label={`Move ${step.title} up`}><ArrowUp size={17} /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={disabled || index === steps.length - 1} className="grid min-h-10 min-w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-25" aria-label={`Move ${step.title} down`}><ArrowDown size={17} /></button>
            </div>
            <button type="button" onClick={() => setExpandedId(expanded ? null : step.id)} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label={`${expanded ? 'Hide' : 'Edit'} ${step.title} details`} aria-expanded={expanded}>{expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button>
            <button type="button" onClick={() => remove(step)} disabled={disabled || protectedWork || steps.length === 1} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30" aria-label={protectedWork ? `${step.title} cannot be deleted because it has progress` : `Delete ${step.title}`} title={protectedWork ? 'This step has progress, proof, or review history and cannot be deleted.' : 'Delete step'}>{protectedWork ? <LockKeyhole size={18} /> : <Trash2 size={18} />}</button>
          </div>
          {!disabled && <div className="flex gap-2 border-t border-slate-100 px-3 pb-3 pt-2 sm:hidden">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 disabled:opacity-30" aria-label={`Move ${step.title} up`}><ArrowUp size={16} /> Move up</button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === steps.length - 1} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 disabled:opacity-30" aria-label={`Move ${step.title} down`}><ArrowDown size={16} /> Move down</button>
          </div>}
          {expanded && <div className="grid gap-4 border-t-2 border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600 sm:col-span-2">Step description<textarea className={`${inputClass} mt-1 min-h-24 resize-y normal-case tracking-normal font-semibold`} disabled={disabled} value={step.description || ''} onChange={event => changeStep(step.id, { description: event.target.value })} placeholder="Describe what this step covers." /></label>
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">Goal for this step<textarea className={`${inputClass} mt-1 min-h-24 resize-y normal-case tracking-normal font-semibold`} disabled={disabled} value={step.objective || ''} onChange={event => changeStep(step.id, { objective: event.target.value })} placeholder="What should the learner achieve?" /></label>
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">Instructions<textarea className={`${inputClass} mt-1 min-h-24 resize-y normal-case tracking-normal font-semibold`} disabled={disabled} value={step.instructions || ''} onChange={event => changeStep(step.id, { instructions: event.target.value })} placeholder="What should happen during this step?" /></label>
            <label className="flex min-h-12 items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-black text-slate-700 sm:col-span-2"><input type="checkbox" className="h-5 w-5 accent-blue-600" checked={step.required !== false} disabled={disabled} onChange={event => changeStep(step.id, { required: event.target.checked })} /> Required before the final project can be approved</label>
            {protectedWork && <p className="flex items-center gap-2 text-xs font-bold text-amber-800 sm:col-span-2"><LockKeyhole size={15} /> This step can be renamed or moved, but not deleted because it already has progress, proof, or feedback.</p>}
          </div>}
        </Reorder.Item>;
      })}
      {!steps.length && <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center"><ClipboardList className="mx-auto text-slate-300" size={32} /><p className="mt-3 font-black text-slate-700">No steps yet</p><p className="mt-1 text-sm font-semibold text-slate-500">Add one step or paste the whole roadmap.</p></div>}
    </Reorder.Group>
  </section>;
}
