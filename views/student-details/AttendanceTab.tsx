import React from 'react';
import { AlertCircle, Calendar, CheckCircle2, Clock3, MessageCircle, Printer, XCircle } from 'lucide-react';
import { AppSettings, AttendanceRecord, Student } from '../../types';
import { formatDate, generateAttendanceReportPrint } from '../../utils/helpers';
import { useConfirm } from '../../context/ConfirmContext';
import { AtlasEmptyState, AtlasSectionHeader } from '../../components/atlas/AtlasSurface';
import { EducationButton, EducationStatusPill } from '../../components/education-ui/EducationPrimitives';

interface AttendanceTabProps {
  studentAttendance: AttendanceRecord[];
  absenceCount: number;
  lateCount: number;
  student: Student;
  settings: AppSettings;
}

const statusStyles: Record<string, { label: string; icon: React.ElementType; tone: 'danger' | 'warning' | 'success' | 'info' }> = {
  absent: { label: 'Absent', icon: XCircle, tone: 'danger' },
  late: { label: 'Late', icon: AlertCircle, tone: 'warning' },
  present: { label: 'Present', icon: CheckCircle2, tone: 'success' },
  excused: { label: 'Excused', icon: Clock3, tone: 'info' }
};

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  studentAttendance,
  absenceCount,
  lateCount,
  student,
  settings
}) => {
  const { alert: showAlert } = useConfirm();

  const handleWhatsApp = async () => {
    if (!student.parentPhone) {
      await showAlert('Parent phone missing', 'Add a parent phone number before sharing the attendance summary.', 'warning');
      return;
    }

    let phone = student.parentPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = `212${phone.substring(1)}`;
    const message = `Hello ${student.parentName || 'Parent'}, here is an attendance summary for ${student.name}. Total absences: ${absenceCount}. Total late arrivals: ${lateCount}. Please contact us if you would like the full report.`;
    const shareWindow = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    if (!shareWindow) {
      await showAlert('WhatsApp did not open', 'Allow pop-ups for Edufy, then try sharing the attendance summary again.', 'warning');
    }
  };

  return (
    <section className="edu-student-surface edu-student-surface--attendance overflow-hidden rounded-lg border border-white/10 bg-slate-900/55">
      <div className="p-4">
        <AtlasSectionHeader
          title="Attendance history"
          description={`${studentAttendance.length} recorded session${studentAttendance.length === 1 ? '' : 's'} for this student`}
          icon={Calendar}
          meta={(
            <div className="flex items-center gap-1.5">
              {absenceCount > 0 && <EducationStatusPill status="danger">{absenceCount} absent</EducationStatusPill>}
              {lateCount > 0 && <EducationStatusPill status="warning">{lateCount} late</EducationStatusPill>}
            </div>
          )}
          actions={(
            <>
              <EducationButton icon={Printer} disabled={studentAttendance.length === 0} title={studentAttendance.length === 0 ? 'A report needs at least one attendance record' : 'Print attendance report'} onClick={() => generateAttendanceReportPrint(student, studentAttendance, absenceCount, lateCount, settings)}>Print report</EducationButton>
              <EducationButton icon={MessageCircle} variant="primary" disabled={studentAttendance.length === 0} title={studentAttendance.length === 0 ? 'An attendance summary needs at least one record' : 'Share attendance summary'} onClick={handleWhatsApp}>Share</EducationButton>
            </>
          )}
        />
      </div>

      {studentAttendance.length === 0 ? (
        <div className="p-4 pt-0">
          <AtlasEmptyState icon={Calendar} title="No attendance recorded" description="Attendance entries will appear here after this student joins a marked session." />
        </div>
      ) : (
        <div className="edu-student-attendance-list">
          {studentAttendance.map(record => {
            const status = statusStyles[record.status] || statusStyles.present;
            const StatusIcon = status.icon;
            return (
              <div key={record.id} className="edu-student-attendance-row">
                <div className="min-w-0">
                  <div className="edu-student-attendance-row__date">{formatDate(record.date)}</div>
                  <div className="edu-student-attendance-row__weekday">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                </div>
                <span className="edu-student-attendance-row__status" data-edu-accent={record.status === 'excused' ? 'purple' : status.tone === 'danger' ? 'red' : status.tone === 'warning' ? 'orange' : status.tone === 'success' ? 'green' : 'blue'}><StatusIcon size={14} aria-hidden="true" />{status.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
