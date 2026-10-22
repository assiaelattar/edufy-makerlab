import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArchiveView} from '../../views/ArchiveView';
import {FixtureControls} from './archive-v1-adapter';
const initial=new URLSearchParams(location.search).get('theme')==='dark'?'dark':'light';
function App(){const [theme,setTheme]=useState(initial);useEffect(()=>{document.body.dataset.eduTheme=theme;document.body.className='education-ui-v1-active';},[theme]);return <div className="archive-fixture" data-edu-theme={theme} data-edu-system="1"><header className="archive-fixture__bar"><strong>Archive · synthetic review</strong><button onClick={()=>setTheme(theme==='light'?'dark':'light')}>Switch to {theme==='light'?'dark':'light'}</button></header><main><ArchiveView/></main><FixtureControls/></div>;}
createRoot(document.getElementById('root')).render(<App/>);
