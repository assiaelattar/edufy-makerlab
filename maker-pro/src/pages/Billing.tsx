import React, { useEffect, useState } from 'react';
import { CreditCard, DollarSign, Calendar, CheckCircle, Clock } from 'lucide-react';
import { useStudentData } from '../hooks/useStudentData';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

interface Payment {
    id: string;
    amount: number;
    date: string;
    status: 'paid' | 'pending' | 'overdue';
    description: string;
}

export function Billing() {
    const { studentProfile } = useAuth();
    const { activeCourse } = useStudentData();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPayments = async () => {
            if (!db || !studentProfile) return;
            try {
                // Fetching payments from 'payments' collection linked to student
                // In a real app, this would be `query(collection(db, 'payments'), where('studentId', '==', studentProfile.id))`
                // For now, let's look for actual data or simulate if empty
                const q = query(collection(db, 'payments'), where('studentId', '==', studentProfile.id), orderBy('date', 'desc'));
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
                    setPayments(data);
                } else {
                    setPayments([]);
                }
            } catch (err) {
                console.error("Error loading payments", err);
                setPayments([]); // Clear payments on error to avoid showing stale/mock data 
            } finally {
                setLoading(false);
            }
        };
        fetchPayments();
    }, [studentProfile]);

    const totalPaid = payments.filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
    const pendingAmount = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Billing & Payments</h1>
                <p className="text-slate-600 mt-1">Manage your tuition fees and view payment history.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-50 rounded-xl text-green-600">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-bold">Total Paid</p>
                            <h3 className="text-2xl font-bold text-slate-900">{totalPaid.toLocaleString()} MAD</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-bold">Outstanding</p>
                            <h3 className="text-2xl font-bold text-slate-900">{pendingAmount.toLocaleString()} MAD</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-brand-600 p-6 rounded-2xl shadow-lg shadow-brand-500/20 text-white relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                    <p className="font-bold mb-2 relative z-10">Next Payment Due</p>
                    <h3 className="text-2xl font-bold mb-4 relative z-10">Dec 01, 2023</h3>
                    <button className="w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-sm font-bold transition-colors border border-white/20">
                        View Details
                    </button>
                </div>
            </div>

            {/* Payment History */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                        <DollarSign size={20} className="text-slate-400" />
                        Transaction History
                    </h2>
                    <button className="text-sm font-bold text-brand-600 hover:text-brand-700">Download Statement</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading history...</td>
                                </tr>
                            ) : payments.map(payment => (
                                <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{payment.description}</td>
                                    <td className="px-6 py-4 text-slate-500 text-sm flex items-center gap-2">
                                        <Calendar size={14} />
                                        {payment.date}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900">{payment.amount.toLocaleString()} MAD</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${payment.status === 'paid' ? 'bg-green-500' :
                                                payment.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                                                }`} />
                                            {payment.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {payments.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400">
                        No transactions found.
                    </div>
                )}
            </div>
        </div>
    );
}
