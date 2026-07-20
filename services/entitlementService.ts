import type { Organization, SubscriptionPlan, AtlasCatalogBilling, AtlasCatalogPolicy } from '../types';
import { AVAILABLE_APPS, type AppManifest } from './appRegistry';
import { MODULES, type ModuleConfig } from './moduleRegistry';

export type AtlasCatalogItem = {
    id: string;
    kind: 'module' | 'app';
    name: string;
    description: string;
    category: string;
    billing: AtlasCatalogBilling;
    isPublished: boolean;
    canSelfActivate: boolean;
    priceMonthly: number;
    currency: string;
    requiredPlan?: string;
    dependencies: string[];
    module?: ModuleConfig;
    app?: AppManifest;
};

export type AtlasEntitlement = {
    item: AtlasCatalogItem;
    entitled: boolean;
    active: boolean;
    locked: boolean;
    source: 'platform' | 'plan' | 'add_on' | 'free' | 'none';
};

const essentialModuleIds = new Set(['dashboard', 'settings']);

const defaultModuleBilling = (module: ModuleConfig): AtlasCatalogBilling => {
    if (essentialModuleIds.has(module.id)) return 'included';
    return module.enabledByDefault ? 'included' : 'paid';
};

export const getDefaultCatalogItems = (): AtlasCatalogItem[] => [
    ...MODULES.map(module => ({
        id: module.id,
        kind: 'module' as const,
        name: module.label,
        description: module.description || `${module.label} workspace module`,
        category: module.category || 'organization',
        billing: defaultModuleBilling(module),
        isPublished: true,
        canSelfActivate: !essentialModuleIds.has(module.id),
        priceMonthly: 0,
        currency: 'MAD',
        requiredPlan: module.requiredPlan,
        dependencies: module.dependencies || [],
        module
    })),
    ...AVAILABLE_APPS.map(app => ({
        id: app.id,
        kind: 'app' as const,
        name: app.name,
        description: app.description,
        category: app.category,
        billing: app.isPremium ? 'paid' as const : 'free' as const,
        isPublished: true,
        canSelfActivate: true,
        priceMonthly: app.pricing?.interval === 'monthly' ? app.pricing.price : 0,
        currency: app.pricing?.currency || 'MAD',
        requiredPlan: app.requiredPlan,
        dependencies: app.dependencies || [],
        app
    }))
];

export const mergeCatalogPolicies = (policies: AtlasCatalogPolicy[] = []) => {
    const policyMap = new Map(policies.map(policy => [policy.id, policy]));
    return getDefaultCatalogItems().map(item => {
        const policy = policyMap.get(item.id);
        return policy ? {
            ...item,
            billing: policy.billing,
            isPublished: policy.isPublished,
            canSelfActivate: policy.canSelfActivate,
            priceMonthly: policy.priceMonthly ?? item.priceMonthly,
            currency: policy.currency || item.currency
        } : item;
    });
};

const planIncludesItem = (plan: SubscriptionPlan | null, item: AtlasCatalogItem) => {
    const included = plan?.includedModules || [];
    if (included.includes(item.id)) return true;
    return item.kind === 'module' && item.module?.appId === 'edufy-core' && included.includes('erp');
};

const legacyModuleActive = (organization: Organization | null, item: AtlasCatalogItem) => {
    if (!organization || item.kind !== 'module') return false;
    if (essentialModuleIds.has(item.id)) return true;
    const explicit = organization.modules?.[item.id];
    if (typeof explicit === 'boolean') return explicit;
    return Boolean(organization.modules?.erp && item.module?.appId === 'edufy-core' && item.module.enabledByDefault);
};

export const resolveCatalogEntitlement = (
    item: AtlasCatalogItem,
    organization: Organization | null,
    plan: SubscriptionPlan | null,
    activeModuleOverrides: Record<string, boolean> = {},
    installedAppOverrides: string[] = []
): AtlasEntitlement => {
    const includedByPlan = planIncludesItem(plan, item);
    const includedByPlatform = item.billing === 'included';
    const grantedAsAddOn = Boolean(organization?.subscription?.addOns?.includes(item.id));
    const free = item.billing === 'free';
    const entitled = item.isPublished && (includedByPlatform || includedByPlan || grantedAsAddOn || free);
    const source: AtlasEntitlement['source'] = includedByPlatform
        ? 'platform'
        : includedByPlan
            ? 'plan'
            : grantedAsAddOn
                ? 'add_on'
                : free
                    ? 'free'
                    : 'none';

    const active = item.kind === 'module'
        ? (essentialModuleIds.has(item.id) || (activeModuleOverrides[item.id] ?? legacyModuleActive(organization, item)))
        : installedAppOverrides.includes(item.id);

    return { item, entitled, active: entitled && active, locked: !entitled, source };
};

export const getEssentialModuleIds = () => Array.from(essentialModuleIds);
