import type { StudentProject } from '../types.ts';

export const SHOWCASE_TEMPLATE_ID = 'showcase-template';

export const isShowcaseProject = (project: Pick<StudentProject, 'templateId'>) =>
  project.templateId === SHOWCASE_TEMPLATE_ID;

export const canDeleteOwnedShowcase = (
  project: StudentProject,
  organizationId: string,
  verifiedOwnerIds: string[],
) => Boolean(
  isShowcaseProject(project) &&
  organizationId &&
  project.organizationId === organizationId &&
  project.studentId &&
  verifiedOwnerIds.includes(project.studentId)
);

export const supportsPasswordReauthentication = (user: {
  email: string | null;
  providerData: Array<{ providerId: string }>;
} | null | undefined) => Boolean(
  user?.email && user.providerData.some(provider => provider.providerId === 'password')
);
