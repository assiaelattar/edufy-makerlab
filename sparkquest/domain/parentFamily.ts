export interface GuardianFamilyLink {
  id: string;
  organizationId: string;
  parentUid: string;
  studentId: string;
  subjectId?: string;
  status: string;
  permissions?: string[];
}

export const familyChildIds = (links: GuardianFamilyLink[], parentUid: string, organizationId: string): string[] =>
  [...new Set(links
    .filter(link => link.parentUid === parentUid && link.organizationId === organizationId &&
      link.status === 'active' && Boolean(link.studentId))
    .map(link => link.studentId))];

export const childPermissions = (
  links: GuardianFamilyLink[], childId: string, parentUid: string, organizationId: string
): string[] => [...new Set(links
  .filter(link => link.parentUid === parentUid && link.organizationId === organizationId &&
    link.studentId === childId && link.status === 'active')
  .flatMap(link => link.permissions || []))];

export const childHasCanonicalPermission = (
  links: GuardianFamilyLink[], childId: string, permission: string,
  parentUid: string, organizationId: string
): boolean => links.some(link => link.parentUid === parentUid && link.organizationId === organizationId &&
  link.studentId === childId && (link.subjectId || link.studentId) === childId && link.status === 'active' &&
  link.permissions?.includes(permission));

export const permittedSubjectsForChild = (
  links: GuardianFamilyLink[], childId: string, learnerUid: string | undefined,
  parentUid: string, organizationId: string, permission: 'portfolio' | 'gallery'
): string[] => {
  const allowed = new Set(links
    .filter(link => link.parentUid === parentUid && link.organizationId === organizationId &&
      link.studentId === childId && link.status === 'active' && link.permissions?.includes(permission))
    .map(link => link.subjectId || link.id.slice(link.parentUid.length + 1)));
  return [...new Set([childId, learnerUid].filter((id): id is string => Boolean(id && allowed.has(id))))];
};

export const projectSubjectsForChild = (
  links: GuardianFamilyLink[], childId: string, learnerUid: string | undefined,
  parentUid: string, organizationId: string
): string[] => permittedSubjectsForChild(links, childId, learnerUid, parentUid, organizationId, 'portfolio');
