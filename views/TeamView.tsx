
import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, MessageSquare, CheckSquare, Plus, Send, User, Clock, Trash2, Edit2, UserCircle, Calendar, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { addDoc, collection, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Task, Project } from '../types';
import { formatDate } from '../utils/helpers';

export const TeamView = () => {
    const { tasks, projects, chatMessages, teamMembers } = useAppContext();
    const { userProfile, can } = useAuth();
    const [activeTab, setActiveTab] = useState<'tasks' | 'projects' | 'chat'>('tasks');

    // --- TASK STATE ---
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskForm, setTaskForm] = useState<Partial<Task>>({ title: '', description: '', status: 'todo', priority: 'medium', assignedTo: '' });
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // --- PROJECT STATE ---
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [projectForm, setProjectForm] = useState<Partial<Project>>({ name: '', description: '', status: 'active' });
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // --- CHAT STATE ---
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeTab === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, activeTab]);

    // Handle auto-assignment logic when opening modal
    useEffect(() => {
        if (isTaskModalOpen && !editingTask && !can('team.assign_others') && userProfile) {
            setTaskForm(prev => ({ ...prev, assignedTo: userProfile.uid }));
        }
    }, [isTaskModalOpen, userProfile, editingTask, can]);

    // --- TASK HANDLERS ---
    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !userProfile) return;
        try {
            const assignedUser = teamMembers.find(u => u.uid === taskForm.assignedTo);
            const taskData = {
                ...taskForm,
                projectId: selectedProject ? selectedProject.id : taskForm.projectId, // Auto-link if inside project
                assignedToName: assignedUser ? assignedUser.name : 'Unassigned'
            };

            if (editingTask) {
                await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
            } else {
                await addDoc(collection(db, 'tasks'), {
                    ...taskData,
                    createdAt: serverTimestamp()
                });
            }
            setIsTaskModalOpen(false);
            setEditingTask(null);
            setTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', assignedTo: '' });
        } catch (err) { console.error(err); }
    };

    const moveTask = async (taskId: string, direction: 'next' | 'prev') => {
        if (!db) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const flow: Task['status'][] = ['todo', 'in_progress', 'done'];
        const currentIndex = flow.indexOf(task.status);
        let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        // Bounds check
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= flow.length) newIndex = flow.length - 1;

        if (flow[newIndex] !== task.status) {
            await updateDoc(doc(db, 'tasks', taskId), { status: flow[newIndex] });
        }
    };

    const deleteTask = async (taskId: string) => {
        if (!db || !confirm('Delete this task?')) return;
        await deleteDoc(doc(db, 'tasks', taskId));
    };

    // --- PROJECT HANDLERS ---
    const handleSaveProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        try {
            await addDoc(collection(db, 'projects'), { ...projectForm, createdAt: serverTimestamp() });
            setIsProjectModalOpen(false);
            setProjectForm({ name: '', description: '', status: 'active' });
        } catch (err) { console.error(err); }
    };

    const handleDeleteProject = async (id: string) => {
        if (!db || !confirm("Delete this project? Tasks linked to it will remain but lose the link.")) return;
        await deleteDoc(doc(db, 'projects', id));
        setSelectedProject(null);
    };

    // --- CHAT HANDLERS ---
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !userProfile || !newMessage.trim()) return;
        try {
            await addDoc(collection(db, 'messages'), {
                text: newMessage,
                senderId: userProfile.uid,
                senderName: userProfile.name,
                createdAt: serverTimestamp(),
                type: 'text'
            });
            setNewMessage('');
        } catch (err) { console.error(err); }
    };

    // --- RENDER HELPERS ---
    const renderTaskCard = (task: Task) => {
        const assignee = teamMembers.find(u => u.uid === task.assignedTo);
        const isAssignedToMe = task.assignedTo === userProfile?.uid;

        // Allow edit if admin OR assigned to me OR unassigned
        const canEdit = can('team.assign_others') || isAssignedToMe || !task.assignedTo;

        return (
            <div key={task.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm hover:border-slate-600 transition-all group relative flex flex-col gap-2 mb-3">
                <div className="flex justify-between items-start">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider ${task.priority === 'high' ? 'bg-red-950/30 text-red-400 border-red-900/50' : task.priority === 'medium' ? 'bg-amber-950/30 text-amber-400 border-amber-900/50' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {task.priority}
                    </span>
                    {canEdit && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setEditingTask(task); setTaskForm(task); setIsTaskModalOpen(true); }} className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors"><Edit2 size={12} /></button>
                            <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"><Trash2 size={12} /></button>
                        </div>
                    )}
                </div>

                <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{task.title}</h4>
                    {task.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3 mt-1">
                    <div className="flex items-center gap-2" title={task.assignedToName}>
                        {assignee ? (
                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white font-bold">{assignee.name.charAt(0)}</div>
                        ) : (
                            <UserCircle size={16} />
                        )}
                        <span className="truncate max-w-[80px]">{assignee ? (assignee.name || '').split(' ')[0] : 'Unassigned'}</span>
                    </div>

                    {canEdit && (
                        <div className="flex gap-1">
                            {task.status !== 'todo' && (
                                <button onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'prev'); }} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition-colors" title="Move Back">
                                    <ArrowLeft size={12} />
                                </button>
                            )}
                            {task.status !== 'done' && (
                                <button onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'next'); }} className="p-1.5 bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white rounded-md transition-colors" title="Move Forward">
                                    <ArrowRight size={12} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-24 md:pb-8 md:h-full flex flex-col animate-in fade-in slide-in-from-right-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4 shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Briefcase className="w-6 h-6 text-orange-500" /> Team Workspace</h2>
                    <p className="text-slate-500 text-sm">Collaborate, track tasks, and manage projects.</p>
                </div>
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => { setActiveTab('tasks'); setSelectedProject(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'tasks' && !selectedProject ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><CheckSquare size={16} /> Board</button>
                    <button onClick={() => { setActiveTab('projects'); setSelectedProject(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'projects' || selectedProject ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><Briefcase size={16} /> Projects</button>
                    <button onClick={() => { setActiveTab('chat'); setSelectedProject(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><MessageSquare size={16} /> Chat</button>
                </div>
            </div>

            {/* KANBAN BOARD (Global) */}
            {activeTab === 'tasks' && !selectedProject && (
                <div className="md:h-full flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white">All Tasks</h3>
                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{tasks.length} Tasks</span>
                        </div>
                        <button onClick={() => { setEditingTask(null); setTaskForm({ status: 'todo', priority: 'medium' }); setIsTaskModalOpen(true); }} className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-orange-900/20"><Plus size={16} /> New Task</button>
                    </div>

                    <div className="flex-1 overflow-x-auto pb-2">
                        <div className="flex gap-6 min-w-[900px] md:h-full">
                            {['todo', 'in_progress', 'done'].map(status => {
                                const statusTasks = tasks.filter(t => t.status === status);
                                return (
                                    <div key={status} className="flex-1 flex flex-col h-full">
                                        <div className={`p-3 rounded-t-xl font-bold text-sm uppercase tracking-wider flex justify-between border-b-2 ${status === 'todo' ? 'bg-slate-900/80 text-slate-400 border-slate-700' : status === 'in_progress' ? 'bg-blue-900/20 text-blue-400 border-blue-500' : 'bg-emerald-900/20 text-emerald-400 border-emerald-500'}`}>
                                            {status.replace('_', ' ')}
                                            <span className="bg-slate-950 px-2 rounded text-xs flex items-center border border-slate-800">{statusTasks.length}</span>
                                        </div>
                                        <div className="flex-1 bg-slate-900/30 border-x border-b border-slate-800 rounded-b-xl p-3 overflow-y-auto custom-scrollbar">
                                            {statusTasks.length === 0 && (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs italic">
                                                    <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-2 opacity-50">
                                                        {status === 'todo' ? <CheckSquare size={20} /> : status === 'in_progress' ? <Clock size={20} /> : <CheckCircle2 size={20} />}
                                                    </div>
                                                    No tasks
                                                </div>
                                            )}
                                            {statusTasks.map(renderTaskCard)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* PROJECTS VIEW */}
            {(activeTab === 'projects' || selectedProject) && (
                <div className="md:h-full flex flex-col min-h-0">
                    {selectedProject ? (
                        /* PROJECT DETAIL VIEW */
                        <div className="flex flex-col md:h-full animate-in fade-in slide-in-from-bottom-4">
                            <button onClick={() => setSelectedProject(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors w-fit"><ArrowLeft size={16} /> Back to Projects</button>

                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 shadow-lg shrink-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h1 className="text-2xl font-bold text-white">{selectedProject.name}</h1>
                                            <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${selectedProject.status === 'active' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50' : 'bg-slate-800 text-slate-400'}`}>{selectedProject.status.replace('_', ' ')}</span>
                                        </div>
                                        <p className="text-slate-400 text-sm max-w-2xl">{selectedProject.description || "No description provided."}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingTask(null); setTaskForm({ projectId: selectedProject.id, status: 'todo', priority: 'medium' }); setIsTaskModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20">
                                            <Plus size={14} /> Add Project Task
                                        </button>
                                        <button onClick={() => handleDeleteProject(selectedProject.id)} className="bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 px-3 py-2 rounded-lg text-xs font-bold border border-slate-700 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-6 mt-6 pt-6 border-t border-slate-800 text-sm">
                                    <div className="flex items-center gap-2 text-slate-300"><CheckSquare size={16} className="text-blue-400" /> {tasks.filter(t => t.projectId === selectedProject.id).length} Tasks Total</div>
                                    <div className="flex items-center gap-2 text-slate-300"><CheckCircle2 size={16} className="text-emerald-400" /> {tasks.filter(t => t.projectId === selectedProject.id && t.status === 'done').length} Completed</div>
                                    {selectedProject.dueDate && <div className="flex items-center gap-2 text-slate-300"><Calendar size={16} className="text-orange-400" /> Due {formatDate(selectedProject.dueDate)}</div>}
                                </div>
                            </div>

                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 shrink-0">Project Tasks</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/20 p-2 rounded-xl">
                                {tasks.filter(t => t.projectId === selectedProject.id).length === 0 ? (
                                    <div className="p-10 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">No tasks linked to this project yet.</div>
                                ) : (
                                    tasks.filter(t => t.projectId === selectedProject.id).map(renderTaskCard)
                                )}
                            </div>
                        </div>
                    ) : (
                        /* PROJECTS GRID */
                        <div className="md:flex-1 md:overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                                <button onClick={() => setIsProjectModalOpen(true)} className="border-2 border-dashed border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 hover:border-orange-500 hover:text-orange-400 transition-colors min-h-[180px] group bg-slate-900/30 hover:bg-slate-900">
                                    <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg"><Plus size={24} /></div>
                                    <span className="font-bold">New Project</span>
                                </button>
                                {projects.map(project => {
                                    const projectTasks = tasks.filter(t => t.projectId === project.id);
                                    const completed = projectTasks.filter(t => t.status === 'done').length;
                                    const progress = projectTasks.length > 0 ? (completed / projectTasks.length) * 100 : 0;

                                    return (
                                        <div key={project.id} onClick={() => setSelectedProject(project)} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col shadow-sm hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/10 transition-all cursor-pointer group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{project.name}</h3>
                                                <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${project.status === 'active' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50' : 'bg-slate-800 text-slate-400'}`}>{project.status.replace('_', ' ')}</span>
                                            </div>
                                            <p className="text-sm text-slate-400 mb-4 flex-1 line-clamp-2">{project.description}</p>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span>Progress</span>
                                                    <span>{Math.round(progress)}%</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                                </div>
                                                <div className="flex justify-between items-center pt-3 border-t border-slate-800 mt-3">
                                                    <div className="text-xs text-slate-500 flex items-center gap-1"><CheckSquare size={12} /> {completed}/{projectTasks.length} Tasks</div>
                                                    {project.dueDate && <div className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={12} /> {formatDate(project.dueDate)}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CHAT VIEW */}
            {activeTab === 'chat' && (
                <div className="flex flex-col h-[70vh] md:h-[calc(100vh-220px)] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2"><MessageSquare size={18} className="text-blue-400" /> Team Chat</h3>
                        <div className="flex -space-x-2">
                            {teamMembers.slice(0, 5).map(m => (
                                <div key={m.email} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-slate-300" title={m.name}>
                                    {m.name.charAt(0)}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/50">
                        {chatMessages.map(msg => {
                            const isMe = msg.senderId === userProfile?.uid;
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-end gap-2 max-w-[85%]">
                                        {!isMe && <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 mb-1 shrink-0">{msg.senderName.charAt(0)}</div>}
                                        <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-500 mt-1 px-2">
                                        {!isMe && <span className="font-bold mr-1">{msg.senderName}</span>}
                                        {msg.createdAt ? new Date((msg.createdAt as any).toMillis ? (msg.createdAt as any).toMillis() : msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                    </span>
                                </div>
                            )
                        })}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
                        <input
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white focus:border-blue-500 outline-none placeholder:text-slate-600"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button type="submit" disabled={!newMessage.trim()} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            )}

            {/* Task Modal */}
            <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={editingTask ? "Edit Task" : "New Task"}>
                <form onSubmit={handleSaveTask} className="space-y-4">
                    <div><label className="block text-xs text-slate-400 mb-1">Title</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} /></div>
                    <div><label className="block text-xs text-slate-400 mb-1">Description</label><textarea className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white h-24 resize-none" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-slate-400 mb-1">Priority</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                        <div><label className="block text-xs text-slate-400 mb-1">Status</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value as any })}><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Assign To</label>
                        {can('team.assign_others') ? (
                            <select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}>
                                <option value="">-- Unassigned --</option>
                                {teamMembers.map(u => <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>)}
                            </select>
                        ) : (
                            <div className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 text-sm cursor-not-allowed">
                                {userProfile?.name || 'Me'} (Locked)
                            </div>
                        )}
                    </div>
                    {/* Only show project selector if NOT in detailed project view */
                        !selectedProject && projects.length > 0 && (
                            <div><label className="block text-xs text-slate-400 mb-1">Link to Project</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={taskForm.projectId} onChange={e => setTaskForm({ ...taskForm, projectId: e.target.value })}><option value="">-- None --</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                        )}
                    <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold transition-colors">Save Task</button>
                </form>
            </Modal>

            {/* Project Modal */}
            <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="New Project">
                <form onSubmit={handleSaveProject} className="space-y-4">
                    <div><label className="block text-xs text-slate-400 mb-1">Project Name</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} /></div>
                    <div><label className="block text-xs text-slate-400 mb-1">Description</label><textarea className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white h-24 resize-none" value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} /></div>
                    <div><label className="block text-xs text-slate-400 mb-1">Due Date</label><input type="date" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={projectForm.dueDate} onChange={e => setProjectForm({ ...projectForm, dueDate: e.target.value })} /></div>
                    <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold transition-colors">Create Project</button>
                </form>
            </Modal>
        </div>
    );
};
