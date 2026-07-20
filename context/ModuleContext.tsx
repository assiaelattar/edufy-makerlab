import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { MODULES, type ModuleConfig } from '../services/moduleRegistry';
import {
    mergeCatalogPolicies,
    resolveCatalogEntitlement,
    type AtlasCatalogItem,
    type AtlasEntitlement
} from '../services/entitlementService';
import type { AtlasCatalogPolicy, SubscriptionPlan } from '../types';

interface ModuleContextType {
    loading: boolean;
    currentPlan: SubscriptionPlan | null;
    catalogItems: AtlasCatalogItem[];
    entitlements: AtlasEntitlement[];
    availableModules: ModuleConfig[];
    installedApps: string[];
    isModuleEnabled: (moduleKey: string) => boolean;
    getEntitlement: (itemId: string) => AtlasEntitlement | undefined;
    activateItem: (itemId: string) => Promise<boolean>;
    deactivateItem: (itemId: string) => Promise<boolean>;
    requestAddOn: (itemId: string) => Promise<void>;
    refreshAccess: () => Promise<void>;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export const ModuleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentOrganization, userProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
    const [catalogPolicies, setCatalogPolicies] = useState<AtlasCatalogPolicy[]>([]);
    const [moduleFlags, setModuleFlags] = useState<Record<string, boolean>>({});
    const [installedApps, setInstalledApps] = useState<string[]>([]);

    const loadAccess = useCallback(async () => {
        setModuleFlags(currentOrganization?.modules || {});
        setInstalledApps(currentOrganization?.installedApps || []);

        if (!db || !currentOrganization) {
            setCurrentPlan(null);
            setCatalogPolicies([]);
            return;
        }

        setLoading(true);
        try {
            const [planResult, catalogResult, organizationResult] = await Promise.allSettled([
                currentOrganization.subscription?.planId
                    ? getDoc(doc(db, 'subscriptionPlans', currentOrganization.subscription.planId))
                    : Promise.resolve(null),
                getDocs(collection(db, 'moduleCatalog')),
                getDoc(doc(db, 'organizations', currentOrganization.id))
            ]);

            const planSnapshot = planResult.status === 'fulfilled' ? planResult.value : null;
            const catalogSnapshot = catalogResult.status === 'fulfilled' ? catalogResult.value : null;
            const organizationSnapshot = organizationResult.status === 'fulfilled' ? organizationResult.value : null;

            setCurrentPlan(planSnapshot?.exists()
                ? ({ id: planSnapshot.id, ...planSnapshot.data() } as SubscriptionPlan)
                : null);
            setCatalogPolicies(catalogSnapshot
                ? catalogSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as AtlasCatalogPolicy))
                : []);

            if (organizationSnapshot?.exists()) {
                const organizationData = organizationSnapshot.data();
                setModuleFlags(organizationData.modules || {});
                setInstalledApps(organizationData.installedApps || []);
            }

            if (planResult.status === 'rejected' || catalogResult.status === 'rejected' || organizationResult.status === 'rejected') {
                console.warn('Some Atlas entitlement sources were unavailable; available access data was preserved.');
            }
        } catch (error) {
            console.warn('Atlas entitlements loaded with local defaults.', error);
            setCurrentPlan(null);
            setCatalogPolicies([]);
        } finally {
            setLoading(false);
        }
    }, [currentOrganization]);

    useEffect(() => {
        loadAccess();
    }, [loadAccess]);

    const catalogItems = useMemo(() => mergeCatalogPolicies(catalogPolicies), [catalogPolicies]);

    const entitlements = useMemo(() => catalogItems.map(item =>
        resolveCatalogEntitlement(item, currentOrganization, currentPlan, moduleFlags, installedApps)
    ), [catalogItems, currentOrganization, currentPlan, installedApps, moduleFlags]);

    const availableModules = useMemo(() => entitlements
        .filter(entitlement => entitlement.item.kind === 'module' && entitlement.entitled && entitlement.active)
        .map(entitlement => entitlement.item.module)
        .filter((module): module is ModuleConfig => Boolean(module)), [entitlements]);

    const getEntitlement = useCallback((itemId: string) =>
        entitlements.find(entitlement => entitlement.item.id === itemId), [entitlements]);

    const isModuleEnabled = useCallback((moduleKey: string) =>
        availableModules.some(module => module.id === moduleKey), [availableModules]);

    const canManageWorkspace = ['owner', 'admin', 'super_admin'].includes(userProfile?.role || '');

    const activateItem = useCallback(async (itemId: string) => {
        if (!db || !currentOrganization || !canManageWorkspace) return false;
        const entitlement = entitlements.find(entry => entry.item.id === itemId);
        if (!entitlement?.entitled || !entitlement.item.canSelfActivate) return false;

        if (entitlement.item.kind === 'app') {
            await updateDoc(doc(db, 'organizations', currentOrganization.id), { installedApps: arrayUnion(itemId) });
            setInstalledApps(previous => previous.includes(itemId) ? previous : [...previous, itemId]);
            return true;
        }

        const moduleUpdates: Record<string, boolean> = { [`modules.${itemId}`]: true };
        const activatedDependencies: string[] = [];
        entitlement.item.dependencies.forEach(dependencyId => {
            const dependency = entitlements.find(entry => entry.item.id === dependencyId);
            if (dependency?.item.kind === 'module' && dependency.entitled) {
                moduleUpdates[`modules.${dependencyId}`] = true;
                activatedDependencies.push(dependencyId);
            }
        });
        await updateDoc(doc(db, 'organizations', currentOrganization.id), moduleUpdates);
        setModuleFlags(previous => ({
            ...previous,
            [itemId]: true,
            ...Object.fromEntries(activatedDependencies.map(dependencyId => [dependencyId, true]))
        }));
        return true;
    }, [canManageWorkspace, currentOrganization, entitlements]);

    const deactivateItem = useCallback(async (itemId: string) => {
        if (!db || !currentOrganization || !canManageWorkspace || ['dashboard', 'settings'].includes(itemId)) return false;
        const entitlement = entitlements.find(entry => entry.item.id === itemId);
        if (!entitlement) return false;

        if (entitlement.item.kind === 'app') {
            await updateDoc(doc(db, 'organizations', currentOrganization.id), { installedApps: arrayRemove(itemId) });
            setInstalledApps(previous => previous.filter(id => id !== itemId));
            return true;
        }

        await updateDoc(doc(db, 'organizations', currentOrganization.id), { [`modules.${itemId}`]: false });
        setModuleFlags(previous => ({ ...previous, [itemId]: false }));
        return true;
    }, [canManageWorkspace, currentOrganization, entitlements]);

    const requestAddOn = useCallback(async (itemId: string) => {
        if (!db || !currentOrganization || !userProfile) return;
        const item = catalogItems.find(entry => entry.id === itemId);
        if (!item) return;
        await addDoc(collection(db, 'organizations', currentOrganization.id, 'addonRequests'), {
            itemId,
            itemName: item.name,
            status: 'requested',
            requestedBy: userProfile.uid || userProfile.email,
            requestedAt: serverTimestamp()
        });
    }, [catalogItems, currentOrganization, userProfile]);

    return (
        <ModuleContext.Provider value={{
            loading,
            currentPlan,
            catalogItems,
            entitlements,
            availableModules: availableModules.length ? availableModules : MODULES.filter(module => ['dashboard', 'settings'].includes(module.id)),
            installedApps,
            isModuleEnabled,
            getEntitlement,
            activateItem,
            deactivateItem,
            requestAddOn,
            refreshAccess: loadAccess
        }}>
            {children}
        </ModuleContext.Provider>
    );
};

export const useModuleContext = () => {
    const context = useContext(ModuleContext);
    if (!context) throw new Error('useModuleContext must be used within a ModuleProvider');
    return context;
};
