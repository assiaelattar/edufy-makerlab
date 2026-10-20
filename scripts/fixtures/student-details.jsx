import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {StudentDetailsView} from '../../views/StudentDetailsView';
import {FixtureStatus} from './student-details-adapter';
import '../../components/education-ui/education-module-compat-v1.css';
import '../../components/education-ui/education-role-surfaces-v1.css';
import '../../components/layouts/education-school-themes.css';

const query=new URLSearchParams(location.search);
function App(){
 const [theme,setTheme]=useState(query.get('theme')==='dark'?'dark':'light');
 const [notice,setNotice]=useState('');
 useEffect(()=>{document.body.className='education-ui-v1-active';document.body.dataset.eduTheme=theme;document.documentElement.style.colorScheme=theme;},[theme]);
 return <div data-edu-system="1" data-edu-theme={theme} className="student-fixture-page edu-v1 edu-shell-v1">
   <header className="student-fixture-toolbar"><div><strong>Student Details · Design System v1</strong><small>Example School · isolated synthetic records</small></div><button onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?'Dark theme':'Light theme'}</button></header>
   <StudentDetailsView onEditStudent={()=>setNotice('Synthetic edit')} onQuickEnroll={()=>setNotice('Enrollment wizard opens from the parent app; use the separate forms preview.')} onRecordPayment={()=>setNotice('Payment form opens from the parent app; this preview performs no financial write.')} />
   {notice&&<p role="status" className="student-fixture-notice">{notice}</p>}
   <FixtureStatus />
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
