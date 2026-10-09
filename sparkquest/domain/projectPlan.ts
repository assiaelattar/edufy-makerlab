import type { ProjectStep, ProjectStepReviewState } from '../types.ts';

const clean = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim();
const cleanLongText = (value: unknown) => String(value || '').replace(/\r\n?/g, '\n').split('\n').map(line => line.replace(/[\t ]+/g, ' ').trim()).join('\n').trim();

const planFields = (step: ProjectStep): Partial<ProjectStep> => ({
  title: clean(step.title),
  description: cleanLongText(step.description),
  objective: cleanLongText(step.objective),
  instructions: cleanLongText(step.instructions),
  required: step.required !== false,
});

export const stepHasProtectedWork = (
  step: ProjectStep,
  review?: ProjectStepReviewState,
) => Boolean(
  review
  || step.status !== 'todo'
  || step.evidence
  || step.note
  || step.submittedAt
  || step.reviewedAt
  || step.reviewNotes
  || step.submissionHistory?.length,
);

export const createPlanStep = (
  title = '',
  values: Partial<ProjectStep> = {},
  id = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
): ProjectStep => ({
  id,
  title: clean(title),
  status: 'todo',
  source: 'student',
  required: values.required ?? false,
  ...(cleanLongText(values.description) ? { description: cleanLongText(values.description) } : {}),
  ...(cleanLongText(values.objective) ? { objective: cleanLongText(values.objective) } : {}),
  ...(cleanLongText(values.instructions) ? { instructions: cleanLongText(values.instructions) } : {}),
});

export interface ParsedPlanStep {
  title: string;
  instructions?: string;
}

const genericHeadings = new Set(['steps', 'step plan', 'plan', 'project plan', 'roadmap', 'tasks', 'to do', 'todo']);

/** Turns bullets, numbered lists, checkboxes, and simple "title: detail" lines into steps. */
export function parsePlanText(value: string): ParsedPlanStep[] {
  const seen = new Set<string>();
  const parsed: ParsedPlanStep[] = [];

  for (const rawLine of String(value || '').split(/\r?\n/)) {
    let line = rawLine
      .replace(/^\s*[-*•·‣▪◦]+\s*/, '')
      .replace(/^\s*(?:step\s*)?\d+[.)\]:-]\s*/i, '')
      .replace(/^\s*[ivxlcdm]+[.)]\s*/i, '')
      .replace(/^\s*(?:\[[ xX]\]\s*)/, '')
      .replace(/^\s*[☐☑✅✓✔]\s*/, '')
      .trim();
    if (!line || /^```/.test(line)) continue;
    line = line.replace(/\s+/g, ' ');
    if (genericHeadings.has(line.replace(/[:：]$/, '').toLowerCase())) continue;

    let title = line;
    let instructions = '';
    const separator = line.match(/^(.{2,80}?)(?:\s+[—–-]\s+|\s*\|\s*|\s*[:：]\s+)(.+)$/);
    if (separator) {
      title = separator[1].trim();
      instructions = separator[2].trim();
    }

    title = title.replace(/[.;,]+$/, '').trim();
    const key = title.toLocaleLowerCase();
    if (!title || seen.has(key)) continue;
    seen.add(key);
    parsed.push({ title, ...(instructions ? { instructions } : {}) });
  }

  return parsed;
}

export function appendParsedPlanSteps(
  steps: ProjectStep[],
  parsed: ParsedPlanStep[],
  idFactory?: (index: number) => string,
): ProjectStep[] {
  const existing = new Set(steps.map(step => clean(step.title).toLocaleLowerCase()));
  const additions = parsed
    .filter(step => !existing.has(clean(step.title).toLocaleLowerCase()))
    .map((step, index) => createPlanStep(step.title, { instructions: step.instructions }, idFactory?.(index)));
  return normalizePlanOrder([...steps, ...additions]);
}

export const normalizePlanOrder = (steps: ProjectStep[]) => steps.map((step, index) => ({
  ...step,
  title: clean(step.title),
  order: index + 1,
}));

/**
 * Applies editable plan fields to the latest stored steps while preserving all
 * proof, progress, resource, and review data. Protected steps cannot disappear.
 */
export function mergeProjectPlan(
  storedSteps: ProjectStep[],
  draftSteps: ProjectStep[],
  stepReviews: Record<string, ProjectStepReviewState> = {},
): ProjectStep[] {
  if (!draftSteps.length) throw new Error('Keep at least one step in the project plan.');
  if (draftSteps.length > 100) throw new Error('A project plan can contain up to 100 steps.');

  const storedById = new Map(storedSteps.map(step => [step.id, step]));
  const draftIds = new Set<string>();
  const merged = draftSteps.map((draft, index) => {
    const id = clean(draft.id);
    const title = clean(draft.title);
    if (!id || draftIds.has(id)) throw new Error('Every plan step needs a unique identity.');
    if (!title) throw new Error(`Step ${index + 1} needs a title.`);
    draftIds.add(id);
    const stored = storedById.get(id);
    if (!stored) return { ...createPlanStep(title, planFields(draft), id), order: index + 1 };
    return { ...stored, ...planFields(draft), title, order: index + 1 };
  });

  for (const step of storedSteps) {
    if (!draftIds.has(step.id) && stepHasProtectedWork(step, stepReviews[step.id])) {
      throw new Error(`“${step.title}” already has progress or review history, so it cannot be deleted. Keep it in the plan.`);
    }
  }

  return merged;
}
