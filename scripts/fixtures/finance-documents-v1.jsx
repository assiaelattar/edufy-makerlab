import React from 'react';
import { createRoot } from 'react-dom/client';
import { FinanceDocumentsPanel } from '../../components/finance/FinanceDocumentsPanel';
import { FixtureStatus } from './finance-documents-v1-adapter';
import '../../components/education-ui/education-system-v1.css';
import '../../views/finance/education-finance-v1.css';
import '../../views/finance/education-finance-focus.css';
import '../../views/finance/education-finance-playful.css';

const theme = new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light';
document.body.className = 'education-ui-v1-active';
document.body.dataset.eduTheme = theme;
document.documentElement.style.colorScheme = theme;
createRoot(document.getElementById('root')).render(
  <div data-edu-theme={theme} data-edu-system="1" className="edu-v1 edu-finance-v1"
    style={{ minHeight: '100vh', padding: 16, background: 'var(--ds-canvas)' }}>
    <main style={{ maxWidth: 1320, margin: '0 auto' }}><FinanceDocumentsPanel /></main>
    <FixtureStatus />
  </div>
);
