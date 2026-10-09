import React, { useMemo, useRef, useState } from 'react';
import { BookOpen, Check, Download, ExternalLink, FileSpreadsheet, FileText, Image as ImageIcon, Link2, Loader2, Plus, RefreshCw, Search, ShieldCheck, Trash2, Upload, Video, Wrench, X } from 'lucide-react';
import type { Resource, ResourceLibraryItem, ResourceQuizQuestion } from '../types';
import { useAuth } from '../context/AuthContext';
import { useResourceLibrary } from '../hooks/useResourceLibrary';
import { asMissionResource, saveResourceLibraryItem } from '../services/resourceLibrary';
import { api } from '../services/api';
import { db } from '../services/firebase';
import { filterResourceLibrary, resourceHasValidQuiz, resourceTypeLabel, validateLibraryResource } from '../domain/resourceLearning';
import { ResourceViewerModal } from './ResourceViewerModal';
import './resource-learning.css';
import { parseResourceQuizCsv, resourceQuizCsvTemplate } from '../domain/resourceQuizCsv';

interface ResourceLibraryProps {
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  picker?: boolean;
  onPick?: (resource: Resource) => void;
  previewMode?: boolean;
  previewResources?: ResourceLibraryItem[];
}

const typeIcon = (type: Resource['type']) => type === 'video' ? Video : type === 'image' ? ImageIcon : type === 'file' ? FileText : type === 'tool' ? Wrench : Link2;
const typeTone = (type: Resource['type']) => type === 'video'
  ? 'border-rose-200 bg-rose-50 text-rose-700'
  : type === 'image'
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : type === 'file'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : type === 'tool'
        ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
        : 'border-violet-200 bg-violet-50 text-violet-700';
const field = 'w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-base font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
const emptyQuestion = (): ResourceQuizQuestion => ({ id: crypto.randomUUID(), prompt: '', options: ['', '', ''], correctOptionIndex: 0, explanation: '' });

export function ResourceLibrary({ isOpen = true, onClose, embedded = false, picker = false, onPick, previewMode = false, previewResources = [] }: ResourceLibraryProps) {
  const { user, userProfile } = useAuth();
  const { resources, loading, error, retry } = useResourceLibrary(userProfile?.organizationId);
  const [previewItems, setPreviewItems] = useState(previewResources);
  const canManage = previewMode || ['owner', 'super_admin', 'admin', 'instructor'].includes(userProfile?.role || '');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | Resource['type']>('all');
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<ResourceLibraryItem | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [resourceType, setResourceType] = useState<Resource['type']>('file');
  const [toolAccess, setToolAccess] = useState<NonNullable<Resource['toolAccess']>>('web');
  const [required, setRequired] = useState(false);
  const [questions, setQuestions] = useState<ResourceQuizQuestion[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [quizCsvStatus, setQuizCsvStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const quizCsvRef = useRef<HTMLInputElement>(null);
  const sourceResources = previewMode ? previewItems : resources;
  const filtered = useMemo(() => filterResourceLibrary(sourceResources, search, type), [sourceResources, search, type]);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle(''); setUrl(''); setDescription(''); setTags(''); setResourceType('file'); setToolAccess('web'); setRequired(false); setQuestions([emptyQuestion()]); setFormError(''); setQuizCsvStatus('');
  };
  const openCreate = () => { resetForm(); setEditing(true); };
  const save = async () => {
    const quizQuestions = questions.map(question => ({ ...question, prompt: question.prompt.trim(), options: question.options.map(option => option.trim()), explanation: question.explanation?.trim() })).filter(question => question.prompt || question.options.some(Boolean));
    const resource: Resource = {
      id: `resource-${Date.now()}`,
      title: title.trim(), type: resourceType, url: url.trim(), description: description.trim(),
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean), requiredForProgress: required,
      ...(resourceType === 'tool' ? { toolAccess } : {}),
      ...(quizQuestions.length ? { quiz: { version: 1, passingScore: 100, questions: quizQuestions } } : {}),
    };
    setSaving(true); setFormError('');
    try {
      if (previewMode) {
        validateLibraryResource(resource);
        setPreviewItems(current => [{ ...resource, id: `preview-${Date.now()}`, organizationId: 'preview-organization', status: 'active', createdBy: 'preview-instructor' }, ...current]);
      } else {
        if (!db || !user?.uid || !userProfile?.organizationId) throw new Error('Your instructor session is unavailable.');
        await saveResourceLibraryItem(db, resource, { uid: user.uid, organizationId: userProfile.organizationId, role: userProfile.role || '' });
      }
      setEditing(false); resetForm();
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'The resource could not be saved.'); }
    finally { setSaving(false); }
  };
  const upload = async (file: File) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (previewMode) {
      setUrl(`https://preview.sparkquest.local/${encodeURIComponent(safeName)}`);
      setTitle(current => current || file.name);
      setResourceType(file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'file');
      return;
    }
    if (!user?.uid || !userProfile?.organizationId) return;
    setUploading(true); setFormError('');
    try {
      const uploaded = await api.uploadFile(file, `instructor-projects/${userProfile.organizationId}/${user.uid}/resource-library/resource-${Date.now()}-${safeName}`);
      setUrl(uploaded); setTitle(current => current || file.name);
      setResourceType(file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'file');
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'The file could not be uploaded.'); }
    finally { setUploading(false); }
  };
  const importQuizCsv = async (file: File) => {
    setFormError(''); setQuizCsvStatus('');
    try {
      const imported = parseResourceQuizCsv(await file.text());
      setQuestions(imported);
      setQuizCsvStatus(`${imported.length} question${imported.length === 1 ? '' : 's'} imported from ${file.name}. Review them below, then save the resource.`);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'The quiz CSV could not be read.');
    }
  };

  const content = <div className="sq-resource-library min-h-0 flex-1 overflow-y-auto bg-[#f4f7fb] p-4 sm:p-7">
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">Shared learning shelf</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">Resource &amp; tool library</h1><p className="mt-2 max-w-2xl font-semibold leading-6 text-blue-100">Find guides, videos, PDFs, images, links, and project-building tools. A shield means the item includes a knowledge check.</p></div>
        {canManage && !picker && <button type="button" onClick={openCreate} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 font-black text-slate-950 shadow-md transition hover:bg-amber-300"><Plus size={19} /> Add resource or tool</button>}
      </header>

      <div className="sticky top-0 z-10 mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:grid-cols-[1fr_auto]">
        <label className="relative"><span className="sr-only">Search resources</span><Search className="absolute left-4 top-3.5 text-slate-400" size={20} /><input className={`${field} pl-11`} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by title, topic, or tag…" /></label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Resource type">{(['all', 'tool', 'video', 'file', 'image', 'link'] as const).map(value => <button type="button" key={value} aria-pressed={type === value} onClick={() => setType(value)} className={`min-h-11 rounded-xl px-4 text-sm font-black capitalize transition ${type === value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}>{value === 'file' ? 'PDF & files' : value === 'tool' ? 'Tools & apps' : value}</button>)}</div>
      </div>

      {!previewMode && error && <div role="alert" className="mt-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 sm:flex-row sm:items-center sm:justify-between"><p className="font-bold">{error}</p><button type="button" onClick={retry} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 font-black text-white hover:bg-red-800"><RefreshCw size={17} /> Try again</button></div>}
      {!previewMode && loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-blue-600" size={34} /><span className="sr-only">Loading resources</span></div> : !previewMode && error ? null : <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(item => {
        const Icon = typeIcon(item.type);
        return <article key={item.id} className="flex min-h-64 flex-col rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
          <div className="flex items-start justify-between gap-3"><span className={`grid h-12 w-12 place-items-center rounded-2xl border ${typeTone(item.type)}`}><Icon size={23} /></span>{resourceHasValidQuiz(item) && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800"><ShieldCheck size={15} /> Knowledge check</span>}</div>
          <p className="mt-4 text-xs font-black uppercase tracking-wider text-blue-700">{resourceTypeLabel(item)}</p><h2 className="mt-1 text-xl font-black text-slate-950">{item.title}</h2><p className="mt-2 line-clamp-3 flex-1 text-sm font-semibold leading-6 text-slate-600">{item.description || (item.type === 'tool' ? 'Open this tool to use it in your project.' : 'Open this resource to explore the learning material.')}</p>
          {item.tags?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{item.tags.slice(0, 4).map(tag => <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{tag}</span>)}</div> : null}
          <div className="mt-5 flex gap-2"><button type="button" onClick={() => setSelected(item)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 font-black text-slate-800 hover:border-blue-300 hover:bg-blue-50"><ExternalLink size={17} /> Open</button>{picker && <button type="button" onClick={() => onPick?.(asMissionResource(item))} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 font-black text-white hover:bg-blue-700"><Check size={17} /> Use resource</button>}</div>
        </article>;
      })}{!filtered.length && <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center"><BookOpen className="mx-auto text-slate-300" size={42} /><h2 className="mt-4 text-xl font-black text-slate-900">No matching resources</h2><p className="mt-2 font-semibold text-slate-500">Try a shorter search or choose another type.</p></div>}</div>}
    </div>
  </div>;

  return <>{embedded ? content : <div className="fixed inset-0 z-[120] flex flex-col bg-white" role="dialog" aria-modal="true" aria-labelledby="resource-library-title"><div className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7"><div><p className="text-xs font-black uppercase tracking-wider text-blue-700">Sparkbook</p><h2 id="resource-library-title" className="text-xl font-black text-slate-950">{picker ? 'Choose a resource or tool' : 'Resource & tool library'}</h2></div><button type="button" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="Close resource library"><X size={22} /></button></div>{content}</div>}

    {editing && <div className="fixed inset-0 z-[140] grid place-items-center bg-slate-950/60 p-3" role="dialog" aria-modal="true" aria-labelledby="new-resource-title"><div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-blue-700">Publish once, reuse everywhere</p><h2 id="new-resource-title" className="mt-1 text-2xl font-black text-slate-950">Add a library item</h2></div><button type="button" onClick={() => setEditing(false)} className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-slate-100" aria-label="Close resource form"><X size={20} /></button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="font-black text-slate-700">Title<input className={`${field} mt-1`} value={title} onChange={event => setTitle(event.target.value)} /></label><label className="font-black text-slate-700">Type<select className={`${field} mt-1`} value={resourceType} onChange={event => setResourceType(event.target.value as Resource['type'])}><option value="tool">Tool or app</option><option value="file">PDF or file</option><option value="video">Video</option><option value="image">Image</option><option value="link">Link</option></select></label>{resourceType === 'tool' && <label className="font-black text-slate-700 sm:col-span-2">How students access it<select className={`${field} mt-1`} value={toolAccess} onChange={event => setToolAccess(event.target.value as NonNullable<Resource['toolAccess']>)}><option value="web">Open a web app</option><option value="download">Download or installation page</option><option value="plugin">Plugin or browser extension</option></select></label>}<label className="font-black text-slate-700 sm:col-span-2">Description<textarea className={`${field} mt-1 min-h-24`} value={description} onChange={event => setDescription(event.target.value)} /></label><label className="font-black text-slate-700 sm:col-span-2">Tags, separated by commas<input className={`${field} mt-1`} value={tags} onChange={event => setTags(event.target.value)} placeholder={resourceType === 'tool' ? 'coding, Windows, design, browser' : 'electronics, sensors, beginner'} /></label><label className="font-black text-slate-700 sm:col-span-2">{resourceType === 'tool' ? 'Launch, download, or installation URL' : 'Resource URL'}<input className={`${field} mt-1`} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" /></label></div>
      <input ref={fileRef} className="hidden" type="file" accept="image/*,video/*,audio/*,application/pdf,text/plain" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ''; }} /><button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-slate-200 px-4 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50">{uploading ? <Loader2 className="animate-spin" size={17} /> : <Upload size={17} />} {uploading ? 'Uploading…' : 'Upload from computer'}</button>
      <div className="mt-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="flex items-center gap-2 font-black text-slate-950"><ShieldCheck className="text-emerald-700" size={20} /> Knowledge check</h3><p className="mt-1 text-sm font-semibold text-slate-600">Import a complete quiz from CSV, then review or adjust individual questions.</p></div><label className="flex items-center gap-2 font-black text-emerald-900"><input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={required} onChange={event => setRequired(event.target.checked)} /> Required for progress</label></div>
        <input ref={quizCsvRef} className="hidden" type="file" accept=".csv,text/csv" onChange={event => { const file = event.target.files?.[0]; if (file) void importQuizCsv(file); event.currentTarget.value = ''; }} />
        <div className="mt-4 grid gap-3 rounded-2xl border border-emerald-200 bg-white p-4 sm:grid-cols-2"><button type="button" onClick={() => quizCsvRef.current?.click()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-black text-white hover:bg-emerald-800"><FileSpreadsheet size={18} /> Import quiz CSV</button><a href={`data:text/csv;charset=utf-8,${encodeURIComponent(resourceQuizCsvTemplate)}`} download="sparkquest-resource-quiz-template.csv" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 px-4 font-black text-emerald-900 hover:bg-emerald-50"><Download size={18} /> Download CSV template</a><p className="text-sm font-semibold leading-6 text-slate-600 sm:col-span-2">Use one row per question. The correct answer accepts A–D, 1–4, or the exact option text. Quoted commas and explanations are supported.</p></div>
        {quizCsvStatus && <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-100 p-3 font-bold text-emerald-900">{quizCsvStatus}</p>}
        <div className="mt-4 space-y-3">{questions.map((question, questionIndex) => <details key={question.id} open={questionIndex === 0} className="rounded-2xl border border-emerald-200 bg-white p-4"><summary className="cursor-pointer font-black text-slate-800">Question {questionIndex + 1}: {question.prompt || 'Untitled question'}</summary><div className="mt-4"><label className="font-black text-slate-700">Question<input className={`${field} mt-1`} value={question.prompt} onChange={event => setQuestions(current => current.map(item => item.id === question.id ? { ...item, prompt: event.target.value } : item))} /></label><div className="mt-3 grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex items-center gap-2"><input type="radio" name={`correct-${question.id}`} checked={question.correctOptionIndex === optionIndex} onChange={() => setQuestions(current => current.map(item => item.id === question.id ? { ...item, correctOptionIndex: optionIndex } : item))} aria-label={`Option ${optionIndex + 1} is correct`} /><input className={field} value={option} onChange={event => setQuestions(current => current.map(item => item.id === question.id ? { ...item, options: item.options.map((value, index) => index === optionIndex ? event.target.value : value) } : item))} placeholder={`Option ${optionIndex + 1}`} /></label>)}</div><label className="mt-3 block font-black text-slate-700">Explanation<input className={`${field} mt-1`} value={question.explanation || ''} onChange={event => setQuestions(current => current.map(item => item.id === question.id ? { ...item, explanation: event.target.value } : item))} /></label>{questions.length > 1 && <button type="button" onClick={() => setQuestions(current => current.filter(item => item.id !== question.id))} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-black text-red-700 hover:bg-red-50"><Trash2 size={17} /> Remove question</button>}</div></details>)}</div><button type="button" onClick={() => setQuestions(current => [...current, emptyQuestion()])} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-black text-emerald-800"><Plus size={17} /> Add one question manually</button>
      </div>
      {formError && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 font-bold text-red-800">{formError}</p>}<div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded-xl px-5 font-black text-slate-600">Cancel</button><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 font-black text-white hover:bg-blue-700 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />} Save to library</button></div></div></div>}

    {selected && <ResourceViewerModal isOpen resource={selected} onClose={() => setSelected(null)} />}
  </>;
}
