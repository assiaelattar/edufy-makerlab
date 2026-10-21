import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StaffAbsenceView } from '../../views/StaffAbsenceView';
import { useFixture } from './staff-attendance-v1-adapter';

const params = new URLSearchParams(location.search);
function App() {
  const [theme, setTheme] = useState(params.get('theme') === 'dark' ? 'dark' : 'light');
  const { dialog, pending, message } = useFixture();
  useEffect(() => { document.body.className = 'education-ui-v1-active'; document.body.dataset.eduTheme = theme; document.documentElement.style.colorScheme = theme; }, [theme]);
  return <div className="staff-fixture edu-shell-v1"><header className="staff-fixture__bar"><strong>Staff attendance · synthetic review</strong><span>No school connection or production writes</span><button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Dark theme' : 'Light theme'}</button></header><main className="edu-shell-v1__content-inner"><StaffAbsenceView /></main><aside className="staff-fixture__controls" aria-label="Synthetic action controls">
    {dialog && <div role="dialog" aria-label="Synthetic confirmation"><strong>{dialog.title}</strong><p>{dialog.message}</p><button onClick={() => dialog.resolve(true)}>{dialog.confirmText}</button><button onClick={() => dialog.resolve(false)}>{dialog.cancelText}</button></div>}
    {pending && <div role="group" aria-label="Synthetic write result"><strong>{pending.label} pending</strong><button onClick={pending.resolve}>Simulate success</button><button onClick={pending.reject}>Simulate failure</button></div>}
    <p role="status">{message}</p>
  </aside></div>;
}
createRoot(document.getElementById('root')).render(<App />);
