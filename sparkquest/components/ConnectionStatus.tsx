import React from 'react';

interface ConnectionStatusProps {
    isConnected: boolean;
    isSaving: boolean;
    error: string | null;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected, isSaving, error }) => {
    if (!isConnected || error) {
        return (
            <div className="fixed top-4 right-4 z-50 bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                {error || 'Connection Lost'}
            </div>
        );
    }

    if (isSaving) {
        return (
            <div className="fixed top-4 right-4 z-50 bg-amber-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                Saving...
            </div>
        );
    }

    return (
        <div className="fixed top-4 right-4 z-50 bg-green-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-lg flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            Synced
        </div>
    );
};
