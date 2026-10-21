import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MarketingView} from '../../views/MarketingView';
import {MarketingFixtureControls} from './marketing-v1-adapter';
import '../../components/education-ui/education-system-v1.css';
import '../../components/education-ui/education-system-v1-modules.css';
import './marketing-v1.css';
const initial=new URLSearchParams(location.search).get('theme')==='dark'?'dark':'light';
function App(){const [theme,setTheme]=useState(initial);useEffect(()=>{document.body.dataset.eduTheme=theme;document.body.className='education-ui-v1-active';},[theme]);return <div className="marketing-fixture" data-edu-system="1" data-edu-theme={theme}><header><strong>Marketing · synthetic review</strong><button onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?'Dark':'Light'} theme</button></header><main><MarketingView onEnrollLead={()=>{}}/></main><MarketingFixtureControls/></div>;}
createRoot(document.getElementById('root')).render(<App/>);
