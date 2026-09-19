const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

export const config = {
    sparkQuestUrl: import.meta.env.VITE_SPARKQUEST_URL
        || (isLocalHost ? 'http://127.0.0.1:5174' : 'https://sparkquest-makerlab.vercel.app'),

    erpUrl: import.meta.env.VITE_ERP_URL
        || (isLocalHost ? 'http://127.0.0.1:5173' : 'https://edufy-makerlab.vercel.app')
};
