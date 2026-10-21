import React from 'react';
import { createRoot } from 'react-dom/client';
import { FinanceView } from '../../views/FinanceView';
import { ActivityDetailsView } from '../../views/ActivityDetailsView';
import { FixtureStatus, recordFixtureMessage, useAppContext } from './finance-v1-adapter';

const params = new URLSearchParams(location.search);
const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
document.body.className = 'education-ui-v1-active';
document.body.dataset.eduTheme = theme;
document.documentElement.style.colorScheme = theme;
const originalOpen = window.open.bind(window);
window.open = (url, ...options) => {
  if (String(url).startsWith('https://wa.me/')) {
    recordFixtureMessage('Synthetic WhatsApp reminder prepared; no external site opened.');
    return { closed: false };
  }
  return originalOpen(url, ...options);
};
const FixtureView = () => {
  const { currentView } = useAppContext();
  return currentView === 'activity-details'
    ? <ActivityDetailsView />
    : <FinanceView onRecordPayment={() => { document.getElementById('fixture-payment-action').textContent = 'Record payment requested (synthetic boundary)'; }} />;
};
createRoot(document.getElementById('root')).render(
  <div data-edu-theme={theme} className="edu-v1 edu-shell-v1" style={{ minHeight: '100vh', padding: 16, background: 'var(--ds-canvas)' }}>
    <main className="edu-shell-v1__content-inner" style={{ maxWidth: 1320, margin: '0 auto' }}>
      <FixtureView />
    </main>
    <div id="fixture-payment-action" role="status" style={{ maxWidth: 1320, margin: 'auto' }} />
    <FixtureStatus />
  </div>
);
