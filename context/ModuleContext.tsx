import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface ModuleContextType {
    isModuleEnabled: (moduleKey: 'erp' | 'makerPro' | 'sparkQuest') => boolean;
    enabledModules: {
        erp: boolean;
        makerPro: boolean;
        sparkQuest: boolean;
    };
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export const ModuleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentOrganization } = useAuth();

    // Default to strict if no org loaded yet, or permissive if desired. 
    // Secure default: all false until loaded.
    const [enabledModules, setEnabledModules] = useState({
        erp: false,
        makerPro: false,
        sparkQuest: false
    });

    useEffect(() => {
        if (currentOrganization?.modules) {
            setEnabledModules({
                erp: currentOrganization.modules.erp ?? false,
                makerPro: currentOrganization.modules.makerPro ?? false,
                sparkQuest: currentOrganization.modules.sparkQuest ?? false,
            });
        } else {
            // Fallback for logic: if logged in but no modules defined (legacy?), maybe default to true or false?
            // Safer to default to TRUE for ERP if it's the core, but let's stick to what's in the DB.
            // If strictly creating tenants now, they will have modules.
            // For the "Recreated" org, we set all to true.
            if (currentOrganization) {
                setEnabledModules({ erp: true, makerPro: true, sparkQuest: true });
            }
        }
    }, [currentOrganization]);

    const isModuleEnabled = (moduleKey: 'erp' | 'makerPro' | 'sparkQuest') => {
        return enabledModules[moduleKey];
    };

    return (
        <ModuleContext.Provider value={{ isModuleEnabled, enabledModules }}>
            {children}
        </ModuleContext.Provider>
    );
};

export const useModuleContext = () => {
    const context = useContext(ModuleContext);
    if (!context) {
        throw new Error('useModuleContext must be used within a ModuleProvider');
    }
    return context;
};
