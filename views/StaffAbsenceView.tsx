
import React, { useState, useMemo, useEffect } from 'react';
import { ClipboardCheck, Search, Filter, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight, User, BarChart2, FileText, Settings, Download, Save, Hash } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { StaffAttendanceRecord } from '../types';
import { calculateDuration, formatDuration, timeToMinutes } from '../utils/timeUtils';

export const StaffAbsenceView = () => {
    const { teamMembers, staffAttendanceRecords, settings } = useAppContext();
    const { currentOrganization, userProfile } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'daily' | 'management'>('daily');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [localData, setLocalData] = useState<Record<string, { arrival?: string, departure?: string }>>({});
    const [saving, setSaving] = useState<string | null>(null);

    // Filter staff members (excluding students/parents/guests)
    const staffList = useMemo(() => {
        return teamMembers.filter(u =>
            !['student', 'parent', 'guest'].includes(u.role) &&
            (searchQuery === '' || u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.role.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [teamMembers, searchQuery]);

    const dayOfWeek = useMemo(() => {
        const d = new Date(selectedDate);
        return d.toLocaleDateString('en-US', { weekday: 'long' });
    }, [selectedDate]);

    const getRecord = (staffId: string) => {
        return staffAttendanceRecords.find(r => r.staffId === staffId && r.date === selectedDate);
    };

    // Initialize local inputs from existing records
    useEffect(() => {
        const newLocal: Record<string, { arrival?: string, departure?: string }> = {};
        staffList.forEach(s => {
            const record = getRecord(s.uid!);
            newLocal[s.uid!] = {
                arrival: record?.arrivalTime || '',
                departure: record?.departureTime || ''
            };
        });
        setLocalData(newLocal);
    }, [selectedDate, staffAttendanceRecords]);

    // Attendance Handler
    const handleMarkAttendance = async (staffId: string, staffName: string, status: StaffAttendanceRecord['status'], overrides?: Partial<StaffAttendanceRecord>) => {
        if (!db || !currentOrganization?.id) {
            console.error("Missing DB or Org ID", { db: !!db, org: currentOrganization?.id });
            return;
        }

        setSaving(staffId);
        const recordId = `staff_${selectedDate}_${staffId}`;
        const existingRecord = getRecord(staffId);

        // Calculate Totals if times are present
        const arrival = overrides?.arrivalTime || localData[staffId]?.arrival || existingRecord?.arrivalTime;
        const departure = overrides?.departureTime || localData[staffId]?.departure || existingRecord?.departureTime;

        let totalMinutes = 0;
        let overtimeMinutes = 0;

        if (arrival && departure) {
            totalMinutes = calculateDuration(arrival, departure);

            // Get work hours for this staff or global default
            const staff = teamMembers.find(u => u.uid === staffId);
            const workStart = staff?.workHours?.start || settings.defaultWorkHours?.start || '09:00';
            const workEnd = staff?.workHours?.end || settings.defaultWorkHours?.end || '18:00';
            const expectedMinutes = calculateDuration(workStart, workEnd);

            overtimeMinutes = totalMinutes - expectedMinutes;
        }

        try {
            const recordData: any = {
                date: selectedDate,
                staffId,
                staffName,
                status,
                type: 'staff', // This is CRITICAL for permissions and filtering
                organizationId: currentOrganization.id,
                markedBy: userProfile?.uid,
                createdAt: serverTimestamp(),
                ...overrides,
                totalMinutes,
                overtimeMinutes,
                arrivalTime: arrival || null,
                departureTime: departure || null
            };

            await setDoc(doc(db, 'attendance', recordId), recordData, { merge: true });

            // Auto-update status to 'late' if arrival is after scheduled start
            if (status === 'present' && arrival) {
                const staff = teamMembers.find(u => u.uid === staffId);
                const workStart = staff?.workHours?.start || settings.defaultWorkHours?.start || '09:00';
                if (timeToMinutes(arrival) > timeToMinutes(workStart) + 5) { // 5 min grace period
                    await setDoc(doc(db, 'attendance', recordId), { status: 'late' }, { merge: true });
                }
            }

        } catch (err: any) {
            console.error("Error marking staff attendance", err);
            alert(`Failed to save. \nError: ${err.message || err.toString()}\n\nDebug Info:\nOrg: ${currentOrganization?.id}\nUser: ${userProfile?.uid}\nRecord: ${recordId}`);
        } finally {
            setSaving(null);
        }
    };

    const dailyStats = useMemo(() => {
        let present = 0, absent = 0, late = 0, leave = 0;
        staffList.forEach(s => {
            const status = getRecord(s.uid!)?.status || 'unmarked';
            if (status === 'present') present++;
            else if (status === 'absent') absent++;
            else if (status === 'late') late++;
            else if (status === 'leave') leave++;
        });
        return { total: staffList.length, present, absent, late, leave };
    }, [staffList, staffAttendanceRecords, selectedDate]);

    const monthlyReport = useMemo(() => {
        const report: Record<string, { present: number, absent: number, late: number, leave: number, totalMinutes: number, overtime: number }> = {};
        staffList.forEach(s => {
            report[s.uid!] = { present: 0, absent: 0, late: 0, leave: 0, totalMinutes: 0, overtime: 0 };
        });
        staffAttendanceRecords.forEach(r => {
            if (r.date.startsWith(selectedMonth) && report[r.staffId]) {
                if (r.status === 'present') report[r.staffId].present++;
                else if (r.status === 'absent') report[r.staffId].absent++;
                else if (r.status === 'late') report[r.staffId].late++;
                else if (r.status === 'leave') report[r.staffId].leave++;

                report[r.staffId].totalMinutes += (r.totalMinutes || 0);
                report[r.staffId].overtime += (r.overtimeMinutes || 0);
            }
        });
        return report;
    }, [staffList, staffAttendanceRecords, selectedMonth]);

    return (
        <div className="space-y-6 pb-24 md:pb-8 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-6 rounded-2xl border border-slate-800 gap-4 shadow-xl">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <ClipboardCheck className="w-8 h-8 text-red-500" /> Staff Attendance
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Track presence, clock-in/out, and overtime logic.</p>
                </div>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button onClick={() => setActiveTab('daily')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'daily' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}><Calendar size={18} /> Daily</button>
                    <button onClick={() => setActiveTab('management')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'management' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}><BarChart2 size={18} /> Management</button>
                </div>
            </div>

            {activeTab === 'daily' ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        {[
                            { label: 'Team', val: dailyStats.total, icon: User, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                            { label: 'Present', val: dailyStats.present, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                            { label: 'Late', val: dailyStats.late, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                            { label: 'Absent', val: dailyStats.absent, icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
                            { label: 'On Leave', val: dailyStats.leave, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <div>
                                    <div className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{stat.label}</div>
                                    <div className="text-xl font-black text-white">{stat.val}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input type="text" placeholder="Search team..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white outline-none focus:border-red-500/50" />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
                            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 text-slate-400 hover:text-white"><ChevronRight className="rotate-180" /></button>
                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer px-4" />
                            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 text-slate-400 hover:text-white"><ChevronRight /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {staffList.map(item => {
                            const record = getRecord(item.uid!);
                            const status = record?.status || 'unmarked';
                            const overtime = record?.overtimeMinutes || 0;

                            return (
                                <div key={item.uid} className={`bg-slate-900 border rounded-[1.5rem] p-5 transition-all relative group ${status !== 'unmarked' ? 'border-red-500/30 ring-1 ring-red-500/20' : 'border-slate-800 shadow-lg shadow-black/40'}`}>
                                    {saving === item.uid && <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] rounded-[1.5rem] z-20 flex items-center justify-center"><Clock className="animate-spin text-red-500" /></div>}

                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white">{item.name[0]}</div>
                                            <div>
                                                <h4 className="font-bold text-white text-md tracking-tight leading-none mb-1">{item.name}</h4>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.role}</span>
                                            </div>
                                        </div>
                                        {status !== 'unmarked' && (
                                            <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${status === 'present' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : status === 'absent' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                {status}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 mb-4">
                                        {[
                                            { id: 'present', icon: CheckCircle2, color: 'bg-emerald-600' },
                                            { id: 'late', icon: Clock, color: 'bg-amber-500' },
                                            { id: 'absent', icon: XCircle, color: 'bg-red-600' },
                                            { id: 'leave', icon: FileText, color: 'bg-purple-600' }
                                        ].map(btn => (
                                            <button
                                                key={btn.id}
                                                onClick={() => handleMarkAttendance(item.uid!, item.name, btn.id as any)}
                                                className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all border ${status === btn.id ? `${btn.color} text-white border-white/20 shadow-lg scale-105 z-10` : 'bg-slate-950 text-slate-600 border-slate-800 hover:border-slate-600'}`}
                                            >
                                                <btn.icon size={18} />
                                                <span className="text-[8px] font-bold uppercase">{btn.id[0]}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Clock In/Out Section */}
                                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-3">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-[9px] text-slate-500 font-black uppercase mb-1">Arrival</label>
                                                <input
                                                    type="time"
                                                    value={localData[item.uid!]?.arrival || ''}
                                                    onChange={e => setLocalData({ ...localData, [item.uid!]: { ...localData[item.uid!], arrival: e.target.value } })}
                                                    onBlur={() => handleMarkAttendance(item.uid!, item.name, status === 'unmarked' ? 'present' : status)}
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white outline-none focus:border-red-500/50 transition-colors"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[9px] text-slate-500 font-black uppercase mb-1">Departure</label>
                                                <input
                                                    type="time"
                                                    value={localData[item.uid!]?.departure || ''}
                                                    onChange={e => setLocalData({ ...localData, [item.uid!]: { ...localData[item.uid!], departure: e.target.value } })}
                                                    onBlur={() => handleMarkAttendance(item.uid!, item.name, status === 'unmarked' ? 'present' : status)}
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white outline-none focus:border-red-500/50 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {(record?.totalMinutes || 0) > 0 && (
                                            <div className="flex justify-between items-center pt-1 border-t border-slate-800/50">
                                                <div className="text-[10px] text-slate-400 font-medium">Worked: <span className="text-white font-bold">{formatDuration(record!.totalMinutes!)}</span></div>
                                                <div className={`text-[10px] font-black uppercase tracking-wider ${overtime >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {overtime > 0 ? `+${formatDuration(overtime)} OT` : overtime < 0 ? `${formatDuration(overtime)} SHORT` : 'ON TIME'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800">
                        <div><h3 className="text-xl font-black text-white">Monthly Hours Report</h3><p className="text-slate-400 text-sm">Aggregated working time and overtime summary.</p></div>
                        <div className="flex gap-3">
                            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-950 border border-slate-800 text-white px-4 py-2 rounded-xl text-sm outline-none" />
                            <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm border border-slate-700 transition-all font-bold"><Download size={18} /> Export</button>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-950"><tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none"><th className="px-6 py-4">Name</th><th className="px-6 py-4 text-center">Days</th><th className="px-6 py-4 text-center">Total Time</th><th className="px-6 py-4 text-center">Net Overtime</th><th className="px-6 py-4 text-center">Attendance %</th></tr></thead>
                            <tbody className="divide-y divide-slate-800">
                                {staffList.map(staff => {
                                    const stats = monthlyReport[staff.uid!] || { present: 0, absent: 0, late: 0, leave: 0, totalMinutes: 0, overtime: 0 };
                                    const totalEntries = stats.present + stats.absent + stats.late;
                                    const attendanceRate = totalEntries > 0 ? Math.round(((stats.present + stats.late) / totalEntries) * 100) : 0;
                                    return (
                                        <tr key={staff.uid} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white text-sm">{staff.name}</td>
                                            <td className="px-6 py-4 text-center font-bold text-slate-300 text-xs">{stats.present + stats.late}d</td>
                                            <td className="px-6 py-4 text-center font-black text-white text-xs whitespace-nowrap">{formatDuration(stats.totalMinutes)}</td>
                                            <td className={`px-6 py-4 text-center font-black text-xs whitespace-nowrap ${stats.overtime >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{stats.overtime > 0 ? '+' : ''}{formatDuration(stats.overtime)}</td>
                                            <td className="px-6 py-4 text-center text-sm font-black text-white">{attendanceRate}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
