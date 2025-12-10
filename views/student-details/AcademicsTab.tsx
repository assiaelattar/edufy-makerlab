
import React from 'react';
import { BookOpen, Plus, Pencil, ArrowRightLeft, Trash2 } from 'lucide-react';
import { Enrollment } from '../../types';
import { formatCurrency } from '../../utils/helpers';

interface AcademicsTabProps {
  studentEnrollments: Enrollment[];
  onQuickEnroll: (id: string) => void;
  navigateTo: (view: string, params: any) => void;
  setEditEnrollment: (enrollment: Enrollment) => void;
  initiateDeleteEnrollment: (id: string) => void;
  studentId: string;
}

export const AcademicsTab: React.FC<AcademicsTabProps> = ({
  studentEnrollments,
  onQuickEnroll,
  navigateTo,
  setEditEnrollment,
  initiateDeleteEnrollment,
  studentId,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
        <h3 className="font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" /> Active Enrollments
        </h3>
        <button
          onClick={() => onQuickEnroll(studentId)}
          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors shadow-lg shadow-blue-900/20"
        >
          <Plus size={14} /> New Enrollment
        </button>
      </div>
      <div className="divide-y divide-slate-800">
        {studentEnrollments.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600">
              <BookOpen size={32} />
            </div>
            <h3 className="text-slate-400 font-bold mb-1">No Active Enrollments</h3>
            <p className="text-slate-500 text-sm mb-4">Enroll this student in a program to get started.</p>
            <button onClick={() => onQuickEnroll(studentId)} className="text-blue-400 hover:text-blue-300 text-sm font-bold">
              + Enroll Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4">
            {studentEnrollments.map((e) => (
              <div key={e.id} className="group relative bg-slate-900/50 hover:bg-slate-800/50 border border-slate-800 hover:border-blue-500/30 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-900/20 text-blue-500 flex items-center justify-center border border-blue-500/20 shrink-0">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg leading-tight mb-1 group-hover:text-blue-400 transition-colors">{e.programName}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-slate-400 font-medium">{e.gradeName}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span className="text-slate-400">{e.groupName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${e.balance > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                      {e.balance > 0 ? 'Payment Due' : 'Paid'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {e.groupTime}
                  </div>
                  {e.secondGroupTime && (
                    <div className="px-2.5 py-1 rounded bg-indigo-950/30 border border-indigo-500/20 text-xs font-mono text-indigo-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      + {e.secondGroupName}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                  <div className="text-sm">
                    <span className="text-slate-500 mr-2">Tuition:</span>
                    <span className="text-white font-bold font-mono">{formatCurrency(e.totalAmount)}</span>
                    {e.balance > 0 && (
                      <span className="ml-3 text-amber-400 font-mono text-xs">
                        (Due: {formatCurrency(e.balance)})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button
                      onClick={() => setEditEnrollment(e)}
                      className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                      title="Edit Enrollment"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => navigateTo('activity-details', { activityId: { type: 'enrollment', id: e.id } })}
                      className="p-2 hover:bg-slate-700 text-slate-400 hover:text-blue-400 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <ArrowRightLeft size={16} />
                    </button>
                    <button
                      onClick={(evt) => {
                        evt.stopPropagation();
                        initiateDeleteEnrollment(e.id);
                      }}
                      className="p-2 hover:bg-red-900/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                      title="Delete Enrollment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
            }
          </div>
        )}
      </div>
    </div>
  );
};
