import React from 'react';
import { createRoot } from 'react-dom/client';
import { AbsenceView } from '../../views/AbsenceView';
import { AttendanceTab } from '../../views/student-details/AttendanceTab';
import { FaceAttendanceView } from '../../views/apps/FaceAttendanceView';
import { FixtureControls } from './pulse-attendance-adapter';
import { AppProvider } from '../../context/AppContext';
import '../../components/education-ui/education-ui-v1.css';
import '../../components/education-ui/education-module-compat-v1.css';
import '../../components/education-ui/education-role-surfaces-v1.css';
import '../../components/layouts/education-school-themes.css';
import '../../views/student-details/education-student-details-v1.css';

const params = new URLSearchParams(location.search);
const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
const page = params.get('page') || 'register';
const history = params.get('scenario') === 'empty' ? [] : [
  { id:'synthetic-present', date:'2026-10-13', studentId:'fixture-learner', status:'present' },
  { id:'synthetic-late', date:'2026-10-06', studentId:'fixture-learner', status:'late' },
  { id:'synthetic-excused', date:'2026-09-29', studentId:'fixture-learner', status:'excused' },
  { id:'synthetic-absent', date:'2026-09-22', studentId:'fixture-learner', status:'absent' }
];
document.body.className = 'education-ui-v1-active';
document.body.dataset.eduTheme = theme;
document.documentElement.style.colorScheme = theme;
createRoot(document.getElementById('root')).render(<div className="edu-v1 edu-shell-v1" data-edu-theme={theme} style={{ minHeight: '100vh', padding: '16px', background: 'var(--edu-canvas)' }}>
  <main className="edu-shell-v1__content-inner" style={{ maxWidth: 1320, margin: '0 auto' }}><AppProvider>{page === 'history'
    ? <div className="edu-v1 edu-student-details-v1" data-edu-system="1"><AttendanceTab studentAttendance={history} absenceCount={history.filter(record => record.status === 'absent').length} lateCount={history.filter(record => record.status === 'late').length} student={{ id:'fixture-learner', name:'Morgan Example', parentName:'Parent Example', parentPhone:'' }} settings={{}} /></div>
    : page === 'face' ? <FaceAttendanceView /> : <AbsenceView />}
    {page === 'register' && <FixtureControls />}</AppProvider></main>
</div>);
