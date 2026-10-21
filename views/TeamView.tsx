import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Ban,
    Briefcase,
    Calendar,
    CheckSquare,
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
    EducationBadge,
    EducationButton,
    EducationField,
    EducationNotice,
    EducationState,
    EducationStatusPill,
    EducationTabs
} from '../components/education-ui/EducationPrimitives';
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
import '../components/education-ui/education-system-v1.css';
import '../components/education-ui/education-system-v1-modules.css';
import './team-operations/team-design-system-v1.css';

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
    const showEducationTeamOperationsV1 = new URLSearchParams(window.location.search).get('ui') !== 'atlas-legacy';
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
    const [taskQuery, setTaskQuery] = useState('');
    const [isSavingTask, setIsSavingTask] = useState(false);

    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [projectForm, setProjectForm] = useState<Partial<Project>>({ name: '', description: '', status: 'active' });
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectError, setProjectError] = useState('');
    const [projectQuery, setProjectQuery] = useState('');
    const [isSavingProject, setIsSavingProject] = useState(false);

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
    const visibleTasks = useMemo(() => {
        const query = taskQuery.trim().toLowerCase();
        return tenantTasks.filter(task => !query || [task.title, plainText(task.description), task.assignedToName, tenantProjects.find(project => project.id === task.projectId)?.name]
            .some(value => value?.toLowerCase().includes(query)));
    }, [taskQuery, tenantProjects, tenantTasks]);
    const visibleProjects = useMemo(() => {
        const query = projectQuery.trim().toLowerCase();
        return tenantProjects.filter(project => !query || `${project.name} ${project.description || ''}`.toLowerCase().includes(query));
    }, [projectQuery, tenantProjects]);
    const currentProject = selectedProject && tenantProjects.find(project => project.id === selectedProject.id);

    const signals = useMemo(() => ({
        activeStaff: staffMembers.filter(member => member.status === 'active').length,
        disabledStaff: staffMembers.filter(member => member.status === 'disabled').length,
        openTasks: tenantTasks.filter(task => task.status !== 'done').length,
        activeProjects: tenantProjects.filter(project => project.status === 'active').length
    }), [staffMembers, tenantProjects, tenantTasks]);

    useEffect(() => {
        if (activeTab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
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
        if (!db || !canManageMember(member) || !member.uid || pendingStaffAction) return;
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
        setIsSavingTask(true);
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
        } finally {
            setIsSavingTask(false);
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
        setIsSavingProject(true);
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
        } finally {
            setIsSavingProject(false);
        }
    };

    const handleDeleteProject = async (project: Project) => {
        if (!db || !canCreateWork || project.organizationId !== orgId) return;
        const currentDb = db;
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
            const projectRef = doc(currentDb, 'projects', project.id);
            const taskRefs = linkedTasks.map(task => doc(currentDb, 'tasks', task.id));
            await runTransaction(currentDb, async transaction => {
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
                         <EducationStatusPill status={task.priority === 'high' ? 'warning' : task.priority === 'medium' ? 'attention' : 'neutral'}>{task.priority} priority</EducationStatusPill>
                        <h4 className="mt-2 text-sm font-bold text-white">{task.title}</h4>
                        {plainText(task.description) && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{plainText(task.description)}</p>}
                         {task.dueDate && <p className="edu-team-due"><Calendar size={14} aria-hidden="true" /> Due {formatDate(task.dueDate)}</p>}
                    </div>
                     {editable && <button type="button" onClick={() => openTask(task)} className="edu-team-icon-action" aria-label={`Edit ${task.title}`}><Edit2 size={16} /></button>}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
                    <span className="flex min-w-0 items-center gap-2"><UserCircle size={15} /><span className="truncate">{assignee?.name || task.assignedToName || 'Unassigned'}</span></span>
                    {editable && <span className="flex gap-1">
                         <button type="button" onClick={() => moveTask(task, 'prev')} disabled={task.status === 'todo'} className="edu-team-icon-action" aria-label={`Move ${task.title} back`}><ArrowLeft size={16} /></button>
                         <button type="button" onClick={() => moveTask(task, 'next')} disabled={task.status === 'done'} className="edu-team-icon-action" aria-label={`Move ${task.title} forward`}><ArrowRight size={16} /></button>
                    </span>}
                </div>
            </article>
        );
    };

    const renderMemberActions = (member: UserProfile) => (
        <div className="flex items-center justify-end gap-1">
             <button type="button" onClick={() => openEditStaff(member)} disabled={!canManageMember(member) || Boolean(pendingStaffAction)} className="edu-team-icon-action" aria-label={`Edit ${member.name || member.email}`}><Edit2 size={16} /></button>
             <button type="button" onClick={() => handleToggleStatus(member)} disabled={!canManageMember(member) || Boolean(pendingStaffAction) || member.uid === userProfile?.uid} className="edu-team-icon-action" aria-label={`${member.status === 'active' ? 'Disable' : 'Activate'} ${member.name || member.email}`}>
                {pendingStaffAction === member.uid ? <Loader2 size={15} className="animate-spin" /> : member.status === 'active' ? <Ban size={15} /> : <UserCheck size={15} />}
            </button>
        </div>
    );

    if (!orgId) {
        return <div className={showEducationTeamOperationsV1 ? 'edu-v1 edu-school-ops-v1 edu-team-v1' : ''} data-edu-system={showEducationTeamOperationsV1 ? '1' : undefined}><EducationState kind="restricted" title="Organization required" description="Select an organization before opening the team workspace." /></div>;
    }

    return (
        <div className={`flex min-h-full flex-col gap-5 pb-24 md:pb-8 ${showEducationTeamOperationsV1 ? 'edu-v1 edu-school-ops-v1 edu-team-v1' : ''}`} data-edu-system={showEducationTeamOperationsV1 ? '1' : undefined} data-testid={showEducationTeamOperationsV1 ? 'education-team-v1' : undefined}>
            <AtlasCommandHeader
                eyebrow="ERP team operations"
                title="Team & Workspace"
                description="Manage staff access and keep projects, tasks, and team conversations connected."
                icon={Users}
                badges={<EducationBadge status="success">{staffMembers.length} staff</EducationBadge>}
                actions={<EducationTabs label="Team views" value={activeTab} onChange={tab => { setActiveTab(tab as TeamTab); setSelectedProject(null); }} items={[
                    { id: 'directory', label: 'Directory', icon: Users },
                    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: signals.openTasks },
                    { id: 'projects', label: 'Projects', icon: Briefcase },
                    { id: 'chat', label: 'Chat', icon: MessageSquare }
                ]} />}
            />

             {feedback && <div className="edu-team-feedback"><EducationNotice status={feedback.type === 'error' ? 'danger' : feedback.type === 'success' ? 'success' : feedback.type === 'warning' ? 'warning' : 'info'}><span><strong>{feedback.title}</strong><br />{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} className="edu-team-icon-action" aria-label="Dismiss message"><X size={16} /></button></EducationNotice></div>}

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Active staff" value={signals.activeStaff} detail="Accounts with app access" icon={UserCheck} tone="emerald" onClick={() => { setActiveTab('directory'); setStatusFilter('active'); }} />
                <AtlasSignalCard label="Disabled" value={signals.disabledStaff} detail="Access currently paused" icon={Ban} tone={signals.disabledStaff ? 'amber' : 'slate'} onClick={() => { setActiveTab('directory'); setStatusFilter(signals.disabledStaff ? 'disabled' : 'all'); }} />
                <AtlasSignalCard label="Open tasks" value={signals.openTasks} detail="Work still in motion" icon={CheckSquare} tone="blue" onClick={() => setActiveTab('tasks')} />
                <AtlasSignalCard label="Active projects" value={signals.activeProjects} detail="Current workstreams" icon={Briefcase} tone="teal" onClick={() => setActiveTab('projects')} />
            </div>

            {activeTab === 'directory' && <section className="space-y-4 rounded-lg border border-white/10 bg-slate-900/45 p-4">
                <AtlasSectionHeader title="Staff directory" description="Accounts, roles, work hours, and access state for this organization." icon={ShieldCheck} actions={canManageTeam ? <AtlasActionButton icon={UserPlus} variant="primary" onClick={openCreateStaff}>Create account</AtlasActionButton> : undefined} />
                {!canManageTeam && <EducationNotice status="info">Directory access is read-only. An owner or administrator can create accounts and change roles.</EducationNotice>}
                <AtlasToolbar>
                    <label className="relative min-w-[220px] flex-1">
                        <span className="sr-only">Search staff</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="search" value={directoryQuery} onChange={event => setDirectoryQuery(event.target.value)} placeholder="Search name, email, or role" className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" />
                    </label>
                    <select aria-label="Filter by role" value={roleFilter} onChange={event => setRoleFilter(event.target.value as 'all' | RoleType)} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-teal-400/60">
                        <option value="all">All roles</option>{roles.filter(role => STAFF_ROLES.includes(role.id)).map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
                    </select>
                    <select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as StaffStatusFilter)} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-teal-400/60">
                        <option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option>
                    </select>
                </AtlasToolbar>

                {(authLoading || appLoading) && staffMembers.length === 0 ? <EducationState kind="loading" title="Loading staff directory" description="Staff accounts will appear here when they finish loading." /> : filteredMembers.length === 0 ? <EducationState title={staffMembers.length ? 'No matching staff' : 'No staff accounts yet'} description={staffMembers.length ? 'Adjust the search or filters to see more people.' : 'Create the first staff account to start assigning access and work.'}>{canManageTeam && !staffMembers.length && <EducationButton variant="primary" icon={UserPlus} onClick={openCreateStaff}>Create first account</EducationButton>}</EducationState> : <>
                    <div className="hidden overflow-hidden rounded-lg border border-white/10 lg:block">
                        <table className="w-full table-fixed text-left">
                            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-500"><tr><th className="w-[34%] px-4 py-3">Staff member</th><th className="w-[20%] px-4 py-3">Role</th><th className="w-[14%] px-4 py-3">Status</th><th className="w-[18%] px-4 py-3">Last sign-in</th><th className="w-[14%] px-4 py-3 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-white/10">{filteredMembers.map(member => <tr key={member.uid || member.email} className="bg-slate-900/40 hover:bg-white/[0.025]">
                                <td className="px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-950 text-sm font-bold text-teal-200">{(member.name || member.email).charAt(0).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{member.name || 'Unnamed staff'}</span><span className="block truncate text-xs text-slate-500">{member.email}</span></span></div></td>
                                <td className="px-4 py-3 text-sm text-slate-300">{roleLabels.get(member.role) || member.role.replace('_', ' ')}</td>
                                <td className="px-4 py-3"><EducationStatusPill status={member.status === 'active' ? 'success' : 'warning'}>{member.status}</EducationStatusPill></td>
                                <td className="px-4 py-3 text-xs text-slate-400">{timestampLabel(member.lastLogin)}</td>
                                <td className="px-4 py-3">{renderMemberActions(member)}</td>
                            </tr>)}</tbody>
                        </table>
                    </div>
                    <div className="grid gap-3 lg:hidden">{filteredMembers.map(member => <article key={member.uid || member.email} className="rounded-lg border border-white/10 bg-slate-950/65 p-4">
                        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-white">{member.name || 'Unnamed staff'}</h3><p className="truncate text-xs text-slate-500">{member.email}</p></div>{renderMemberActions(member)}</div>
                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs"><div><span className="block text-[10px] uppercase text-slate-600">Role</span><span className="mt-1 block text-slate-300">{roleLabels.get(member.role) || member.role.replace('_', ' ')}</span></div><div><span className="block text-[10px] uppercase text-slate-600">Status</span><EducationStatusPill status={member.status === 'active' ? 'success' : 'warning'}>{member.status}</EducationStatusPill></div></div>
                    </article>)}</div>
                </>}
            </section>}

            {activeTab === 'tasks' && <section className="space-y-4">
                <AtlasSectionHeader title="Task board" description="Move assigned work from backlog to completion." icon={CheckSquare} meta={<span className="text-xs text-slate-500">{tenantTasks.length} tasks</span>} actions={canCreateWork ? <AtlasActionButton icon={Plus} variant="primary" onClick={() => openTask()}>New task</AtlasActionButton> : undefined} />
                <label className="edu-team-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search tasks</span><input type="search" value={taskQuery} onChange={event => setTaskQuery(event.target.value)} placeholder="Search tasks, assignees or projects" /></label>
                {(appLoading && tenantTasks.length === 0) ? <EducationState kind="loading" title="Loading tasks" description="The board will appear when task data is ready." /> : <div className="edu-team-board">{(['todo', 'in_progress', 'done'] as Task['status'][]).map(status => {
                    const statusTasks = visibleTasks.filter(task => task.status === status);
                    return <div key={status} className="edu-team-lane"><div className="edu-team-lane-heading"><h3>{status.replace('_', ' ')}</h3><EducationBadge status={status === 'done' ? 'success' : status === 'in_progress' ? 'info' : 'neutral'}>{statusTasks.length}</EducationBadge></div>{statusTasks.length ? statusTasks.map(renderTaskCard) : <EducationState title={taskQuery ? 'No matches' : 'No tasks'} description={taskQuery ? 'Try another search.' : status === 'todo' ? 'New work will appear here.' : status === 'in_progress' ? 'Move a task forward when work begins.' : 'Completed work will collect here.'} />}</div>;
                })}</div>}
            </section>}

            {activeTab === 'projects' && <section className="space-y-4">
                {currentProject ? <>
                    <button type="button" onClick={() => setSelectedProject(null)} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft size={16} /> Back to projects</button>
                    <div className="edu-team-project-detail p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">{currentProject.name}</h2><EducationStatusPill status="success">{currentProject.status.replace('_', ' ')}</EducationStatusPill></div><p className="mt-2 max-w-2xl text-sm">{currentProject.description || 'No description provided.'}</p></div><div className="flex gap-2">{canCreateWork && <AtlasActionButton icon={Plus} variant="primary" onClick={() => openTask(undefined, currentProject.id)}>Add task</AtlasActionButton>}{canCreateWork && <AtlasActionButton variant="danger" onClick={() => handleDeleteProject(currentProject)}>Delete</AtlasActionButton>}</div></div><div className="edu-team-project-detail__meta mt-5 flex flex-wrap gap-5 pt-4 text-xs"><span>{tenantTasks.filter(task => task.projectId === currentProject.id).length} tasks</span><span>{tenantTasks.filter(task => task.projectId === currentProject.id && task.status === 'done').length} completed</span>{currentProject.dueDate && <span className="flex items-center gap-1"><Calendar size={14} /> Due {formatDate(currentProject.dueDate)}</span>}</div></div>
                    <div>{tenantTasks.filter(task => task.projectId === currentProject.id).length ? tenantTasks.filter(task => task.projectId === currentProject.id).map(renderTaskCard) : <EducationState title="No project tasks" description="Add the first task to make this workstream actionable." />}</div>
                </> : <>
                    <AtlasSectionHeader title="Projects" description="Track shared workstreams and their completion." icon={Briefcase} actions={canCreateWork ? <AtlasActionButton icon={Plus} variant="primary" onClick={() => { setProjectError(''); setIsProjectModalOpen(true); }}>New project</AtlasActionButton> : undefined} />
                    <label className="edu-team-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search projects</span><input type="search" value={projectQuery} onChange={event => setProjectQuery(event.target.value)} placeholder="Search projects" /></label>
                    {appLoading && tenantProjects.length === 0 ? <EducationState kind="loading" title="Loading projects" description="Projects will appear when the workspace is ready." /> : visibleProjects.length === 0 ? <EducationState title={tenantProjects.length ? 'No matching projects' : 'No projects yet'} description={tenantProjects.length ? 'Try another search.' : 'Create a project to group related team tasks.'}>{canCreateWork && !tenantProjects.length && <EducationButton variant="primary" icon={Plus} onClick={() => { setProjectError(''); setIsProjectModalOpen(true); }}>Create project</EducationButton>}</EducationState> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleProjects.map(project => {
                        const projectTasks = tenantTasks.filter(task => task.projectId === project.id); const completed = projectTasks.filter(task => task.status === 'done').length; const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
                        return <button type="button" key={project.id} onClick={() => setSelectedProject(project)} className="edu-team-project rounded-lg border border-white/10 bg-slate-900/55 p-4 text-left transition-colors"><div className="flex items-start justify-between gap-3"><h3 className="text-base font-bold text-white">{project.name}</h3><EducationStatusPill status="success">{project.status.replace('_', ' ')}</EducationStatusPill></div><p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{project.description || 'No description'}</p><div className="mt-4 flex justify-between text-xs text-slate-500"><span>{completed}/{projectTasks.length} tasks</span><span>{progress}%</span></div><div className="edu-team-progress" role="progressbar" aria-label={`${project.name} tasks complete`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div></button>;
                    })}</div>}
                </>}
            </section>}

            {activeTab === 'chat' && <section className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-900/55">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><h3 className="flex items-center gap-2 text-sm font-bold text-white"><MessageSquare size={17} className="text-teal-300" /> Team chat</h3><p className="mt-1 text-xs text-slate-500">Visible to staff in this organization.</p></div><span className="text-xs text-slate-500">{signals.activeStaff} active</span></div>
                <div className="flex-1 space-y-4 overflow-y-auto p-4">{appLoading && tenantMessages.length === 0 ? <EducationState kind="loading" title="Loading conversation" description="Messages will appear when the workspace is ready." /> : tenantMessages.length === 0 && <EducationState title="No messages yet" description="Start the operational conversation below." />}{tenantMessages.map(message => { const isMe = message.senderId === userProfile?.uid; return <div key={message.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}><div className={`edu-team-message ${isMe ? 'edu-team-message--own' : ''}`}>{message.text}</div><span className="mt-1 px-1 text-[10px] text-slate-500">{!isMe && `${message.senderName} / `}{timestampLabel(message.createdAt)}</span></div>; })}<div ref={chatEndRef} /></div>
                <form onSubmit={handleSendMessage} className="edu-team-chat-composer"><label className="sr-only" htmlFor="team-message">Team message</label><input id="team-message" maxLength={2000} value={newMessage} onChange={event => setNewMessage(event.target.value)} placeholder="Write a team message" /><EducationButton type="submit" variant="primary" icon={isSendingMessage ? Loader2 : Send} disabled={!newMessage.trim() || isSendingMessage}>{isSendingMessage ? 'Sending…' : 'Send'}</EducationButton></form>
            </section>}

            <Modal isOpen={isStaffModalOpen} onClose={() => !pendingStaffAction && setIsStaffModalOpen(false)} title={editingMember ? 'Edit staff profile' : 'Create staff account'} designSystem={showEducationTeamOperationsV1}>
                <form onSubmit={handleSaveStaff} className="edu-team-form">
                    {staffError && <EducationNotice status="danger">{staffError}</EducationNotice>}
                    {!editingMember && <EducationNotice status="info">This creates a sign-in account. No invitation email is sent. Temporary credentials appear once after creation.</EducationNotice>}
                    <EducationField label="Full name"><input required autoFocus value={staffForm.name} onChange={event => setStaffForm({ ...staffForm, name: event.target.value })} /></EducationField>
                    <EducationField label="Work email" hint={editingMember ? 'Email changes require an authentication administrator.' : undefined}><input required type="email" disabled={Boolean(editingMember)} value={staffForm.email} onChange={event => setStaffForm({ ...staffForm, email: event.target.value })} /></EducationField>
                    <EducationField label="Role" hint="Permissions come from the role configuration in Settings."><select value={staffForm.role} onChange={event => setStaffForm({ ...staffForm, role: event.target.value as RoleType })}>{assignableRoles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}</select></EducationField>
                    {!editingMember && <EducationField label="Temporary password" hint="Use at least 8 characters and share it through a secure channel."><input required minLength={8} type="password" autoComplete="new-password" value={staffForm.password} onChange={event => setStaffForm({ ...staffForm, password: event.target.value })} /></EducationField>}
                    <div className="edu-team-form-grid"><EducationField label="Workday starts"><input type="time" value={staffForm.workStart} onChange={event => setStaffForm({ ...staffForm, workStart: event.target.value })} /></EducationField><EducationField label="Workday ends"><input type="time" value={staffForm.workEnd} onChange={event => setStaffForm({ ...staffForm, workEnd: event.target.value })} /></EducationField></div>
                    <div className="edu-ds-form-footer"><EducationButton variant="secondary" onClick={() => setIsStaffModalOpen(false)} disabled={Boolean(pendingStaffAction)}>Cancel</EducationButton><EducationButton type="submit" variant="primary" icon={editingMember ? ShieldCheck : UserPlus} disabled={Boolean(pendingStaffAction)}>{pendingStaffAction ? 'Saving account…' : editingMember ? 'Save profile' : 'Create account'}</EducationButton></div>
                </form>
            </Modal>

            <Modal isOpen={Boolean(credentials)} onClose={() => { setCredentials(null); setCredentialsCopyMessage(''); }} title="Temporary credentials" designSystem={showEducationTeamOperationsV1}>
                {credentials && <div className="edu-team-credentials">
                    <EducationNotice status="warning">No invitation email was sent. Share these credentials securely; they will not be shown again after this dialog closes.</EducationNotice>
                    <div className="edu-team-credentials__values"><p><strong>Email</strong><span>{credentials.email}</span></p><p><strong>Temporary password</strong><span>{credentials.password}</span></p></div>
                    {credentialsCopyMessage && <EducationNotice status="info">{credentialsCopyMessage}</EducationNotice>}
                    <EducationButton icon={Copy} variant="primary" onClick={copyCredentials}>Copy credentials</EducationButton>
                </div>}
            </Modal>

            <Modal isOpen={isTaskModalOpen} onClose={() => !isSavingTask && setIsTaskModalOpen(false)} title={editingTask ? 'Edit task' : 'New task'} designSystem={showEducationTeamOperationsV1}>
                <form onSubmit={handleSaveTask} className="edu-team-form">
                    {taskError && <EducationNotice status="danger">{taskError}</EducationNotice>}
                    <EducationField label="Title"><input required autoFocus value={taskForm.title || ''} onChange={event => setTaskForm({ ...taskForm, title: event.target.value })} /></EducationField>
                    <EducationField label="Description"><textarea value={taskForm.description || ''} onChange={event => setTaskForm({ ...taskForm, description: event.target.value })} /></EducationField>
                    <div className="edu-team-form-grid">
                        <EducationField label="Priority"><select value={taskForm.priority || 'medium'} onChange={event => setTaskForm({ ...taskForm, priority: event.target.value as Task['priority'] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></EducationField>
                        <EducationField label="Status"><select value={taskForm.status || 'todo'} onChange={event => setTaskForm({ ...taskForm, status: event.target.value as Task['status'] })}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></EducationField>
                    </div>
                    <EducationField label="Due date"><input type="date" value={taskForm.dueDate || ''} onChange={event => setTaskForm({ ...taskForm, dueDate: event.target.value })} /></EducationField>
                    {can('team.assign_others') ? <EducationField label="Assignee"><select value={taskForm.assignedTo || ''} onChange={event => setTaskForm({ ...taskForm, assignedTo: event.target.value })}><option value="">Unassigned</option>{staffMembers.filter(member => member.status === 'active').map(member => <option key={member.uid} value={member.uid}>{member.name} / {roleLabels.get(member.role) || member.role}</option>)}</select></EducationField> : <EducationNotice status="info">Assigned to {userProfile?.name || 'me'}. Your role can only assign work to you.</EducationNotice>}
                    {tenantProjects.length > 0 && <EducationField label="Project"><select value={taskForm.projectId || ''} onChange={event => setTaskForm({ ...taskForm, projectId: event.target.value })}><option value="">No project</option>{tenantProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></EducationField>}
                    <div className="edu-ds-form-footer">
                        {editingTask && <EducationButton status="danger" onClick={() => { setIsTaskModalOpen(false); deleteTask(editingTask); }} disabled={isSavingTask}>Delete task</EducationButton>}
                        <EducationButton variant="secondary" onClick={() => setIsTaskModalOpen(false)} disabled={isSavingTask}>Cancel</EducationButton>
                        <EducationButton type="submit" variant="primary" disabled={isSavingTask}>{isSavingTask ? 'Saving task…' : editingTask ? 'Save task' : 'Create task'}</EducationButton>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isProjectModalOpen} onClose={() => !isSavingProject && setIsProjectModalOpen(false)} title="New project" designSystem={showEducationTeamOperationsV1}>
                <form onSubmit={handleSaveProject} className="edu-team-form">
                    {projectError && <EducationNotice status="danger">{projectError}</EducationNotice>}
                    <EducationField label="Project name"><input required autoFocus value={projectForm.name || ''} onChange={event => setProjectForm({ ...projectForm, name: event.target.value })} /></EducationField>
                    <EducationField label="Description"><textarea value={projectForm.description || ''} onChange={event => setProjectForm({ ...projectForm, description: event.target.value })} /></EducationField>
                    <EducationField label="Due date"><input type="date" value={projectForm.dueDate || ''} onChange={event => setProjectForm({ ...projectForm, dueDate: event.target.value })} /></EducationField>
                    <div className="edu-ds-form-footer"><EducationButton variant="secondary" onClick={() => setIsProjectModalOpen(false)} disabled={isSavingProject}>Cancel</EducationButton><EducationButton type="submit" variant="primary" icon={Briefcase} disabled={isSavingProject}>{isSavingProject ? 'Creating project…' : 'Create project'}</EducationButton></div>
                </form>
            </Modal>
        </div>
    );
};
