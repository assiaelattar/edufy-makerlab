
import React from 'react';
import { Calendar, XCircle, AlertCircle, Printer, MessageCircle } from 'lucide-react';
import { AttendanceRecord, Student, AppSettings } from '../../types';
import { formatDate, generateAttendanceReportPrint } from '../../utils/helpers';

interface AttendanceTabProps {
  studentAttendance: AttendanceRecord[];
  absenceCount: number;
  lateCount: number;
  student: Student;
  settings: AppSettings;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  studentAttendance,
  absenceCount,
  lateCount,
  student,
  settings
}) => {
  const handleWhatsApp = () => {
    if (!student.parentPhone) return alert("No parent phone number found.");
    let phone = student.parentPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '212' + phone.substring(1);
    const msg = `Hello ${student.parentName || 'Parent'}, here is an attendance summary for ${student.name}. Total Absences: ${absenceCount}. Total Lates: ${lateCount}. If you'd like a full report, please let us know. Thank you!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-red-400" /> Attendance History
        </h3>
        <div className="flex gap-2">
          {absenceCount > 0 && (
            <span className="bg-red-950/50 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-red-900/50">
              {absenceCount} Absent
            </span>
          )}
          {lateCount > 0 && (
            <span className="bg-amber-950/50 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-900/50">
              {lateCount} Late
            </span>
          )}
          <button onClick={() => generateAttendanceReportPrint(student, studentAttendance, absenceCount, lateCount, settings)} className="ml-2 p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors" title="Print Report">
            <Printer size={14} />
          </button>
          <button onClick={handleWhatsApp} className="p-1 text-slate-400 hover:text-emerald-400 bg-slate-800 hover:bg-slate-700 rounded transition-colors" title="Share via WhatsApp">
            <MessageCircle size={14} />
          </button>
        </div>
      </div>
      <div className="">
        {studentAttendance.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm italic">
            No attendance records found.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {studentAttendance.map((record) => (
              <div key={record.id} className="p-3 flex items-center justify-between hover:bg-slate-800/30">
                <div>
                  <div className="text-sm font-medium text-slate-300">{formatDate(record.date)}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                </div>
                <div>
                  {record.status === 'absent' && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-950/30 px-2 py-1 rounded border border-red-900/50">
                      <XCircle size={12} /> Absent
                    </span>
                  )}
                  {record.status === 'late' && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/30 px-2 py-1 rounded border border-amber-900/50">
                      <AlertCircle size={12} /> Late
                    </span>
                  )}
                  {record.status === 'present' && (
                    <span className="text-xs font-medium text-emerald-500">Present</span>
                  )}
                  {record.status === 'excused' && (
                    <span className="text-xs font-medium text-blue-400">Excused</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
