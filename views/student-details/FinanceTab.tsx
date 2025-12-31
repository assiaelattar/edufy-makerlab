
import React from 'react';
import { Wallet, CreditCard, Eye, Pencil, Trash2, Printer, Share2, CheckCircle2 } from 'lucide-react';
import { Payment, Enrollment, Student } from '../../types';
import { formatCurrency, formatDate, generateReceipt } from '../../utils/helpers';

interface FinanceTabProps {
  studentPayments: Payment[];
  studentEnrollments: Enrollment[];
  student: Student;
  onRecordPayment: (id: string) => void;
  navigateTo: (view: string, params: any) => void;
  setEditPayment: (payment: Payment) => void;
  initiateDeletePayment: (payment: Payment) => void;
  settings: any;
  onShareReceipt: (paymentId: string) => void;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({
  studentPayments,
  studentEnrollments,
  student,
  onRecordPayment,
  navigateTo,
  setEditPayment,
  initiateDeletePayment,
  settings,
  onShareReceipt
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" /> Payment History
        </h3>
        <button
          onClick={() => onRecordPayment(student.id)}
          className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors shadow-lg shadow-emerald-900/20"
        >
          <CreditCard size={14} /> Record Payment
        </button>
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-950/50 text-slate-500 uppercase text-xs font-bold tracking-wider">
            <tr>
              <th className="p-4 pl-6 rounded-tl-xl">Date</th>
              <th className="p-4">Method</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4">Shared</th>
              <th className="p-4 text-right rounded-tr-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {studentPayments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/30 group transition-colors">
                <td className="p-4 pl-6 text-slate-300 font-medium">{formatDate(p.date)}</td>
                <td className="p-4 capitalize text-slate-400">{p.method}</td>
                <td className="p-4 font-mono text-emerald-400 font-bold">{formatCurrency(p.amount)}</td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border tracking-wide ${['paid', 'verified'].includes(p.status)
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : p.status === 'check_bounced'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                  >
                    {p.status === 'check_bounced' ? 'Rejected' : p.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4">
                  {p.receiptSharedAt ? (
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium" title={`Shared on ${formatDate(((p.receiptSharedAt as any).toDate ? (p.receiptSharedAt as any).toDate() : p.receiptSharedAt) as any)}`}>
                      <CheckCircle2 size={14} /> Shared
                    </div>
                  ) : (
                    <span className="text-slate-600 text-xs">-</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button
                      onClick={() => {
                        if (!student.parentPhone) return alert("Parent phone number missing");
                        let phone = student.parentPhone.replace(/[^0-9]/g, '');
                        if (phone.startsWith('0')) phone = '212' + phone.substring(1);
                        const enrollment = studentEnrollments.find((e) => e.id === p.enrollmentId);
                        const msg = `🧾 Payment Receipt - MakerLab Academy\n\nDate: ${formatDate(p.date)}\nAmount: ${formatCurrency(p.amount)}\nMethod: ${p.method}\nProgram: ${enrollment?.programName || 'Unknown Program'}\n\nThank you for your payment!`;

                        onShareReceipt(p.id);
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-green-400 transition-colors"
                      title="Share Receipt (WhatsApp)"
                    >
                      <Share2 size={16} />
                    </button>
                    <button
                      onClick={() => navigateTo('activity-details', { activityId: { type: 'payment', id: p.id } })}
                      className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => setEditPayment(p)}
                      className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="Edit Record"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => {
                        const enrollment = studentEnrollments.find((e) => e.id === p.enrollmentId);
                        generateReceipt(p, enrollment, student, settings);
                      }}
                      className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                      title="Print Receipt"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      onClick={() => initiateDeletePayment(p)}
                      className="p-2 hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {studentPayments.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600">
                      <Wallet size={24} />
                    </div>
                    <p>No payments recorded yet.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="md:hidden grid grid-cols-1 gap-3 p-4">
        {studentPayments.map((p) => (
          <div
            key={p.id}
            className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-emerald-500/30 transition-colors"
            onClick={() => navigateTo('activity-details', { activityId: { type: 'payment', id: p.id } })}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-bold text-emerald-400 text-lg font-mono">{formatCurrency(p.amount)}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>{formatDate(p.date)}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                  <span className="capitalize text-slate-400">{p.method}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border tracking-wide ${['paid', 'verified'].includes(p.status)
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : p.status === 'check_bounced'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                >
                  {p.status === 'check_bounced' ? 'Rejected' : p.status.replace('_', ' ')}
                </span>
                {p.receiptSharedAt && (
                  <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-medium">
                    <CheckCircle2 size={12} /> Shared
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!student.parentPhone) return alert("Parent phone number missing");
                  let phone = student.parentPhone.replace(/[^0-9]/g, '');
                  if (phone.startsWith('0')) phone = '212' + phone.substring(1);
                  const enrollment = studentEnrollments.find((e) => e.id === p.enrollmentId);
                  const msg = `Receipt for payment of ${formatCurrency(p.amount)} received on ${formatDate(p.date)}. Thank you!`;

                  onShareReceipt(p.id);
                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-green-400 rounded-lg border border-slate-800 transition-colors"
              >
                <Share2 size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateTo('activity-details', { activityId: { type: 'payment', id: p.id } });
                }}
                className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg border border-slate-800 transition-colors"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditPayment(p);
                }}
                className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const enrollment = studentEnrollments.find((e) => e.id === p.enrollmentId);
                  generateReceipt(p, enrollment, student, settings);
                }}
                className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-lg border border-slate-800 transition-colors"
              >
                <Printer size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  initiateDeletePayment(p);
                }}
                className="p-2 bg-slate-950 hover:bg-red-900/20 text-slate-400 hover:text-red-400 rounded-lg border border-slate-800 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
