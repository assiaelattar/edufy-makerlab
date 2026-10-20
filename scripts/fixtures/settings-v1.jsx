import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsView } from '../../views/SettingsView';
import { events } from './settings-v1-adapter';
const params = new URLSearchParams(location.search);
function App() {
  const [theme, setTheme] = useState(params.get('theme') === 'dark' ? 'dark' : 'light');
  const [log, setLog] = useState([...events]);
  useEffect(() => { document.body.className = 'education-ui-v1-active'; document.body.dataset.eduTheme = theme; document.documentElement.style.colorScheme = theme; }, [theme]);
  useEffect(() => { const update = () => setLog([...events]); window.addEventListener('synthetic-write', update); return () => window.removeEventListener('synthetic-write', update); }, []);
  return <div className="settings-fixture edu-shell-v1" data-edu-system="1"><header className="settings-fixture__bar"><strong>Settings · synthetic review</strong><span>No school connection or production writes</span><button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Dark theme' : 'Light theme'}</button></header><main className="edu-shell-v1__content-inner"><SettingsView /></main><output className="settings-fixture__events" aria-label="Synthetic events">{log.slice(-2).join(' · ')}</output></div>;
}
createRoot(document.getElementById('root')).render(<App />);
