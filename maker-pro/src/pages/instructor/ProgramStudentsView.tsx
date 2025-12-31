import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Student, Enrollment, Program } from '../../types';
import { Users, ArrowLeft, Search, Mail, ExternalLink } from 'lucide-react';

export const ProgramStudentsView = () => {
    const { programId } = useParams();
    const navigate = useNavigate();
    const [students, setStudents] = useState<Student[]>([]);
    const [program, setProgram] = useState<Program | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!programId || !db) return;

            try {
                // Fetch Program Details
                const programDoc = await getDoc(doc(db, 'programs', programId));
                if (programDoc.exists()) {
                    setProgram({ id: programDoc.id, ...programDoc.data() } as Program);
                }

                // Fetch Enrollments for this program
                const q = query(collection(db, 'enrollments'), where('programId', '==', programId), where('status', '==', 'active'));
                const enrollmentSnaps = await getDocs(q);

                const studentIds = enrollmentSnaps.docs.map(doc => doc.data().studentId);

                if (studentIds.length > 0) {
                    // Fetch Students (In chunks of 10 if necessary, but simple logic for now)
                    // Firestore 'in' query supports up to 10. If more, we need to batch or fetch individually.
                    // For safety, let's fetch individually or chunk.
                    // Actually, simpler approach for now:
                    const studentPromises = studentIds.map(id => getDoc(doc(db as any, 'students', id)));
                    const studentDocs = await Promise.all(studentPromises);

                    const loadedStudents = studentDocs
                        .filter(d => d.exists())
                        .map(d => ({ id: d.id, ...d.data() } as Student));

                    setStudents(loadedStudents);
                } else {
                    setStudents([]);
                }

            } catch (err) {
                console.error("Error loading roster:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [programId]);

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{program?.name || 'Program Roster'}</h1>
                        <p className="text-slate-500">Managing {students.length} active students</p>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6 relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search students..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                        <Users size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No students found</h3>
                        <p className="text-slate-500">Try adjusting your search or check enrollments.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredStudents.map(student => (
                            <div
                                key={student.id}
                                onClick={() => navigate(`/instructor/student/${student.id}`)}
                                className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center text-center relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="w-20 h-20 rounded-full bg-slate-100 mb-4 flex items-center justify-center text-2xl font-bold text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    {student.photoUrl ? (
                                        <img src={student.photoUrl} alt={student.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        student.name.charAt(0)
                                    )}
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{student.name}</h3>
                                <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                                    <Mail size={12} /> {student.email || 'No email'}
                                </p>

                                <div className="mt-auto w-full pt-4 border-t border-slate-100 flex justify-between items-center px-4">
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                        Active
                                    </span>
                                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1 group-hover:text-blue-500">
                                        View Profile <ExternalLink size={12} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
