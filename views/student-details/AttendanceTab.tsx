import React from 'react';
import { AlertCircle, Calendar, CheckCircle2, Clock3, MessageCircle, Printer, XCircle } from 'lucide-react';
import { AppSettings, AttendanceRecord, Student } from '../../types';
import { formatDate, generateAttendanceReportPrint } from '../../utils/helpers';
import { useConfirm } from '../../context/ConfirmContext';
import { AtlasActionButton, AtlasEmptyState, AtlasSectionHeader } from '../../components/atlas/AtlasSurface';

interface AttendanceTabProps {
  studentAttendance: AttendanceRecord[];
  absenceCount: number;
  lateCount: number;
  student: Student;
  settings: AppSettings;
}

const statusStyles: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  absent: { label: 'Absent', icon: XCircle, className: 'border-red-400/25 bg-red-500/10 text-red-300' },
  late: { label: 'Late', icon: AlertCircle, className: 'border-amber-300/25 bg-amber-400/10 text-amber-200' },
  present: { label: 'Present', icon: CheckCircle2, className: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' },
  excused: { label: 'Excused', icon: Clock3, className: 'border-sky-400/20 bg-sky-500/10 text-sky-300' }
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
    <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/55">
      <div className="p-4">
        <AtlasSectionHeader
          title="Attendance history"
          description={`${studentAttendance.length} recorded session${studentAttendance.length === 1 ? '' : 's'} for this student`}
          icon={Calendar}
          meta={(
            <div className="flex items-center gap-1.5">
              {absenceCount > 0 && <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">{absenceCount} absent</span>}
              {lateCount > 0 && <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">{lateCount} late</span>}
            </div>
          )}
          actions={(
            <>
              <AtlasActionButton icon={Printer} disabled={studentAttendance.length === 0} title={studentAttendance.length === 0 ? 'A report needs at least one attendance record' : 'Print attendance report'} onClick={() => generateAttendanceReportPrint(student, studentAttendance, absenceCount, lateCount, settings)}>Print report</AtlasActionButton>
              <AtlasActionButton icon={MessageCircle} variant="primary" disabled={studentAttendance.length === 0} title={studentAttendance.length === 0 ? 'An attendance summary needs at least one record' : 'Share attendance summary'} onClick={handleWhatsApp}>Share</AtlasActionButton>
            </>
          )}
        />
      </div>

      {studentAttendance.length === 0 ? (
        <div className="p-4 pt-0">
          <AtlasEmptyState icon={Calendar} title="No attendance recorded" description="Attendance entries will appear here after this student joins a marked session." />
        </div>
      ) : (
        <div className="divide-y divide-white/5 border-t border-white/10">
          {studentAttendance.map(record => {
            const status = statusStyles[record.status] || statusStyles.present;
            const StatusIcon = status.icon;
            return (
              <div key={record.id} className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white/[0.025]">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-200">{formatDate(record.date)}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.className}`}>
                  <StatusIcon size={13} /> {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
