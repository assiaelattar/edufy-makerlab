import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../views/team-operations/education-team-operations-v1.css';
import { TeamView } from '../../views/TeamView';
import { ConfirmProvider } from '../../context/ConfirmContext';

const params = new URLSearchParams(location.search);
Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => {
  document.body.dataset.teamClipboardPayload = value.includes('Edufy sign-in\nEmail:') && value.includes('\nTemporary password:') ? 'valid' : 'invalid';
  document.body.dataset.teamClipboardOutcome = params.get('clipboard') === 'error' ? 'error' : 'success';
  if (params.get('clipboard') === 'error') throw new Error('Synthetic clipboard failure');
} } });
function App() {
  const [theme, setTheme] = useState(params.get('theme') === 'dark' ? 'dark' : 'light');
  useEffect(() => { document.body.className = 'education-ui-v1-active'; document.body.dataset.eduTheme = theme; document.documentElement.style.colorScheme = theme; }, [theme]);
  return <div className="team-fixture edu-shell-v1" data-edu-system="1"><header className="team-fixture__bar"><strong>Team · synthetic review</strong><span>No school connection or production writes</span><button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Dark theme' : 'Light theme'}</button></header><main className="edu-shell-v1__content-inner"><ConfirmProvider><TeamView /></ConfirmProvider></main></div>;
}
createRoot(document.getElementById('root')).render(<App />);
