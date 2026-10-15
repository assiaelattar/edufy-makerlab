import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

type AtlasBootScreenProps = {
    message?: string;
    error?: string | null;
    onSignOut?: () => void;
};

export const AtlasBootScreen = ({
    message = 'Preparing your academy workspace',
    error,
    onSignOut
}: AtlasBootScreenProps) => {
    const [isTakingLonger, setIsTakingLonger] = useState(false);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => setIsTakingLonger(true), 8000);
        return () => window.clearTimeout(timeoutId);
    }, []);

    return (
        <div className="atlas-boot-screen" role={error ? 'alert' : 'status'} aria-live="polite" aria-label={error || message}>
            <div className="atlas-boot-grid" aria-hidden="true" />

            <div className="atlas-boot-content">
                <div className="atlas-boot-board" aria-hidden="true">
                    <span className="atlas-boot-cell" />
                    <span className="atlas-boot-cell" />
                    <span className="atlas-boot-cell" />
                    <span className="atlas-boot-cell" />
                    <span className="atlas-boot-cell atlas-boot-cell--core">
                        <i />
                        <i />
                        <i />
                        <i />
                    </span>
                    <span className="atlas-boot-cell" />
                    <span className="atlas-boot-cell" />
                    <span className="atlas-boot-cell" />
                    <span className="atlas-boot-cell" />
                    <span className="atlas-boot-scan" />
                </div>

                <div className="atlas-boot-brand" aria-hidden="true">
                    <span className="atlas-boot-brand__eyebrow">Edufy</span>
                    <strong>Atlas</strong>
                    <span className="atlas-boot-brand__edition">Academy OS</span>
                </div>

                <div className="atlas-boot-status">
                    {!error && <span className="atlas-boot-status__pulse" aria-hidden="true" />}
                    <span>{error || (isTakingLonger ? 'Still connecting to your workspace' : message)}</span>
                </div>

                {!error && <div className="atlas-boot-progress" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                </div>}

                {error && (
                    <div className="atlas-boot-recovery">
                        <button type="button" onClick={() => window.location.reload()}>
                            <RefreshCw size={14} aria-hidden="true" />
                            Retry
                        </button>
                        {error && onSignOut && <button type="button" onClick={onSignOut}>Sign out</button>}
                    </div>
                )}
                {!error && isTakingLonger && (
                    <div className="atlas-boot-recovery">
                        <p>Your academy data is still loading. Keep this page open.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
