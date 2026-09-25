import type { ProjectTemplate } from '../types';

export type MissionAudienceMode = 'grade' | 'groups' | 'students';

export interface MissionAudienceInput {
  mode: MissionAudienceMode;
  organizationId: string;
  programId?: string;
  programName?: string;
  gradeId?: string;
  gradeName?: string;
  groupIds?: string[];
  groupNames?: string[];
  studentIds?: string[];
}

export interface LearnerMissionContext {
  ownerIds: string[];
  programIds: string[];
  gradeIds: string[];
  groupIds: string[];
}

const unique = (values: Array<string | undefined>) => Array.from(new Set(
  values.map(value => String(value || '').trim()).filter(Boolean)
));

export const buildMissionAssignmentPatch = ({
  mode,
  organizationId,
  programId,
  programName,
  gradeId,
  gradeName,
  groupIds = [],
  groupNames = [],
  studentIds = [],
}: MissionAudienceInput): Pick<ProjectTemplate, 'organizationId' | 'status' | 'targetAudience'> => {
  if (!organizationId.trim()) throw new Error('The instructor organization could not be resolved.');
  if ((mode === 'grade' || mode === 'groups') && !programId) {
    throw new Error('Choose a program before assigning this mission.');
  }
  if ((mode === 'grade' || mode === 'groups') && !gradeId) {
    throw new Error('Choose a grade before assigning this mission.');
  }
  if (mode === 'groups' && groupIds.length === 0 && groupNames.length === 0) {
    throw new Error('Choose at least one group.');
  }
  if (mode === 'students' && studentIds.length === 0) {
    throw new Error('Choose at least one student.');
  }

  return {
    organizationId,
    status: 'assigned',
    targetAudience: {
      programs: mode === 'students' ? [] : unique([programId, programName]),
      grades: mode === 'students' ? [] : unique([gradeId, gradeName]),
      groups: mode === 'groups' ? unique([...groupIds, ...groupNames]) : [],
      students: mode === 'students' ? unique(studentIds) : [],
    },
  };
};

const overlaps = (targets: unknown[] | undefined, values: string[]) => {
  if (!Array.isArray(targets) || targets.length === 0) return false;
  const normalized = new Set(values.map(value => String(value).trim().toLowerCase()));
  return targets.some(target => normalized.has(String(target).trim().toLowerCase()));
};

export const missionIsVisibleToLearner = (
  template: Pick<ProjectTemplate, 'status' | 'targetAudience'>,
  context: LearnerMissionContext,
) => {
  if (template.status !== 'assigned' && template.status !== 'featured') return false;

  const audience = template.targetAudience || {};
  const hasPrograms = Boolean(audience.programs?.length);
  const hasGrades = Boolean(audience.grades?.length);
  const hasGroups = Boolean(audience.groups?.length);
  const hasStudents = Boolean(audience.students?.length);
  if (!hasPrograms && !hasGrades && !hasGroups && !hasStudents) return false;

  // A canonical direct assignment is authoritative, even when enrollment
  // metadata is stale or temporarily unavailable.
  if (hasStudents) return overlaps(audience.students, context.ownerIds);
  if (hasPrograms && !overlaps(audience.programs, context.programIds)) return false;
  if (hasGrades && !overlaps(audience.grades, context.gradeIds)) return false;
  if (hasGroups && !overlaps(audience.groups, context.groupIds)) return false;
  return true;
};
