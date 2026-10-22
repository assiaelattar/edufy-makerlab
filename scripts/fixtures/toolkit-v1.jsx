import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ToolkitView } from '../../views/ToolkitView';
import { ConfirmProvider } from '../../context/ConfirmContext';

const params=new URLSearchParams(location.search);
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__toolkitEvents.push(`clipboard: ${value}`);if(params.get('clipboard')==='error')throw new Error('Synthetic clipboard failure');}}});
function App(){
  const [theme,setTheme]=useState(params.get('theme')==='dark'?'dark':'light');
  useEffect(()=>{document.body.className='education-ui-v1-active';document.body.dataset.eduTheme=theme;document.documentElement.style.colorScheme=theme;},[theme]);
  return <div className="toolkit-fixture edu-shell-v1" data-edu-system="1"><header className="toolkit-fixture__bar"><strong>Toolkit · synthetic review</strong><span>No school connection or production writes</span><button type="button" onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?'Dark theme':'Light theme'}</button></header><main className="edu-shell-v1__content-inner"><ConfirmProvider><ToolkitView /></ConfirmProvider></main></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
