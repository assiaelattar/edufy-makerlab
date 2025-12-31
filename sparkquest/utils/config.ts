export const config = {
    // Logic: If on localhost, point to localhost. Else point to production.
    sparkQuestUrl: window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://sparkquest-makerlab.vercel.app',

    erpUrl: window.location.hostname === 'localhost'
        ? 'http://localhost:5173'
        : 'https://edufy-makerlab.vercel.app'
};
