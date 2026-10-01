import React, { useEffect, useId, useRef, useState } from 'react';
import Papa from 'papaparse';
import { ArrowLeft, ArrowRight, Check, Download, Eye, Loader2, Plus, Upload, X } from 'lucide-react';
import type { ProcessPhase, ProjectTemplate } from '../../types';
import { importHeaders, importTasks, materializeImport, normalizeImportRow, safeUrl, sampleImportRow, stationNames, evidenceTypes, type ImportAsset, type ImportCatalog, type ImportDraft, type ImportReference } from '../../domain/missionImport';
import { getMissionReadiness } from '../../domain/missionContent';
import { normalizeWorkflowPhase } from '../../domain/workflowPipeline';
import { StudentMissionDetails } from '../StudentMissionDetails';
import './mission-import.css';

interface Props {
  catalog: ImportCatalog;
  canWrite: boolean;
  sessionKey: string;
  onClose: () => void;
  onSuccess: () => void;
  saveMission: (draft: ImportDraft, catalog: ImportCatalog, source: string) => Promise<NonNullable<ImportDraft['result']>>;
  assignMission: (id: string) => Promise<void>;
  uploadFile: (file: File, scope: string, progress: (percent: number) => void) => Promise<string>;
}
type Mode = 'upload' | 'queue' | 'complete' | 'review' | 'report';
type TaskKind = ReturnType<typeof importTasks>[number]['kind'];
const labels = { data: 'Identity', brief: 'Brief', workflow: 'Build map', audience: 'Audience', uploads: 'Files' };
const download = (filename: string, rows: Record<string, unknown>[]) => {
  const safeRows = rows.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === 'string' && /^[=+@-]/.test(v) ? `'${v}` : v])));
  const url = URL.createObjectURL(new Blob(['\ufeff', Papa.unparse(safeRows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const uniqueChoices = (values: ImportReference[]) => values.filter((v, i) => values.findIndex(other => other.id === v.id) === i);
const Field = ({ label, value, onChange, multiline = false, placeholder = '' }: { label: string; value?: string; onChange: (value: string) => void; multiline?: boolean; placeholder?: string }) => <label className="mi-field"><span>{label}</span>{multiline ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} /> : <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}</label>;

export const MissionImportWizard: React.FC<Props> = ({ catalog, canWrite, sessionKey, onClose, onSuccess, saveMission, assignMission, uploadFile }) => {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const success = useRef(onSuccess); success.current = onSuccess;
  const [mode, setMode] = useState<Mode>('upload');
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [selected, setSelected] = useState(0);
  const [task, setTask] = useState<TaskKind>('brief');
  const [source, setSource] = useState('');
  const [paste, setPaste] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); busyRef.current = busy;
  const session = useRef(sessionKey);
  const activeSession = useRef(sessionKey); activeSession.current = sessionKey;
  const sessionValid = session.current === sessionKey;
  const [progress, setProgress] = useState('');
  const [rawEdits, setRawEdits] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [audienceSearch, setAudienceSearch] = useState('');
  const hasWrites = useRef(false);
  const draft = drafts[selected];
  const tasks = draft ? importTasks(draft, catalog) : [];
  const canOperate = canWrite && sessionValid;
  const finish = () => { if (hasWrites.current) success.current(); close.current(); };
  const change = (update: (value: ImportDraft) => ImportDraft) => setDrafts(values => values.map((value, i) => i === selected ? update(value) : value));
  const missionField = (field: keyof ProjectTemplate, value: any) => change(d => ({ ...d, mission: { ...d.mission, [field]: value } }));
  const briefField = (field: string, value: any) => change(d => ({ ...d, mission: { ...d.mission, missionBrief: { ...d.mission.missionBrief, [field]: value } } }));
  const closeAction = useRef(() => {});
  closeAction.current = () => {
    if (busyRef.current) return;
    if (preview) { setPreview(false); return; }
    if (confirmClose) { setConfirmClose(false); return; }
    if (drafts.some(d => !d.result && !d.skip)) setConfirmClose(true); else finish();
  };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeAction.current(); }
      if (event.key !== 'Tab' || !panel.current) return;
      const root = panel.current.querySelector('.mi-confirm') || panel.current.querySelector('.mi-preview') || panel.current;
      const all = Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, a[href], [tabindex="0"]')).filter(e => e.getClientRects().length);
      const first = all[0], last = all[all.length - 1];
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handler); previous?.focus(); };
  }, []);
  useEffect(() => { setRawEdits(draft?.raw || {}); setAudienceSearch(''); setError(''); }, [selected, mode]);
  useEffect(() => { const body = panel.current?.querySelector('.mi-body'); if (body) body.scrollTop = 0; }, [selected, mode, task]);
  useEffect(() => { if (preview) panel.current?.querySelector<HTMLElement>('.mi-preview button')?.focus(); }, [preview]);
  useEffect(() => {
    if (confirmClose) panel.current?.querySelector<HTMLElement>('.mi-confirm button')?.focus();
  }, [confirmClose]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (busyRef.current || drafts.some(d => !d.result && !d.skip)) event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [drafts]);
  const parse = (content: string, filename: string) => {
    setError('');
    if (new TextEncoder().encode(content).length > 5 * 1024 * 1024) { setError('Keep CSV content under 5 MB.'); return; }
    const parsed = Papa.parse<Record<string, string>>(content, { header: true, skipEmptyLines: 'greedy', transformHeader: header => {
      const trimmed = header.replace(/^\ufeff/, '').trim();
      return [...importHeaders, 'ThumbnailUrl', 'Image'].find(h => h.toLowerCase() === trimmed.toLowerCase()) || trimmed;
    } });
    if (parsed.meta.renamedHeaders) { setError('Each CSV column needs a unique header. Remove repeated column names and try again.'); return; }
    if (parsed.errors.length) { setError(parsed.errors.map(e => `Row ${(e.row || 0) + 2}: ${e.message}`).join(' ')); return; }
    if (!parsed.data.length) { setError('The file is empty. Download the example to see the expected structure.'); return; }
    if (parsed.data.length > 200) { setError('Import up to 200 missions at a time. Split this file into smaller batches.'); return; }
    if (!parsed.meta.fields?.includes('Title')) { setError('Add a Title column. Other missing content can be completed in the wizard.'); return; }
    const rows = parsed.data.map((row, i) => normalizeImportRow(row, i + 2, catalog));
    rows.forEach((r, i) => { if (!r.importKey) r.importKey = `${filename}:row-${i + 2}`; });
    setDrafts(rows); setSource(filename); setSelected(0); setMode('queue');
  };
  const readFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') || file.size > 5 * 1024 * 1024) { setError('Choose a CSV file under 5 MB.'); return; }
    try { parse(await file.text(), file.name); } catch { setError('The file could not be read. Choose it again.'); }
  };
  const openMission = (index: number, requested?: TaskKind) => {
    setSelected(index); setTask(requested || importTasks(drafts[index], catalog)[0]?.kind || 'brief'); setMode('complete');
  };
  const next = () => {
    const remaining = importTasks(draft, catalog);
    if (remaining.some(t => t.kind === task)) { setError('Complete the highlighted items, or open review to save an incomplete draft.'); return; }
    if (remaining.length) { setTask(remaining[0].kind); setError(''); return; }
    const index = drafts.findIndex((d, i) => i !== selected && !d.skip && !d.result && importTasks(d, catalog).length);
    if (index >= 0) openMission(index); else setMode('review');
  };
  const chooseAudience = (field: 'programs' | 'grades' | 'groups' | 'students', value: string) => change(d => {
    const audience = d.mission.targetAudience || {};
    const current = audience[field] || [];
    return { ...d, questions: d.questions.filter(q => q.field !== field && (field !== 'programs' || !['grades', 'groups'].includes(q.field)) && (field !== 'grades' || q.field !== 'groups')), mission: { ...d.mission, targetAudience: { ...audience, [field]: current.includes(value) ? current.filter(v => v !== value) : [...current, value], ...(field === 'programs' ? { grades: [], groups: [] } : field === 'grades' ? { groups: [] } : {}) } } };
  });
  const applyRawCorrections = () => {
    const normalized = normalizeImportRow(rawEdits, draft.row, catalog);
    change(d => ({ ...normalized, importKey: normalized.importKey || d.importKey, skip: d.skip }));
    if (!normalized.errors.length) setError('');
  };
  const updatePhase = (id: string, field: keyof ProcessPhase, value: any) => change(d => ({ ...d, workflow: d.workflow ? { ...d.workflow, phases: d.workflow.phases.map(p => p.id === id ? { ...p, [field]: value } : p) } : undefined }));
  const useBuildCycle = () => change(d => ({ ...d, questions: d.questions.filter(q => q.field !== 'workflow'), assets: d.assets.filter(a => !d.workflow?.phases.some(p => p.id === a.phaseId && p.resources?.some(r => r.id === a.id))), workflow: { id: 'import-workflow', name: `${d.mission.title || 'Mission'} build cycle`, description: 'Understand, plan, build, test, and share.', version: 1, status: 'published', phases: ['Understand', 'Plan', 'Build', 'Test and improve', 'Share'].map((name, i) => normalizeWorkflowPhase({ id: `phase-${i + 1}`, name, color: 'blue', icon: 'Circle', order: i + 1, instructions: `Complete the ${name.toLowerCase()} phase and record what you learned.`, estimatedMinutes: 30, evidenceRequirements: [{ id: `proof-${i + 1}`, type: i === 3 ? 'video' : 'any', prompt: `Show your work from the ${name.toLowerCase()} phase.`, required: true }] }, i)) }, mission: { ...d.mission, defaultWorkflowId: 'import-workflow' } }));
  const setWorkflowChoice = (id: string) => change(d => ({ ...d, workflow: undefined, questions: d.questions.filter(q => q.field !== 'workflow'), assets: d.assets.filter(a => !d.workflow?.phases.some(p => p.id === a.phaseId && p.resources?.some(r => r.id === a.id))), mission: { ...d.mission, defaultWorkflowId: id } }));
  const uploadAssets = async (files: File[], explicit?: ImportAsset) => {
    if (!canOperate || busyRef.current) return;
    const index = selected, currentDraft = drafts[index];
    const pending = currentDraft.assets.filter(a => !a.url && !a.skipped);
    const matches: { file: File; asset: ImportAsset }[] = [];
    for (const file of files) {
      const candidates = explicit ? [explicit] : pending.filter(a => a.fileName.toLowerCase() === file.name.toLowerCase());
      if (candidates.length !== 1) { setError(`“${file.name}” has ${candidates.length ? 'multiple destinations' : 'no matching filename'}. Choose its individual file button.`); continue; }
      matches.push({ file, asset: candidates[0] });
    }
    if (!matches.length) return;
    busyRef.current = true; setBusy(true);
    try {
      for (const { file, asset } of matches) {
        if (activeSession.current !== session.current) throw new Error('Your session changed. Start the import again.');
        const mime = file.type;
        const valid = asset.type === 'cover' || asset.type === 'image' ? mime.startsWith('image/') : asset.type === 'video' ? /^(video|audio)\//.test(mime) : /^(image|video|audio)\//.test(mime) || ['application/pdf', 'text/plain'].includes(mime);
        if (!valid || file.size > (asset.type === 'cover' ? 5 : 20) * 1024 * 1024) throw new Error(`Choose a supported ${asset.type === 'cover' ? 'image under 5 MB' : 'resource under 20 MB'} for “${asset.title}”.`);
        const url = await uploadFile(file, `import-${currentDraft.importKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 70)}`, percent => setProgress(`${asset.title} · ${percent}%`));
        hasWrites.current = true;
        setDrafts(values => values.map((d, i) => i === index ? { ...d, assets: d.assets.map(a => a.id === asset.id && a.phaseId === asset.phaseId ? { ...a, url, skipped: false } : a) } : d));
      }
    } catch (e: any) { setError(e.message || 'Upload failed. Completed uploads are kept; try this file again.'); }
    finally { busyRef.current = false; setBusy(false); setProgress(''); }
  };
  const duplicateKeys = drafts.filter((d, i) => !d.skip && drafts.some((other, j) => j !== i && !other.skip && other.importKey.trim() === d.importKey.trim()));
  const eligible = drafts.filter(d => !d.skip && !d.result);
  const blocking = (d: ImportDraft) => { try { materializeImport(d, catalog); return ''; } catch (e: any) { return e.message; } };
  const save = async () => {
    if (!canOperate || busyRef.current || !eligible.length || duplicateKeys.length || eligible.some(d => blocking(d))) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      for (const item of eligible) {
        if (activeSession.current !== session.current) { setError('Your session changed. Completed drafts are kept; start a new import for the remaining rows.'); break; }
        setProgress(`Creating ${item.mission.title}…`);
        let result: NonNullable<ImportDraft['result']>;
        try { result = await saveMission(item, catalog, source); hasWrites.current = true; } catch (e: any) { result = { state: 'failed', message: e.message || 'Could not create this mission.' }; }
        setDrafts(values => values.map(d => d.row === item.row ? { ...d, result } : d));
      }
      setMode('report');
    } finally { busyRef.current = false; setBusy(false); setProgress(''); }
  };
  const publish = async (item: ImportDraft) => {
    if (!canOperate || busyRef.current || !item.result?.id) return;
    busyRef.current = true; setBusy(true); setError('');
    try { await assignMission(item.result.id); setAssigned(values => [...values, item.result!.id!]); hasWrites.current = true; }
    catch (e: any) { setError(e.message || 'Could not assign the mission.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const currentWorkflow = draft?.workflow || catalog.workflows.find(w => w.id === draft?.mission.defaultWorkflowId);
  const previewMission = draft ? (() => { try { return materializeImport(draft, catalog).mission; } catch { return draft.mission; } })() : undefined;
  const questionNotice = (fields: string[]) => draft.questions.filter(q => fields.includes(q.field)).map((q, i) => <p className="mi-notice" key={i}>Choose the correct {q.field} for “{q.value}”. Learners are resolved by record IDs.</p>);
  return <div className="mi-layer"><section className="mi-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panel}>
    <header className="mi-header"><div><p className="mi-eyebrow">Mission library / Import</p><h2 id={titleId}>Mission Autopilot</h2><p>Bring your CSV. Complete only what’s missing.</p></div><button className="mi-icon" aria-label="Close mission import" onClick={() => closeAction.current()} disabled={busy}><X size={22} /></button></header>
    <nav className="mi-stages" aria-label="Import progress">{['Upload', 'Complete', 'Review', 'Create'].map((name, i) => <span key={name} className={(mode === 'upload' ? 0 : ['queue', 'complete'].includes(mode) ? 1 : mode === 'review' ? 2 : 3) === i ? 'active' : ''}>{i + 1}<b>{name}</b></span>)}</nav>
    <div className="mi-body"><fieldset disabled={busy} className="mi-fieldset">
      {!canOperate && <p className="mi-error" role="alert">{sessionValid ? 'Your instructor session needs an organization before uploading or saving.' : 'Your account or organization changed. Close this import and start again.'}</p>}
      {error && <p className="mi-error" role="alert">{error}</p>}
      {mode === 'upload' && <div className="mi-upload-start">
        <label className="mi-dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void readFile(e.dataTransfer.files[0]); }}><Upload size={32} /><strong>Drop your mission CSV here</strong><span>One row per mission · up to 200 rows · CSV under 5 MB</span><input type="file" accept=".csv,text/csv" onChange={e => void readFile(e.target.files?.[0])} /></label>
        <div className="mi-template"><div><strong>Start with a ready-made example</strong><p>Includes a brief, deliverables, file requests, and two workflow phases using ordinary columns.</p></div><button onClick={() => download('sparkquest-missions-template.csv', [{ ...Object.fromEntries(importHeaders.map(h => [h, ''])), ...sampleImportRow }])}><Download size={17} /> Download CSV</button></div>
        <details><summary>Paste CSV or see the format</summary><Field label="CSV content" multiline value={paste} onChange={setPaste} placeholder="Title,Description,Station" /><button disabled={!paste.trim()} onClick={() => parse(paste, 'pasted-missions.csv')}>Read pasted CSV</button><p className="mi-hint">Lists use semicolons. Repeated objects can use JSON. Step_1_Name, Step_1_Instructions, Step_1_Checklist, Step_1_Minutes, Step_1_EvidenceType and Step_1_EvidencePrompt describe the first phase; repeat with Step_2_* and so on. ResourcesJSON accepts title, type, url or fileName. AudienceStudents accepts learner record IDs or verified linked UIDs.</p><p className="mi-hint">ImportKey prevents duplicates across files. Without it, the filename and row number become the key. URLs attach existing files; filenames create upload requests.</p></details>
      </div>}
      {mode === 'queue' && <>
        <div className="mi-heading"><div><h3>{drafts.length} mission{drafts.length === 1 ? '' : 's'} found</h3><p>{source} · Missions are prepared until you create drafts.</p></div><button className="mi-primary" onClick={() => { const index = drafts.findIndex(d => !d.skip && importTasks(d, catalog).length); index >= 0 ? openMission(index) : setMode('review'); }}>Complete missing items <ArrowRight size={17} /></button></div>
        <div className="mi-mission-list">{drafts.map((d, i) => <article key={d.row} className={d.skip ? 'is-skipped' : ''}><div className="mi-row-number">{i + 1}</div><div><strong>{d.mission.title || `Untitled mission · row ${d.row}`}</strong><p>{importTasks(d, catalog).map(t => t.label).join(' · ') || 'Ready to review'}</p><small>{d.importKey}</small></div><button onClick={() => openMission(i)}>Review <ArrowRight size={16} /></button><label className="mi-check"><input type="checkbox" checked={Boolean(d.skip)} onChange={e => setDrafts(values => values.map((v, index) => index === i ? { ...v, skip: e.target.checked } : v))} /> Skip</label></article>)}</div>
      </>}
      {mode === 'complete' && draft && <>
        <div className="mi-heading"><div><p className="mi-eyebrow">Mission {selected + 1} of {drafts.length}</p><h3>{draft.mission.title || 'Complete your mission'}</h3><p aria-live="polite">{tasks.length ? `${tasks.length} section${tasks.length === 1 ? ' needs' : 's need'} attention` : 'All sections complete. Ready to review.'}</p></div><select aria-label="Choose imported mission" value={selected} onChange={e => openMission(Number(e.target.value))}>{drafts.map((d, i) => <option value={i} key={d.row}>{i + 1}. {d.mission.title || 'Untitled'}</option>)}</select></div>
        <nav className="mi-task-tabs" aria-label="Mission sections">{(Object.keys(labels) as TaskKind[]).map(kind => <button key={kind} aria-current={task === kind ? 'step' : undefined} onClick={() => { setTask(kind); setError(''); }}><span className={tasks.some(t => t.kind === kind) ? 'mi-dot pending' : 'mi-dot'} />{labels[kind]}</button>)}</nav>
        {task === 'data' && <div className="mi-section">
          <Field label="Permanent import key" value={draft.importKey} onChange={value => change(d => ({ ...d, importKey: value }))} /><p className="mi-hint">Keep the same key when retrying. Use a different key to create a copy; existing missions are kept.</p>
          {questionNotice(['station'])}<label className="mi-field"><span>Station</span><select value={draft.mission.station} onChange={e => change(d => ({ ...d, questions: d.questions.filter(q => q.field !== 'station'), mission: { ...d.mission, station: e.target.value as any } }))}><option value="">Choose a station</option>{(catalog.stations.length ? catalog.stations : stationNames.map(name => ({ id: name, label: name }))).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <label className="mi-field"><span>Difficulty</span><select value={draft.mission.difficulty} onChange={e => change(d => ({ ...d, mission: { ...d.mission, difficulty: e.target.value as any }, errors: d.errors.filter(err => err.field !== 'Difficulty') }))}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
          <Field label="Duration" value={draft.mission.duration} onChange={v => missionField('duration', v)} /><label className="mi-field"><span>Due date (optional)</span><input type="date" value={draft.dueDate || ''} onChange={e => change(d => ({ ...d, dueDate: e.target.value || undefined, errors: d.errors.filter(err => err.field !== 'DueDate') }))} /></label>
          {draft.errors.length > 0 && <div className="mi-corrections"><h4>Correct these CSV cells</h4>{[...new Set(draft.errors.map(e => e.field))].map(field => <div key={field}><p className="mi-error">{draft.errors.filter(e => e.field === field).map(e => e.message).join(' ')}</p><Field multiline label={field} value={rawEdits[field] || ''} onChange={v => setRawEdits(values => ({ ...values, [field]: v }))} /></div>)}<button onClick={applyRawCorrections}>Re-read corrected row</button><p className="mi-hint">Re-reading replaces this row’s wizard edits with corrected CSV values. Complete corrections before other sections.</p></div>}
          {draft.warnings.map((w, i) => <p className="mi-notice" key={i}>{w}</p>)}
        </div>}
        {task === 'brief' && <div className="mi-section">
          <Field label="Mission title" value={draft.mission.title} onChange={v => missionField('title', v)} /><Field label="Short mission summary" multiline value={draft.mission.description} onChange={v => missionField('description', v)} /><Field label="Engagement hook" value={draft.mission.hook} onChange={v => missionField('hook', v)} />
          <Field label="What should learners achieve?" multiline value={draft.mission.missionBrief?.goal} onChange={v => briefField('goal', v)} /><Field label="Why does it matter?" multiline value={draft.mission.missionBrief?.whyItMatters} onChange={v => briefField('whyItMatters', v)} /><Field label="What finished result should exist?" multiline value={draft.mission.missionBrief?.finalOutcome} onChange={v => briefField('finalOutcome', v)} />
          <div className="mi-subheading"><h4>Deliverables</h4><button onClick={() => briefField('deliverables', [...(draft.mission.missionBrief?.deliverables || []), { id: crypto.randomUUID(), title: '', required: true, evidenceType: 'any' }])}><Plus size={16} /> Add</button></div>
          {(draft.mission.missionBrief?.deliverables || []).map((d, i) => { const update = (field: string, value: any) => briefField('deliverables', draft.mission.missionBrief!.deliverables!.map(item => item.id === d.id ? { ...item, [field]: value } : item)); return <div className="mi-card" key={d.id}><Field label={`Deliverable ${i + 1}`} value={d.title} onChange={v => update('title', v)} /><Field label="Description" value={d.description} onChange={v => update('description', v)} /><div className="mi-inline"><label className="mi-field"><span>Evidence type</span><select value={d.evidenceType} onChange={e => update('evidenceType', e.target.value)}>{evidenceTypes.map(type => <option key={type}>{type}</option>)}</select></label><label className="mi-check"><input type="checkbox" checked={d.required !== false} onChange={e => update('required', e.target.checked)} /> Required</label><button onClick={() => briefField('deliverables', draft.mission.missionBrief!.deliverables!.filter(item => item.id !== d.id))}>Remove</button></div></div>; })}
          {(['materials', 'prerequisites', 'safetyNotes'] as const).map(field => <Field key={field} multiline label={{ materials: 'Tools and materials · one per line', prerequisites: 'Before learners start · one per line', safetyNotes: 'Safety and constraints · one per line' }[field]} value={draft.mission.missionBrief?.[field]?.join('\n')} onChange={v => briefField(field, v.split('\n'))} />)}<Field label="Skills · separated by semicolons" value={draft.mission.skills.join(';')} onChange={v => missionField('skills', v.split(';'))} />
        </div>}
        {task === 'workflow' && <div className="mi-section">
          {questionNotice(['workflow'])}<label className="mi-field"><span>Use an existing workflow</span><select value={draft.workflow ? '' : draft.mission.defaultWorkflowId || ''} onChange={e => setWorkflowChoice(e.target.value)}><option value="">Choose a workflow</option>{catalog.workflows.map(w => <option key={w.id} value={w.id}>{w.name} · v{w.version || 1} · {w.phases.length} phases</option>)}</select></label><button onClick={useBuildCycle}>Prepare a custom maker build cycle</button>
          {draft.workflow && <><Field label="Custom workflow name" value={draft.workflow.name} onChange={v => change(d => ({ ...d, workflow: { ...d.workflow!, name: v } }))} /><Field label="Workflow description" value={draft.workflow.description} onChange={v => change(d => ({ ...d, workflow: { ...d.workflow!, description: v } }))} /><p className="mi-hint">This build map is saved as a reusable workflow. Review the instructions and proof prompts before assigning.</p></>}
          {currentWorkflow?.phases.map((p, i) => <details className="mi-card" key={p.id} open={draft.workflow ? undefined : true}><summary>{i + 1}. {p.name} · {p.estimatedMinutes || '—'} minutes</summary>{draft.workflow ? <>
            <Field label="Phase name" value={p.name} onChange={v => updatePhase(p.id, 'name', v)} /><Field label="Objective" value={p.objective} onChange={v => updatePhase(p.id, 'objective', v)} /><Field label="Description" value={p.description} onChange={v => updatePhase(p.id, 'description', v)} /><Field multiline label="Learner instructions" value={p.instructions} onChange={v => updatePhase(p.id, 'instructions', v)} />
            {(['checklist', 'tools', 'materials', 'safetyNotes'] as const).map(field => <Field key={field} multiline label={`${field === 'safetyNotes' ? 'Safety notes' : field} · one per line`} value={p[field]?.join('\n')} onChange={v => updatePhase(p.id, field, v.split('\n'))} />)}<label className="mi-field"><span>Estimated minutes</span><input type="number" min="1" value={p.estimatedMinutes || ''} onChange={e => updatePhase(p.id, 'estimatedMinutes', Number(e.target.value))} /></label><label className="mi-check"><input type="checkbox" checked={p.required !== false} onChange={e => updatePhase(p.id, 'required', e.target.checked)} /> Required phase</label>
            {(p.evidenceRequirements || []).map(r => { const update = (field: string, value: any) => updatePhase(p.id, 'evidenceRequirements', p.evidenceRequirements!.map(item => item.id === r.id ? { ...item, [field]: value } : item)); return <div className="mi-card" key={r.id}><Field label="Evidence prompt" value={r.prompt} onChange={v => update('prompt', v)} /><label className="mi-field"><span>Evidence type</span><select value={r.type} onChange={e => update('type', e.target.value)}>{evidenceTypes.map(t => <option key={t}>{t}</option>)}</select></label><label className="mi-check"><input type="checkbox" checked={r.required !== false} onChange={e => update('required', e.target.checked)} /> Required proof</label><button onClick={() => updatePhase(p.id, 'evidenceRequirements', p.evidenceRequirements!.filter(item => item.id !== r.id))}>Remove proof</button></div>; })}<button onClick={() => updatePhase(p.id, 'evidenceRequirements', [...(p.evidenceRequirements || []), { id: crypto.randomUUID(), type: 'any', prompt: '', required: true }])}>Add evidence prompt</button>
          </> : <><p>{p.objective || p.description}</p><p>{p.instructions}</p>{p.evidenceRequirements?.map(r => <p key={r.id}>Proof: {r.prompt} ({r.type})</p>)}</>}{p.resources?.map(r => <p key={r.id}>{r.title} · {r.url ? 'Attached' : 'Upload requested'}</p>)}</details>)}
          {draft.workflow && <button onClick={() => change(d => ({ ...d, workflow: { ...d.workflow!, phases: [...d.workflow!.phases, normalizeWorkflowPhase({ id: crypto.randomUUID(), name: 'New phase', estimatedMinutes: 30, color: 'blue', icon: 'Circle', order: d.workflow!.phases.length + 1 }, d.workflow!.phases.length)] } }))}><Plus size={16} /> Add phase</button>}
          {Object.keys(draft.mission.stepResources || {}).filter(id => !currentWorkflow?.phases.some(p => p.id === id)).map(id => <label className="mi-field" key={id}><span>Resources for unknown phase “{id}”</span><select value="" onChange={e => { const destination = e.target.value; change(d => { const stepResources = { ...d.mission.stepResources }; stepResources[destination] = [...(stepResources[destination] || []), ...stepResources[id]]; delete stepResources[id]; return { ...d, assets: d.assets.map(a => a.phaseId === id ? { ...a, phaseId: destination } : a), mission: { ...d.mission, stepResources } }; }); }}><option value="">Choose the matching phase</option>{currentWorkflow?.phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>)}
        </div>}
        {task === 'audience' && <div className="mi-section">
          {questionNotice(['programs', 'grades', 'groups', 'students'])}<p className="mi-hint">Choose an audience before assignment. Direct learner selections take priority over program and grade filters.</p>
          {(['programs', 'grades', 'groups', 'students'] as const).map(field => {
            const audience = draft.mission.targetAudience || {};
            const choices = uniqueChoices(catalog[field].filter(c => field === 'grades' ? !audience.programs?.length || audience.programs.includes(c.programId || '') : field === 'groups' ? (!audience.programs?.length || audience.programs.includes(c.programId || '')) && (!audience.grades?.length || audience.grades.includes(c.gradeId || '')) : true));
            return <div key={field}><div className="mi-subheading"><h4>{field === 'students' ? 'Specific learners' : field}</h4><button onClick={() => change(d => ({ ...d, questions: d.questions.filter(q => q.field !== field), mission: { ...d.mission, targetAudience: { ...d.mission.targetAudience, [field]: [], ...(field === 'programs' ? { grades: [], groups: [] } : field === 'grades' ? { groups: [] } : {}) } } }))}>Clear / leave empty</button></div>{field === 'students' && <Field label="Search learners by name or record ID" value={audienceSearch} onChange={setAudienceSearch} />}<div className="mi-choice-list">{choices.filter(c => field !== 'students' || `${c.label} ${c.id}`.toLowerCase().includes(audienceSearch.toLowerCase())).map(c => <label className="mi-choice" key={c.id}><input type="checkbox" checked={audience[field]?.includes(c.id) || false} onChange={() => chooseAudience(field, c.id)} /><span>{c.label}<small>{field === 'students' ? c.id : catalog.programs.find(p => p.id === c.programId)?.label}</small></span></label>)}{!choices.length && <p className="mi-hint">No {field} available in this organization.</p>}</div></div>;
          })}
        </div>}
        {task === 'uploads' && <div className="mi-section">
          <p className="mi-hint">Drop files with the filenames requested in your CSV, or choose each file below. A cover is optional unless your CSV requests one.</p><label className="mi-dropzone small" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy) void uploadAssets(Array.from(e.dataTransfer.files)); }}><Upload size={24} /><strong>Match files by filename</strong><input type="file" multiple disabled={!canOperate} onChange={e => void uploadAssets(Array.from(e.target.files || []))} /></label>
          {!draft.assets.some(a => a.type === 'cover') && <button onClick={() => change(d => ({ ...d, assets: [...d.assets, { id: 'cover', title: 'Cover image', fileName: 'Choose an image', type: 'cover' }] }))}><Plus size={16} /> Add cover image</button>}
          {draft.assets.map(a => <article className="mi-file-row" key={`${a.phaseId || ''}/${a.id}`}><div><strong>{a.title}</strong><p>{a.fileName}{a.phaseId ? ` · phase ${a.phaseId}` : ''}</p><small>{a.url ? 'Attached' : a.skipped ? 'Removed from this import' : 'File needed'}</small></div><label className="mi-file-button">{a.url ? 'Replace file' : 'Choose file'}<input type="file" disabled={!canOperate} accept={a.type === 'cover' || a.type === 'image' ? 'image/*' : a.type === 'video' ? 'video/*,audio/*' : 'image/*,video/*,audio/*,.pdf,.txt'} onChange={e => { const file = e.target.files?.[0]; if (file) void uploadAssets([file], a); }} /></label><button onClick={() => change(d => ({ ...d, assets: d.assets.map(item => item.id === a.id && item.phaseId === a.phaseId ? { ...item, skipped: !item.skipped, url: undefined } : item) }))}>{a.skipped ? 'Restore request' : 'Remove request'}</button></article>)}
          <Field label="Use an existing cover image URL" value={draft.mission.thumbnailUrl} onChange={v => missionField('thumbnailUrl', v)} /><button disabled={!safeUrl(draft.mission.thumbnailUrl || '')} onClick={() => change(d => ({ ...d, assets: d.assets.map(a => a.type === 'cover' ? { ...a, url: d.mission.thumbnailUrl, skipped: false } : a), errors: d.errors.filter(e => e.field !== 'CoverImage') }))}>Use cover URL</button>
          <div className="mi-subheading"><h4>Mission resources</h4><button onClick={() => change(d => { const id = crypto.randomUUID(); return { ...d, mission: { ...d.mission, resources: [...(d.mission.resources || []), { id, title: 'New resource', type: 'file', url: '' }] }, assets: [...d.assets, { id, title: 'New resource', fileName: 'Choose a file', type: 'file' }] }; })}>Add file resource</button></div>
          {draft.mission.resources?.map(r => <div className="mi-card" key={r.id}><Field label="Resource title" value={r.title} onChange={v => change(d => ({ ...d, mission: { ...d.mission, resources: d.mission.resources!.map(item => item.id === r.id ? { ...item, title: v } : item) }, assets: d.assets.map(a => a.id === r.id && !a.phaseId ? { ...a, title: v } : a) }))} /><Field label="Resource URL (or upload its file above)" value={r.url} onChange={v => change(d => ({ ...d, mission: { ...d.mission, resources: d.mission.resources!.map(item => item.id === r.id ? { ...item, url: v } : item) } }))} /><button disabled={!safeUrl(r.url)} onClick={() => change(d => ({ ...d, assets: d.assets.map(a => a.id === r.id && !a.phaseId ? { ...a, url: r.url, skipped: false } : a) }))}>Use resource URL</button></div>)}
        </div>}
      </>}
      {mode === 'review' && <>
        <div className="mi-heading"><div><h3>Review before creating drafts</h3><p>Drafts stay hidden from learners. Assign complete missions after creation.</p></div></div>{!!duplicateKeys.length && <p className="mi-error">Repeated keys: {Array.from(new Set(duplicateKeys.map(d => d.importKey))).join(', ')}. Change the key or skip the duplicate row.</p>}
        {eligible.map(d => { const i = drafts.indexOf(d), issue = blocking(d); return <article className="mi-review-card" key={d.row}><div className="mi-heading"><div><h4>{d.mission.title || 'Untitled mission'}</h4><p>{d.mission.station} · {d.mission.difficulty} · {d.mission.duration || 'Duration not set'}</p><small>{d.importKey}</small></div><button onClick={() => { setSelected(i); setPreview(true); }}><Eye size={17} /> Learner preview</button></div><p>{d.mission.description}</p><dl><div><dt>Final outcome</dt><dd>{d.mission.missionBrief?.finalOutcome || d.mission.missionBrief?.deliverables?.[0]?.title || 'Not set'}</dd></div><div><dt>Workflow</dt><dd>{d.workflow?.name || catalog.workflows.find(w => w.id === d.mission.defaultWorkflowId)?.name || 'Not set'}</dd></div><div><dt>Audience</dt><dd>{Object.entries(d.mission.targetAudience || {}).filter(([, values]) => values?.length).map(([field, values]) => `${values.length} ${field}`).join(' · ') || 'Not selected'}</dd></div></dl>{issue ? <p className="mi-error">{issue}</p> : !getMissionReadiness(d.mission).publishReady ? <p className="mi-notice">Can be saved as an incomplete draft. Complete the brief, workflow, and audience before assigning.</p> : <p className="mi-success"><Check size={16} /> Ready to create</p>}<button onClick={() => openMission(i)}>Edit / complete mission</button></article>; })}
      </>}
      {mode === 'report' && <>
        <div className="mi-heading"><div><h3>Import results</h3><p>{drafts.filter(d => d.result?.state === 'created').length} created · {drafts.filter(d => d.result?.state === 'exists').length} already existed · {drafts.filter(d => d.result?.state === 'failed').length} failed · {drafts.filter(d => d.skip).length} skipped</p></div><button onClick={() => download('sparkquest-import-report.csv', drafts.map(d => ({ Row: d.row, ImportKey: d.importKey, Title: d.mission.title, Result: d.skip ? 'skipped' : d.result?.state, MissionId: d.result?.id || '', Message: d.result?.message || '' })))}><Download size={17} /> Download report</button></div>
        {drafts.filter(d => d.result).map(d => <article className="mi-review-card" key={d.row}><h4>{d.mission.title}</h4><p className={d.result?.state === 'failed' ? 'mi-error' : 'mi-success'}>{d.result?.message}</p>{d.result?.state === 'created' && getMissionReadiness(d.mission).publishReady && <button className="mi-primary" disabled={!canOperate || assigned.includes(d.result.id!)} onClick={() => void publish(d)}>{assigned.includes(d.result.id!) ? 'Assigned to selected learners' : 'Assign to selected audience'}</button>}{d.result?.state === 'failed' && <button onClick={() => { setDrafts(values => values.map(item => item.row === d.row ? { ...item, result: undefined } : item)); openMission(drafts.indexOf(d)); }}>Review and retry</button>}</article>)}
      </>}
    </fieldset></div>
    <footer className="mi-footer"><div aria-live="polite">{busy ? <><Loader2 size={18} className="mi-spin" /> {progress || 'Working…'}</> : mode === 'upload' ? 'Start with any amount of mission content.' : 'Files are stored when attached. Missions are saved when you create drafts.'}</div><div className="mi-footer-actions">{mode !== 'upload' && <button disabled={busy} onClick={() => setMode(mode === 'report' ? 'review' : 'queue')}><ArrowLeft size={16} /> {mode === 'report' ? 'Review remaining' : 'Mission list'}</button>}{mode === 'queue' && <button className="mi-primary" onClick={() => setMode('review')}>Review drafts <ArrowRight size={16} /></button>}{mode === 'complete' && <><button disabled={busy} onClick={() => setMode('review')}>Review drafts</button><button className="mi-primary" disabled={busy} onClick={next}>Continue <ArrowRight size={16} /></button></>}{mode === 'review' && <button className="mi-primary" disabled={busy || !canOperate || !eligible.length || !!duplicateKeys.length || eligible.some(d => blocking(d))} onClick={() => void save()}>Create {eligible.length} draft{eligible.length === 1 ? '' : 's'}</button>}{mode === 'report' && <button className="mi-primary" disabled={busy} onClick={() => closeAction.current()}>Done</button>}</div></footer>
    {preview && draft && previewMission && <div className="mi-preview"><StudentMissionDetails project={{ ...previewMission, id: 'import-preview' }} workflow={currentWorkflow} onBack={() => setPreview(false)} /></div>}
    {confirmClose && <div className="mi-confirm"><div role="alertdialog" aria-labelledby={`${titleId}-close`}><h3 id={`${titleId}-close`}>Leave this import?</h3><p>Unsaved mission details will be lost. Drafts already created and files already uploaded are kept.</p><button onClick={() => setConfirmClose(false)}>Keep working</button><button className="mi-primary" onClick={finish}>Leave import</button></div></div>}
  </section></div>;
};
