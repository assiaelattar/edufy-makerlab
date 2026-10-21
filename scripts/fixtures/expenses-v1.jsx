import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ExpensesView } from '../../views/ExpensesView';
import { events } from './expenses-v1-adapter';
const params = new URLSearchParams(location.search);
function App() {
  const [theme, setTheme] = useState(params.get('theme') === 'dark' ? 'dark' : 'light');
  const [log, setLog] = useState([...events]);
  useEffect(() => { document.body.className = 'education-ui-v1-active'; document.body.dataset.eduTheme = theme; document.documentElement.style.colorScheme = theme; }, [theme]);
  useEffect(() => { const update = () => setLog([...events]); window.addEventListener('synthetic-write', update); return () => window.removeEventListener('synthetic-write', update); }, []);
  return <div className="expenses-fixture edu-shell-v1" data-edu-system="1"><header className="expenses-fixture__bar"><strong>Expenses · synthetic review</strong><span>No school connection or production writes</span><button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Dark theme' : 'Light theme'}</button></header><main className="edu-shell-v1__content-inner"><ExpensesView /></main><output className="expenses-fixture__events" aria-label="Synthetic events">{log.slice(-3).join(' · ')}</output></div>;
}
createRoot(document.getElementById('root')).render(<App />);
