import { resolveAppUrl } from '../../utils/appUrls';

export const config = {
    sparkQuestUrl: resolveAppUrl({
        configuredUrl: import.meta.env.VITE_SPARKQUEST_URL,
        currentHostname: window.location.hostname,
        localUrl: 'http://127.0.0.1:5174',
        productionUrl: 'https://sparkquest-makerlab.vercel.app'
    }),

    erpUrl: resolveAppUrl({
        configuredUrl: import.meta.env.VITE_ERP_URL,
        currentHostname: window.location.hostname,
        localUrl: 'http://127.0.0.1:5173',
        productionUrl: 'https://edufy-makerlab.vercel.app'
    })
};
