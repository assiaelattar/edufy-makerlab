import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProgramsView } from '../../views/ProgramsView';
import { ModuleFixtureControls } from './pulse-programs-adapter';
import { AppProvider } from '../../context/AppContext';
import '../../components/education-ui/education-ui-v1.css';
import '../../components/education-ui/education-module-compat-v1.css';
import '../../components/education-ui/education-role-surfaces-v1.css';
import '../../components/layouts/education-school-themes.css';

const theme = new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light';
document.body.className = 'education-ui-v1-active';
document.body.dataset.eduTheme = theme;
document.documentElement.style.colorScheme = theme;
createRoot(document.getElementById('root')).render(<div className="edu-v1 edu-shell-v1" data-edu-theme={theme} style={{ minHeight: '100vh', padding: '16px', background: 'var(--edu-canvas)' }}>
  <main className="edu-shell-v1__content-inner" style={{ maxWidth: 1320, margin: '0 auto' }}><AppProvider><ProgramsView/><ModuleFixtureControls /></AppProvider></main>
</div>);
