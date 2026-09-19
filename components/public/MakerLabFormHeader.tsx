import React from 'react';

export const MakerLabFormHeader = ({ label }: { label: string }) => (
    <header className="ml-form-header">
        <div>
            <a href="https://space.makerlab.academy/" aria-label="MakerLab Academy — accueil" className="ml-form-logo">
                <svg viewBox="110 275 1360 535" role="img" aria-label="MakerLab Academy"><image href="/images/makerlab-academy-logo-full.webp" width="1568" height="1045" /></svg>
            </a>
            <span>{label}<small>MakerLab Academy</small></span>
        </div>
    </header>
);
