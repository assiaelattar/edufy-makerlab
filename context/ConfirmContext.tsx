import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertModal, AlertVariant } from '../components/AlertModal';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: AlertVariant;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    alert: (title: string, message: string, variant?: AlertVariant) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '' });
    const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);
    const [isAlert, setIsAlert] = useState(false);

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setOptions(opts);
            setIsOpen(true);
            setIsAlert(false);
            setResolveRef(() => resolve);
        });
    }, []);

    const alert = useCallback((title: string, message: string, variant: AlertVariant = 'info'): Promise<void> => {
        return new Promise((resolve) => {
            setOptions({ title, message, variant, confirmText: 'OK' });
            setIsOpen(true);
            setIsAlert(true);
            setResolveRef(() => () => resolve());
        });
    }, []);

    const handleConfirm = () => {
        if (resolveRef) resolveRef(true);
        setIsOpen(false);
    };

    const handleCancel = () => {
        if (resolveRef) resolveRef(false);
        setIsOpen(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm, alert }}>
            {children}
            <AlertModal
                isOpen={isOpen}
                onClose={isAlert ? handleConfirm : handleCancel}
                onConfirm={handleConfirm}
                title={options.title}
                message={options.message}
                confirmText={options.confirmText}
                cancelText={options.cancelText}
                variant={options.variant}
                isAlert={isAlert}
            />
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};
