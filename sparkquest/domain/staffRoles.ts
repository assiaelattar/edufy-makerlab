export const SPARKQUEST_STAFF_ROLES = ['super_admin', 'owner', 'admin', 'instructor'] as const;

export const isSparkQuestStaffRole = (role?: string | null): boolean =>
  Boolean(role && SPARKQUEST_STAFF_ROLES.includes(role as (typeof SPARKQUEST_STAFF_ROLES)[number]));
