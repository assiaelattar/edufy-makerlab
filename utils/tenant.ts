import { AtlasPermission, AtlasTenantAccess, Organization, RoleDefinition, UserProfile } from '../types';

export interface TenantScopedRecord {
  organizationId: string;
}

export const requireOrganizationId = (organization?: Pick<Organization, 'id'> | null, fallbackOrgId?: string) => {
  const organizationId = organization?.id || fallbackOrgId;
  if (!organizationId) {
    throw new Error('Organization context is required for this action.');
  }
  return organizationId;
};

export const getUserOrganizationId = (userProfile?: Pick<UserProfile, 'organizationId'> | null) => {
  return userProfile?.organizationId || '';
};

export const withOrganizationId = <T extends Record<string, unknown>>(data: T, organizationId: string): T & TenantScopedRecord => {
  if (!organizationId) {
    throw new Error('Cannot write tenant data without organizationId.');
  }

  return {
    ...data,
    organizationId,
  };
};
export const belongsToOrganization = <T extends Partial<TenantScopedRecord>>(record: T | null | undefined, organizationId: string) => {
  return !!record && !!organizationId && record.organizationId === organizationId;
};

export const filterByOrganization = <T extends Partial<TenantScopedRecord>>(records: T[], organizationId: string) => {
  return records.filter(record => belongsToOrganization(record, organizationId));
};

export const hasPermission = (
  permission: AtlasPermission,
  roleDefinition?: Pick<RoleDefinition, 'permissions'> | null,
  userProfile?: Pick<UserProfile, 'role' | 'status'> | null
) => {
  if (!userProfile || userProfile.status !== 'active') return false;
  if (userProfile.role === 'super_admin' || userProfile.role === 'owner' || userProfile.role === 'admin') return true;
  if (!roleDefinition) return false;
  if (roleDefinition.permissions.includes('*')) return true;
  if (roleDefinition.permissions.includes(permission)) return true;

  const [scope] = permission.split('.');
  return roleDefinition.permissions.includes(`${scope}.*`);
};

export const canUseApp = (appId: string, access?: AtlasTenantAccess) => {
  if (!access) return false;
  if (appId === 'edufy-core') return true;
  return !!access.installedApps?.includes(appId) || !!access.enabledModules?.[appId];
};

export const createTenantAccess = (
  organization: Organization | null,
  userProfile: UserProfile | null,
  roleDefinition?: RoleDefinition | null
): AtlasTenantAccess | null => {
  if (!organization || !userProfile) return null;

  return {
    organizationId: organization.id,
    userId: userProfile.uid,
    role: userProfile.role,
    permissions: roleDefinition?.permissions || [],
    installedApps: organization.installedApps || [],
    enabledModules: organization.modules || {},
    subscriptionPlanId: organization.subscription?.planId,
  };
};
