import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Ban,
    Briefcase,
    Calendar,
    CheckCircle2,
    CheckSquare,
    Clock,
    Copy,
    Edit2,
    Loader2,
    MessageSquare,
    Plus,
    Search,
    Send,
    ShieldCheck,
    UserCheck,
    UserCircle,
    UserPlus,
    Users,
    X
} from 'lucide-react';
import {
    addDoc,
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'firebase/firestore';
import { Modal } from '../components/Modal';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard,
    AtlasToolbar
} from '../components/atlas/AtlasSurface';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { db } from '../services/firebase';
import { Project, RoleType, Task, UserProfile } from '../types';
import { formatDate } from '../utils/helpers';

type TeamTab = 'directory' | 'tasks' | 'projects' | 'chat';
type StaffStatusFilter = 'all' | UserProfile['status'];

interface StaffFormState {
    name: string;
    email: string;
    role: RoleType;
    password: string;
    workStart: string;
    workEnd: string;
}

const EMPTY_STAFF_FORM: StaffFormState = {
    name: '',
    email: '',
    role: 'admission_officer',
    password: '',
    workStart: '',
    workEnd: ''
};

const STAFF_ROLES: RoleType[] = ['owner', 'admin', 'admission_officer', 'accountant', 'instructor', 'content_manager'];
const PRIVILEGED_ROLES: RoleType[] = ['owner', 'admin'];
const FEEDBACK_STYLES = {
    success: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-300/25 bg-amber-500/10 text-amber-100',
    error: 'border-red-400/25 bg-red-500/10 text-red-100',
    info: 'border-sky-400/25 bg-sky-500/10 text-sky-100'
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const plainText = (value = '') => value.replace(/<[^>]+>/g, '').trim();

const timestampLabel = (value?: unknown) => {
    if (!value) return 'Never';
    try {
        const date = typeof (value as { toDate?: () => Date }).toDate === 'function'
            ? (value as { toDate: () => Date }).toDate()
            : new Date(value as string | number | Date);
        return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return 'Never';
    }
};

export const TeamView = () => {
    const { tasks, projects, chatMessages, teamMembers, loading: appLoading } = useAppContext();
    const {
        userProfile,
        currentOrganization,
        can,
        roles,
        createSecondaryUser,
        loading: authLoading
    } = useAuth();
    const { confirm } = useConfirm();
    const orgId = currentOrganization?.id || '';
    const [activeTab, setActiveTab] = useState<TeamTab>('directory');

    const [directoryQuery, setDirectoryQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | RoleType>('all');
    const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>('all');
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
    const [staffForm, setStaffForm] = useState<StaffFormState>(EMPTY_STAFF_FORM);
    const [staffError, setStaffError] = useState('');
    const [pendingStaffAction, setPendingStaffAction] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
    const [credentialsCopyMessage, setCredentialsCopyMessage] = useState('');
    const [feedback, setFeedback] = useState<{ title: string; message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskForm, setTaskForm] = useState<Partial<Task>>({ title: '', description: '', status: 'todo', priority: 'medium', assignedTo: '' });
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskError, setTaskError] = useState('');

    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [projectForm, setProjectForm] = useState<Partial<Project>>({ name: '', description: '', status: 'active' });
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectError, setProjectError] = useState('');

    const [newMessage, setNewMessage] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const canManageTeam = can('settings.manage_team');
    const canCreateWork = can('team.create');
    const showFeedback = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => setFeedback({ title, message, type });
    const canManageMember = (member: UserProfile) => canManageTeam
        && (member.role !== 'owner' || userProfile?.role === 'owner' || userProfile?.role === 'super_admin');

    const tenantMembers = useMemo(
        () => teamMembers.filter(member => member.organizationId === orgId),
        [orgId, teamMembers]
    );
    const staffMembers = useMemo(
        () => tenantMembers
            .filter(member => STAFF_ROLES.includes(member.role))
            .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)),
        [tenantMembers]
    );
    const tenantTasks = useMemo(() => tasks.filter(task => task.organizationId === orgId), [orgId, tasks]);
    const tenantProjects = useMemo(() => projects.filter(project => project.organizationId === orgId), [orgId, projects]);
    const tenantMessages = useMemo(
        () => chatMessages.filter(message => {
            const messageOrg = (message as typeof message & { organizationId?: string }).organizationId;
            return !messageOrg || messageOrg === orgId;
        }),
        [chatMessages, orgId]
    );

    const roleLabels = useMemo(
        () => new Map(roles.map(role => [role.id, role.label])),
        [roles]
    );
    const assignableRoles = useMemo(
        () => roles.filter(role => STAFF_ROLES.includes(role.id) && (role.id !== 'owner' || userProfile?.role === 'owner' || userProfile?.role === 'super_admin')),
        [roles, userProfile?.role]
    );
    const activePrivilegedMembers = useMemo(
        () => staffMembers.filter(member => member.status === 'active' && PRIVILEGED_ROLES.includes(member.role)),
        [staffMembers]
    );
    const filteredMembers = useMemo(() => {
        const query = directoryQuery.trim().toLowerCase();
        return staffMembers.filter(member => {
            const matchesQuery = !query || `${member.name} ${member.email} ${roleLabels.get(member.role) || member.role}`.toLowerCase().includes(query);
            const matchesRole = roleFilter === 'all' || member.role === roleFilter;
            const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
            return matchesQuery && matchesRole && matchesStatus;
        });
    }, [directoryQuery, roleFilter, roleLabels, staffMembers, statusFilter]);

    const signals = useMemo(() => ({
        activeStaff: staffMembers.filter(member => member.status === 'active').length,
        disabledStaff: staffMembers.filter(member => member.status === 'disabled').length,
        openTasks: tenantTasks.filter(task => task.status !== 'done').length,
        activeProjects: tenantProjects.filter(project => project.status === 'active').length
    }), [staffMembers, tenantProjects, tenantTasks]);

    useEffect(() => {
        if (activeTab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [activeTab, tenantMessages]);

    useEffect(() => {
        if (isTaskModalOpen && !editingTask && !can('team.assign_others') && userProfile?.uid) {
            setTaskForm(previous => ({ ...previous, assignedTo: userProfile.uid }));
        }
    }, [can, editingTask, isTaskModalOpen, userProfile?.uid]);

    const assertOwnedMember = async (member: UserProfile) => {
        if (!db || !orgId || !member.uid || member.organizationId !== orgId) throw new Error('This staff profile is not available in the current organization.');
        const snapshot = await getDoc(doc(db, 'users', member.uid));
        if (!snapshot.exists() || snapshot.data().organizationId !== orgId) throw new Error('Staff ownership changed. Refresh the directory before trying again.');
        return snapshot;
    };

    const openCreateStaff = () => {
        if (!canManageTeam) return;
        setEditingMember(null);
        setStaffForm(EMPTY_STAFF_FORM);
        setStaffError('');
        setIsStaffModalOpen(true);
    };

    const openEditStaff = (member: UserProfile) => {
        if (!canManageMember(member) || member.organizationId !== orgId) return;
        setEditingMember(member);
        setStaffForm({
            name: member.name || '',
            email: member.email || '',
            role: member.role,
            password: '',
            workStart: member.workHours?.start || '',
            workEnd: member.workHours?.end || ''
        });
        setStaffError('');
        setIsStaffModalOpen(true);
    };

    const handleSaveStaff = async (event: React.FormEvent) => {
        event.preventDefault();
        setStaffError('');
        if (!db || !orgId || !canManageTeam) {
            setStaffError('You do not have permission to manage team accounts.');
            return;
        }

        const name = staffForm.name.trim();
        const email = normalizeEmail(staffForm.email);
        const hasWorkHours = Boolean(staffForm.workStart || staffForm.workEnd);
        if (name.length < 2) return setStaffError('Enter the staff member\'s full name.');
        if (!/^\S+@\S+\.\S+$/.test(email)) return setStaffError('Enter a valid work email address.');
        if (!assignableRoles.some(role => role.id === staffForm.role) && editingMember?.role !== staffForm.role) return setStaffError('You cannot assign this role.');
        if (hasWorkHours && (!staffForm.workStart || !staffForm.workEnd || staffForm.workStart >= staffForm.workEnd)) return setStaffError('Work hours require a start time earlier than the end time.');

        const duplicate = tenantMembers.find(member => member.uid !== editingMember?.uid && normalizeEmail(member.email) === email);
        if (duplicate) return setStaffError('A profile with this email already exists in this organization.');

        if (editingMember) {
            if (editingMember.uid === userProfile?.uid && editingMember.role !== staffForm.role) return setStaffError('Use another owner or administrator to change your own role.');
            const removesLastAdmin = editingMember.status === 'active'
                && PRIVILEGED_ROLES.includes(editingMember.role)
                && !PRIVILEGED_ROLES.includes(staffForm.role)
                && activePrivilegedMembers.length <= 1;
            if (removesLastAdmin) return setStaffError('Assign another active owner or administrator before changing this role.');

            setPendingStaffAction(editingMember.uid || 'editing');
            try {
                await assertOwnedMember(editingMember);
                await updateDoc(doc(db, 'users', editingMember.uid!), {
                    name,
                    role: staffForm.role,
                    workHours: hasWorkHours ? { start: staffForm.workStart, end: staffForm.workEnd } : null,
                    updatedAt: serverTimestamp(),
                    updatedBy: userProfile?.uid || null
                });
                setIsStaffModalOpen(false);
                showFeedback('Staff profile updated', `${name}'s access profile is up to date.`, 'success');
            } catch (error) {
                setStaffError(error instanceof Error ? error.message : 'Could not update this staff profile.');
            } finally {
                setPendingStaffAction(null);
            }
            return;
        }

        if (staffForm.password.length < 8) return setStaffError('Temporary passwords must contain at least 8 characters.');
        setPendingStaffAction('creating');
        let createdUid = '';
        try {
            createdUid = await createSecondaryUser(email, staffForm.password);
            await setDoc(doc(db, 'users', createdUid), {
                uid: createdUid,
                organizationId: orgId,
                email,
                name,
                role: staffForm.role,
                status: 'active',
                workHours: hasWorkHours ? { start: staffForm.workStart, end: staffForm.workEnd } : null,
                createdAt: serverTimestamp(),
                createdBy: userProfile?.uid || null
            });
            setIsStaffModalOpen(false);
            setCredentialsCopyMessage('');
            setCredentials({ email, password: staffForm.password });
            showFeedback('Account created', `${name} can sign in with the temporary credentials shown. No email was sent.`, 'success');
        } catch (error) {
            const suffix = createdUid ? ' The sign-in account may exist without a staff profile and needs administrator review.' : '';
            setStaffError(`${error instanceof Error ? error.message : 'Could not create the account.'}${suffix}`);
        } finally {
            setPendingStaffAction(null);
        }
    };

    const handleToggleStatus = async (member: UserProfile) => {
        if (!canManageMember(member) || !member.uid || pendingStaffAction) return;
        if (member.uid === userProfile?.uid) {
            showFeedback('Action blocked', 'You cannot disable your own account from this screen.', 'warning');
            return;
        }
        const nextStatus: UserProfile['status'] = member.status === 'active' ? 'disabled' : 'active';
        if (nextStatus === 'disabled' && PRIVILEGED_ROLES.includes(member.role) && activePrivilegedMembers.length <= 1) {
            showFeedback('Action blocked', 'At least one active owner or administrator is required.', 'warning');
            return;
        }
        const approved = await confirm({
            title: `${nextStatus === 'active' ? 'Activate' : 'Disable'} ${member.name}?`,
            message: nextStatus === 'active'
                ? 'This account will regain access according to its assigned role.'
                : 'This account will be denied app access until it is activated again.',
            confirmText: nextStatus === 'active' ? 'Activate account' : 'Disable account',
            cancelText: 'Cancel',
            variant: nextStatus === 'active' ? 'info' : 'warning'
        });
        if (!approved) return;

        setPendingStaffAction(member.uid);
        try {
            await assertOwnedMember(member);
            await updateDoc(doc(db, 'users', member.uid), {
                status: nextStatus,
                statusChangedAt: serverTimestamp(),
                statusChangedBy: userProfile?.uid || null
            });
            showFeedback('Account updated', `${member.name} is now ${nextStatus}.`, 'success');
        } catch (error) {
            showFeedback('Account update failed', error instanceof Error ? error.message : 'Try again after refreshing the directory.', 'error');
        } finally {
            setPendingStaffAction(null);
        }
    };

    const copyCredentials = async () => {
        if (!credentials) return;
        try {
            await navigator.clipboard.writeText(`Edufy sign-in\nEmail: ${credentials.email}\nTemporary password: ${credentials.password}`);
            setCredentialsCopyMessage('Copied. Share these credentials through a secure channel.');
        } catch {
            setCredentialsCopyMessage('Copy is unavailable. Select the credentials and copy them manually.');
        }
    };

    const canEditTask = (task: Task) => task.organizationId === orgId
        && (can('team.assign_others') || task.assignedTo === userProfile?.uid || (!task.assignedTo && canCreateWork));

    const openTask = (task?: Task, projectId?: string) => {
        if (task && !canEditTask(task)) return;
        if (!task && !canCreateWork) return;
        setEditingTask(task || null);
        setTaskError('');
        setTaskForm(task ? {
            title: task.title,
            description: plainText(task.description),
            status: task.status,
            priority: task.priority,
            assignedTo: task.assignedTo || '',
            projectId: task.projectId || '',
            dueDate: task.dueDate || ''
        } : { title: '', description: '', status: 'todo', priority: 'medium', assignedTo: '', projectId: projectId || '', dueDate: '' });
        setIsTaskModalOpen(true);
    };

    const handleSaveTask = async (event: React.FormEvent) => {
        event.preventDefault();
        setTaskError('');
        if (!db || !userProfile || !orgId) return setTaskError('The team workspace is unavailable.');
        const title = taskForm.title?.trim() || '';
        if (title.length < 2) return setTaskError('Enter a task title.');
        if (editingTask && !canEditTask(editingTask)) return setTaskError('You can only update tasks assigned to you.');
        if (!editingTask && !canCreateWork) return setTaskError('You do not have permission to create tasks.');

        const assignee = taskForm.assignedTo ? staffMembers.find(member => member.uid === taskForm.assignedTo && member.status === 'active') : undefined;
        if (taskForm.assignedTo && !assignee) return setTaskError('Choose an active staff member from this organization.');
        if (!can('team.assign_others') && taskForm.assignedTo !== userProfile.uid) return setTaskError('You can only assign tasks to yourself.');
        const project = taskForm.projectId ? tenantProjects.find(item => item.id === taskForm.projectId) : undefined;
        if (taskForm.projectId && !project) return setTaskError('Choose a project from this organization.');

        const payload = {
            title,
            description: taskForm.description?.trim() || '',
            status: taskForm.status || 'todo',
            priority: taskForm.priority || 'medium',
            assignedTo: assignee?.uid || '',
            assignedToName: assignee?.name || 'Unassigned',
            projectId: project?.id || '',
            dueDate: taskForm.dueDate || '',
            updatedAt: serverTimestamp(),
            updatedBy: userProfile.uid
        };
        try {
            if (editingTask) {
                const snapshot = await getDoc(doc(db, 'tasks', editingTask.id));
                if (!snapshot.exists() || snapshot.data().organizationId !== orgId) throw new Error('Task ownership changed.');
                await updateDoc(snapshot.ref, payload);
            } else {
                await addDoc(collection(db, 'tasks'), { ...payload, organizationId: orgId, createdAt: serverTimestamp() });
            }
            setIsTaskModalOpen(false);
            showFeedback(editingTask ? 'Task updated' : 'Task created', title, 'success');
        } catch (error) {
            setTaskError(error instanceof Error ? error.message : 'Could not save the task.');
        }
    };

    const moveTask = async (task: Task, direction: 'next' | 'prev') => {
        if (!db || !canEditTask(task)) return;
        const flow: Task['status'][] = ['todo', 'in_progress', 'done'];
        const nextIndex = Math.min(flow.length - 1, Math.max(0, flow.indexOf(task.status) + (direction === 'next' ? 1 : -1)));
        if (flow[nextIndex] === task.status) return;
        try {
            const snapshot = await getDoc(doc(db, 'tasks', task.id));
            if (!snapshot.exists() || snapshot.data().organizationId !== orgId) throw new Error('Task ownership changed.');
            await updateDoc(snapshot.ref, { status: flow[nextIndex], updatedAt: serverTimestamp(), updatedBy: userProfile?.uid || null });
        } catch (error) {
            showFeedback('Task update failed', error instanceof Error ? error.message : 'Refresh the board and try again.', 'error');
        }
    };

    const deleteTask = async (task: Task) => {
        if (!db || !canEditTask(task)) return;
        const approved = await confirm({ title: 'Delete task?', message: `"${task.title}" will be permanently removed.`, confirmText: 'Delete task', cancelText: 'Cancel', variant: 'danger' });
        if (!approved) return;
        try {
            const snapshot = await getDoc(doc(db, 'tasks', task.id));
            if (!snapshot.exists() || snapshot.data().organizationId !== orgId) throw new Error('Task ownership changed.');
            await deleteDoc(snapshot.ref);
            showFeedback('Task deleted', task.title, 'success');
        } catch (error) {
            showFeedback('Task deletion failed', error instanceof Error ? error.message : 'Refresh the board and try again.', 'error');
        }
    };

    const handleSaveProject = async (event: React.FormEvent) => {
        event.preventDefault();
        setProjectError('');
        if (!db || !orgId || !canCreateWork) return setProjectError('You do not have permission to create projects.');
        const name = projectForm.name?.trim() || '';
        if (name.length < 2) return setProjectError('Enter a project name.');
        if (tenantProjects.some(project => project.name.trim().toLowerCase() === name.toLowerCase())) return setProjectError('A project with this name already exists.');
        try {
            await addDoc(collection(db, 'projects'), {
                name,
                description: projectForm.description?.trim() || '',
                status: 'active',
                dueDate: projectForm.dueDate || '',
                organizationId: orgId,
                createdAt: serverTimestamp(),
                createdBy: userProfile?.uid || null
            });
            setIsProjectModalOpen(false);
            setProjectForm({ name: '', description: '', status: 'active' });
            showFeedback('Project created', name, 'success');
        } catch {
            setProjectError('Could not create the project. Try again.');
        }
    };

    const handleDeleteProject = async (project: Project) => {
        if (!db || !canCreateWork || project.organizationId !== orgId) return;
        const linkedTasks = tenantTasks.filter(task => task.projectId === project.id);
        if (linkedTasks.length > 450) {
            showFeedback('Project not deleted', 'This project has too many linked tasks for a safe client-side update.', 'warning');
            return;
        }
        const approved = await confirm({
            title: 'Delete project?',
            message: `${linkedTasks.length} linked task${linkedTasks.length === 1 ? '' : 's'} will remain on the board and be unlinked from this project.`,
            confirmText: 'Delete project',
            cancelText: 'Cancel',
            variant: 'danger'
        });
        if (!approved) return;
        try {
            const projectRef = doc(db, 'projects', project.id);
            const taskRefs = linkedTasks.map(task => doc(db, 'tasks', task.id));
            await runTransaction(db, async transaction => {
                const projectSnapshot = await transaction.get(projectRef);
                const taskSnapshots = await Promise.all(taskRefs.map(taskRef => transaction.get(taskRef)));
                if (!projectSnapshot.exists() || projectSnapshot.data().organizationId !== orgId) throw new Error('Project ownership changed.');
                if (taskSnapshots.some(snapshot => !snapshot.exists() || snapshot.data().organizationId !== orgId)) throw new Error('A linked task changed ownership.');
                taskSnapshots.forEach(snapshot => transaction.update(snapshot.ref, { projectId: deleteField() }));
                transaction.delete(projectRef);
            });
            setSelectedProject(null);
            showFeedback('Project deleted', `${project.name} was removed and its tasks were unlinked.`, 'success');
        } catch (error) {
            showFeedback('Project deletion failed', error instanceof Error ? error.message : 'Refresh the workspace and try again.', 'error');
        }
    };

    const handleSendMessage = async (event: React.FormEvent) => {
        event.preventDefault();
        const text = newMessage.trim();
        if (!db || !userProfile || !orgId || !text || isSendingMessage || !can('team.view')) return;
        setIsSendingMessage(true);
        try {
            await addDoc(collection(db, 'messages'), {
                organizationId: orgId,
                text: text.slice(0, 2000),
                senderId: userProfile.uid,
                senderName: userProfile.name,
                createdAt: serverTimestamp(),
                type: 'text'
            });
            setNewMessage('');
        } catch {
            showFeedback('Message not sent', 'Check your connection and try again.', 'error');
        } finally {
            setIsSendingMessage(false);
        }
    };

    const renderTaskCard = (task: Task) => {
        const assignee = staffMembers.find(member => member.uid === task.assignedTo);
        const editable = canEditTask(task);
        return (
            <article key={task.id} className="mb-3 rounded-lg border border-white/10 bg-slate-900 p-3 transition-colors hover:border-white/20">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${task.priority === 'high' ? 'border-red-400/25 bg-red-500/10 text-red-200' : task.priority === 'medium' ? 'border-amber-300/25 bg-amber-400/10 text-amber-200' : 'border-white/10 bg-white/[0.04] text-slate-400'}`}>{task.priority}</span>
                        <h4 className="mt-2 text-sm font-bold text-white">{task.title}</h4>
                        {plainText(task.description) && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{plainText(task.description)}</p>}
                    </div>
                    {editable && <button type="button" onClick={() => openTask(task)} className="rounded-lg p-2 text-slate-500 hover:bg-white/[0.05] hover:text-white" title="Edit task"><Edit2 size={14} /></button>}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
                    <span className="flex min-w-0 items-center gap-2"><UserCircle size={15} /><span className="truncate">{assignee?.name || task.assignedToName || 'Unassigned'}</span></span>
                    {editable && <span className="flex gap-1">
                        <button type="button" onClick={() => moveTask(task, 'prev')} disabled={task.status === 'todo'} className="rounded-md border border-white/10 p-1.5 hover:bg-white/[0.05] disabled:opacity-30" title="Move back"><ArrowLeft size={12} /></button>
                        <button type="button" onClick={() => moveTask(task, 'next')} disabled={task.status === 'done'} className="rounded-md border border-white/10 p-1.5 hover:bg-white/[0.05] disabled:opacity-30" title="Move forward"><ArrowRight size={12} /></button>
                    </span>}
                </div>
            </article>
        );
    };

    const renderMemberActions = (member: UserProfile) => (
        <div className="flex items-center justify-end gap-1">
            <button type="button" onClick={() => openEditStaff(member)} disabled={!canManageMember(member) || pendingStaffAction === member.uid} className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white disabled:opacity-40" title="Edit staff profile"><Edit2 size={15} /></button>
            <button type="button" onClick={() => handleToggleStatus(member)} disabled={!canManageMember(member) || pendingStaffAction === member.uid || member.uid === userProfile?.uid} className={`rounded-lg p-2 hover:bg-white/[0.05] disabled:opacity-40 ${member.status === 'active' ? 'text-amber-300' : 'text-emerald-300'}`} title={member.status === 'active' ? 'Disable account' : 'Activate account'}>
                {pendingStaffAction === member.uid ? <Loader2 size={15} className="animate-spin" /> : member.status === 'active' ? <Ban size={15} /> : <UserCheck size={15} />}
            </button>
        </div>
    );

    const tabButton = (tab: TeamTab, label: string, Icon: React.ComponentType<{ size?: number }>) => (
        <button type="button" role="tab" aria-selected={activeTab === tab} onClick={() => { setActiveTab(tab); setSelectedProject(null); }} className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-colors sm:flex-none ${activeTab === tab ? 'bg-teal-400/15 text-teal-200' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'}`}>
            <Icon size={16} /> {label}
        </button>
    );

    if (!orgId) {
        return <AtlasEmptyState icon={AlertCircle} title="Organization required" description="Select an organization before opening the team workspace." />;
    }

    return (
        <div className="flex min-h-full flex-col gap-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="ERP team operations"
                title="Team & Workspace"
                description="Manage staff access and keep projects, tasks, and team conversations connected."
                icon={Users}
                badges={<span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase text-slate-300">{staffMembers.length} staff</span>}
                actions={<div role="tablist" aria-label="Team views" className="grid w-full grid-cols-2 rounded-lg border border-white/10 bg-slate-900 p-1 sm:flex sm:w-auto">
                    {tabButton('directory', 'Directory', Users)}
                    {tabButton('tasks', 'Tasks', CheckSquare)}
                    {tabButton('projects', 'Projects', Briefcase)}
                    {tabButton('chat', 'Chat', MessageSquare)}
                </div>}
            />

            {feedback && <div role={feedback.type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${FEEDBACK_STYLES[feedback.type]}`}>
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1"><p className="font-bold">{feedback.title}</p><p className="mt-0.5 text-xs leading-5 opacity-85">{feedback.message}</p></div>
                <button type="button" onClick={() => setFeedback(null)} className="rounded-md p-1 opacity-70 hover:bg-white/10 hover:opacity-100" title="Dismiss message"><X size={15} /></button>
            </div>}

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Active staff" value={signals.activeStaff} detail="Accounts with app access" icon={UserCheck} tone="emerald" onClick={() => { setActiveTab('directory'); setStatusFilter('active'); }} />
                <AtlasSignalCard label="Disabled" value={signals.disabledStaff} detail="Access currently paused" icon={Ban} tone={signals.disabledStaff ? 'amber' : 'slate'} onClick={() => { setActiveTab('directory'); setStatusFilter(signals.disabledStaff ? 'disabled' : 'all'); }} />
                <AtlasSignalCard label="Open tasks" value={signals.openTasks} detail="Work still in motion" icon={CheckSquare} tone="blue" onClick={() => setActiveTab('tasks')} />
                <AtlasSignalCard label="Active projects" value={signals.activeProjects} detail="Current workstreams" icon={Briefcase} tone="teal" onClick={() => setActiveTab('projects')} />
            </div>

            {activeTab === 'directory' && <section className="space-y-4 rounded-lg border border-white/10 bg-slate-900/45 p-4">
                <AtlasSectionHeader title="Staff directory" description="Accounts, roles, work hours, and access state for this organization." icon={ShieldCheck} actions={canManageTeam ? <AtlasActionButton icon={UserPlus} variant="primary" onClick={openCreateStaff}>Create account</AtlasActionButton> : undefined} />
                {!canManageTeam && <div className="rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">Directory access is read-only. An owner or administrator can create accounts and change roles.</div>}
                <AtlasToolbar>
                    <label className="relative min-w-[220px] flex-1">
                        <span className="sr-only">Search staff</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="search" value={directoryQuery} onChange={event => setDirectoryQuery(event.target.value)} placeholder="Search name, email, or role" className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" />
                    </label>
                    <select aria-label="Filter by role" value={roleFilter} onChange={event => setRoleFilter(event.target.value as 'all' | RoleType)} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-teal-400/60">
                        <option value="all">All roles</option>{assignableRoles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
                    </select>
                    <select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as StaffStatusFilter)} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-teal-400/60">
                        <option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option>
                    </select>
                </AtlasToolbar>

                {(authLoading || appLoading) && staffMembers.length === 0 ? <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-slate-400"><Loader2 size={18} className="animate-spin text-teal-300" /> Loading staff directory</div> : filteredMembers.length === 0 ? <AtlasEmptyState icon={Users} title={staffMembers.length ? 'No matching staff' : 'No staff accounts yet'} description={staffMembers.length ? 'Adjust the search or filters to see more people.' : 'Create the first staff account to start assigning access and work.'} action={canManageTeam && !staffMembers.length ? <AtlasActionButton icon={UserPlus} variant="primary" onClick={openCreateStaff}>Create first account</AtlasActionButton> : undefined} /> : <>
                    <div className="hidden overflow-hidden rounded-lg border border-white/10 lg:block">
                        <table className="w-full table-fixed text-left">
                            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-500"><tr><th className="w-[34%] px-4 py-3">Staff member</th><th className="w-[20%] px-4 py-3">Role</th><th className="w-[14%] px-4 py-3">Status</th><th className="w-[18%] px-4 py-3">Last sign-in</th><th className="w-[14%] px-4 py-3 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-white/10">{filteredMembers.map(member => <tr key={member.uid || member.email} className="bg-slate-900/40 hover:bg-white/[0.025]">
                                <td className="px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-950 text-sm font-bold text-teal-200">{(member.name || member.email).charAt(0).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{member.name || 'Unnamed staff'}</span><span className="block truncate text-xs text-slate-500">{member.email}</span></span></div></td>
                                <td className="px-4 py-3 text-sm text-slate-300">{roleLabels.get(member.role) || member.role.replace('_', ' ')}</td>
                                <td className="px-4 py-3"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${member.status === 'active' ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200' : 'border-amber-300/25 bg-amber-500/10 text-amber-200'}`}>{member.status}</span></td>
                                <td className="px-4 py-3 text-xs text-slate-400">{timestampLabel(member.lastLogin)}</td>
                                <td className="px-4 py-3">{renderMemberActions(member)}</td>
                            </tr>)}</tbody>
                        </table>
                    </div>
                    <div className="grid gap-3 lg:hidden">{filteredMembers.map(member => <article key={member.uid || member.email} className="rounded-lg border border-white/10 bg-slate-950/65 p-4">
                        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-white">{member.name || 'Unnamed staff'}</h3><p className="truncate text-xs text-slate-500">{member.email}</p></div>{renderMemberActions(member)}</div>
                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs"><div><span className="block text-[10px] uppercase text-slate-600">Role</span><span className="mt-1 block text-slate-300">{roleLabels.get(member.role) || member.role.replace('_', ' ')}</span></div><div><span className="block text-[10px] uppercase text-slate-600">Status</span><span className={`mt-1 block font-bold ${member.status === 'active' ? 'text-emerald-300' : 'text-amber-300'}`}>{member.status}</span></div></div>
                    </article>)}</div>
                </>}
            </section>}

            {activeTab === 'tasks' && <section className="space-y-4">
                <AtlasSectionHeader title="Task board" description="Move assigned work from backlog to completion." icon={CheckSquare} meta={<span className="text-xs text-slate-500">{tenantTasks.length} tasks</span>} actions={canCreateWork ? <AtlasActionButton icon={Plus} variant="primary" onClick={() => openTask()}>New task</AtlasActionButton> : undefined} />
                <div className="overflow-x-auto pb-2"><div className="grid min-w-[840px] grid-cols-3 gap-4">{(['todo', 'in_progress', 'done'] as Task['status'][]).map(status => {
                    const statusTasks = tenantTasks.filter(task => task.status === status);
                    return <div key={status} className="rounded-lg border border-white/10 bg-slate-950/45 p-3"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-bold uppercase text-slate-300">{status.replace('_', ' ')}</h3><span className="rounded-md bg-white/[0.05] px-2 py-1 text-xs text-slate-400">{statusTasks.length}</span></div>{statusTasks.length ? statusTasks.map(renderTaskCard) : <AtlasEmptyState icon={status === 'done' ? CheckCircle2 : Clock} title="No tasks" description={status === 'todo' ? 'New work will appear here.' : status === 'in_progress' ? 'Move a task forward when work begins.' : 'Completed work will collect here.'} />}</div>;
                })}</div></div>
            </section>}

            {activeTab === 'projects' && <section className="space-y-4">
                {selectedProject ? <>
                    <button type="button" onClick={() => setSelectedProject(null)} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft size={16} /> Back to projects</button>
                    <div className="rounded-lg border border-white/10 bg-slate-900/55 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-white">{selectedProject.name}</h2><span className="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-200">{selectedProject.status.replace('_', ' ')}</span></div><p className="mt-2 max-w-2xl text-sm text-slate-400">{selectedProject.description || 'No description provided.'}</p></div><div className="flex gap-2">{canCreateWork && <AtlasActionButton icon={Plus} variant="primary" onClick={() => openTask(undefined, selectedProject.id)}>Add task</AtlasActionButton>}{canCreateWork && <AtlasActionButton variant="danger" onClick={() => handleDeleteProject(selectedProject)}>Delete</AtlasActionButton>}</div></div><div className="mt-5 flex flex-wrap gap-5 border-t border-white/10 pt-4 text-xs text-slate-400"><span>{tenantTasks.filter(task => task.projectId === selectedProject.id).length} tasks</span><span>{tenantTasks.filter(task => task.projectId === selectedProject.id && task.status === 'done').length} completed</span>{selectedProject.dueDate && <span className="flex items-center gap-1"><Calendar size={14} /> Due {formatDate(selectedProject.dueDate)}</span>}</div></div>
                    <div>{tenantTasks.filter(task => task.projectId === selectedProject.id).length ? tenantTasks.filter(task => task.projectId === selectedProject.id).map(renderTaskCard) : <AtlasEmptyState icon={CheckSquare} title="No project tasks" description="Add the first task to make this workstream actionable." />}</div>
                </> : <>
                    <AtlasSectionHeader title="Projects" description="Track shared workstreams and their completion." icon={Briefcase} actions={canCreateWork ? <AtlasActionButton icon={Plus} variant="primary" onClick={() => { setProjectError(''); setIsProjectModalOpen(true); }}>New project</AtlasActionButton> : undefined} />
                    {tenantProjects.length === 0 ? <AtlasEmptyState icon={Briefcase} title="No projects yet" description="Create a project to group related team tasks." action={canCreateWork ? <AtlasActionButton icon={Plus} variant="primary" onClick={() => setIsProjectModalOpen(true)}>Create project</AtlasActionButton> : undefined} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tenantProjects.map(project => {
                        const projectTasks = tenantTasks.filter(task => task.projectId === project.id); const completed = projectTasks.filter(task => task.status === 'done').length; const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
                        return <button type="button" key={project.id} onClick={() => setSelectedProject(project)} className="rounded-lg border border-white/10 bg-slate-900/55 p-4 text-left transition-colors hover:border-teal-300/40"><div className="flex items-start justify-between gap-3"><h3 className="text-base font-bold text-white">{project.name}</h3><span className="text-[10px] font-bold uppercase text-emerald-300">{project.status.replace('_', ' ')}</span></div><p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{project.description || 'No description'}</p><div className="mt-4 flex justify-between text-xs text-slate-500"><span>{completed}/{projectTasks.length} tasks</span><span>{progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-teal-400" style={{ width: `${progress}%` }} /></div></button>;
                    })}</div>}
                </>}
            </section>}

            {activeTab === 'chat' && <section className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-900/55">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><h3 className="flex items-center gap-2 text-sm font-bold text-white"><MessageSquare size={17} className="text-teal-300" /> Team chat</h3><p className="mt-1 text-xs text-slate-500">Visible to staff in this organization.</p></div><span className="text-xs text-slate-500">{signals.activeStaff} active</span></div>
                <div className="flex-1 space-y-4 overflow-y-auto p-4">{tenantMessages.length === 0 && <AtlasEmptyState icon={MessageSquare} title="No messages yet" description="Start the operational conversation below." />}{tenantMessages.map(message => { const isMe = message.senderId === userProfile?.uid; return <div key={message.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}><div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${isMe ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`}>{message.text}</div><span className="mt-1 px-1 text-[10px] text-slate-500">{!isMe && `${message.senderName} / `}{timestampLabel(message.createdAt)}</span></div>; })}<div ref={chatEndRef} /></div>
                <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-white/10 bg-slate-950/70 p-3"><label className="sr-only" htmlFor="team-message">Team message</label><input id="team-message" maxLength={2000} value={newMessage} onChange={event => setNewMessage(event.target.value)} placeholder="Write a team message" className="h-10 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/60" /><button type="submit" disabled={!newMessage.trim() || isSendingMessage} className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-40" title="Send message">{isSendingMessage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button></form>
            </section>}

            <Modal isOpen={isStaffModalOpen} onClose={() => !pendingStaffAction && setIsStaffModalOpen(false)} title={editingMember ? 'Edit staff profile' : 'Create staff account'}>
                <form onSubmit={handleSaveStaff} className="space-y-4">
                    {staffError && <div role="alert" className="flex gap-2 rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100"><AlertCircle size={17} className="mt-0.5 shrink-0" />{staffError}</div>}
                    {!editingMember && <div className="rounded-lg border border-sky-400/20 bg-sky-500/10 p-3 text-xs leading-5 text-sky-100">This creates a real sign-in account. Edufy does not email an invitation; temporary credentials will be shown once after creation.</div>}
                    <div><label className="mb-1 block text-xs font-bold text-slate-400" htmlFor="staff-name">Full name</label><input id="staff-name" required autoFocus value={staffForm.name} onChange={event => setStaffForm({ ...staffForm, name: event.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-teal-400/60" /></div>
                    <div><label className="mb-1 block text-xs font-bold text-slate-400" htmlFor="staff-email">Work email</label><input id="staff-email" required type="email" disabled={Boolean(editingMember)} value={staffForm.email} onChange={event => setStaffForm({ ...staffForm, email: event.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-teal-400/60 disabled:cursor-not-allowed disabled:opacity-60" />{editingMember && <p className="mt-1 text-[11px] text-slate-500">Email changes require an authentication administrator.</p>}</div>
                    <div><label className="mb-1 block text-xs font-bold text-slate-400" htmlFor="staff-role">Role</label><select id="staff-role" value={staffForm.role} onChange={event => setStaffForm({ ...staffForm, role: event.target.value as RoleType })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-teal-400/60">{assignableRoles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}</select><p className="mt-1 text-[11px] text-slate-500">Permissions come from the role configuration in Settings.</p></div>
                    {!editingMember && <div><label className="mb-1 block text-xs font-bold text-slate-400" htmlFor="staff-password">Temporary password</label><input id="staff-password" required minLength={8} type="text" autoComplete="new-password" value={staffForm.password} onChange={event => setStaffForm({ ...staffForm, password: event.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 font-mono text-sm text-white outline-none focus:border-teal-400/60" /><p className="mt-1 text-[11px] text-slate-500">Use at least 8 characters and share it through a secure channel.</p></div>}
                    <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-bold text-slate-400" htmlFor="work-start">Workday starts</label><input id="work-start" type="time" value={staffForm.workStart} onChange={event => setStaffForm({ ...staffForm, workStart: event.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-teal-400/60" /></div><div><label className="mb-1 block text-xs font-bold text-slate-400" htmlFor="work-end">Workday ends</label><input id="work-end" type="time" value={staffForm.workEnd} onChange={event => setStaffForm({ ...staffForm, workEnd: event.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-teal-400/60" /></div></div>
                    <AtlasActionButton type="submit" variant="primary" className="w-full" disabled={Boolean(pendingStaffAction)} icon={editingMember ? ShieldCheck : UserPlus}>{pendingStaffAction ? 'Saving...' : editingMember ? 'Save profile' : 'Create account'}</AtlasActionButton>
                </form>
            </Modal>

            <Modal isOpen={Boolean(credentials)} onClose={() => { setCredentials(null); setCredentialsCopyMessage(''); }} title="Temporary credentials">
                {credentials && <div className="space-y-4"><div className="rounded-lg border border-amber-300/25 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">No invitation email was sent. Share these credentials securely; they will not be shown again after this dialog closes.</div><div className="rounded-lg border border-white/10 bg-slate-950 p-4 font-mono text-sm text-slate-200"><p><span className="text-slate-500">Email:</span> {credentials.email}</p><p className="mt-2 break-all"><span className="text-slate-500">Password:</span> {credentials.password}</p></div>{credentialsCopyMessage && <p role="status" className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300">{credentialsCopyMessage}</p>}<AtlasActionButton icon={Copy} variant="primary" className="w-full" onClick={copyCredentials}>Copy credentials</AtlasActionButton></div>}
            </Modal>

            <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={editingTask ? 'Edit task' : 'New task'}>
                <form onSubmit={handleSaveTask} className="space-y-4">{taskError && <div role="alert" className="rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">{taskError}</div>}<div><label className="mb-1 block text-xs font-bold text-slate-400">Title</label><input required autoFocus value={taskForm.title || ''} onChange={event => setTaskForm({ ...taskForm, title: event.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-teal-400/60" /></div><div><label className="mb-1 block text-xs font-bold text-slate-400">Description</label><textarea value={taskForm.description || ''} onChange={event => setTaskForm({ ...taskForm, description: event.target.value })} className="min-h-28 w-full resize-y rounded-lg border border-white/10 bg-slate-950 p-3 text-sm text-white outline-none focus:border-teal-400/60" /></div><div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-bold text-slate-400">Priority</label><select value={taskForm.priority || 'medium'} onChange={event => setTaskForm({ ...taskForm, priority: event.target.value as Task['priority'] })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div><div><label className="mb-1 block text-xs font-bold text-slate-400">Status</label><select value={taskForm.status || 'todo'} onChange={event => setTaskForm({ ...taskForm, status: event.target.value as Task['status'] })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></div></div><div><label className="mb-1 block text-xs font-bold text-slate-400">Assignee</label>{can('team.assign_others') ? <select value={taskForm.assignedTo || ''} onChange={event => setTaskForm({ ...taskForm, assignedTo: event.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white"><option value="">Unassigned</option>{staffMembers.filter(member => member.status === 'active').map(member => <option key={member.uid} value={member.uid}>{member.name} / {roleLabels.get(member.role) || member.role}</option>)}</select> : <div className="rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm text-slate-400">{userProfile?.name || 'Assigned to me'}</div>}</div>{tenantProjects.length > 0 && <div><label className="mb-1 block text-xs font-bold text-slate-400">Project</label><select value={taskForm.projectId || ''} onChange={event => setTaskForm({ ...taskForm, projectId: event.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white"><option value="">No project</option>{tenantProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>}<div className="flex gap-2">{editingTask && <AtlasActionButton variant="danger" onClick={() => { setIsTaskModalOpen(false); deleteTask(editingTask); }}>Delete</AtlasActionButton>}<AtlasActionButton type="submit" variant="primary" className="flex-1">Save task</AtlasActionButton></div></form>
            </Modal>

            <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="New project">
                <form onSubmit={handleSaveProject} className="space-y-4">{projectError && <div role="alert" className="rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">{projectError}</div>}<div><label className="mb-1 block text-xs font-bold text-slate-400">Project name</label><input required autoFocus value={projectForm.name || ''} onChange={event => setProjectForm({ ...projectForm, name: event.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-teal-400/60" /></div><div><label className="mb-1 block text-xs font-bold text-slate-400">Description</label><textarea value={projectForm.description || ''} onChange={event => setProjectForm({ ...projectForm, description: event.target.value })} className="min-h-24 w-full resize-y rounded-lg border border-white/10 bg-slate-950 p-3 text-sm text-white outline-none focus:border-teal-400/60" /></div><div><label className="mb-1 block text-xs font-bold text-slate-400">Due date</label><input type="date" value={projectForm.dueDate || ''} onChange={event => setProjectForm({ ...projectForm, dueDate: event.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white" /></div><AtlasActionButton type="submit" variant="primary" className="w-full" icon={Briefcase}>Create project</AtlasActionButton></form>
            </Modal>
        </div>
    );
};
