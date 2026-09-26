import type { Assignment, MissionBrief, MissionDeliverable, ProcessTemplate, ProjectTemplate, StudentProject } from '../types.ts';

type MissionSource = {
  id?: string;
  templateId?: string;
  title?: string;
  description?: string;
  hook?: string;
  station?: string;
  workflowId?: string;
  defaultWorkflowId?: string;
  processTemplateId?: string;
  defaultSteps?: string[];
  missionBrief?: MissionBrief;
  resources?: ProjectTemplate['resources'];
  stepResources?: ProjectTemplate['stepResources'];
  technologies?: ProjectTemplate['technologies'];
  difficulty?: ProjectTemplate['difficulty'];
  duration?: string;
  learningOutcomes?: ProjectTemplate['learningOutcomes'];
  targetAudience?: ProjectTemplate['targetAudience'];
};

const clean = (value: unknown) => String(value || '').trim();
const cleanList = (values?: string[]) => (values || []).map(clean).filter(Boolean);

export interface MissionStepSummary {
  id: string;
  title: string;
  description?: string;
  resourceCount: number;
}

export interface ResolvedMissionContent {
  goal: string;
  whyItMatters: string;
  finalOutcome: string;
  materials: string[];
  prerequisites: string[];
  safetyNotes: string[];
  deliverables: MissionDeliverable[];
  steps: MissionStepSummary[];
}

export const normalizeMissionBrief = (source: MissionSource): MissionBrief => {
  const brief = source.missionBrief || {};
  const technologies = source.technologies;
  const fallbackDeliverables: MissionDeliverable[] = clean(brief.finalOutcome)
    ? [{ id: 'final-outcome', title: clean(brief.finalOutcome), required: true, evidenceType: 'any' }]
    : [];

  return {
    goal: clean(brief.goal) || clean(source.description),
    whyItMatters: clean(brief.whyItMatters) || clean(source.hook),
    finalOutcome: clean(brief.finalOutcome),
    materials: cleanList(brief.materials).length
      ? cleanList(brief.materials)
      : (technologies || []).map(item => clean(item.name)).filter(Boolean),
    prerequisites: cleanList(brief.prerequisites),
    safetyNotes: cleanList(brief.safetyNotes),
    deliverables: (brief.deliverables || fallbackDeliverables)
      .map((item, index) => ({
        id: clean(item.id) || `deliverable-${index + 1}`,
        title: clean(item.title),
        description: clean(item.description) || undefined,
        required: item.required !== false,
        evidenceType: item.evidenceType || 'any',
      }))
      .filter(item => Boolean(item.title)),
  };
};

export const resolveMissionContent = (
  source: MissionSource,
  workflow?: ProcessTemplate,
): ResolvedMissionContent => {
  const brief = normalizeMissionBrief(source);
  const stepResources = source.stepResources || {};
  const workflowSteps = workflow?.phases
    ?.slice()
    .sort((left, right) => left.order - right.order)
    .map(phase => ({
      id: phase.id,
      title: phase.name,
      description: phase.description,
      resourceCount: (phase.resources?.length || 0) + (stepResources[phase.id]?.length || 0),
    }));
  const defaultSteps = source.defaultSteps;
  const steps = workflowSteps?.length
    ? workflowSteps
    : (defaultSteps || []).map((title, index) => ({
      id: `step-${index + 1}`,
      title,
      resourceCount: 0,
    }));

  return {
    goal: clean(brief.goal) || 'Read the mission brief and define what you will build.',
    whyItMatters: clean(brief.whyItMatters),
    finalOutcome: clean(brief.finalOutcome) || brief.deliverables?.[0]?.title || 'A tested project with clear evidence of your work.',
    materials: brief.materials || [],
    prerequisites: brief.prerequisites || [],
    safetyNotes: brief.safetyNotes || [],
    deliverables: brief.deliverables || [],
    steps: steps.length ? steps : [
      { id: 'understand', title: 'Understand the challenge', resourceCount: 0 },
      { id: 'build', title: 'Build and test', resourceCount: 0 },
      { id: 'prove', title: 'Upload evidence and submit', resourceCount: 0 },
    ],
  };
};

export const getMissionReadiness = (source: Partial<ProjectTemplate>) => {
  const content = resolveMissionContent(source);
  const brief = normalizeMissionBrief(source);
  const audience = source.targetAudience || {};
  const checks = [
    { id: 'title', label: 'Mission title', complete: Boolean(clean(source.title)) },
    { id: 'goal', label: 'Clear learner goal', complete: Boolean(clean(content.goal) && clean(source.description)) },
    { id: 'outcome', label: 'Final outcome or deliverable', complete: Boolean(clean(brief.finalOutcome) || brief.deliverables?.length) },
    { id: 'workflow', label: 'Build workflow', complete: Boolean(source.defaultWorkflowId || source.processTemplateId || source.defaultSteps?.length) },
    { id: 'audience', label: 'Learner audience', complete: Boolean(audience.programs?.length || audience.grades?.length || audience.groups?.length || audience.students?.length) },
  ];
  return {
    checks,
    completed: checks.filter(check => check.complete).length,
    total: checks.length,
    publishReady: checks.every(check => check.complete),
  };
};

export const assignmentFromMission = (
  source: ProjectTemplate | StudentProject,
  resources = source.resources || [],
  stepResources = source.stepResources || {},
): Assignment => ({
  id: ('templateId' in source ? source.templateId : undefined) || source.id,
  title: source.title,
  description: source.description,
  station: source.station,
  badges: [],
  recommendedWorkflow: ('workflowId' in source ? source.workflowId : undefined) || ('defaultWorkflowId' in source ? source.defaultWorkflowId : '') || 'default',
  resources,
  stepResources,
  missionBrief: normalizeMissionBrief(source),
  hook: source.hook,
  duration: source.duration,
  difficulty: 'difficulty' in source ? source.difficulty : undefined,
  learningOutcomes: 'learningOutcomes' in source ? source.learningOutcomes : undefined,
  technologies: 'technologies' in source ? source.technologies : undefined,
});
