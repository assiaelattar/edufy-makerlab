import type {
  ProcessPhase,
  ProcessTemplate,
  ProjectStep,
  Resource,
  WorkflowSnapshot,
} from '../types.ts';

const clean = (value: unknown) => String(value || '').trim();
const cleanList = (values?: string[]) => (values || []).map(clean).filter(Boolean);

const uniqueResources = (resources: Resource[]) => {
  const seen = new Set<string>();
  return resources.filter(resource => {
    const key = clean(resource.url) || clean(resource.id);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const normalizeWorkflowPhase = (phase: ProcessPhase, index: number): ProcessPhase => {
  const phaseId = clean(phase.id) || `phase-${index + 1}`;
  const estimatedMinutes = Number(phase.estimatedMinutes);

  return {
    id: phaseId,
    name: clean(phase.name) || `Phase ${index + 1}`,
    color: clean(phase.color) || 'blue',
    icon: clean(phase.icon) || 'Circle',
    order: Number.isFinite(phase.order) ? phase.order : index + 1,
    // Firestore rejects undefined values inside arrays. Keep authored text as
    // explicit strings and omit only the optional numeric field when absent.
    description: clean(phase.description),
    objective: clean(phase.objective) || clean(phase.description),
    instructions: clean(phase.instructions),
    checklist: cleanList(phase.checklist),
    tools: cleanList(phase.tools),
    materials: cleanList(phase.materials),
    safetyNotes: cleanList(phase.safetyNotes),
    evidenceRequirements: (phase.evidenceRequirements || [])
      .map((requirement, requirementIndex) => ({
        id: clean(requirement.id) || `${phaseId}-proof-${requirementIndex + 1}`,
        type: requirement.type || 'any',
        prompt: clean(requirement.prompt),
        required: requirement.required !== false,
      }))
      .filter(requirement => Boolean(requirement.prompt)),
    ...(estimatedMinutes > 0 ? { estimatedMinutes } : {}),
    required: phase.required !== false,
    resources: uniqueResources(phase.resources || []),
  };
};

export const createWorkflowSnapshot = (
  workflow: ProcessTemplate,
  capturedAt = new Date().toISOString(),
): WorkflowSnapshot => ({
  workflowId: workflow.id,
  version: Math.max(1, Number(workflow.version) || 1),
  name: clean(workflow.name) || 'Project workflow',
  description: clean(workflow.description),
  capturedAt,
  phases: (workflow.phases || [])
    .map(normalizeWorkflowPhase)
    .sort((left, right) => left.order - right.order),
});

const resourcesForPhase = (
  phase: ProcessPhase,
  stepResources: Record<string, Resource[]> = {},
) => uniqueResources([...(phase.resources || []), ...(stepResources[phase.id] || [])]);

export const buildProjectStepsFromWorkflow = (
  snapshot: WorkflowSnapshot,
  stepResources: Record<string, Resource[]> = {},
): ProjectStep[] => snapshot.phases.map((phase, index) => ({
  id: phase.id,
  phaseId: phase.id,
  order: index + 1,
  source: 'workflow',
  required: phase.required !== false,
  title: phase.name,
  status: 'todo',
  description: clean(phase.description),
  objective: clean(phase.objective),
  instructions: clean(phase.instructions),
  checklist: phase.checklist || [],
  checklistCompleted: Array((phase.checklist || []).length).fill(false),
  tools: phase.tools || [],
  materials: phase.materials || [],
  safetyNotes: phase.safetyNotes || [],
  evidenceRequirements: phase.evidenceRequirements || [],
  ...(Number(phase.estimatedMinutes) > 0 ? { estimatedMinutes: Number(phase.estimatedMinutes) } : {}),
  resources: resourcesForPhase(phase, stepResources),
}));

/**
 * Refreshes presentation metadata without replacing learner progress. Stable
 * phase IDs are authoritative. Exact title matching is retained only for old
 * projects whose steps predate phase IDs; array position is never used.
 */
export const refreshProjectStepsFromWorkflow = (
  steps: ProjectStep[],
  snapshot: WorkflowSnapshot,
  stepResources: Record<string, Resource[]> = {},
): ProjectStep[] => {
  const phasesById = new Map(snapshot.phases.map(phase => [phase.id, phase]));
  const phasesByTitle = new Map(snapshot.phases.map(phase => [clean(phase.name).toLowerCase(), phase]));

  return steps.map(step => {
    if (step.source === 'student') return step;
    const phase = phasesById.get(step.phaseId || step.id)
      || phasesByTitle.get(clean(step.title).toLowerCase());
    if (!phase) return step;
    const checklist = phase.checklist || [];
    const previousChecklist = Array.isArray(step.checklistCompleted) ? step.checklistCompleted : [];
    return {
      ...step,
      phaseId: phase.id,
      source: step.source || 'workflow',
      required: phase.required !== false,
      title: phase.name,
      description: clean(phase.description),
      objective: clean(phase.objective),
      instructions: clean(phase.instructions),
      checklist,
      checklistCompleted: checklist.map((_, index) => Boolean(previousChecklist[index])),
      tools: phase.tools || [],
      materials: phase.materials || [],
      safetyNotes: phase.safetyNotes || [],
      evidenceRequirements: phase.evidenceRequirements || [],
      ...(Number(phase.estimatedMinutes) > 0
        ? { estimatedMinutes: Number(phase.estimatedMinutes) }
        : {}),
      resources: uniqueResources([...(step.resources || []), ...resourcesForPhase(phase, stepResources)]),
    };
  });
};

export const createStudentTask = (title: string, id = `student-${Date.now()}`): ProjectStep => ({
  id,
  title: clean(title),
  status: 'todo',
  source: 'student',
  required: false,
});


