
import React from 'react';
import { Calendar, XCircle, AlertCircle } from 'lucide-react';
import { AttendanceRecord } from '../../types';
import { formatDate } from '../../utils/helpers';

interface AttendanceTabProps {
  studentAttendance: AttendanceRecord[];
  absenceCount: number;
  lateCount: number;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  studentAttendance,
  absenceCount,
  lateCount,
}) => {
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
