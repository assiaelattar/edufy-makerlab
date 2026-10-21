import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClassesView } from '../../views/ClassesView';
import { AppProvider } from './classes-ds-adapter';
import { ClassesFixtureControls, recordAction } from './classes-ds-adapter';
import '../../components/education-ui/education-ui-v1.css';
import '../../components/education-ui/education-module-compat-v1.css';
import '../../components/education-ui/education-role-surfaces-v1.css';
import '../../components/layouts/education-school-themes.css';

const theme = new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light';
const qa = new URLSearchParams(location.search);
const printResult = qa.get('print');
if (printResult) window.open = () => {
  if (printResult === 'blocked') return null;
  if (printResult === 'error') throw new Error('Synthetic print failure');
  recordAction('Synthetic print window opened');
  return { document:{ write:() => {}, close:() => {} } };
};
const copyResult = qa.get('copy');
if (copyResult) Object.defineProperty(navigator, 'clipboard', { configurable:true, value:{ writeText:async text => {
  if (copyResult === 'error') throw new Error('Synthetic clipboard failure');
  recordAction(`Synthetic email copy: ${text.split(',').length} recipient(s)`);
} } });
document.body.className = 'education-ui-v1-active';
document.body.dataset.eduTheme = theme;
document.documentElement.style.colorScheme = theme;
createRoot(document.getElementById('root')).render(<div className="edu-v1 edu-shell-v1" data-edu-system="1" data-edu-theme={theme} style={{ minHeight:'100vh', padding:16, background:'var(--ds-canvas)' }}>
  <main className="edu-shell-v1__content-inner" style={{ maxWidth:1320, margin:'0 auto' }}><AppProvider><ClassesView onEnroll={(p,g,c) => recordAction(`Synthetic enrollment requested: ${p}/${g}/${c}`)} /><ClassesFixtureControls /></AppProvider></main>
</div>);
