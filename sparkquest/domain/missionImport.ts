import type { MissionEvidenceType, ProcessPhase, ProcessTemplate, ProjectTemplate, Resource } from '../types.ts';
import { normalizeWorkflowPhase } from './workflowPipeline.ts';
import { getMissionReadiness, normalizeMissionBrief } from './missionContent.ts';

export const importHeaders = ['ImportKey', 'Title', 'Description', 'Hook', 'Station', 'Difficulty', 'Duration', 'CoverImage', 'CoverFile', 'Skills', 'Technologies', 'Goal', 'WhyItMatters', 'FinalOutcome', 'Materials', 'Prerequisites', 'SafetyNotes', 'Deliverables', 'DeliverablesJSON', 'LearningOutcomesJSON', 'ResourcesJSON', 'StepResourcesJSON', 'WorkflowId', 'WorkflowName', 'WorkflowDescription', 'WorkflowPhasesJSON', 'DefaultSteps', 'AudiencePrograms', 'AudienceGrades', 'AudienceGroups', 'AudienceStudents', 'DueDate', 'Status', 'RealWorld_Title', 'RealWorld_Description', 'RealWorld_Companies', ...[1, 2, 3].flatMap(n => [`Challenge_${n}_Title`, `Challenge_${n}_Desc`, `Outcome_${n}_Title`, `Outcome_${n}_Desc`])];
export const evidenceTypes: MissionEvidenceType[] = ['image', 'video', 'document', 'link', 'text', 'any'];
export const stationNames = ['Robotics', 'Coding', 'Design', 'Circuits', 'Engineering', 'Game Design', 'Multimedia', 'Branding'];
export const splitList = (value: string = '') => [...new Set(value.split(/[;\n]/).map(v => v.trim()).filter(Boolean))];
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const key = (value: unknown) => text(value).toLocaleLowerCase();
const object = (v: unknown): v is Record<string, any> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
export const safeUrl = (value: string) => { try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; } };

export interface ImportReference { id: string; label: string; aliases?: string[]; programId?: string; gradeId?: string }
export interface ImportCatalog {
  stations: ImportReference[];
  workflows: ProcessTemplate[];
  programs: ImportReference[];
  grades: ImportReference[];
  groups: ImportReference[];
  students: ImportReference[];
}
export interface ReferenceQuestion { field: 'station' | 'workflow' | 'programs' | 'grades' | 'groups' | 'students'; value: string; label: string }
export interface ImportAsset { id: string; title: string; fileName: string; type: Resource['type'] | 'cover'; phaseId?: string; url?: string; skipped?: boolean }
export interface ImportDraft {
  row: number;
  raw: Record<string, string>;
  importKey: string;
  mission: Omit<ProjectTemplate, 'id'>;
  workflow?: ProcessTemplate;
  questions: ReferenceQuestion[];
  assets: ImportAsset[];
  errors: { field: string; message: string }[];
  warnings: string[];
  dueDate?: string;
  skip?: boolean;
  result?: { id?: string; state: 'created' | 'exists' | 'failed'; message?: string };
}

export const resolveReference = (value: string, choices: ImportReference[], idsOnly = false) => {
  const exact = choices.filter(c => c.id === value || c.aliases?.includes(value));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1 || idsOnly) return undefined;
  const matches = choices.filter(c => key(c.label) === key(value));
  return matches.length === 1 ? matches[0] : undefined;
};

/** Only explicitly supported properties cross from CSV to application data. */
export const normalizeImportRow = (rawInput: Record<string, string>, row: number, catalog: ImportCatalog): ImportDraft => {
  const raw = Object.fromEntries(Object.entries(rawInput).map(([k, v]) => [k.trim(), text(v)]));
  const errors: ImportDraft['errors'] = [];
  const warnings: string[] = [];
  const questions: ReferenceQuestion[] = [];
  const assets: ImportAsset[] = [];
  const error = (field: string, message: string) => errors.push({ field, message });
  const json = (field: string, fallback: any) => {
    if (!raw[field]) return fallback;
    try { return JSON.parse(raw[field]); } catch { error(field, 'Use valid JSON, or clear this cell to complete it in the wizard.'); return fallback; }
  };
  const array = (field: string): any[] => { const v = json(field, []); if (!Array.isArray(v)) { error(field, 'Expected a JSON array.'); return []; } return v; };
  const list = (value: any, field: string) => { if (value === undefined) return []; if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) { error(field, 'Expected a list of strings.'); return []; } return value.map(text).filter(Boolean); };
  const required = (value: any, field: string) => { if (value !== undefined && typeof value !== 'boolean') error(field, 'Required must be true or false.'); return value !== false; };
  const evidence = (value: any, field: string): MissionEvidenceType => { if (value !== undefined && !evidenceTypes.includes(value)) error(field, 'Evidence type must be image, video, document, link, text, or any.'); return evidenceTypes.includes(value) ? value : 'any'; };
  const resource = (v: any, index: number, field: string, phaseId?: string): Resource | undefined => {
    if (!object(v) || !text(v.title)) { error(field, `Resource ${index + 1} needs a title.`); return; }
    const id = text(v.id) || `${phaseId || 'mission'}-resource-${index + 1}`;
    const type = ['video', 'link', 'file', 'image'].includes(v.type) ? v.type : 'file';
    if (v.type && !['video', 'link', 'file', 'image'].includes(v.type)) error(field, 'Resource type must be video, link, file, or image.');
    const url = text(v.url);
    if (url && !safeUrl(url)) error(field, 'Resource URLs must start with http:// or https://.');
    if (!url) assets.push({ id, title: text(v.title), type, fileName: text(v.fileName) || text(v.title), phaseId });
    return { id, title: text(v.title), type, url };
  };
  const resources = (values: any, field: string, phaseId?: string): Resource[] => {
    if (!Array.isArray(values)) { error(field, 'Expected a resource array.'); return []; }
    return values.map((v, i) => resource(v, i, field, phaseId)).filter(Boolean) as Resource[];
  };
  const reference = (value: string, choices: ImportReference[], field: ReferenceQuestion['field'], label: string, idsOnly = false) => {
    const match = resolveReference(value, choices, idsOnly);
    if (match) return match.id;
    questions.push({ field, value, label });
    return '';
  };
  const stationValue = raw.Station || '';
  const stationChoices = catalog.stations.length ? catalog.stations : stationNames.map(name => ({ id: name, label: name }));
  const station = stationValue ? reference(stationValue, stationChoices, 'station', 'Station') : '';
  const difficulty = key(raw.Difficulty) || 'intermediate';
  if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) error('Difficulty', 'Choose beginner, intermediate, or advanced.');
  let cover = raw.CoverImage || raw.ThumbnailUrl || raw.Image || '';
  if (cover && !safeUrl(cover)) { error('CoverImage', 'Use an image URL; put a filename in CoverFile.'); cover = ''; }
  if (!cover && raw.CoverFile) assets.push({ id: 'cover', title: 'Cover image', fileName: raw.CoverFile, type: 'cover' });

  const deliverables = raw.DeliverablesJSON ? array('DeliverablesJSON').map((v, i) => {
    if (!object(v) || !text(v.title)) { error('DeliverablesJSON', `Deliverable ${i + 1} needs a title.`); return; }
    return { id: text(v.id) || `deliverable-${i + 1}`, title: text(v.title), description: text(v.description), required: required(v.required, 'DeliverablesJSON'), evidenceType: evidence(v.evidenceType, 'DeliverablesJSON') };
  }).filter(Boolean) : splitList(raw.Deliverables).map((title, i) => ({ id: `deliverable-${i + 1}`, title, required: true, evidenceType: 'any' as const }));
  const outcomes = raw.LearningOutcomesJSON ? array('LearningOutcomesJSON').map((v, i) => {
    if (!object(v) || !text(v.title)) { error('LearningOutcomesJSON', `Outcome ${i + 1} needs a title.`); return; }
    return { id: text(v.id) || `outcome-${i + 1}`, title: text(v.title), desc: text(v.desc || v.description), theme: text(v.theme) || 'blue' };
  }).filter(Boolean) : [1, 2, 3].filter(n => raw[`Outcome_${n}_Title`]).map(n => ({ id: n, title: raw[`Outcome_${n}_Title`], desc: raw[`Outcome_${n}_Desc`] || '', theme: 'blue' }));
  const globalResources = resources(array('ResourcesJSON'), 'ResourcesJSON');
  const stepValue = json('StepResourcesJSON', {});
  const stepResources: Record<string, Resource[]> = {};
  if (!object(stepValue)) error('StepResourcesJSON', 'Expected an object keyed by phase ID.');
  else Object.entries(stepValue).forEach(([id, values]) => { if (['__proto__', 'constructor', 'prototype'].includes(id)) error('StepResourcesJSON', 'Choose a different phase ID.'); else stepResources[id] = resources(values, 'StepResourcesJSON', id); });

  let phases = array('WorkflowPhasesJSON');
  // Friendly spreadsheet columns can describe phases without JSON.
  if (!raw.WorkflowPhasesJSON) {
    const numbers = [...new Set(Object.keys(raw).map(k => /^Step_(\d+)_Name$/.exec(k)?.[1]).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
    phases = numbers.filter(n => raw[`Step_${n}_Name`]).map(n => ({ id: raw[`Step_${n}_Id`] || `phase-${n}`, name: raw[`Step_${n}_Name`], objective: raw[`Step_${n}_Objective`], instructions: raw[`Step_${n}_Instructions`], checklist: splitList(raw[`Step_${n}_Checklist`]), tools: splitList(raw[`Step_${n}_Tools`]), materials: splitList(raw[`Step_${n}_Materials`]), safetyNotes: splitList(raw[`Step_${n}_SafetyNotes`]), estimatedMinutes: raw[`Step_${n}_Minutes`] ? Number(raw[`Step_${n}_Minutes`]) : undefined, evidenceRequirements: raw[`Step_${n}_EvidencePrompt`] ? [{ type: raw[`Step_${n}_EvidenceType`] || 'any', prompt: raw[`Step_${n}_EvidencePrompt`], required: true }] : [], resources: [] }));
  }
  let workflow: ProcessTemplate | undefined;
  let workflowId = '';
  if (phases.length) {
    const ids = new Set<string>();
    const normalizedPhases = phases.map((v, i): ProcessPhase => {
      if (!object(v)) { error('WorkflowPhasesJSON', `Phase ${i + 1} must be an object.`); v = {}; }
      if (!text(v.name)) error('WorkflowPhasesJSON', `Phase ${i + 1} needs a name.`);
      const id = text(v.id) || `phase-${i + 1}`;
      if (['__proto__', 'constructor', 'prototype'].includes(id)) error('WorkflowPhasesJSON', 'Choose a different phase ID.');
      if (ids.has(id)) error('WorkflowPhasesJSON', `Duplicate phase ID: ${id}.`);
      ids.add(id);
      if (v.estimatedMinutes !== undefined && (!Number.isFinite(Number(v.estimatedMinutes)) || Number(v.estimatedMinutes) <= 0)) error('WorkflowPhasesJSON', 'Phase minutes must be a positive number.');
      let requirements = v.evidenceRequirements || [];
      if (!Array.isArray(requirements)) { error('WorkflowPhasesJSON', 'Evidence requirements must be an array.'); requirements = []; }
      return normalizeWorkflowPhase({ id, name: text(v.name), color: text(v.color) || 'blue', icon: text(v.icon) || 'Circle', order: i + 1, description: text(v.description), objective: text(v.objective), instructions: text(v.instructions), checklist: list(v.checklist, 'WorkflowPhasesJSON'), tools: list(v.tools, 'WorkflowPhasesJSON'), materials: list(v.materials, 'WorkflowPhasesJSON'), safetyNotes: list(v.safetyNotes, 'WorkflowPhasesJSON'), estimatedMinutes: Number(v.estimatedMinutes) || undefined, required: required(v.required, 'WorkflowPhasesJSON'), evidenceRequirements: requirements.map((r: any, j: number) => {
        if (!object(r) || !text(r.prompt)) { error('WorkflowPhasesJSON', 'Every evidence requirement needs a prompt.'); r = {}; }
        return { id: text(r.id) || `${id}-proof-${j + 1}`, type: evidence(r.type, 'WorkflowPhasesJSON'), prompt: text(r.prompt), required: required(r.required, 'WorkflowPhasesJSON') };
      }), resources: resources(v.resources || [], 'WorkflowPhasesJSON', id) }, i);
    });
    workflow = { id: 'import-workflow', name: raw.WorkflowName || `${raw.Title || 'Mission'} build map`, description: raw.WorkflowDescription || '', phases: normalizedPhases, version: 1, status: 'published' };
    workflowId = workflow.id;
  } else if (raw.WorkflowId || raw.WorkflowName) workflowId = reference(raw.WorkflowId || raw.WorkflowName, catalog.workflows.map(w => ({ id: w.id, label: w.name })), 'workflow', 'Workflow');
  else if (splitList(raw.DefaultSteps).length) {
    workflow = { id: 'import-workflow', name: `${raw.Title || 'Mission'} build map`, description: '', phases: splitList(raw.DefaultSteps).map((name, i) => normalizeWorkflowPhase({ id: `phase-${i + 1}`, name, color: 'blue', icon: 'Circle', order: i + 1 }, i)), version: 1, status: 'published' };
    workflowId = workflow.id;
  }
  const audience = { programs: [] as string[], grades: [] as string[], groups: [] as string[], students: [] as string[] };
  const resolveList = (column: string, field: keyof typeof audience, choices: ImportReference[], idsOnly = false) => splitList(raw[column]).forEach(value => { const id = reference(value, choices, field, column, idsOnly); if (id) audience[field].push(id); });
  resolveList('AudiencePrograms', 'programs', catalog.programs);
  const grades = catalog.grades.filter(g => !audience.programs.length || audience.programs.includes(g.programId || ''));
  resolveList('AudienceGrades', 'grades', grades);
  const groups = catalog.groups.filter(g => (!audience.programs.length || audience.programs.includes(g.programId || '')) && (!audience.grades.length || audience.grades.includes(g.gradeId || '')));
  resolveList('AudienceGroups', 'groups', groups);
  resolveList('AudienceStudents', 'students', catalog.students, true);
  if (raw.Status && raw.Status !== 'draft') warnings.push('Imported as a draft. Publishing is a separate review action.');
  if (!raw.ImportKey) warnings.push('Add a permanent import key to keep this mission recognizable across different files.');
  let dueDate: string | undefined;
  if (raw.DueDate) {
    const date = new Date(`${raw.DueDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.DueDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== raw.DueDate) error('DueDate', 'Use a valid YYYY-MM-DD date.');
    else dueDate = raw.DueDate;
  }
  const known = new Set([...importHeaders, 'ThumbnailUrl', 'Image']);
  Object.keys(raw).filter(k => !known.has(k) && !/^Step_\d+_(Name|Id|Objective|Instructions|Checklist|Tools|Materials|SafetyNotes|Minutes|EvidenceType|EvidencePrompt)$/.test(k)).forEach(k => warnings.push(`Column “${k}” is not supported and will be ignored.`));
  const resourceIds = new Set<string>();
  const checkResourceIds = (values: Resource[], field: string, phaseId = '') => values.forEach(r => {
    const identifier = `${phaseId}/${r.id}`;
    if ((!phaseId && r.id === 'cover') || resourceIds.has(identifier)) error(field, 'Resource IDs must be unique within each phase; “cover” is reserved for the cover image.');
    resourceIds.add(identifier);
  });
  checkResourceIds(globalResources, 'ResourcesJSON');
  Object.entries(stepResources).forEach(([id, values]) => checkResourceIds(values, 'StepResourcesJSON', id));
  workflow?.phases.forEach(p => checkResourceIds(p.resources || [], 'WorkflowPhasesJSON', p.id));
  return { row, raw, importKey: raw.ImportKey, errors, questions, warnings, assets, workflow, dueDate, mission: {
    title: raw.Title || '', description: raw.Description || '', hook: raw.Hook || '', station: station as ProjectTemplate['station'], difficulty: difficulty as ProjectTemplate['difficulty'], duration: raw.Duration || '', thumbnailUrl: cover,
    skills: splitList(raw.Skills), technologies: (raw.Technologies || '').split(/[;,]/).map(text).filter(Boolean).map(name => ({ name, icon: 'PenTool' })), defaultWorkflowId: workflowId, status: 'draft', targetAudience: audience,
    missionBrief: { goal: raw.Goal || raw.Description || '', whyItMatters: raw.WhyItMatters || raw.Hook || '', finalOutcome: raw.FinalOutcome || '', materials: splitList(raw.Materials), prerequisites: splitList(raw.Prerequisites), safetyNotes: splitList(raw.SafetyNotes), deliverables: deliverables as NonNullable<ProjectTemplate['missionBrief']>['deliverables'] },
    learningOutcomes: outcomes as ProjectTemplate['learningOutcomes'], resources: globalResources, stepResources,
    realWorldApp: { title: raw.RealWorld_Title || '', description: raw.RealWorld_Description || '', companies: (raw.RealWorld_Companies || '').split(/[;,]/).map(text).filter(Boolean).map(name => ({ name })) },
    keyChallenges: [1, 2, 3].filter(n => raw[`Challenge_${n}_Title`]).map(n => ({ title: raw[`Challenge_${n}_Title`], desc: raw[`Challenge_${n}_Desc`] || '' })),
  } };
};

export const importTasks = (draft: ImportDraft, catalog: ImportCatalog) => {
  const tasks: { kind: 'data' | 'brief' | 'workflow' | 'audience' | 'uploads'; label: string }[] = [];
  if (draft.errors.length || draft.questions.some(q => q.field === 'station') || !draft.mission.station || !draft.importKey.trim()) tasks.push({ kind: 'data', label: 'Mission identity and CSV corrections' });
  const checks = getMissionReadiness(draft.mission).checks;
  if (checks.some(c => ['title', 'goal', 'outcome'].includes(c.id) && !c.complete) || draft.mission.missionBrief?.deliverables?.some(d => !d.title.trim())) tasks.push({ kind: 'brief', label: 'Goal and finished result' });
  const workflow = draft.workflow || catalog.workflows.find(w => w.id === draft.mission.defaultWorkflowId);
  if (!workflow?.phases.length || draft.questions.some(q => q.field === 'workflow') || workflowValidation(workflow)) tasks.push({ kind: 'workflow', label: 'Choose or build the learner workflow' });
  if (!checks.find(c => c.id === 'audience')?.complete || draft.questions.some(q => ['programs', 'grades', 'groups', 'students'].includes(q.field))) tasks.push({ kind: 'audience', label: 'Confirm the learner audience' });
  if (draft.assets.some(a => !a.url && !a.skipped)) tasks.push({ kind: 'uploads', label: 'Upload requested files' });
  if (Object.keys(draft.mission.stepResources || {}).some(id => !workflow?.phases.some(p => p.id === id)) || draft.assets.some(a => a.phaseId && !workflow?.phases.some(p => p.id === a.phaseId))) {
    if (!tasks.some(t => t.kind === 'workflow')) tasks.push({ kind: 'workflow', label: 'Match resource phase IDs to the workflow' });
  }
  return tasks;
};

const workflowValidation = (workflow?: ProcessTemplate) => {
  if (!workflow) return '';
  if (!workflow.name.trim() || !workflow.phases.length) return 'Give the workflow a name and at least one phase.';
  if (new Set(workflow.phases.map(p => p.id)).size !== workflow.phases.length) return 'Workflow phase IDs must be unique.';
  for (const phase of workflow.phases) {
    if (!phase.name.trim()) return 'Every workflow phase needs a name.';
    if (phase.estimatedMinutes !== undefined && (!Number.isFinite(phase.estimatedMinutes) || phase.estimatedMinutes <= 0)) return 'Phase minutes must be positive.';
    if (phase.evidenceRequirements?.some(r => !r.prompt.trim() || !evidenceTypes.includes(r.type))) return 'Complete every evidence prompt and choose a valid proof type.';
  }
  return '';
};

export const materializeImport = (draft: ImportDraft, catalog: ImportCatalog) => {
  if (draft.errors.length || draft.questions.length) throw new Error('Resolve CSV errors and references before saving.');
  if (!draft.mission.title.trim() || !draft.mission.station || !draft.importKey.trim()) throw new Error('Add a title, station, and import key before saving.');
  if (!['beginner', 'intermediate', 'advanced'].includes(draft.mission.difficulty)) throw new Error('Choose a valid difficulty.');
  if (draft.mission.missionBrief?.deliverables?.some(d => !d.title.trim() || (d.evidenceType && !evidenceTypes.includes(d.evidenceType)))) throw new Error('Give each deliverable a title and a valid evidence type, or remove it.');
  if (draft.dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate) || !Number.isFinite(new Date(draft.dueDate).getTime()))) throw new Error('Choose a valid due date.');
  if (draft.assets.some(a => !a.url && !a.skipped)) throw new Error('Upload or explicitly remove every requested file.');
  const bindAsset = (r: Resource, phaseId?: string) => { const asset = draft.assets.find(a => a.id === r.id && a.phaseId === phaseId); return { ...r, url: asset?.skipped ? '' : asset?.url || r.url }; };
  const applyAssets = (values: Resource[] = []) => values.map(r => bindAsset(r)).filter(r => Boolean(r.url));
  const mission = { ...draft.mission, resources: applyAssets(draft.mission.resources), stepResources: { ...draft.mission.stepResources }, status: 'draft' as const };
  const cover = draft.assets.find(a => a.type === 'cover');
  if (cover) mission.thumbnailUrl = cover.url || '';
  Object.entries(mission.stepResources).forEach(([id, values]) => { mission.stepResources[id] = values.map(r => bindAsset(r, id)).filter(r => Boolean(r.url)); });
  let workflow = draft.workflow || catalog.workflows.find(w => w.id === mission.defaultWorkflowId);
  if (draft.workflow) workflow = { ...draft.workflow, phases: draft.workflow.phases.map(p => ({ ...p, resources: (p.resources || []).map(r => bindAsset(r, p.id)).filter(r => Boolean(r.url)) })) };
  const workflowIssue = workflowValidation(workflow);
  if (workflowIssue) throw new Error(workflowIssue);
  if (Object.keys(mission.stepResources).some(id => !workflow?.phases.some(p => p.id === id))) throw new Error('Match every resource phase ID to the selected workflow.');
  if (mission.thumbnailUrl && !safeUrl(mission.thumbnailUrl)) throw new Error('Use an http:// or https:// cover image URL.');
  const allResources = [...(mission.resources || []), ...Object.values(mission.stepResources).flat(), ...(workflow?.phases.flatMap(p => p.resources || []) || [])];
  if (allResources.some(r => !r.title.trim() || !safeUrl(r.url))) throw new Error('Every attached resource needs a title and an http:// or https:// URL.');
  return { mission: { ...mission, missionBrief: normalizeMissionBrief(mission), title: mission.title.trim(), skills: mission.skills.map(s => s.trim()).filter(Boolean) }, workflow: draft.workflow ? workflow : undefined, dueDate: draft.dueDate };
};

export const importDocumentId = async (organizationId: string, importKey: string) => {
  if (!organizationId.trim() || !importKey.trim()) throw new Error('Organization and import key are required.');
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([organizationId, importKey.trim()])));
  return `csv-${Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')}`;
};

export const sampleImportRow = {
  ImportKey: 'plant-guardian-v1', Title: 'Build a smart plant guardian', Description: 'Build a sensor that notices dry soil and gives a visible alert.', Hook: 'Can technology help us care for plants?', Station: 'Circuits', Difficulty: 'intermediate', Duration: '3 sessions', CoverFile: 'plant-cover.jpg', Skills: 'Electronics;Prototyping;Testing', Technologies: 'Microcontroller;Sensor;LED', Goal: 'Build and test a plant monitor.', WhyItMatters: 'Sensors help people care for living things.', FinalOutcome: 'A working guardian with proof from wet and dry soil tests.', Materials: 'Microcontroller;Sensor;LED;Jumper wires', Prerequisites: 'Circuit basics', SafetyNotes: 'Disconnect power before changing wires', Deliverables: 'Working prototype;Test evidence;Short reflection', ResourcesJSON: JSON.stringify([{ title: 'Wiring guide', type: 'file', fileName: 'wiring-guide.pdf' }]), WorkflowName: 'Plant guardian build cycle', AudiencePrograms: '', AudienceGrades: '', Status: 'draft',
  Step_1_Name: 'Plan', Step_1_Objective: 'Draw a safe circuit', Step_1_Instructions: 'Draw and label the circuit. Ask your instructor to check it.', Step_1_Checklist: 'Draw the circuit;Label each wire;Get instructor feedback', Step_1_Minutes: '30', Step_1_EvidenceType: 'image', Step_1_EvidencePrompt: 'Upload a photo of your circuit plan.',
  Step_2_Name: 'Build and test', Step_2_Objective: 'Prove the alert responds to moisture', Step_2_Instructions: 'Build the circuit and test wet and dry soil.', Step_2_Checklist: 'Build safely;Test dry soil;Test wet soil;Make an improvement', Step_2_Minutes: '60', Step_2_EvidenceType: 'video', Step_2_EvidencePrompt: 'Record the wet and dry soil tests.',
};
