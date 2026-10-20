import React from 'react';
import { AlertCircle, Calendar, CheckCircle2, Clock3, MessageCircle, Printer, XCircle } from 'lucide-react';
import { AppSettings, AttendanceRecord, Student } from '../../types';
import { formatDate, generateAttendanceReportPrint } from '../../utils/helpers';
import { normalizePhoneForWhatsApp } from '../../utils/whatsappPhone';
import { useConfirm } from '../../context/ConfirmContext';
import { EducationButton, EducationIcon, EducationNotice } from '../../components/education-ui/EducationPrimitives';
import './education-student-attendance-polish.css';

interface AttendanceTabProps {
  studentAttendance: AttendanceRecord[];
  absenceCount: number;
  lateCount: number;
  student: Student;
  settings: AppSettings;
}

const statusStyles: Record<string, { label: string; icon: React.ElementType; tone: 'attention' | 'success' | 'info' }> = {
  absent: { label: 'Absent', icon: XCircle, tone: 'attention' },
  late: { label: 'Late', icon: AlertCircle, tone: 'attention' },
  present: { label: 'Present', icon: CheckCircle2, tone: 'success' },
  excused: { label: 'Excused', icon: Clock3, tone: 'info' }
};
const unknownStatus = { label: 'Unrecognized', icon: AlertCircle, tone: 'info' } as const;

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  studentAttendance,
  absenceCount,
  lateCount,
  student,
  settings
}) => {
  const { alert: showAlert } = useConfirm();
  const hasRecords = studentAttendance.length > 0;
  const parentPhoneReady = Boolean(normalizePhoneForWhatsApp(student.parentPhone));

  const handleWhatsApp = async () => {
    const phone = normalizePhoneForWhatsApp(student.parentPhone);
    if (!phone) {
      await showAlert('Parent phone missing', 'Add a valid parent phone number before sharing the attendance summary.', 'warning');
      return;
    }

    const message = `Hello ${student.parentName || 'Parent'}, here is an attendance summary for ${student.name}. Total absences: ${absenceCount}. Total late arrivals: ${lateCount}. Please contact us if you would like the full report.`;
    const shareWindow = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    if (!shareWindow) {
      await showAlert('WhatsApp did not open', 'Allow pop-ups for Edufy, then try sharing the attendance summary again.', 'warning');
      return;
    }
    try { shareWindow.opener = null; } catch { /* Browser already isolated the new tab. */ }
  };

  return (
    <section className="edu-student-surface edu-student-surface--attendance edu-student-attendance" aria-labelledby="student-attendance-title">
      <header className="edu-student-attendance__header">
        <div className="edu-student-attendance__heading">
          <EducationIcon icon={Calendar} accent="blue" />
          <div>
            <h3 id="student-attendance-title">Attendance history</h3>
            <p>{studentAttendance.length} recorded session{studentAttendance.length === 1 ? '' : 's'} for this learner</p>
          </div>
        </div>
        <div className="edu-student-attendance__actions" role="group" aria-label="Attendance actions">
          <EducationButton icon={Printer} disabled={!hasRecords} title={!hasRecords ? 'A report needs at least one attendance record' : 'Print attendance report'} onClick={() => generateAttendanceReportPrint(student, studentAttendance, absenceCount, lateCount, settings)}>Print report</EducationButton>
          <EducationButton icon={MessageCircle} variant="primary" disabled={!hasRecords} title={!hasRecords ? 'An attendance summary needs at least one record' : 'Share attendance summary'} onClick={handleWhatsApp}>Share summary</EducationButton>
        </div>
      </header>

      {hasRecords && <div className="edu-student-attendance__summary" role="group" aria-label="Attendance follow-up">
        <div data-tone={absenceCount > 0 ? 'attention' : 'success'}><span>Absences</span><strong>{absenceCount}</strong></div>
        <div data-tone={lateCount > 0 ? 'attention' : 'success'}><span>Late arrivals</span><strong>{lateCount}</strong></div>
        <p>{absenceCount || lateCount ? 'Review the marked sessions below before contacting the family.' : 'All recorded sessions are on track.'}</p>
      </div>}

      {hasRecords && !parentPhoneReady && <div className="edu-student-attendance__notice"><EducationNotice status="warning">Add a valid parent phone in the learner record before sharing this summary.</EducationNotice></div>}

      {hasRecords ? (
        <ol className="edu-student-attendance__history" aria-label="Recorded sessions">
          {studentAttendance.map(record => {
            const status = statusStyles[record.status] || unknownStatus;
            const StatusIcon = status.icon;
            return (
              <li key={record.id} className="edu-student-attendance__session">
                <span className="edu-student-attendance__date-icon"><Calendar size={18} aria-hidden="true" /></span>
                <div className="edu-student-attendance__date">
                  <strong>{formatDate(record.date)}</strong>
                  <small>{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}</small>
                </div>
                <span data-tone={status.tone} className="edu-student-status edu-student-attendance__status"><StatusIcon size={16} aria-hidden="true" />{status.label}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="edu-student-attendance__empty" role="status">
          <EducationIcon icon={Calendar} accent="blue" />
          <h4>No attendance recorded</h4>
          <p>Sessions will appear here after this learner joins a marked class.</p>
        </div>
      )}
    </section>
  );
};
