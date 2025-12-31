import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Access the exposed electron API
// const bridge = (window as any).sparkquest; 

interface SessionContextType {
    isActive: boolean;
    timeLeft: number;
    sessionUrl: string | null;
    sessionTool: string | null; // Added
    startSession: (url: string, durationMinutes?: number, toolName?: string) => void;
    endSession: () => void;
    formatTime: (seconds: number) => string;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [sessionUrl, setSessionUrl] = useState<string | null>(null);
    const [sessionTool, setSessionTool] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    const endSession = useCallback(() => {
        setIsActive(false);
        setSessionUrl(null);
        setSessionTool(null);
        setTimeLeft(0);
    }, []);

    const startSession = useCallback((url: string, durationMinutes: number = 30, toolName?: string) => {
        setIsActive(true);
        setSessionUrl(url);
        setSessionTool(toolName || null);
        setTimeLeft(durationMinutes * 60);
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        endSession();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft, endSession]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <SessionContext.Provider value={{ isActive, timeLeft, sessionUrl, sessionTool, startSession, endSession, formatTime }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};
