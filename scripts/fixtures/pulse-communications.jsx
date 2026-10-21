import React from 'react';
import { createRoot } from 'react-dom/client';
import { CommunicationsView } from '../../views/CommunicationsView';
import { FixtureControls } from './pulse-communications-adapter';
import '../../components/education-ui/education-ui-v1.css';
import '../../components/layouts/education-school-themes.css';

const theme = new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light';
document.body.className = 'education-ui-v1-active';
document.body.dataset.eduTheme = theme;
document.documentElement.style.colorScheme = theme;
const Fixture = () => <div className="edu-v1 edu-shell-v1" data-edu-theme={theme} style={{ minHeight: '100vh', padding: 16, background: 'var(--edu-canvas)' }}><main className="edu-shell-v1__content-inner" style={{ maxWidth: 1320, margin: '0 auto' }}><CommunicationsView /><FixtureControls /></main></div>;
createRoot(document.getElementById('root')).render(<Fixture />);
