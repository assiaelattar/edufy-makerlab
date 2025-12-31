import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Student, StudentProject } from '../../types';
import { ArrowLeft, Mail, ExternalLink, Image as ImageIcon, X, Zap } from 'lucide-react';
import { UniversalEmbed } from '../../components/UniversalEmbed';

export const InstructorStudentProfile = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState<Student | null>(null);
    const [projects, setProjects] = useState<StudentProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<StudentProject | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!studentId || !db) return;

            try {
                // Fetch Student
                const studentDoc = await getDoc(doc(db, 'students', studentId));
                if (studentDoc.exists()) {
                    setStudent({ id: studentDoc.id, ...studentDoc.data() } as Student);
                }

                // Fetch Projects
                const q = query(collection(db, 'student_projects'), where('studentId', '==', studentId), where('status', '==', 'published'));
                const projectSnaps = await getDocs(q);
                const loadedProjects = projectSnaps.docs.map(d => ({ id: d.id, ...d.data() } as StudentProject));
                setProjects(loadedProjects);

            } catch (err) {
                console.error("Error loading profile:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [studentId]);

    if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    if (!student) return <div className="p-8 text-center">Student not found</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium">
                    <ArrowLeft size={20} /> Back to Roster
                </button>

                {/* Profile Header */}
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm mb-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1 shadow-xl">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-3xl font-bold text-slate-700">
                            {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full rounded-full object-cover" /> : student.name.charAt(0)}
                        </div>
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">{student.name}</h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-500">
                            <span className="flex items-center gap-1.5"><Mail size={16} /> {student.email}</span>
                            <span className="h-4 w-px bg-slate-300"></span>
                            <span className="font-bold text-blue-600">{projects.length} Projects Shipped</span>
                        </div>
                    </div>
                </div>

                {/* Projects Grid */}
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Zap className="text-amber-500" /> Project Portfolio</h2>

                {projects.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><ImageIcon className="text-slate-300" /></div>
                        <h3 className="text-lg font-medium text-slate-900">No projects yet</h3>
                        <p className="text-slate-500">This student hasn't published any work yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(project => (
                            <div
                                key={project.id}
                                onClick={() => setSelectedProject(project)}
                                className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer"
                            >
                                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                                    {project.mediaUrls?.[0] ? (
                                        <img src={project.mediaUrls[0]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={32} /></div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white font-bold border border-white/50 px-4 py-2 rounded-full backdrop-blur-sm">View Project</span>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">{project.title}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{project.description}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {project.skillsAcquired?.slice(0, 3).map(skill => (
                                            <span key={skill} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Project Modal */}
            {selectedProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                        <button
                            onClick={() => setSelectedProject(null)}
                            className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="flex-1 overflow-y-auto">
                            {/* Hero Media */}
                            <div className="w-full bg-black">
                                {selectedProject.embedUrl ? (
                                    <div className="aspect-video">
                                        <UniversalEmbed src={selectedProject.embedUrl} title={selectedProject.title} type="video" />
                                    </div>
                                ) : (
                                    <div className="aspect-video flex items-center justify-center bg-slate-900">
                                        {selectedProject.mediaUrls?.[0] ? (
                                            <img src={selectedProject.mediaUrls[0]} className="h-full object-contain" />
                                        ) : (
                                            <span className="text-slate-500">No media available</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-8">
                                <div className="flex justify-between items-start gap-4 mb-6">
                                    <div>
                                        <h2 className="text-3xl font-bold text-slate-900 mb-2">{selectedProject.title}</h2>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{selectedProject.station} Station</span>
                                            <span className="text-slate-400 text-sm">{new Date(selectedProject.createdAt.seconds * 1000).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    {selectedProject.externalLink && (
                                        <a href={selectedProject.externalLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors">
                                            <ExternalLink size={18} /> Open Link
                                        </a>
                                    )}
                                </div>

                                <div className="prose prose-slate max-w-none mb-8">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedProject.description}</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Skills demonstrated</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProject.skillsAcquired?.map(skill => (
                                            <span key={skill} className="px-3 py-1.5 bg-blue-50 text-blue-700 font-medium rounded-lg text-sm border border-blue-100">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
