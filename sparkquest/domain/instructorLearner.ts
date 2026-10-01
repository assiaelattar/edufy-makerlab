import type { ProjectTemplate, StudentProject } from '../types.ts';
import { missionIsVisibleToLearner, type LearnerMissionContext } from './missionAssignment.ts';
import { getMissionReadiness } from './missionContent.ts';
import { projectProgress, sortRecentProjects } from './learnerWorkbench.ts';
import { needsReview, reviewTime } from './projectReview.ts';
import { currentAcademicYear, projectAcademicYear } from '../utils/academicYear.ts';

const active = (value: unknown) => !['inactive', 'archived', 'deleted', 'disabled'].includes(String(value || '').toLowerCase());
const unique = (values: unknown[]) => [...new Set(values.filter(Boolean).map(String))];
export function learnerDirectory(students: any[], projects: StudentProject[], organizationId: string) {
  if (!organizationId) return [];
  const profiles = students.filter(student => student.organizationId === organizationId && (student._source === 'student_profile' || student.role === 'student'));
  return profiles.map(profile => {
    const alias = profile.loginInfo?.uid;
    const conflicts = alias ? profiles.filter(other => other.id !== profile.id && (other.loginInfo?.uid === alias || other.id === alias)) : [];
    const ownerIds = unique([profile.id, !conflicts.length && alias]);
    const owned = sortRecentProjects(projects.filter(project => project.organizationId === organizationId && ownerIds.includes(String(project.studentId || ''))));
    return { ...profile, name: profile.name || profile.firstName || 'Unnamed learner', ownerIds, projects: owned, assignable: active(profile.status) && !conflicts.length, identityIssue: conflicts.length ? 'The account link is ambiguous. Resolve it in Edufy before assigning.' : !active(profile.status) ? 'This learner is inactive in Edufy.' : null,
      projectCount: owned.length, reviewCount: owned.filter(needsReview).length, publishedCount: owned.filter(project => String(project.status).toLowerCase() === 'published').length,
      lastActive: Math.max(reviewTime(profile.updatedAt || profile.createdAt), ...owned.map(project => reviewTime(project.updatedAt || project.createdAt))) };
  }).sort((a, b) => b.reviewCount - a.reviewCount || b.lastActive - a.lastActive || a.name.localeCompare(b.name));
}
export function learnerMemberships(learner: any, enrollments: any[], programs: any[], organizationId: string) {
  const memberships = enrollments.filter(item => item.organizationId === organizationId && learner.ownerIds.includes(String(item.studentId)) && String(item.status).toLowerCase() === 'active');
  const context: LearnerMissionContext = { ownerIds: learner.ownerIds, programIds: [], gradeIds: [], groupIds: [] };
  const placements = memberships.map(item => {
    const program = programs.find(candidate => candidate.organizationId === organizationId && (candidate.id === item.programId || candidate.name === item.programName));
    const grade = program?.grades?.find((candidate: any) => candidate.id === item.gradeId || candidate.name === item.gradeName);
    const group = grade?.groups?.find((candidate: any) => candidate.id === item.groupId || candidate.name === item.groupName);
    context.programIds.push(...unique([item.programId, item.programName, program?.id, program?.name, program?.title]));
    context.gradeIds.push(...unique([item.gradeId, item.gradeName, grade?.id, grade?.name]));
    context.groupIds.push(...unique([item.groupId, item.groupName, group?.id, group?.name]));
    return { id: item.id, program: program?.name || program?.title || item.programName || 'Program not labeled', grade: grade?.name || item.gradeName || 'Grade not labeled', group: group?.name || item.groupName || 'Group not labeled' };
  });
  return { memberships, placements, context };
}
export function learnerWorkspace(learner: any, templates: ProjectTemplate[], enrollments: any[], programs: any[], organizationId: string, year = currentAcademicYear()) {
  const { context, placements } = learnerMemberships(learner, enrollments, programs, organizationId);
  const projects: StudentProject[] = learner.projects;
  const current = projects.filter(project => projectAcademicYear(project) === year);
  const archived = projects.filter(project => projectAcademicYear(project) !== year);
  const missions = templates.filter(template => template.organizationId === organizationId && missionIsVisibleToLearner(template, context)).map(mission => ({ mission, projects: projects.filter(project => project.templateId === mission.id), direct: Boolean(mission.targetAudience?.students?.some(id => learner.ownerIds.includes(id)) || mission.targetAudience?.additionalStudents?.some(id => learner.ownerIds.includes(id))) }));
  const history = projects.flatMap(project => (project.reviewHistory || []).map(review => ({ project, review }))).sort((a, b) => reviewTime(b.review.reviewedAt) - reviewTime(a.review.reviewedAt) || a.review.id.localeCompare(b.review.id));
  return { current, archived, placements, context, missions, history, reviews: current.filter(needsReview), progress: current.map(project => ({ project, ...projectProgress(project) })) };
}
export function buildProfileAssignmentPatch(mission: ProjectTemplate, studentId: string, organizationId: string): Partial<Pick<ProjectTemplate, 'status' | 'targetAudience'>> {
  if (!organizationId || mission.organizationId !== organizationId || !studentId.trim()) throw new Error('Choose a learner and mission in your organization.');
  if (mission.status === 'archived') throw new Error('Archived missions cannot be assigned.');
  const audience = mission.targetAudience || {};
  const live = mission.status === 'assigned' || mission.status === 'featured';
  // Activating a draft with a planned class audience would dispatch it to others.
  if (!live && Object.values(audience).some(values => values?.length)) throw new Error('This draft has a planned audience. Dispatch it from Missions first to avoid assigning it to other learners unintentionally.');
  if (audience.students?.includes(studentId) || audience.additionalStudents?.includes(studentId)) return {};
  const targetAudience = { ...audience, additionalStudents: unique([...(audience.additionalStudents || []), studentId]) };
  const patch = { status: mission.status === 'featured' ? 'featured' as const : 'assigned' as const, targetAudience };
  if (!live && !getMissionReadiness({ ...mission, ...patch }).publishReady) throw new Error('Complete the mission brief and workflow in Missions before assigning this draft.');
  return patch;
}
