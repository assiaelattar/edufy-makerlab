import { config } from '../utils/config';

export type SparkQuestExchangeResult = {
    customToken: string;
    projectId: string | null;
    organizationId: string;
};

const exchangeUrl = () => new URL('/api/app-bridge/sparkquest/exchange', config.erpUrl).toString();

export const exchangeSparkQuestLaunch = async (launchCode: string): Promise<SparkQuestExchangeResult> => {
    if (!/^[A-Za-z0-9_-]{43}$/.test(launchCode)) {
        throw new Error('The Edufy launch link is invalid.');
    }

    const response = await fetch(exchangeUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchCode }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.customToken) {
        throw new Error(payload?.error?.message || 'The Edufy launch link is invalid or expired.');
    }
    return {
        customToken: payload.customToken,
        projectId: payload.projectId || null,
        organizationId: payload.organizationId,
    };
};
