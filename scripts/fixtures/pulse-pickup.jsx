import React from 'react';
import { createRoot } from 'react-dom/client';
import { PickupView } from '../../views/PickupView';
import { ModuleFixtureControls } from './pulse-pickup-adapter';
import { AppProvider } from '../../context/AppContext';
import '../../components/education-ui/education-ui-v1.css';
import '../../components/education-ui/education-module-compat-v1.css';
import '../../components/education-ui/education-role-surfaces-v1.css';
import '../../components/layouts/education-school-themes.css';

const theme = new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light';
document.body.className = 'education-ui-v1-active';
document.body.dataset.eduTheme = theme;
document.documentElement.style.colorScheme = theme;
createRoot(document.getElementById('root')).render(<div className="edu-v1 edu-shell-v1" data-edu-theme={theme} data-edu-system="1" style={{ minHeight: '100vh', padding: '16px', background: 'var(--ds-canvas)' }}>
  <main className="edu-shell-v1__content-inner" style={{ maxWidth: 1320, margin: '0 auto' }}><nav aria-label="Design preview" style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',padding:'4px 12px 16px',fontFamily:'Nunito,sans-serif',fontWeight:900}}><span>EDUFY <span style={{fontWeight:600,fontSize:12}}> / Pickup synthetic QA</span></span><span style={{display:'flex',gap:16,fontSize:13}}><a href="?theme=light" aria-current={theme==='light'?'page':undefined}>Light</a><a href="?theme=dark" aria-current={theme==='dark'?'page':undefined}>Dark</a></span></nav><AppProvider><PickupView/><ModuleFixtureControls /></AppProvider></main>
</div>);
