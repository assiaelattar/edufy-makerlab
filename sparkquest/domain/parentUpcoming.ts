import type { ProjectTemplate, StudentProject } from '../types';
import { missionIsVisibleToLearner, type LearnerMissionContext } from './missionAssignment.ts';

export interface FamilyUpcomingMission {
  id: string;
  title: string;
  intention: string;
  thumbnailUrl?: string;
}

/** A parent sees only tenant-owned missions addressed to this verified child and not yet started. */
export const upcomingForChild = (
  templates: ProjectTemplate[], projects: StudentProject[], organizationId: string,
  context: LearnerMissionContext,
): FamilyUpcomingMission[] => {
  const started = new Set(projects.map(project => project.templateId).filter(Boolean));
  return templates
    .filter(template => template.organizationId === organizationId && template.title?.trim() &&
      !started.has(template.id) && missionIsVisibleToLearner(template, context))
    .map(template => ({
      id: template.id,
      title: template.title.trim(),
      intention: (template.missionBrief?.goal || template.description || '').trim(),
      thumbnailUrl: template.thumbnailUrl,
    }));
};
