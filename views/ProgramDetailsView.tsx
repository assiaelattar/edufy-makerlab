import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Calendar, Users, DollarSign, Clock, Search, Filter, MoreVertical, LayoutGrid, List, UserPlus, FileText, CheckCircle2, XCircle, Printer, Link as LinkIcon, Copy, Tablet, Download, ExternalLink } from 'lucide-react';
import { Program, Lead, Enrollment } from '../types';
import { formatCurrency } from '../utils/helpers';

interface ProgramDetailsViewProps {
    onEnrollLead?: (lead: Lead) => void;
    programIdProp?: string; // NEW: For Modal usage
    onClose?: () => void; // NEW: For Modal usage
    onPrintProgram?: (program: Program) => void; // NEW: Print Trigger
}

export const ProgramDetailsView: React.FC<ProgramDetailsViewProps> = ({ onEnrollLead, programIdProp, onClose, onPrintProgram }) => {
    const { programs, viewParams, navigateTo, leads, enrollments, students } = useAppContext();
    const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'students' | 'waiting-list' | 'financials' | 'resources'>('overview');
    const baseUrl = window.location.origin;

    // Get the program (Prioritize Prop -> then URL Param)
    const targetId = programIdProp || viewParams.programId;
    const program = useMemo(() =>
        programs.find(p => p.id === targetId),
        [programs, targetId]
    );

    if (!program) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p className="mb-4">Program not found (ID: {targetId})</p>
                {!programIdProp && <button onClick={() => navigateTo('programs')} className="text-blue-500 hover:underline">Return to Programs</button>}
            </div>
        );
    }

    // Derived Data
    const programLeads = leads.filter(l => (l.programId === program.id || l.interests?.includes(program.name)) && l.status !== 'converted' && l.status !== 'closed');
    const programEnrollments = enrollments.filter(e => e.programId === program.id && e.status === 'active');
    const totalRevenue = programEnrollments.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const activeClassesCount = program.grades.reduce((sum, g) => sum + g.groups.length, 0);

    // Color Helpers
    const theme = program.themeColor || 'blue';
    const bgGradient = {
        blue: 'from-blue-600 to-indigo-700',
        purple: 'from-purple-600 to-fuchsia-700',
        emerald: 'from-emerald-600 to-teal-700',
        amber: 'from-amber-500 to-orange-700',
        rose: 'from-rose-600 to-pink-700',
        cyan: 'from-cyan-600 to-blue-700',
        slate: 'from-slate-700 to-slate-900',
    }[theme] || 'from-blue-600 to-indigo-700';

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Left Column: Description & Packs */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
                                <h3 className="text-lg font-bold text-white mb-4">About Program</h3>
                                <p className="text-slate-400 leading-relaxed">
                                    {program.description || "No description provided."}
                                </p>
                                <div className="mt-6 flex gap-4">
                                    <div className="px-4 py-2 rounded-lg bg-slate-950 border border-slate-800">
                                        <div className="text-xs text-slate-500 uppercase font-bold">Duration</div>
                                        <div className="text-white font-medium">{program.duration || 'Not set'}</div>
                                    </div>
                                    <div className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800">
                                        <div className="text-xs text-slate-500 uppercase font-bold">Audience</div>
                                        <div className="text-white font-medium capitalize animate-pulse">{program.targetAudience || 'All'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
                                <h3 className="text-lg font-bold text-white mb-4">Pricing Plans</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {program.packs?.map((pack, i) => (
                                        <div key={i} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-150" />
                                            <div>
                                                <h4 className="font-bold text-white">{pack.name}</h4>
                                                {pack.promoPrice && <span className="text-xs text-emerald-400 font-bold">PROMO ACTIVE</span>}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-slate-400 text-xs uppercase font-bold">Price</div>
                                                <div className="text-xl font-black text-white">{pack.promoPrice ? formatCurrency(pack.promoPrice) : formatCurrency(pack.priceAnnual || pack.price || 0)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Quick Stats */}
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
                                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Performance</h3>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-400">Capacity (Est.)</span>
                                            <span className="text-white font-bold">--</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 w-[60%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                            <div className="text-2xl font-black text-white">{programEnrollments.length}</div>
                                            <div className="text-xs text-slate-500 uppercase font-bold">Students</div>
                                        </div>
                                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                            <div className="text-2xl font-black text-amber-500">{programLeads.length}</div>
                                            <div className="text-xs text-slate-500 uppercase font-bold">Lead/Wait</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'classes':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
                        {program.grades.map(grade => (
                            <div key={grade.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors">
                                <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                                    <h4 className="font-bold text-white">{grade.name}</h4>
                                    <span className="text-xs font-bold bg-slate-800 text-slate-400 px-2 py-1 rounded-lg">{grade.groups.length} Groups</span>
                                </div>
                                <div className="p-4 space-y-2">
                                    {grade.groups.map(group => (
                                        <button
                                            key={group.id}
                                            onClick={() => navigateTo('classes', { classId: { pId: program.id, gId: grade.id, grpId: group.id } })}
                                            className="w-full flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 transition-all group active:scale-95"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full bg-${theme === 'emerald' ? 'emerald' : 'blue'}-500 shadow-[0_0_8px_currentColor]`}></div>
                                                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{group.day} - {group.time}</span>
                                            </div>
                                            <ArrowLeft className="text-slate-600 rotate-180 group-hover:text-white group-hover:translate-x-1 transition-all" size={16} />
                                        </button>
                                    ))}
                                    {grade.groups.length === 0 && (
                                        <div className="text-center py-6 text-slate-600 italic text-sm">No groups scheduled yet</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'students':
                return (
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden animate-in fade-in">
                        <table className="w-full text-left">
                            <thead className="bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">Student</th>
                                    <th className="p-4">Pack</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Enroll Date</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {programEnrollments.map(enrollment => (
                                    <tr key={enrollment.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-white">{enrollment.studentName}</div>
                                            <div className="text-xs text-slate-500">{enrollment.groupName}</div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-300">{enrollment.packName}</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Active</span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-400">{enrollment.startDate}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })} className="text-blue-400 hover:text-white text-sm font-bold">View</button>
                                        </td>
                                    </tr>
                                ))}
                                {programEnrollments.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500 italic">No active enrollments found for this program.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                );
            case 'waiting-list':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
                        {programLeads.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
                                No pre-enrollments or leads waiting.
                            </div>
                        ) : (
                            programLeads.map(lead => (
                                <div key={lead.id} className="bg-slate-900/50 border border-slate-800 hover:border-amber-500/30 rounded-xl p-5 flex flex-col gap-4 group transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 border border-slate-700 text-lg">
                                                {lead.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{lead.name}</div>
                                                <div className="text-xs text-slate-400">{lead.phone}</div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] uppercase font-bold bg-amber-500/10 text-amber-500 px-2 py-1 rounded border border-amber-500/20">
                                            {lead.status}
                                        </span>
                                    </div>

                                    <div className="bg-slate-950 p-3 rounded-lg space-y-2 border border-slate-800/50">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Slot Pref:</span>
                                            <span className="text-white font-medium">{lead.selectedSlot || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Pack:</span>
                                            <span className="text-white font-medium">{lead.selectedPack || 'N/A'}</span>
                                        </div>
                                    </div>

                                    {onEnrollLead && (
                                        <button
                                            onClick={() => onEnrollLead(lead)}
                                            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <UserPlus size={16} /> Enroll Now
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                );
            case 'financials':
                return <div className="p-8 text-center text-slate-500 italic bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">Financial Analytics Coming Soon</div>;
            case 'resources':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                        {/* Kiosk / Public Link Card */}
                        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                                    <Tablet size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Public Enrollment Kiosk</h3>
                                    <p className="text-sm text-slate-400 mt-1">Direct link for parents/students to enroll in this program.</p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-3">
                                <div className="text-xs font-bold text-slate-500 uppercase">Public URL</div>
                                <div className="text-sm text-blue-400 truncate font-mono bg-slate-900/50 p-2 rounded">
                                    {`${baseUrl}/enroll?program=${program.id}`}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => window.open(`${baseUrl}/enroll?program=${program.id}`, '_blank')}
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all active:scale-95"
                                >
                                    <ExternalLink size={18} /> Open Kiosk
                                </button>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${baseUrl}/enroll?program=${program.id}`);
                                        alert('Link copied to clipboard!');
                                    }}
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all active:scale-95 border border-slate-700"
                                >
                                    <Copy size={18} /> Copy Link
                                </button>
                            </div>
                        </div>

                        {/* Print Materials */}
                        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                                    <Printer size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Printable Materials</h3>
                                    <p className="text-sm text-slate-400 mt-1">Generate enrollment forms and schedules.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => onPrintProgram && onPrintProgram(program)}
                                    className="w-full flex items-center justify-between p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/30 rounded-xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText size={20} className="text-slate-400 group-hover:text-emerald-400" />
                                        <div className="text-left">
                                            <div className="font-bold text-slate-200 group-hover:text-white">Print Schedule & Form</div>
                                            <div className="text-xs text-slate-500">Official signup sheet with schedule</div>
                                        </div>
                                    </div>
                                    <Printer size={16} className="text-slate-600 group-hover:text-emerald-400" />
                                </button>

                                {/* Placeholder for Brochure */}
                                {program.brochureUrl ? (
                                    <a
                                        href={program.brochureUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-between p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/30 rounded-xl transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Download size={20} className="text-slate-400 group-hover:text-blue-400" />
                                            <div className="text-left">
                                                <div className="font-bold text-slate-200 group-hover:text-white">Download Brochure</div>
                                                <div className="text-xs text-slate-500">Program PDF Guide</div>
                                            </div>
                                        </div>
                                        <ExternalLink size={16} className="text-slate-600 group-hover:text-blue-400" />
                                    </a>
                                ) : (
                                    <div className="w-full p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl flex items-center gap-3 opacity-50 cursor-not-allowed">
                                        <Download size={20} className="text-slate-600" />
                                        <div className="text-left">
                                            <div className="font-bold text-slate-500">Brochure (Not Uploaded)</div>
                                            <div className="text-xs text-slate-600">Upload feature coming soon</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div className="flex flex-col pb-6">
            {/* Header */}
            <div
                className={`relative rounded-3xl overflow-hidden mb-6 p-8 min-h-[200px] flex flex-col justify-end bg-gradient-to-br ${bgGradient} bg-cover bg-center`}
                style={program.thumbnailUrl ? { backgroundImage: `url(${program.thumbnailUrl})` } : {}}
            >
                {/* Decorative - Only show if no image */}
                {!program.thumbnailUrl && <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>}

                {/* Overlay for readability if image exists */}
                {program.thumbnailUrl && <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>}

                <div className="relative z-10">
                    {!programIdProp ? (
                        <button onClick={() => navigateTo('programs')} className="flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors group">
                            <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors"><ArrowLeft size={16} /></div>
                            <span className="font-bold text-sm">Back to Programs</span>
                        </button>
                    ) : (
                        <div className="mb-4" />
                    )}

                    <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                        <div>
                            {/* Partner Badge */}
                            {program.partnerName && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                                    {program.partnerLogoUrl && <img src={program.partnerLogoUrl} alt="Partner" className="w-5 h-5 rounded-full object-cover" />}
                                    <span className="text-xs font-bold text-white uppercase tracking-wide">{program.partnerName} <span className="opacity-50 mx-1">x</span> {programs.length > 0 ? 'MakerLab' : ''}</span>
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold uppercase tracking-wider text-white border border-white/20">{program.type}</span>
                                {totalRevenue > 0 && (
                                    <span className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-lg text-xs font-bold uppercase tracking-wider text-emerald-100 border border-emerald-500/20 flex items-center gap-1">
                                        <DollarSign size={12} /> Revenue: {formatCurrency(totalRevenue)}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm">{program.name}</h1>
                        </div>

                        <div className="flex gap-3">
                            {/* <button className="px-5 py-2.5 bg-white text-blue-600 rounded-xl font-bold shadow-xl hover:bg-slate-50 transition-all active:scale-95">Edit Program</button> */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto gap-4 mb-6 pb-2 custom-scrollbar">
                {[
                    { id: 'overview', label: 'Overview', icon: LayoutGrid },
                    { id: 'classes', label: 'Active Classes', icon: Clock, count: activeClassesCount },
                    { id: 'students', label: 'Enrollments', icon: Users, count: programEnrollments.length },
                    { id: 'waiting-list', label: 'Waiting List', icon: List, count: programLeads.length },
                    { id: 'resources', label: 'Resources', icon: LinkIcon }, // NEW
                    { id: 'financials', label: 'Financials', icon: DollarSign },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-lg scale-105' : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-800 text-slate-300'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 pr-2">
                {renderTabContent()}
            </div>
        </div>
    );
};
