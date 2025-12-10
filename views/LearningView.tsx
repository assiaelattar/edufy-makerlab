
import React, { useState, useMemo, useEffect } from 'react';
import { Brain, Plus, Target, Star, Upload, ExternalLink, CheckCircle2, Clock, AlertCircle, Image as ImageIcon, ChevronRight, Award, BookOpen, LayoutGrid, List, UserCheck, Trash2, ArrowRight, ClipboardList, Play, CheckSquare, ArrowLeft, Lock, Zap, PenTool, Send, Database, MoreHorizontal, Rocket, ListChecks, Beaker, FileText, GitCommit, Edit3 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { SuccessModal } from '../components/SuccessModal';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ProjectTemplate, StudentProject, ProjectStep, StationType, ProcessTemplate, ProcessPhase, Station, Badge } from '../types';
import { formatDate, compressImage } from '../utils/helpers';
import { getTheme, STATION_THEMES } from '../utils/theme';
import { STUDIO_THEME, studioClass } from '../utils/studioTheme';
import { generateProjectThumbnail } from '../utils/thumbnailGenerator';
import { MOCK_PROJECT_TEMPLATES } from '../utils/mockData';
import { NotificationBell } from '../components/NotificationBell';
import { ProjectFactoryModal } from './learning/ProjectFactoryModal';
import { StudentProjectWizardView } from './learning/StudentProjectWizardView';
import { InstructorStudioDashboard } from './learning/InstructorStudioDashboard';
import { CommitFeedView } from './learning/CommitFeedView';
import { StepReviewModal } from './learning/StepReviewModal';
import { FactoryDashboard } from './learning/FactoryDashboard';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { Confetti } from '../components/Confetti';

// Helper to recursively remove undefined values for Firestore
const cleanData = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => cleanData(v));
    } else if (obj !== null && typeof obj === 'object') {
        if (obj.constructor && obj.constructor.name !== 'Object') return obj;

        return Object.fromEntries(
            Object.entries(obj)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => [k, cleanData(v)])
        );
    }
    return obj;
};

export const LearningView = () => {
    const { projectTemplates, studentProjects, students, settings, programs, sendNotification, teamMembers, processTemplates, stations, badges } = useAppContext();
    const { userProfile, can } = useAuth();

    // Debug logging
    console.log('🔍 LearningView Debug:', {
        totalProjects: studentProjects.length,
        userProfileUid: userProfile?.uid,
        projectsForCurrentUser: studentProjects.filter(p => p.studentId === userProfile?.uid),
        allProjectStudentIds: studentProjects.map(p => ({ id: p.id, studentId: p.studentId }))
    });

    const isInstructor = can('learning.manage');
    const isStudioTheme = userProfile?.role === 'instructor';

    // Theme Helpers
    const theme = {
        card: isStudioTheme ? "bg-white border border-slate-200 shadow-sm" : "bg-slate-900 border border-slate-800",
        text: isStudioTheme ? "text-slate-900" : "text-white",
        textMuted: "text-slate-500",
        bgMuted: isStudioTheme ? "bg-slate-50 border-slate-100" : "bg-slate-950 border-slate-800",
        tabContainer: isStudioTheme ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-800",
        tabActive: isStudioTheme ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" : "bg-slate-800 text-white shadow-sm",
        tabInactive: isStudioTheme ? "text-slate-500 hover:text-slate-900" : "text-slate-500 hover:text-slate-300"
    };

    // --- SHARED STATE ---
    const [activeTab, setActiveTab] = useState<'curriculum' | 'studio' | 'review' | 'portfolios' | 'track' | 'setup'>('curriculum');
    const [studentTab, setStudentTab] = useState<'my_studio' | 'explore'>('explore');
    const [studentProjectFilter, setStudentProjectFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

    // --- STUDIO STATE ---
    const [studioView, setStudioView] = useState<'dashboard' | 'commits' | 'reviews'>('dashboard');
    const [selectedReviewStep, setSelectedReviewStep] = useState<{ step: any; project: any; student: any } | null>(null);

    // --- INSTRUCTOR STATE ---
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templateForm, setTemplateForm] = useState<Partial<ProjectTemplate>>({
        title: '', description: '', difficulty: 'beginner', skills: [], defaultSteps: [], station: 'general',
        resources: [], status: 'draft', targetAudience: { grades: [], groups: [] }
    });
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [wizardStep, setWizardStep] = useState(0);
    const [activeModalTab, setActiveModalTab] = useState<'details' | 'resources' | 'targeting' | 'publishing'>('details');
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<StudentProject | null>(null);
    const [feedback, setFeedback] = useState('');
    const [isSeeding, setIsSeeding] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'planning' | 'building' | 'testing' | 'delivered' | 'submitted' | 'changes_requested' | 'published'>('all');
    const [selectedStation, setSelectedStation] = useState<StationType | null>(null);
    const [showStationProjects, setShowStationProjects] = useState(false);

    // --- SETUP FACTORY STATE ---
    const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
    const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
    const [workflowForm, setWorkflowForm] = useState<Partial<ProcessTemplate>>({
        name: '',
        description: '',
        phases: []
    });
    const [setupSubTab, setSetupSubTab] = useState<'workflows' | 'stations' | 'badges'>('workflows');
    const [isStationModalOpen, setIsStationModalOpen] = useState(false);
    const [editingStationId, setEditingStationId] = useState<string | null>(null);
    const [stationForm, setStationForm] = useState<Partial<Station>>({
        label: '',
        color: 'blue',
        icon: 'Circle',
        description: '',
        gradeIds: [],
        gradeNames: []
    });
    const [showConfetti, setShowConfetti] = useState(false);

    // --- BADGE STATE ---
    const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
    const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
    const [badgeForm, setBadgeForm] = useState<Partial<Badge>>({
        name: '',
        description: '',
        color: 'blue',
        icon: 'Award',
        criteria: { type: 'project_count', target: 'all', count: 1 }
    });

    const handleSaveBadge = async () => {
        if (!db || !badgeForm.name) return;
        try {
            if (editingBadgeId) {
                await updateDoc(doc(db, 'badges', editingBadgeId), {
                    ...badgeForm
                });
            } else {
                await addDoc(collection(db, 'badges'), {
                    ...badgeForm,
                    createdAt: serverTimestamp()
                });
            }
            setIsBadgeModalOpen(false);
            setEditingBadgeId(null);
            setBadgeForm({ name: '', description: '', color: 'blue', icon: 'Award', criteria: { type: 'project_count', target: 'all', count: 1 } });
        } catch (e) {
            console.error('Error saving badge:', e);
        }
    };

    const handleDeleteBadge = async (id: string) => {
        if (!db || !window.confirm('Are you sure you want to delete this badge?')) return;
        try {
            await deleteDoc(doc(db, 'badges', id));
        } catch (e) {
            console.error('Error deleting badge:', e);
        }
    };


    // --- STUDENT STATE ---
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [activeProject, setActiveProject] = useState<StudentProject | null>(null);
    const [projectForm, setProjectForm] = useState<Partial<StudentProject>>({
        title: '', description: '', externalLink: '', embedUrl: '', mediaUrls: [], steps: [], station: 'general'
    });
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
    const [workspaceTab, setWorkspaceTab] = useState<'mission' | 'resources'>('mission');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Proof of Work State
    const [isProofModalOpen, setIsProofModalOpen] = useState(false);
    const [activeStepForProof, setActiveStepForProof] = useState<string | null>(null);
    const [proofFile, setProofFile] = useState<string | null>(null);

    // For Planning Phase
    const [newStepTitle, setNewStepTitle] = useState('');

    // --- TOAST NOTIFICATIONS ---
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, title, message, type, timestamp: Date.now() }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // --- HELPERS ---
    const pendingReviews = studentProjects.filter(p => p.status === 'submitted');

    const currentStudentId = useMemo(() => {
        if (!userProfile) return null;
        const matchedStudent = students.find(s => s.email === userProfile.email || s.loginInfo?.email === userProfile.email);
        return matchedStudent ? matchedStudent.id : null;
    }, [students, userProfile]);

    const currentTheme = getTheme(projectForm.station);

    // --- DERIVED DATA ---
    const availableGrades = useMemo(() => {
        const grades = new Map<string, string>(); // id -> name
        programs.filter(p => p.status === 'active').forEach(p => {
            p.grades.forEach(g => grades.set(g.id, g.name));
        });
        return Array.from(grades.entries()).map(([id, name]) => ({ id, name }));
    }, [programs]);

    const availableGroups = useMemo(() => {
        const groups = new Set<string>();
        programs.filter(p => p.status === 'active').forEach(p => {
            p.grades.forEach(g => {
                g.groups.forEach(grp => groups.add(grp.name));
            });
        });
        return Array.from(groups).sort();
    }, [programs]);

    // --- HANDLERS ---
    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;

        const skillsArray = typeof templateForm.skills === 'string'
            ? (templateForm.skills as string).split(',').map(s => s.trim()).filter(Boolean)
            : templateForm.skills || [];

        const stepsArray = typeof templateForm.defaultSteps === 'string'
            ? (templateForm.defaultSteps as string).split('\n').map(s => s.trim()).filter(Boolean)
            : templateForm.defaultSteps || [];

        const data = cleanData({
            ...templateForm,
            skills: skillsArray,
            defaultSteps: stepsArray,
            updatedAt: serverTimestamp()
        });

        if (editingTemplateId) {
            // Update existing template
            await updateDoc(doc(db, 'project_templates', editingTemplateId), data);
        } else {
            // Create new template
            await addDoc(collection(db, 'project_templates'), {
                ...data,
                createdAt: serverTimestamp()
            });
        }

        setIsTemplateModalOpen(false);
        setTemplateForm({ title: '', description: '', difficulty: 'beginner', skills: [], defaultSteps: [], station: 'general', resources: [], status: 'draft', targetAudience: { grades: [], groups: [] } });
        setEditingTemplateId(null);
        setWizardStep(0);
        setActiveModalTab('details');
    };

    const WIZARD_STEPS = [
        { title: 'Welcome', description: 'Get Started' },
        { title: 'Basics', description: 'Project Info' },
        { title: 'Details', description: 'Difficulty & Skills' },
        { title: 'Path', description: 'Learning Steps' },
        { title: 'Resources', description: 'Materials' },
        { title: 'Audience', description: 'Who is it for?' },
        { title: 'Publish', description: 'Status & Dates' },
        { title: 'Review', description: 'Ready to Launch?' }
    ];

    const isStepValid = (step: number) => {
        switch (step) {
            case 0: return true;
            case 1: return !!templateForm.title && !!templateForm.description && !!templateForm.station;
            case 2: return !!templateForm.difficulty;
            case 3: return (templateForm.defaultSteps?.length || 0) > 0;
            default: return true;
        }
    };

    const handleNextStep = () => {
        if (wizardStep < WIZARD_STEPS.length - 1) setWizardStep(prev => prev + 1);
    };
    const handlePrevStep = () => {
        if (wizardStep > 0) setWizardStep(prev => prev - 1);
    };

    const handleEditTemplate = (template: ProjectTemplate) => {
        setTemplateForm({
            title: template.title,
            description: template.description,
            difficulty: template.difficulty,
            skills: template.skills,
            defaultSteps: template.defaultSteps,
            station: template.station,
            resources: template.resources || [],
            status: template.status || 'draft',
            targetAudience: template.targetAudience || { grades: [], groups: [] },
            dueDate: template.dueDate
        });
        setEditingTemplateId(template.id);
        setActiveModalTab('details');
        setIsTemplateModalOpen(true);
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!db || !confirm("Delete this assignment template?")) return;
        await deleteDoc(doc(db, 'project_templates', id));
    };

    const handleSeedCurriculum = async () => {
        if (!db) return;
        setIsSeeding(true);
        try {
            for (const t of MOCK_PROJECT_TEMPLATES) {
                await addDoc(collection(db, 'project_templates'), {
                    ...t,
                    createdAt: serverTimestamp()
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSeeding(false);
        }
    };

    const handleSeedWorkflows = async () => {
        if (!db) return;
        setIsSeeding(true);
        try {
            const defaultWorkflows: Omit<ProcessTemplate, 'id'>[] = [
                {
                    name: 'Engineering Design Process',
                    description: 'Standard engineering workflow: Ask, Imagine, Plan, Create, Test, Improve',
                    isDefault: true,
                    phases: [
                        { id: 'ask', name: 'Ask', color: 'blue', icon: 'HelpCircle', order: 1, description: 'Define the problem' },
                        { id: 'imagine', name: 'Imagine', color: 'purple', icon: 'Lightbulb', order: 2, description: 'Brainstorm solutions' },
                        { id: 'plan', name: 'Plan', color: 'cyan', icon: 'ClipboardList', order: 3, description: 'Design your solution' },
                        { id: 'create', name: 'Create', color: 'amber', icon: 'Hammer', order: 4, description: 'Build a prototype' },
                        { id: 'test', name: 'Test', color: 'green', icon: 'Beaker', order: 5, description: 'Test and evaluate' },
                        { id: 'improve', name: 'Improve', color: 'orange', icon: 'RefreshCw', order: 6, description: 'Iterate and refine' }
                    ],
                    createdAt: serverTimestamp() as any
                },
                {
                    name: 'Scientific Method',
                    description: 'Classic scientific inquiry process',
                    isDefault: false,
                    phases: [
                        { id: 'question', name: 'Question', color: 'blue', icon: 'HelpCircle', order: 1 },
                        { id: 'research', name: 'Research', color: 'purple', icon: 'BookOpen', order: 2 },
                        { id: 'hypothesis', name: 'Hypothesis', color: 'cyan', icon: 'Lightbulb', order: 3 },
                        { id: 'experiment', name: 'Experiment', color: 'amber', icon: 'Beaker', order: 4 },
                        { id: 'analyze', name: 'Analyze', color: 'green', icon: 'BarChart', order: 5 },
                        { id: 'conclude', name: 'Conclude', color: 'indigo', icon: 'CheckCircle', order: 6 }
                    ],
                    createdAt: serverTimestamp() as any
                },
                {
                    name: 'Design Thinking',
                    description: 'Human-centered design approach',
                    isDefault: false,
                    phases: [
                        { id: 'empathize', name: 'Empathize', color: 'pink', icon: 'Heart', order: 1 },
                        { id: 'define', name: 'Define', color: 'purple', icon: 'Target', order: 2 },
                        { id: 'ideate', name: 'Ideate', color: 'cyan', icon: 'Zap', order: 3 },
                        { id: 'prototype', name: 'Prototype', color: 'amber', icon: 'Box', order: 4 },
                        { id: 'test', name: 'Test', color: 'green', icon: 'TestTube', order: 5 }
                    ],
                    createdAt: serverTimestamp() as any
                }
            ];

            for (const workflow of defaultWorkflows) {
                await addDoc(collection(db, 'process_templates'), workflow);
            }
        } catch (e) {
            console.error('Error seeding workflows:', e);
        } finally {
            setIsSeeding(false);
        }
    };

    const handleEditWorkflow = (workflow: ProcessTemplate) => {
        setEditingWorkflowId(workflow.id);
        setWorkflowForm({
            name: workflow.name,
            description: workflow.description,
            phases: workflow.phases,
            isDefault: workflow.isDefault
        });
        setIsWorkflowModalOpen(true);
    };

    const handleDeleteWorkflow = async (id: string) => {
        if (!db || !confirm('Delete this workflow? Projects using it will need to be reassigned.')) return;
        try {
            await deleteDoc(doc(db, 'process_templates', id));
        } catch (e) {
            console.error('Error deleting workflow:', e);
        }
    };

    const handleSetDefaultWorkflow = async (id: string) => {
        if (!db) return;
        try {
            // First, unset all defaults
            const firestore = db!;
            const batch = writeBatch(firestore);
            processTemplates.forEach(wf => {
                if (wf.isDefault) {
                    batch.update(doc(firestore, 'process_templates', wf.id), { isDefault: false });
                }
            });
            // Set the new default
            batch.update(doc(firestore, 'process_templates', id), { isDefault: true });
            await batch.commit();
        } catch (e) {
            console.error('Error setting default workflow:', e);
        }
    };

    // --- STATIONS HANDLERS ---
    const handleSeedStations = async () => {
        if (!db) return;
        setIsSeeding(true);
        try {
            const stationEntries = Object.entries(STATION_THEMES).map(([key, theme], index) => ({
                id: key,
                label: theme.label,
                color: key.includes('robo') ? 'sky' : key.includes('cod') ? 'violet' : key.includes('game') ? 'amber' : key.includes('multi') ? 'pink' : key.includes('brand') ? 'rose' : key.includes('engineer') ? 'emerald' : 'slate',
                icon: theme.icon.name || 'Circle',
                description: `${theme.label} projects and activities`,
                order: index + 1
            }));

            for (const station of stationEntries) {
                await addDoc(collection(db, 'stations'), {
                    ...station,
                    createdAt: serverTimestamp()
                });
            }
        } catch (e) {
            console.error('Error seeding stations:', e);
        } finally {
            setIsSeeding(false);
        }
    };

    const handleSeedBadges = async () => {
        if (!db) return;
        setIsSeeding(true);
        try {
            const defaultBadges = [
                { name: 'First Step', description: 'Completed your very first project!', color: 'blue', icon: 'Award', criteria: { type: 'project_count', target: 'all', count: 1 } },
                { name: 'Maker', description: 'Completed 5 projects. You\'re getting the hang of this!', color: 'purple', icon: 'Hammer', criteria: { type: 'project_count', target: 'all', count: 5 } },
                { name: 'Innovator', description: 'Completed 10 projects. A true innovator in the making.', color: 'amber', icon: 'Zap', criteria: { type: 'project_count', target: 'all', count: 10 } },
                { name: 'Legend', description: 'Completed 20 projects. You are a Makerlab Legend!', color: 'yellow', icon: 'Crown', criteria: { type: 'project_count', target: 'all', count: 20 } },
                { name: 'Bot Beginner', description: 'Built your first robot or circuit.', color: 'sky', icon: 'Bot', criteria: { type: 'project_count', target: 'robotics', count: 1 } },
                { name: 'Circuit Wizard', description: 'Completed 3 robotics projects.', color: 'sky', icon: 'Zap', criteria: { type: 'project_count', target: 'robotics', count: 3 } },
                { name: 'Robo-Master', description: 'Completed 5 robotics projects. Master of machines!', color: 'sky', icon: 'Cpu', criteria: { type: 'project_count', target: 'robotics', count: 5 } },
                { name: 'Hello World', description: 'Wrote your first line of code.', color: 'violet', icon: 'Terminal', criteria: { type: 'project_count', target: 'coding', count: 1 } },
                { name: 'Scripter', description: 'Completed 3 coding projects.', color: 'violet', icon: 'Code', criteria: { type: 'project_count', target: 'coding', count: 3 } },
                { name: 'Full Stack', description: 'Completed 5 coding projects. You speak the language of computers.', color: 'violet', icon: 'Layers', criteria: { type: 'project_count', target: 'coding', count: 5 } },
                { name: 'Player One', description: 'Created your first game.', color: 'amber', icon: 'Gamepad2', criteria: { type: 'project_count', target: 'game_design', count: 1 } },
                { name: 'Level Designer', description: 'Completed 3 game design projects.', color: 'amber', icon: 'Map', criteria: { type: 'project_count', target: 'game_design', count: 3 } },
                { name: 'Game Master', description: 'Completed 5 game design projects. High score!', color: 'amber', icon: 'Trophy', criteria: { type: 'project_count', target: 'game_design', count: 5 } },
                { name: 'Creator', description: 'Produced your first video or animation.', color: 'pink', icon: 'Video', criteria: { type: 'project_count', target: 'multimedia', count: 1 } },
                { name: 'Editor', description: 'Completed 3 multimedia projects.', color: 'pink', icon: 'Scissors', criteria: { type: 'project_count', target: 'multimedia', count: 3 } },
                { name: 'Director', description: 'Completed 5 multimedia projects. Hollywood calling!', color: 'pink', icon: 'Clapperboard', criteria: { type: 'project_count', target: 'multimedia', count: 5 } },
                { name: 'Designer', description: 'Created your first design asset.', color: 'emerald', icon: 'PenTool', criteria: { type: 'project_count', target: 'branding', count: 1 } },
                { name: 'Artist', description: 'Completed 3 branding projects.', color: 'emerald', icon: 'Palette', criteria: { type: 'project_count', target: 'branding', count: 3 } },
                { name: 'Creative Director', description: 'Completed 5 branding projects. Visionary!', color: 'emerald', icon: 'Briefcase', criteria: { type: 'project_count', target: 'branding', count: 5 } },
                { name: 'Tinkerer', description: 'Built your first physical prototype.', color: 'slate', icon: 'Wrench', criteria: { type: 'project_count', target: 'engineering', count: 1 } },
                { name: 'Builder', description: 'Completed 3 engineering projects.', color: 'slate', icon: 'Hammer', criteria: { type: 'project_count', target: 'engineering', count: 3 } },
                { name: 'Chief Engineer', description: 'Completed 5 engineering projects. Solid as a rock.', color: 'slate', icon: 'HardHat', criteria: { type: 'project_count', target: 'engineering', count: 5 } },
                { name: '3D Wizard', description: 'Mastered the art of 3D modeling.', color: 'indigo', icon: 'Box', criteria: { type: 'skill', target: '3D Design' } },
                { name: 'Programmer', description: 'Learned the logic of programming.', color: 'violet', icon: 'Code2', criteria: { type: 'skill', target: 'Block Coding' } },
                { name: 'Problem Solver', description: 'Overcame complex challenges.', color: 'blue', icon: 'Puzzle', criteria: { type: 'skill', target: 'Problem Solving' } },
                { name: 'Physicist', description: 'Applied laws of physics in a project.', color: 'cyan', icon: 'Atom', criteria: { type: 'skill', target: 'Physics' } },
                { name: 'Animator', description: 'Brought static images to life.', color: 'pink', icon: 'Film', criteria: { type: 'skill', target: 'Animation' } },
                { name: 'Storyteller', description: 'Crafted a compelling narrative.', color: 'rose', icon: 'BookOpen', criteria: { type: 'skill', target: 'Storyboarding' } },
                { name: 'Graphic Artist', description: 'Created stunning visual graphics.', color: 'emerald', icon: 'Image', criteria: { type: 'skill', target: 'Graphic Design' } },
                { name: 'Vector Pro', description: 'Mastered scalable vector graphics.', color: 'green', icon: 'PenTool', criteria: { type: 'skill', target: 'Vector Art' } },
                { name: 'Brand Expert', description: 'Learned how to build a brand identity.', color: 'teal', icon: 'Tag', criteria: { type: 'skill', target: 'Branding' } },
                { name: 'Roboticist', description: 'Learned the fundamentals of robotics.', color: 'sky', icon: 'Bot', criteria: { type: 'skill', target: 'Robotics' } }
            ];

            for (const badge of defaultBadges) {
                await addDoc(collection(db, 'badges'), {
                    ...badge,
                    createdAt: serverTimestamp()
                });
            }
        } catch (e) {
            console.error('Error seeding badges:', e);
        } finally {
            setIsSeeding(false);
        }
    };

    const handleEditStation = (station: Station) => {
        setEditingStationId(station.id);
        const s = station as any;
        setStationForm({
            label: station.label,
            color: station.color,
            icon: station.icon,
            description: station.description,
            order: station.order,
            gradeIds: station.gradeIds || (s.gradeId ? [s.gradeId] : []),
            gradeNames: station.gradeNames || (s.gradeName ? [s.gradeName] : [])
        });
        setIsStationModalOpen(true);
    };

    const handleDeleteStation = async (id: string) => {
        if (!db || !confirm('Delete this station? Projects using it will need to be reassigned.')) return;
        try {
            await deleteDoc(doc(db, 'stations', id));
        } catch (e) {
            console.error('Error deleting station:', e);
        }
    };



    const handleToggleStationActivation = async (stationId: string, gradeId: string) => {
        if (!db) return;
        try {
            const batch = writeBatch(db);
            const targetStation = stations.find(s => s.id === stationId);
            if (!targetStation) return;

            const isCurrentlyActive = targetStation.activeForGradeIds?.includes(gradeId);

            if (isCurrentlyActive) {
                // Deactivate
                const newActiveIds = (targetStation.activeForGradeIds || []).filter(id => id !== gradeId);
                batch.update(doc(db, 'stations', stationId), { activeForGradeIds: newActiveIds });
            } else {
                // Activate
                // 1. Add to target station
                const newActiveIds = [...(targetStation.activeForGradeIds || []), gradeId];
                batch.update(doc(db, 'stations', stationId), { activeForGradeIds: newActiveIds });

                // 2. Remove from other stations that are active for this grade
                stations.forEach(st => {
                    if (st.id !== stationId && st.activeForGradeIds?.includes(gradeId)) {
                        const filteredIds = (st.activeForGradeIds || []).filter(id => id !== gradeId);
                        batch.update(doc(db!, 'stations', st.id), { activeForGradeIds: filteredIds });
                    }
                });
            }
            await batch.commit();
        } catch (e) {
            console.error('Error toggling station activation:', e);
        }
    };

    const handleReviewAction = async (status: 'published' | 'changes_requested') => {
        if (!db || !selectedSubmission) return;
        try {
            await updateDoc(doc(db, 'student_projects', selectedSubmission.id), {
                status: status === 'changes_requested' ? 'changes_requested' : 'published',
                instructorFeedback: feedback,
                updatedAt: serverTimestamp()
            });

            if (selectedSubmission.studentId) {
                await sendNotification(
                    selectedSubmission.studentId,
                    status === 'published' ? 'Mission Accomplished! 🚀' : 'Mission Update 📝',
                    status === 'published'
                        ? `Your project "${selectedSubmission.title}" has been approved and published!`
                        : `Your project "${selectedSubmission.title}" needs some changes. Check the feedback!`,
                    status === 'published' ? 'success' : 'warning'
                );

                // --- BADGE AWARDING LOGIC ---
                if (status === 'published') {
                    const studentId = selectedSubmission.studentId;
                    const student = students.find(s => s.id === studentId);

                    if (student) {
                        const currentBadges = student.badges || [];
                        const newBadges: string[] = [];

                        // Get all published projects for this student (including this one)
                        const studentPublishedProjects = studentProjects.filter(p => p.studentId === studentId && p.status === 'published');
                        // Add current one if not already in list (it might not be updated in context yet)
                        const allProjects = studentPublishedProjects.find(p => p.id === selectedSubmission.id)
                            ? studentPublishedProjects
                            : [...studentPublishedProjects, { ...selectedSubmission, status: 'published' } as StudentProject];

                        // Check each badge
                        for (const badge of badges) {
                            if (currentBadges.includes(badge.id)) continue; // Already has it

                            let earned = false;

                            if (badge.criteria.type === 'project_count') {
                                const targetStation = badge.criteria.target;
                                let count = 0;

                                if (targetStation === 'all') {
                                    count = allProjects.length;
                                } else {
                                    count = allProjects.filter(p => p.station === targetStation).length;
                                }

                                if (count >= badge.criteria.count) {
                                    earned = true;
                                }
                            } else if (badge.criteria.type === 'skill') {
                                const allSkills = new Set<string>();
                                allProjects.forEach(p => p.skillsAcquired?.forEach(s => allSkills.add(s)));

                                if (allSkills.has(badge.criteria.target)) {
                                    earned = true;
                                }
                            }

                            if (earned) {
                                newBadges.push(badge.id);
                            }
                        }

                        if (newBadges.length > 0) {
                            await updateDoc(doc(db, 'students', studentId), {
                                badges: [...currentBadges, ...newBadges]
                            });

                            // 2. Update Project with Earned Badges
                            await updateDoc(doc(db, 'student_projects', selectedSubmission.id), {
                                earnedBadgeIds: newBadges
                            });

                            // Notify for each badge
                            for (const badgeId of newBadges) {
                                const badge = badges.find(b => b.id === badgeId);
                                if (badge) {
                                    await sendNotification(
                                        studentId,
                                        'New Badge Earned! 🏆',
                                        `You earned the "${badge.name}" badge!`,
                                        'success'
                                    );
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error processing review:", error);
            alert("There was an error updating the project status. Please try again.");
        } finally {
            setReviewModalOpen(false);
            setFeedback('');
            setSelectedSubmission(null);
        }

        setReviewModalOpen(false);
        setFeedback('');
        setSelectedSubmission(null);
    };

    const startNewProject = (template?: ProjectTemplate) => {
        const defaultWorkflowId = template?.defaultWorkflowId || '';
        let initialSteps: ProjectStep[] = [];
        let initialWorkflowId = '';

        if (defaultWorkflowId) {
            const workflow = processTemplates.find(w => w.id === defaultWorkflowId);
            if (workflow) {
                initialWorkflowId = defaultWorkflowId;
                initialSteps = workflow.phases.map(p => ({
                    id: Date.now().toString() + Math.random(),
                    title: p.name,
                    status: 'todo',
                    isLocked: true
                }));
            }
        }

        // Fallback to template default steps if no workflow steps defined
        if (initialSteps.length === 0 && template?.defaultSteps) {
            initialSteps = template.defaultSteps.map(s => ({
                id: Date.now().toString() + Math.random(),
                title: s,
                status: 'todo',
                isLocked: true
            }));
        }

        setSelectedWorkflowId(initialWorkflowId);
        setProjectForm({
            title: template ? template.title : '',
            description: template ? template.description : '',
            externalLink: '',
            embedUrl: '',
            mediaUrls: template?.thumbnailUrl ? [template.thumbnailUrl] : [],
            resources: template?.resources || [],
            skillsAcquired: template ? template.skills : [],
            steps: initialSteps,
            templateId: template?.id || null,
            station: template ? template.station : 'general',
            status: 'planning'
        });
        setActiveProject(null);
        setIsProjectModalOpen(true);
    };

    const handleWorkflowChange = (workflowId: string) => {
        setSelectedWorkflowId(workflowId);
        const workflow = processTemplates.find(w => w.id === workflowId);
        if (workflow) {
            const newSteps = workflow.phases.map(p => ({
                id: Date.now().toString() + Math.random(),
                title: p.name,
                status: 'todo' as const,
                isLocked: true
            }));
            setProjectForm(prev => ({ ...prev, steps: newSteps }));
        }
    };

    const openActiveProject = (project: StudentProject) => {
        setActiveProject(project);
        setProjectForm(project);
        setIsProjectModalOpen(true);
    };

    const handleSaveProject = async (silent = false): Promise<string | undefined> => {
        console.log("💾 Saving project...", { silent, currentStudentId, userProfile });

        if (!db || !userProfile) {
            console.error("❌ Cannot save: Missing DB or User Profile", { db: !!db, userProfile: !!userProfile });
            if (!silent) addToast("Error", "Not logged in or database unavailable.", "error");
            return;
        }

        console.log("✅ DB and userProfile check passed");

        // Fallback: If currentStudentId is null (e.g. new account not synced), use Auth UID
        const studentIdToUse = currentStudentId || userProfile.uid;
        console.log("📝 Student ID to use:", studentIdToUse);

        const rawData = {
            ...projectForm,
            studentId: studentIdToUse,
            studentName: userProfile.name,
            updatedAt: serverTimestamp()
        };

        const data = cleanData(rawData);
        console.log("🧹 Data cleaned, ready to save");

        try {
            if (activeProject) {
                console.log("📤 Updating existing project:", activeProject.id);
                await updateDoc(doc(db, 'student_projects', activeProject.id), data);
                console.log("✅ Project updated successfully!");
                if (!silent) addToast("Saved!", "Project updated successfully. 💾", "success");
                return activeProject.id;
            } else {
                console.log("🆕 Creating new project...");
                if (!data.mediaUrls || (data.mediaUrls as string[]).length === 0) {
                    if (data.title) {
                        try {
                            console.log("🖼️ Generating thumbnail...");
                            // We might want to trigger the Google Search here too if we wanted fully auto, 
                            // but for now we stick to the manual button or fallback to canvas if needed.
                            // Keeping existing canvas fallback for now if no image provided.
                            const thumbnail = await generateProjectThumbnail(data.title as string, userProfile.name, (data.station as StationType) || 'general', settings.academyName);
                            data.mediaUrls = [thumbnail];
                            setProjectForm(prev => ({ ...prev, mediaUrls: [thumbnail] }));
                            console.log("✅ Thumbnail generated");
                        } catch (e) {
                            console.error("⚠️ Thumbnail gen failed", e);
                        }
                    }
                }

                console.log("📤 Adding document to Firestore...");
                const ref = await addDoc(collection(db, 'student_projects'), {
                    ...data,
                    status: 'planning',
                    createdAt: serverTimestamp()
                });

                console.log("✅ Document added with ID:", ref.id);

                // Update active project so subsequent saves are updates
                const newProject = { ...data, id: ref.id, status: 'planning' } as StudentProject;
                setActiveProject(newProject);

                if (!silent) addToast("Created!", "New project started! 🚀", "success");
                return ref.id;
            }
        } catch (error) {
            console.error("❌ Error saving project:", error);
            if (!silent) addToast("Error", "Failed to save project. Please check your connection.", "error");
            return undefined;
        }
    };

    const handleAddStep = () => {
        if (!newStepTitle.trim()) return;
        setProjectForm(prev => ({
            ...prev,
            steps: [...(prev.steps || []), { id: Date.now().toString(), title: newStepTitle, status: 'todo', isLocked: false }]
        }));
        setNewStepTitle('');
    };

    const handleMoveStep = (stepId: string, newStatus: 'todo' | 'doing' | 'done') => {
        // If the new Wizard is open, don't trigger the legacy proof modal here.
        // The Wizard handles its own proof of work flow internally.
        if (newStatus === 'done' && !isProjectModalOpen) {
            setActiveStepForProof(stepId);
            setProofFile(null);
            setIsProofModalOpen(true);
            return;
        }
        setProjectForm(prev => ({
            ...prev,
            steps: prev.steps?.map(s => s.id === stepId ? { ...s, status: newStatus } : s)
        }));
    };

    const handleProofFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofFile(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProofSubmit = async () => {
        if (!activeStepForProof || !proofFile) return;

        const updatedSteps = projectForm.steps?.map(s => s.id === activeStepForProof ? {
            ...s,
            status: 'done' as const,
            proofUrl: proofFile,
            proofStatus: 'pending' as const
        } : s);

        setProjectForm(prev => ({
            ...prev,
            steps: updatedSteps
        }));

        // Auto-save to Firestore
        if (activeProject?.id && db) {
            await updateDoc(doc(db, 'student_projects', activeProject.id), {
                steps: updatedSteps,
                updatedAt: serverTimestamp()
            });
        }

        setIsProofModalOpen(false);
        setProofFile(null);
        setActiveStepForProof(null);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
    };

    const handleDeleteStep = (stepId: string) => {
        setProjectForm(prev => ({
            ...prev,
            steps: prev.steps?.filter(s => s.id !== stepId)
        }));
    };

    const handleStartBuilding = async () => {
        if (!db) return;
        if ((projectForm.steps?.length || 0) < 1) return alert("Plan at least one step!");

        let projectId = activeProject?.id;
        if (!projectId) {
            projectId = await handleSaveProject(true);
        }

        setProjectForm(prev => ({ ...prev, status: 'building' }));

        if (projectId) {
            await updateDoc(doc(db, 'student_projects', projectId), { status: 'building' });
            if (!activeProject) {
                setActiveProject(prev => prev ? ({ ...prev, id: projectId!, status: 'building' }) : null);
            }
        }
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
    };

    const handleSubmitForReview = async () => {
        if (!db || !activeProject) return;
        const allDone = projectForm.steps?.every(s => s.status === 'done');
        if (!allDone) {
            alert("Mission Incomplete: Finish all tasks before submitting!");
            return;
        }

        let media = projectForm.mediaUrls || [];
        if (media.length === 0) {
            try {
                const thumbnail = await generateProjectThumbnail(projectForm.title || 'Project', userProfile?.name || 'Student', projectForm.station || 'general', settings.academyName);
                media = [thumbnail];
            } catch (e) { console.error(e); }
        }

        await updateDoc(doc(db, 'student_projects', activeProject.id), {
            ...cleanData(projectForm),
            mediaUrls: media,
            status: 'submitted',
            updatedAt: serverTimestamp()
        });
        setIsProjectModalOpen(false);
        setShowSuccessModal(true);

        // Notify Instructors
        const instructors = teamMembers.filter(m => m.role === 'instructor' || m.role === 'admin');
        for (const instructor of instructors) {
            if (instructor.uid) {
                await sendNotification(
                    instructor.uid,
                    'New Project Submission 📬',
                    `${userProfile?.name || 'Student'} submitted "${projectForm.title}" for review.`,
                    'info'
                );
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            setProjectForm(prev => ({ ...prev, mediaUrls: [compressed] }));
        } catch (err) { console.error(err); }
    };

    if (isInstructor) {
        return (
            <div className="space-y-6 pb-24 md:pb-8 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                {showConfetti && <Confetti duration={4000} />}
                {/* Header */}
                <div className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-xl border gap-4 ${theme.card}`}>
                    <div>
                        <h2 className={`text-xl font-bold flex items-center gap-2 ${theme.text}`}><Brain className="w-6 h-6 text-cyan-500" /> Learning Management</h2>
                        <p className="text-slate-500 text-sm">Manage curriculum, review student work, and build portfolios.</p>
                    </div>
                    <div className={`flex p-1 rounded-lg border overflow-x-auto ${theme.tabContainer}`}>
                        <button onClick={() => setActiveTab('curriculum')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'curriculum' ? theme.tabActive : theme.tabInactive}`}>
                            <Brain size={16} /> Curriculum
                        </button>
                        <button onClick={() => setActiveTab('studio')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'studio' ? (isStudioTheme ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm') : theme.tabInactive}`}>
                            <Rocket size={16} /> Studio
                        </button>
                        <button onClick={() => setActiveTab('review')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'review' ? theme.tabActive : theme.tabInactive}`}>
                            <CheckCircle2 size={16} /> Review
                            {pendingReviews.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{pendingReviews.length}</span>}
                        </button>
                        <button onClick={() => setActiveTab('portfolios')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'portfolios' ? theme.tabActive : theme.tabInactive}`}><Award size={16} /> Portfolios</button>
                        <button onClick={() => setActiveTab('setup')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'setup' ? theme.tabActive : theme.tabInactive}`}><Beaker size={16} /> Setup</button>
                    </div>
                </div>

                {/* CURRICULUM TAB */}
                {/* CURRICULUM TAB - The Factory */}
                {activeTab === 'curriculum' && (
                    <>
                        {!showStationProjects ? (
                            <FactoryDashboard
                                projectTemplates={projectTemplates}
                                stations={stations}
                                programs={programs}
                                onAddProject={(station, grade) => {
                                    setTemplateForm({
                                        title: '',
                                        description: '',
                                        difficulty: 'beginner',
                                        skills: [],
                                        defaultSteps: [],
                                        station: station || 'general',
                                        resources: [],
                                        status: 'draft',
                                        targetAudience: grade
                                            ? { grades: [grade], groups: [] }
                                            : { grades: [], groups: [] }
                                    });
                                    setEditingTemplateId(null);
                                    setWizardStep(0);
                                    setActiveModalTab('details');
                                    setIsTemplateModalOpen(true);
                                }}
                                onViewStation={(station) => {
                                    setSelectedStation(station);
                                    setShowStationProjects(true);
                                }}
                            />
                        ) : (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
                                {/* Header with Back Button */}
                                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => {
                                                setShowStationProjects(false);
                                                setSelectedStation(null);
                                            }}
                                            className="p-3 hover:bg-white/10 rounded-xl transition-colors group"
                                        >
                                            <ArrowLeft size={24} className="text-slate-400 group-hover:text-white" />
                                        </button>
                                        <div>
                                            <h2 className="text-3xl font-black text-white flex items-center gap-3">
                                                {selectedStation && (
                                                    <span className={`w-3 h-8 rounded-full bg-${getTheme(selectedStation).color}-500 block`}></span>
                                                )}
                                                {selectedStation && getTheme(selectedStation).label} Projects
                                            </h2>
                                            <p className="text-slate-400 text-lg mt-1">Manage templates and view student progress</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Actions could go here */}
                                    </div>
                                </div>

                                {/* Project Templates Section */}
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                            <FileText size={20} />
                                        </div>
                                        Project Templates
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                                        {/* Add New Template Card */}
                                        <button
                                            onClick={() => {
                                                setTemplateForm({
                                                    title: '',
                                                    description: '',
                                                    difficulty: 'beginner',
                                                    skills: [],
                                                    defaultSteps: [],
                                                    station: selectedStation || 'general',
                                                    resources: [],
                                                    status: 'draft',
                                                    targetAudience: { grades: [], groups: [] }
                                                });
                                                setEditingTemplateId(null);
                                                setIsTemplateModalOpen(true);
                                            }}
                                            className="group relative h-full min-h-[280px] bg-indigo-900/10 border-2 border-dashed border-indigo-500/30 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-indigo-900/20 hover:border-indigo-500/50 transition-all"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Plus size={32} className="text-indigo-400" />
                                            </div>
                                            <span className="font-bold text-indigo-300">New Template</span>
                                        </button>

                                        {projectTemplates
                                            .filter(t => t.station === selectedStation)
                                            .map(template => {
                                                const theme = getTheme(template.station);
                                                return (
                                                    <div key={template.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-900/20 flex flex-col">
                                                        <div className="aspect-video bg-slate-800 relative overflow-hidden">
                                                            {template.thumbnailUrl ? (
                                                                <img src={template.thumbnailUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={template.title} />
                                                            ) : (
                                                                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                                                    <FileText size={48} className="text-slate-700" />
                                                                </div>
                                                            )}
                                                            <div className="absolute top-3 right-3 flex gap-2">
                                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-950/80 text-white backdrop-blur-sm border border-white/10">
                                                                    Template
                                                                </span>
                                                            </div>
                                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                                                        </div>
                                                        <div className="p-5 flex flex-col flex-1">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${theme.badge} bg-opacity-10`}>{theme.label}</span>
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-slate-700 text-slate-400`}>{template.difficulty}</span>
                                                            </div>
                                                            <h3 className="font-bold text-white text-lg mb-2 leading-tight group-hover:text-indigo-400 transition-colors">{template.title}</h3>
                                                            <p className="text-sm text-slate-400 mb-6 line-clamp-2">{template.description}</p>

                                                            <div className="mt-auto pt-4 border-t border-slate-800 flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingTemplateId(template.id);
                                                                        setTemplateForm(template);
                                                                        setWizardStep(0);
                                                                        setActiveModalTab('details');
                                                                        setIsTemplateModalOpen(true);
                                                                    }}
                                                                    className="flex-1 py-2.5 bg-slate-800 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <Edit3 size={14} />
                                                                    Edit
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Student Projects Section */}
                                <div className="pt-8 border-t border-slate-800">
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                                            <Rocket size={20} />
                                        </div>
                                        Student Projects
                                    </h3>

                                    {studentProjects.filter(p => p.station === selectedStation).length === 0 ? (
                                        <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl p-12 text-center">
                                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Rocket size={32} className="text-slate-600" />
                                            </div>
                                            <h4 className="font-bold text-white mb-2">No Projects Yet</h4>
                                            <p className="text-slate-500">Students haven't started any projects in this station yet.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {studentProjects
                                                .filter(p => p.station === selectedStation)
                                                .map(project => {
                                                    const theme = getTheme(project.station);
                                                    const student = students.find(s => s.id === project.studentId);
                                                    const progress = project.steps && project.steps.length > 0
                                                        ? Math.round((project.steps.filter(s => s.status === 'done').length / project.steps.length) * 100)
                                                        : 0;

                                                    const statusColors = {
                                                        planning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                                                        building: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                                                        submitted: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
                                                        published: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                                                        changes_requested: 'text-orange-400 bg-orange-400/10 border-orange-400/20'
                                                    } as any;

                                                    return (
                                                        <div key={project.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-900/20 flex flex-col">
                                                            <div className="aspect-video bg-slate-800 relative overflow-hidden">
                                                                {project.mediaUrls?.[0] ? (
                                                                    <img src={project.mediaUrls[0]} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={project.title} />
                                                                ) : (
                                                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                                                        <ImageIcon size={32} className="text-slate-700" />
                                                                    </div>
                                                                )}
                                                                <div className="absolute top-3 right-3">
                                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-sm border ${statusColors[project.status] || 'text-slate-400 bg-slate-800 border-slate-700'}`}>
                                                                        {project.status.replace('_', ' ')}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="p-5 flex flex-col flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">
                                                                        {student?.name?.charAt(0) || '?'}
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-400">{student?.name || project.studentName}</span>
                                                                </div>

                                                                <h3 className="font-bold text-white text-lg mb-4 leading-tight line-clamp-1 group-hover:text-emerald-400 transition-colors">{project.title}</h3>

                                                                {/* Progress Bar */}
                                                                <div className="mb-6">
                                                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                                                                        <span>COMPLETION</span>
                                                                        <span className={progress === 100 ? 'text-emerald-400' : 'text-slate-400'}>{progress}%</span>
                                                                    </div>
                                                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-800">
                                                                        <div className={`h-full bg-gradient-to-r ${theme.gradient} transition-all duration-500`} style={{ width: `${progress}%` }} />
                                                                    </div>
                                                                </div>

                                                                <div className="mt-auto flex gap-2">
                                                                    {project.presentationUrl && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                window.open(project.presentationUrl, '_blank');
                                                                            }}
                                                                            className="px-3 py-2 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-600/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                                                                            title="Watch Presentation"
                                                                        >
                                                                            <Play size={14} fill="currentColor" />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveProject(project);
                                                                            setProjectForm(project);
                                                                            setIsProjectModalOpen(true);
                                                                        }}
                                                                        className="flex-1 py-2 bg-slate-800 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-emerald-500"
                                                                    >
                                                                        <Edit3 size={14} />
                                                                        Manage
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* TRACK PROJECTS TAB */}
                {activeTab === 'track' && (
                    <div className="flex flex-col space-y-6">
                        {/* Status Overview Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                                { status: 'all', label: 'All Projects', count: studentProjects.length, color: 'slate', icon: LayoutGrid },
                                { status: 'planning', label: 'Planning', count: studentProjects.filter(p => p.status === 'planning').length, color: 'amber', icon: ClipboardList },
                                { status: 'building', label: 'Building', count: studentProjects.filter(p => p.status === 'building').length, color: 'cyan', icon: Zap },
                                { status: 'testing', label: 'Testing', count: studentProjects.filter(p => p.status === 'testing').length, color: 'blue', icon: CheckCircle2 },
                                { status: 'delivered', label: 'Delivered', count: studentProjects.filter(p => p.status === 'delivered').length, color: 'purple', icon: Send },
                                { status: 'submitted', label: 'Submitted', count: studentProjects.filter(p => p.status === 'submitted').length, color: 'indigo', icon: Send },
                                { status: 'changes_requested', label: 'Changes Needed', count: studentProjects.filter(p => p.status === 'changes_requested').length, color: 'orange', icon: AlertCircle },
                                { status: 'published', label: 'Published', count: studentProjects.filter(p => p.status === 'published').length, color: 'emerald', icon: CheckCircle2 }
                            ].map(({ status, label, count, color, icon: Icon }) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status as any)}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${statusFilter === status
                                        ? `bg-${color}-950/30 border-${color}-500/50`
                                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon size={16} className={statusFilter === status ? `text-${color}-400` : 'text-slate-500'} />
                                        <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === status ? `text-${color}-400` : 'text-slate-500'}`}>
                                            {label}
                                        </span>
                                    </div>
                                    <div className={`text-2xl font-bold text-white`}>
                                        {count}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Filtered Projects List */}
                        <div className="pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {studentProjects
                                    .filter(p => statusFilter === 'all' || p.status === statusFilter)
                                    .map(project => {
                                        const theme = getTheme(project.station);
                                        const progress = project.steps && project.steps.length > 0
                                            ? Math.round((project.steps.filter(s => s.status === 'done').length / project.steps.length) * 100)
                                            : 0;
                                        return (
                                            <div key={project.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-600 transition-all">
                                                {/* Project Header */}
                                                <div className="h-32 bg-slate-800 relative overflow-hidden">
                                                    {project.mediaUrls?.[0] ? (
                                                        <img src={project.mediaUrls[0]} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={project.title} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                                            <ImageIcon size={32} className="text-slate-700" />
                                                        </div>
                                                    )}
                                                    {/* Status Badge */}
                                                    <div className="absolute top-2 right-2">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-950/80 text-white border border-slate-800`}>
                                                            {project.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Project Info */}
                                                <div className="p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <theme.icon size={12} style={{ color: theme.colorHex }} />
                                                        <span className={`text-[9px] font-bold uppercase ${theme.text}`}>{theme.label}</span>
                                                    </div>
                                                    <h3 className="font-bold text-white text-sm mb-1 line-clamp-1">{project.title}</h3>
                                                    <p className="text-xs text-slate-400 mb-3">by {project.studentName}</p>

                                                    {/* Progress Bar */}
                                                    <div className="mb-3">
                                                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                            <span>Progress</span>
                                                            <span className={progress === 100 ? 'text-emerald-400' : ''}>{progress}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className={`h-full bg-gradient-to-r ${theme.gradient} transition-all`} style={{ width: `${progress}%` }} />
                                                        </div>
                                                    </div>

                                                    {/* Instructor Feedback Preview */}
                                                    {project.instructorFeedback && (
                                                        <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-2 mb-3">
                                                            <p className="text-[10px] text-amber-400 font-bold mb-1">FEEDBACK</p>
                                                            <p className="text-[10px] text-amber-100 italic line-clamp-2">"{project.instructorFeedback}"</p>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2">
                                                        {/* Watch Presentation Button */}
                                                        {project.presentationUrl && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.open(project.presentationUrl, '_blank');
                                                                }}
                                                                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                                                            >
                                                                <Play size={12} fill="currentColor" />
                                                            </button>
                                                        )}
                                                        {/* Review Button (for submitted projects) */}
                                                        {project.status === 'submitted' && (
                                                            <button
                                                                onClick={() => { setSelectedSubmission(project); setReviewModalOpen(true); }}
                                                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors"
                                                            >
                                                                Review Now
                                                            </button>
                                                        )}

                                                        {/* Edit Button (for admins/instructors OR own projects for students) */}
                                                        {(userProfile?.role !== 'student' || project.studentId === userProfile?.uid) && (
                                                            <button
                                                                onClick={() => {
                                                                    setActiveProject(project);
                                                                    setProjectForm(project);
                                                                    setIsProjectModalOpen(true);
                                                                }}
                                                                className={`${project.status === 'submitted' ? 'flex-1' : 'w-full'} py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1`}
                                                            >
                                                                <Edit3 size={12} />
                                                                Edit Project
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                            {studentProjects.filter(p => statusFilter === 'all' || p.status === statusFilter).length === 0 && (
                                <div className="p-12 text-center text-slate-500 italic bg-slate-900/50 rounded-xl border border-slate-800">
                                    No projects found with status: {statusFilter}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STUDIO TAB - Instructor Project Monitoring */}
                {activeTab === 'studio' && (
                    <div>
                        {studioView === 'dashboard' && (
                            <InstructorStudioDashboard
                                studentProjects={studentProjects}
                                students={students}
                                onViewProject={(project) => {
                                    setActiveProject(project);
                                    setProjectForm(project);
                                    setIsProjectModalOpen(true);
                                }}
                                onViewCommits={() => setStudioView('commits')}
                                onViewReviews={() => setStudioView('reviews')}
                            />
                        )}

                        {studioView === 'commits' && (
                            <CommitFeedView
                                studentProjects={studentProjects}
                                students={students}
                                onViewProject={(project) => {
                                    setActiveProject(project);
                                    setProjectForm(project);
                                    setIsProjectModalOpen(true);
                                }}
                            />
                        )}

                        {studioView === 'reviews' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900">Review Queue</h3>
                                        <p className="text-slate-600">Projects submitted for your review</p>
                                    </div>
                                    <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-bold">
                                        {pendingReviews.length} Pending
                                    </div>
                                </div>

                                {pendingReviews.length === 0 ? (
                                    <div className="bg-white border-2 border-slate-200 rounded-xl p-12 text-center">
                                        <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                                        <h4 className="text-xl font-bold text-slate-900 mb-2">All Caught Up! 🎉</h4>
                                        <p className="text-slate-600">No projects waiting for review.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {pendingReviews.map(project => {
                                            const theme = getTheme(project.station);
                                            const student = students.find(s => s.id === project.studentId);
                                            return (
                                                <div key={project.id} className="bg-white border-2 border-purple-200 rounded-xl overflow-hidden hover:border-purple-400 transition-all shadow-sm hover:shadow-lg">
                                                    {/* Project Header */}
                                                    <div className="h-32 bg-slate-800 relative overflow-hidden">
                                                        {project.mediaUrls?.[0] ? (
                                                            <img src={project.mediaUrls[0]} className="w-full h-full object-cover" alt={project.title} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                                                <ImageIcon size={32} className="text-slate-700" />
                                                            </div>
                                                        )}
                                                        <div className="absolute top-2 right-2">
                                                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-purple-600 text-white">
                                                                Needs Review
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Project Info */}
                                                    <div className="p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <theme.icon size={12} style={{ color: theme.colorHex }} />
                                                            <span className={`text-[9px] font-bold uppercase ${theme.text}`}>{theme.label}</span>
                                                        </div>
                                                        <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{project.title}</h3>
                                                        <p className="text-xs text-slate-600 mb-3">by {student?.name || project.studentName}</p>

                                                        {/* Submitted Date */}
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-3">
                                                            <Clock size={10} />
                                                            <span>Submitted {project.updatedAt ? formatDate(project.updatedAt) : 'recently'}</span>
                                                        </div>

                                                        {/* Review Button */}
                                                        <button
                                                            onClick={() => { setSelectedSubmission(project); setReviewModalOpen(true); }}
                                                            className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors"
                                                        >
                                                            Review Now
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* REVIEW TAB */}
                {activeTab === 'review' && (
                    <div className="flex flex-col">
                        <div className="space-y-3 pb-4">
                            {pendingReviews.length === 0 ? <div className="p-8 text-center text-slate-500 italic bg-slate-900/50 rounded-xl border border-slate-800">No projects waiting for review.</div> :
                                pendingReviews.map(p => {
                                    const theme = getTheme(p.station);
                                    return (
                                        <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-700 transition-colors">
                                            <div className="flex items-start gap-4">
                                                {p.mediaUrls?.[0] ? (
                                                    <img src={p.mediaUrls[0]} alt="Preview" className="w-24 h-16 rounded-lg object-cover border border-slate-800" />
                                                ) : (
                                                    <div className="w-24 h-16 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500"><ImageIcon size={20} /></div>
                                                )}
                                                <div>
                                                    <h4 className="font-bold text-white">{p.title}</h4>
                                                    <p className="text-sm text-slate-400">by <span className="text-cyan-400">{p.studentName}</span></p>
                                                    <span className={`text-[10px] uppercase font-bold ${theme.text} mt-1 block`}>{theme.label}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => { setSelectedSubmission(p); setReviewModalOpen(true); }} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-cyan-900/20">Review</button>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {/* PORTFOLIO TAB */}
                {activeTab === 'portfolios' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
                        {students.filter(s => s.status === 'active').map(student => {
                            const workCount = studentProjects.filter(p => p.studentId === student.id && p.status === 'published').length;
                            return (
                                <div key={student.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center text-center hover:border-slate-700 transition-colors group">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-400 mb-3 group-hover:bg-cyan-900/20 group-hover:text-cyan-400 transition-colors">
                                        {student.name.charAt(0)}
                                    </div>
                                    <h3 className="font-bold text-white">{student.name}</h3>
                                    <p className="text-xs text-slate-500 mb-3">{workCount} Published Projects</p>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* SETUP TAB */}
                {activeTab === 'setup' && (
                    <div className="flex flex-col">
                        <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-800/30 rounded-xl p-6 mb-6">
                            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                <Beaker className="text-purple-400" size={28} /> Setup Factory
                            </h3>
                            <p className="text-slate-400">Configure workflows, stations, and badges for your learning environment.</p>
                        </div>

                        {/* Sub-tabs */}
                        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-2">
                            <button
                                onClick={() => setSetupSubTab('workflows')}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${setupSubTab === 'workflows' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                🔄 Workflows
                            </button>
                            <button
                                onClick={() => setSetupSubTab('stations')}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${setupSubTab === 'stations' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                🎨 Stations
                            </button>
                            <button
                                onClick={() => setSetupSubTab('badges')}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${setupSubTab === 'badges' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                🏆 Badges
                            </button>
                        </div>

                        {/* Workflows Section */}
                        {setupSubTab === 'workflows' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-white text-lg">Process Workflows</h4>
                                    <button
                                        onClick={() => setIsWorkflowModalOpen(true)}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold flex items-center gap-2"
                                    >
                                        <Plus size={18} /> New Workflow
                                    </button>
                                </div>

                                {processTemplates.length === 0 ? (
                                    <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl p-12 text-center">
                                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Beaker size={32} className="text-slate-600" />
                                        </div>
                                        <h4 className="font-bold text-white mb-2">No Workflows Yet</h4>
                                        <p className="text-slate-500 mb-4">Create your first process workflow to structure student projects.</p>
                                        <button
                                            onClick={handleSeedWorkflows}
                                            disabled={isSeeding}
                                            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSeeding ? 'Creating...' : 'Create Default Workflows'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {processTemplates.map(workflow => (
                                            <div key={workflow.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-purple-500/50 transition-all group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h5 className="font-bold text-white text-lg">{workflow.name}</h5>
                                                        <p className="text-sm text-slate-400">{workflow.description}</p>
                                                    </div>
                                                    {workflow.isDefault && (
                                                        <span className="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs font-bold rounded border border-purple-800">
                                                            DEFAULT
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {workflow.phases.sort((a, b) => a.order - b.order).map(phase => (
                                                        <span
                                                            key={phase.id}
                                                            className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700"
                                                        >
                                                            {phase.name}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditWorkflow(workflow)}
                                                        className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    {!workflow.isDefault && (
                                                        <button
                                                            onClick={() => handleSetDefaultWorkflow(workflow.id)}
                                                            className="px-3 py-2 bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 rounded-lg text-sm font-medium"
                                                            title="Set as default"
                                                        >
                                                            <Star size={16} />
                                                        </button>
                                                    )}
                                                    {!workflow.isDefault && (
                                                        <button
                                                            onClick={() => handleDeleteWorkflow(workflow.id)}
                                                            className="px-3 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg text-sm font-medium"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Stations Section */}
                        {setupSubTab === 'stations' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-white text-lg">Project Stations</h4>
                                    <button
                                        onClick={() => setIsStationModalOpen(true)}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold flex items-center gap-2"
                                    >
                                        <Plus size={18} /> New Station
                                    </button>
                                </div>

                                {stations.length === 0 ? (
                                    <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl p-12 text-center">
                                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Zap size={32} className="text-slate-600" />
                                        </div>
                                        <h4 className="font-bold text-white mb-2">No Stations Yet</h4>
                                        <p className="text-slate-500 mb-4">Create project stations to categorize and theme your learning activities.</p>
                                        <button
                                            onClick={handleSeedStations}
                                            disabled={isSeeding}
                                            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSeeding ? 'Creating...' : 'Create Default Stations'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {stations.sort((a, b) => (a.order || 0) - (b.order || 0)).map(station => {
                                            const colorMap: Record<string, { border: string, bg: string, text: string, badge: string, activeBtn: string }> = {
                                                blue: { border: 'border-blue-500/30', bg: 'bg-blue-900/10', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30', activeBtn: 'bg-blue-500 text-white border-blue-400' },
                                                purple: { border: 'border-purple-500/30', bg: 'bg-purple-900/10', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', activeBtn: 'bg-purple-500 text-white border-purple-400' },
                                                cyan: { border: 'border-cyan-500/30', bg: 'bg-cyan-900/10', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', activeBtn: 'bg-cyan-500 text-white border-cyan-400' },
                                                amber: { border: 'border-amber-500/30', bg: 'bg-amber-900/10', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', activeBtn: 'bg-amber-500 text-white border-amber-400' },
                                                green: { border: 'border-green-500/30', bg: 'bg-green-900/10', text: 'text-green-400', badge: 'bg-green-500/20 text-green-300 border-green-500/30', activeBtn: 'bg-green-500 text-white border-green-400' },
                                                orange: { border: 'border-orange-500/30', bg: 'bg-orange-900/10', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30', activeBtn: 'bg-orange-500 text-white border-orange-400' },
                                                pink: { border: 'border-pink-500/30', bg: 'bg-pink-900/10', text: 'text-pink-400', badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30', activeBtn: 'bg-pink-500 text-white border-pink-400' },
                                                indigo: { border: 'border-indigo-500/30', bg: 'bg-indigo-900/10', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', activeBtn: 'bg-indigo-500 text-white border-indigo-400' },
                                                sky: { border: 'border-sky-500/30', bg: 'bg-sky-900/10', text: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30', activeBtn: 'bg-sky-500 text-white border-sky-400' },
                                                violet: { border: 'border-violet-500/30', bg: 'bg-violet-900/10', text: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30', activeBtn: 'bg-violet-500 text-white border-violet-400' },
                                                rose: { border: 'border-rose-500/30', bg: 'bg-rose-900/10', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30', activeBtn: 'bg-rose-500 text-white border-rose-400' },
                                                emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-900/10', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', activeBtn: 'bg-emerald-500 text-white border-emerald-400' },
                                            };
                                            const theme = colorMap[station.color] || colorMap.blue;
                                            const Icon = (LucideIcons[station.icon as keyof typeof LucideIcons] || LucideIcons.Circle) as React.ElementType;

                                            return (
                                                <div key={station.id} className={`relative overflow-hidden rounded-xl border ${theme.border} ${theme.bg} p-5 transition-all hover:shadow-lg hover:shadow-${station.color}-500/10 group`}>
                                                    {/* Header */}
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme.badge}`}>
                                                                <Icon size={20} />
                                                            </div>
                                                            <div>
                                                                <h5 className="font-bold text-white text-lg leading-tight">{station.label}</h5>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {(station.gradeNames?.length ? station.gradeNames : ['All Grades']).map((gn, i) => (
                                                                        <span key={i} className="text-[10px] uppercase tracking-wider font-bold opacity-60">
                                                                            {gn}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <p className="text-sm text-slate-300 mb-6 line-clamp-2 min-h-[2.5rem]">{station.description}</p>

                                                    {/* Activation Section */}
                                                    <div className="space-y-2 mb-4">
                                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active For:</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(station.gradeIds && station.gradeIds.length > 0 ? station.gradeIds : availableGrades.map(g => g.id)).map(gid => {
                                                                const gName = availableGrades.find(g => g.id === gid)?.name || station.gradeNames?.[station.gradeIds?.indexOf(gid) || -1] || 'Unknown';
                                                                const isActive = station.activeForGradeIds?.includes(gid);

                                                                return (
                                                                    <button
                                                                        key={gid}
                                                                        onClick={() => handleToggleStationActivation(station.id, gid)}
                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shadow-sm ${isActive
                                                                            ? theme.activeBtn
                                                                            : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                                                                            }`}
                                                                    >
                                                                        {isActive ? <Zap size={12} fill="currentColor" /> : <div className="w-3 h-3 rounded-full border-2 border-slate-600" />}
                                                                        {gName}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex gap-2 pt-4 border-t border-slate-700/50">
                                                        <button
                                                            onClick={() => handleEditStation(station)}
                                                            className="flex-1 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteStation(station.id)}
                                                            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Badges Section */}
                        {setupSubTab === 'badges' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-white text-lg">Achievement Badges</h4>
                                    <button
                                        onClick={() => setIsBadgeModalOpen(true)}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold flex items-center gap-2"
                                    >
                                        <Plus size={18} /> New Badge
                                    </button>
                                </div>

                                {badges.length === 0 ? (
                                    <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl p-12 text-center">
                                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Award size={32} className="text-slate-600" />
                                        </div>
                                        <h4 className="font-bold text-white mb-2">No Badges Yet</h4>
                                        <p className="text-slate-500 mb-4">Create badges to reward student achievements.</p>
                                        <button
                                            onClick={handleSeedBadges}
                                            disabled={isSeeding}
                                            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSeeding ? 'Creating...' : 'Create Default Badges'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {badges.map(badge => {
                                            const Icon = (LucideIcons[badge.icon as keyof typeof LucideIcons] || LucideIcons.Award) as React.ElementType;
                                            return (
                                                <div key={badge.id} className={`bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-${badge.color}-500/50 transition-all group`}>
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className={`w-12 h-12 rounded-xl bg-${badge.color}-900/20 text-${badge.color}-400 flex items-center justify-center border border-${badge.color}-500/30`}>
                                                            <Icon size={24} />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => { setEditingBadgeId(badge.id); setBadgeForm(badge); setIsBadgeModalOpen(true); }} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"><MoreHorizontal size={16} /></button>
                                                            <button onClick={() => handleDeleteBadge(badge.id)} className="p-2 hover:bg-red-900/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                    <h5 className="font-bold text-white text-lg mb-1">{badge.name}</h5>
                                                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">{badge.description}</p>
                                                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-950 py-2 px-3 rounded-lg border border-slate-800">
                                                        Criteria: {badge.criteria.type === 'project_count' ? `${badge.criteria.count} Projects (${badge.criteria.target})` : `Skill: ${badge.criteria.target}`}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* WORKFLOW EDITOR MODAL */}
                <Modal
                    isOpen={isWorkflowModalOpen}
                    onClose={() => {
                        setIsWorkflowModalOpen(false);
                        setEditingWorkflowId(null);
                        setWorkflowForm({ name: '', description: '', phases: [] });
                    }}
                    title={editingWorkflowId ? "✏️ Edit Workflow" : "✨ Create New Workflow"}
                >
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Workflow Name</label>
                            <input
                                type="text"
                                value={workflowForm.name || ''}
                                onChange={e => setWorkflowForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 outline-none"
                                placeholder="e.g., Engineering Design Process"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Description</label>
                            <textarea
                                value={workflowForm.description || ''}
                                onChange={e => setWorkflowForm(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 outline-none h-24"
                                placeholder="Describe this workflow..."
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-sm font-bold text-slate-400">Phases</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newPhase: ProcessPhase = {
                                            id: `phase_${Date.now()}`,
                                            name: '',
                                            color: 'blue',
                                            icon: 'Circle',
                                            order: (workflowForm.phases?.length || 0) + 1
                                        };
                                        setWorkflowForm(prev => ({
                                            ...prev,
                                            phases: [...(prev.phases || []), newPhase]
                                        }));
                                    }}
                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold flex items-center gap-1"
                                >
                                    <Plus size={14} /> Add Phase
                                </button>
                            </div>

                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {workflowForm.phases?.map((phase, index) => (
                                    <div key={phase.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center gap-3">
                                        <span className="text-slate-500 font-bold text-sm">{index + 1}</span>
                                        <input
                                            type="text"
                                            value={phase.name}
                                            onChange={e => {
                                                const updated = [...(workflowForm.phases || [])];
                                                updated[index] = { ...phase, name: e.target.value };
                                                setWorkflowForm(prev => ({ ...prev, phases: updated }));
                                            }}
                                            className="flex-1 p-2 bg-slate-950 border border-slate-700 rounded text-white text-sm outline-none focus:border-purple-500"
                                            placeholder="Phase name"
                                        />
                                        <select
                                            value={phase.color}
                                            onChange={e => {
                                                const updated = [...(workflowForm.phases || [])];
                                                updated[index] = { ...phase, color: e.target.value };
                                                setWorkflowForm(prev => ({ ...prev, phases: updated }));
                                            }}
                                            className="p-2 bg-slate-950 border border-slate-700 rounded text-white text-sm outline-none"
                                        >
                                            <option value="blue">Blue</option>
                                            <option value="purple">Purple</option>
                                            <option value="cyan">Cyan</option>
                                            <option value="amber">Amber</option>
                                            <option value="green">Green</option>
                                            <option value="orange">Orange</option>
                                            <option value="pink">Pink</option>
                                            <option value="indigo">Indigo</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = workflowForm.phases?.filter((_, i) => i !== index);
                                                setWorkflowForm(prev => ({ ...prev, phases: updated }));
                                            }}
                                            className="p-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {(!workflowForm.phases || workflowForm.phases.length === 0) && (
                                    <div className="text-center py-8 text-slate-500 text-sm italic">
                                        No phases yet. Click "Add Phase" to get started.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsWorkflowModalOpen(false);
                                    setEditingWorkflowId(null);
                                    setWorkflowForm({ name: '', description: '', phases: [] });
                                }}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!db || !workflowForm.name || !workflowForm.phases?.length) return;
                                    try {
                                        if (editingWorkflowId) {
                                            // Update existing workflow
                                            await updateDoc(doc(db, 'process_templates', editingWorkflowId), {
                                                name: workflowForm.name,
                                                description: workflowForm.description,
                                                phases: workflowForm.phases
                                            });
                                        } else {
                                            // Create new workflow
                                            await addDoc(collection(db, 'process_templates'), {
                                                ...workflowForm,
                                                createdAt: serverTimestamp()
                                            });
                                        }
                                        setIsWorkflowModalOpen(false);
                                        setEditingWorkflowId(null);
                                        setWorkflowForm({ name: '', description: '', phases: [] });
                                    } catch (e) {
                                        console.error('Error saving workflow:', e);
                                    }
                                }}
                                disabled={!workflowForm.name || !workflowForm.phases?.length}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editingWorkflowId ? 'Update' : 'Create'} Workflow
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* STATION EDITOR MODAL */}
                <Modal
                    isOpen={isStationModalOpen}
                    onClose={() => {
                        setIsStationModalOpen(false);
                        setEditingStationId(null);
                        setStationForm({ label: '', color: 'blue', icon: 'Circle', description: '' });
                    }}
                    title={editingStationId ? "✏️ Edit Station" : "✨ Create New Station"}
                >
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Station Name</label>
                            <input
                                type="text"
                                value={stationForm.label || ''}
                                onChange={e => setStationForm(prev => ({ ...prev, label: e.target.value }))}
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 outline-none"
                                placeholder="e.g., Robotics & Engineering"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Description</label>
                            <textarea
                                value={stationForm.description || ''}
                                onChange={e => setStationForm(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 outline-none h-24"
                                placeholder="Describe this station..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Assign to Grades</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-slate-950 border border-slate-800 rounded-xl">
                                <label className="flex items-center gap-2 cursor-pointer hover:text-purple-400 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={!stationForm.gradeIds || stationForm.gradeIds.length === 0}
                                        onChange={() => setStationForm(prev => ({ ...prev, gradeIds: [], gradeNames: [] }))}
                                        className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-white">All Grades</span>
                                </label>
                                {availableGrades.map(grade => (
                                    <label key={grade.id} className="flex items-center gap-2 cursor-pointer hover:text-purple-400 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={stationForm.gradeIds?.includes(grade.id) || false}
                                            onChange={e => {
                                                const currentIds = stationForm.gradeIds || [];
                                                const currentNames = stationForm.gradeNames || [];
                                                if (e.target.checked) {
                                                    setStationForm(prev => ({
                                                        ...prev,
                                                        gradeIds: [...currentIds, grade.id],
                                                        gradeNames: [...currentNames, grade.name]
                                                    }));
                                                } else {
                                                    const newIds = currentIds.filter(id => id !== grade.id);
                                                    const newNames = currentNames.filter(name => name !== grade.name);
                                                    setStationForm(prev => ({
                                                        ...prev,
                                                        gradeIds: newIds,
                                                        gradeNames: newNames
                                                    }));
                                                }
                                            }}
                                            className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-white">{grade.name}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Select specific grades or "All Grades" for universal access</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-2">Color</label>
                                <select
                                    value={stationForm.color || 'blue'}
                                    onChange={e => setStationForm(prev => ({ ...prev, color: e.target.value }))}
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 outline-none"
                                >
                                    <option value="blue">Blue</option>
                                    <option value="purple">Purple</option>
                                    <option value="cyan">Cyan</option>
                                    <option value="amber">Amber</option>
                                    <option value="green">Green</option>
                                    <option value="orange">Orange</option>
                                    <option value="pink">Pink</option>
                                    <option value="indigo">Indigo</option>
                                    <option value="sky">Sky</option>
                                    <option value="violet">Violet</option>
                                    <option value="rose">Rose</option>
                                    <option value="emerald">Emerald</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-2">Icon</label>
                                <input
                                    type="text"
                                    value={stationForm.icon || ''}
                                    onChange={e => setStationForm(prev => ({ ...prev, icon: e.target.value }))}
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 outline-none"
                                    placeholder="e.g., Bot"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsStationModalOpen(false);
                                    setEditingStationId(null);
                                    setStationForm({ label: '', color: 'blue', icon: 'Circle', description: '' });
                                }}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!db || !stationForm.label) return;
                                    try {
                                        if (editingStationId) {
                                            // Update existing station
                                            await updateDoc(doc(db, 'stations', editingStationId), {
                                                label: stationForm.label,
                                                description: stationForm.description,
                                                color: stationForm.color,
                                                icon: stationForm.icon,
                                                gradeId: null, // Legacy
                                                gradeName: null, // Legacy
                                                gradeIds: stationForm.gradeIds || [],
                                                gradeNames: stationForm.gradeNames || []
                                            });
                                        } else {
                                            // Create new station
                                            await addDoc(collection(db, 'stations'), {
                                                ...stationForm,
                                                order: stations.length + 1,
                                                createdAt: serverTimestamp()
                                            });
                                        }
                                        setIsStationModalOpen(false);
                                        setEditingStationId(null);
                                        setStationForm({ label: '', color: 'blue', icon: 'Circle', description: '' });
                                    } catch (e) {
                                        console.error('Error saving station:', e);
                                    }
                                }}
                                disabled={!stationForm.label}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editingStationId ? 'Update' : 'Create'} Station
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* BADGE EDITOR MODAL */}
                <Modal
                    isOpen={isBadgeModalOpen}
                    onClose={() => {
                        setIsBadgeModalOpen(false);
                        setEditingBadgeId(null);
                        setBadgeForm({ name: '', description: '', color: 'blue', icon: 'Award', criteria: { type: 'project_count', target: 'all', count: 1 } });
                    }}
                    title={editingBadgeId ? "✏️ Edit Badge" : "✨ Create New Badge"}
                >
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Badge Name</label>
                            <input
                                type="text"
                                value={badgeForm.name || ''}
                                onChange={e => setBadgeForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 outline-none"
                                placeholder="e.g., Robotics Master"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Description</label>
                            <textarea
                                value={badgeForm.description || ''}
                                onChange={e => setBadgeForm(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 outline-none h-24"
                                placeholder="Describe this badge..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-2">Color</label>
                                <select
                                    value={badgeForm.color || 'blue'}
                                    onChange={e => setBadgeForm(prev => ({ ...prev, color: e.target.value }))}
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 outline-none"
                                >
                                    {Object.keys(STATION_THEMES).map(color => (
                                        <option key={color} value={color}>{color.charAt(0).toUpperCase() + color.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-2">Icon (Lucide)</label>
                                <input
                                    type="text"
                                    value={badgeForm.icon || ''}
                                    onChange={e => setBadgeForm(prev => ({ ...prev, icon: e.target.value }))}
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 outline-none"
                                    placeholder="e.g., Award"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Target size={16} className="text-cyan-400" /> Awarding Criteria</h4>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                    <select
                                        value={badgeForm.criteria?.type || 'project_count'}
                                        onChange={e => setBadgeForm(prev => ({ ...prev, criteria: { ...prev.criteria!, type: e.target.value as any } }))}
                                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                                    >
                                        <option value="project_count">Project Count</option>
                                        <option value="skill">Skill Acquisition</option>
                                    </select>
                                </div>

                                {badgeForm.criteria?.type === 'project_count' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Station</label>
                                            <select
                                                value={badgeForm.criteria?.target || 'all'}
                                                onChange={e => setBadgeForm(prev => ({ ...prev, criteria: { ...prev.criteria!, target: e.target.value } }))}
                                                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                                            >
                                                <option value="all">All Stations</option>
                                                {Object.keys(STATION_THEMES).map(k => <option key={k} value={k}>{STATION_THEMES[k as StationType].label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Count Required</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={badgeForm.criteria?.count || 1}
                                                onChange={e => setBadgeForm(prev => ({ ...prev, criteria: { ...prev.criteria!, count: parseInt(e.target.value) } }))}
                                                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                {badgeForm.criteria?.type === 'skill' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Skill Name</label>
                                        <input
                                            type="text"
                                            value={badgeForm.criteria?.target || ''}
                                            onChange={e => setBadgeForm(prev => ({ ...prev, criteria: { ...prev.criteria!, target: e.target.value } }))}
                                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                                            placeholder="e.g., Python, 3D Design"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsBadgeModalOpen(false);
                                    setEditingBadgeId(null);
                                    setBadgeForm({ name: '', description: '', color: 'blue', icon: 'Award', criteria: { type: 'project_count', target: 'all', count: 1 } });
                                }}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveBadge}
                                disabled={!badgeForm.name}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editingBadgeId ? 'Update' : 'Create'} Badge
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* FACTORY MODAL (Create Assignment) */}
                <ProjectFactoryModal
                    isOpen={isTemplateModalOpen}
                    onClose={() => setIsTemplateModalOpen(false)}
                    editingTemplateId={editingTemplateId}
                    templateForm={templateForm}
                    setTemplateForm={setTemplateForm}
                    handleSaveTemplate={handleSaveTemplate}
                    activeModalTab={activeModalTab}
                    setActiveModalTab={setActiveModalTab}
                    availableGrades={availableGrades.map(g => ({ ...g, groups: [] }))}
                    availableGroups={availableGroups}
                    wizardStep={wizardStep}
                    WIZARD_STEPS={WIZARD_STEPS}
                    processTemplates={processTemplates}
                />

                <Modal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} title="Review Submission">
                    <div className="space-y-4">
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                            <div className="flex justify-between mb-2"><span className="text-xs font-bold text-slate-500 uppercase">Student</span><span className="text-white font-medium">{selectedSubmission?.studentName}</span></div>
                            <h4 className="text-lg font-bold text-white mb-2">{selectedSubmission?.title}</h4>
                            <div className="mb-4">
                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Engineering Process</h5>
                                <div className="space-y-1">
                                    {selectedSubmission?.steps?.map((step, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                            {step.status === 'done' ? <CheckSquare size={14} className="text-emerald-500" /> : <Clock size={14} className="text-amber-500" />}
                                            {step.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {selectedSubmission?.mediaUrls?.[0] && <img src={selectedSubmission.mediaUrls[0]} alt="Work" className="w-full rounded-lg border border-slate-800" />}
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Feedback</label>
                            <textarea className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white h-20" value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Great job!..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => handleReviewAction('changes_requested')} className="py-3 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg font-bold border border-slate-700">Request Changes</button>
                            <button onClick={() => handleReviewAction('published')} className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold">Approve & Publish</button>
                        </div>
                    </div>
                </Modal>
            </div >
        );
    }

    const progress = projectForm.steps ? Math.round((projectForm.steps.filter(s => s.status === 'done').length / (projectForm.steps.length || 1)) * 100) : 0;
    const phase = projectForm.status === 'planning' ? 1 : projectForm.status === 'submitted' ? 3 : 2;

    return (
        <div className="space-y-8 pb-24 md:pb-8 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4">
            {showConfetti && <Confetti duration={5000} />}
            {/* Student Header */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 relative overflow-hidden shadow-sm group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Target size={180} className="text-[#2D2B6B]" /></div>
                <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-bold text-[#2D2B6B] mb-2">Engineering Studio</h2>
                        <p className="text-slate-500 max-w-lg">Build, test, and launch your next big idea.</p>
                    </div>
                    <NotificationBell onNotificationClick={(projectId) => {
                        if (projectId) {
                            const project = studentProjects.find(p => p.id === projectId);
                            if (project) {
                                setActiveProject(project);
                                setProjectForm(project);
                                setIsProjectModalOpen(true);
                            }
                        }
                    }} />
                </div>

                <div className="flex gap-4 mt-8">
                    <button onClick={() => setStudentTab('explore')} className={studioClass("px-6 py-3 rounded-full font-bold text-sm transition-all flex items-center gap-2", studentTab === 'explore' ? `${STUDIO_THEME.colors.primary} text-white ${STUDIO_THEME.shadow.button}` : "bg-slate-50 text-slate-500 hover:bg-slate-100")}>
                        <Rocket size={18} className={studentTab === 'explore' ? "text-amber-300" : "text-slate-400"} />
                        New Missions
                    </button>
                    <button onClick={() => setStudentTab('my_studio')} className={studioClass("px-6 py-3 rounded-full font-bold text-sm transition-all flex items-center gap-2", studentTab === 'my_studio' ? `${STUDIO_THEME.colors.primary} text-white ${STUDIO_THEME.shadow.button}` : "bg-slate-50 text-slate-500 hover:bg-slate-100")}>
                        <PenTool size={18} className={studentTab === 'my_studio' ? "text-amber-300" : "text-slate-400"} />
                        My Creative Studio
                    </button>
                </div>
            </div>

            {/* EXPLORE TAB (Cards) */}
            {studentTab === 'explore' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div onClick={() => startNewProject()} className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#2D2B6B] hover:bg-white transition-all group min-h-[320px]">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm border border-slate-100"><PenTool size={32} className="text-[#2D2B6B]" /></div>
                        <h3 className="font-bold text-[#2D2B6B] text-lg">Custom Project</h3>
                        <p className="text-slate-400 text-center text-sm mt-2 max-w-[200px]">Have a unique idea? Design your own engineering plan from scratch.</p>
                    </div>
                    {projectTemplates
                        .filter(t => t.status !== 'draft')
                        .filter(t => !studentProjects.some(p => p.studentId === currentStudentId && p.templateId === t.id))
                        .map(t => {
                            const theme = getTheme(t.station);
                            const isLocked = t.status === 'featured';
                            return (
                                <div key={t.id} className={`bg-white border border-slate-100 rounded-[2rem] overflow-hidden transition-all group flex flex-col h-full shadow-sm hover:shadow-xl hover:-translate-y-1 ${isLocked ? 'opacity-75 grayscale-[0.5]' : ''} `}>
                                    <div className="h-48 relative overflow-hidden">
                                        <img src={t.thumbnailUrl || 'https://placehold.co/600x400/f1f5f9/cbd5e1?text=Mission'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={t.title} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#2D2B6B]/80 to-transparent opacity-60"></div>
                                        <div className="absolute bottom-0 left-0 p-6 w-full">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/20 text-white backdrop-blur-md border border-white/10">{t.difficulty}</span>
                                                <div className="p-2 bg-white rounded-full shadow-lg text-[#2D2B6B]">
                                                    {isLocked ? <Lock size={20} className="text-slate-400" /> : <theme.icon size={20} />}
                                                </div>
                                            </div>
                                        </div>
                                        {isLocked && <div className="absolute top-4 right-4 bg-[#FFC107] text-[#2D2B6B] text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg">Coming Soon</div>}
                                        {t.dueDate && !isLocked && <div className="absolute top-4 right-4 bg-white text-[#2D2B6B] text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-lg flex items-center gap-1"><Clock size={12} /> Due {formatDate(t.dueDate)}</div>}
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="font-bold text-[#2D2B6B] text-xl mb-3 group-hover:text-indigo-600 transition-colors leading-tight">{t.title}</h3>
                                        <p className="text-slate-500 text-sm line-clamp-3 mb-6 flex-1">{t.description}</p>

                                        <div className="mb-6 flex flex-wrap gap-2">
                                            {t.skills.slice(0, 3).map(skill => (
                                                <span key={skill} className="text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-100 font-medium">{skill}</span>
                                            ))}
                                        </div>

                                        <button disabled={isLocked} onClick={() => startNewProject(t)} className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border ${isLocked ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-[#2D2B6B] hover:bg-indigo-800 text-white border-transparent shadow-lg shadow-indigo-900/10'} `}>
                                            {isLocked ? <><Lock size={16} /> Locked</> : <>Accept Mission <ArrowRight size={16} /></>}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* MY STUDIO TAB (Grid) */}
            {/* MY STUDIO TAB (Enhanced) */}
            {studentTab === 'my_studio' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {['all', 'in_progress', 'completed'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setStudentProjectFilter(filter as any)}
                                className={`px-5 py-2.5 rounded-full text-sm font-bold capitalize transition-all whitespace-nowrap flex items-center gap-2 ${studentProjectFilter === filter
                                    ? 'bg-[#2D2B6B] text-white shadow-lg shadow-indigo-900/20 scale-105'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {filter === 'all' && <LayoutGrid size={16} />}
                                {filter === 'in_progress' && <Zap size={16} />}
                                {filter === 'completed' && <CheckCircle2 size={16} />}
                                {filter.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    {/* Stations Grid */}
                    <div className="space-y-12">
                        {(Object.keys(STATION_THEMES) as StationType[]).map(stationKey => {
                            const theme = STATION_THEMES[stationKey];
                            const StationIcon = theme.icon;

                            // Filter projects for this station
                            const stationProjects = studentProjects.filter(p =>
                                p.studentId === currentStudentId &&
                                p.station === stationKey &&
                                (studentProjectFilter === 'all' ||
                                    (studentProjectFilter === 'in_progress' && !['published', 'submitted'].includes(p.status)) ||
                                    (studentProjectFilter === 'completed' && ['published', 'submitted'].includes(p.status)))
                            );

                            // Skip empty stations if filtering by specific status (optional, but cleaner)
                            if (studentProjectFilter !== 'all' && stationProjects.length === 0) return null;

                            return (
                                <div key={stationKey} className="space-y-6">
                                    {/* Station Header */}
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl ${theme.bgSoft} flex items-center justify-center shadow-sm`}>
                                            <StationIcon size={28} style={{ color: theme.colorHex }} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-800">{theme.label}</h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">{stationProjects.length}</span>
                                                {stationProjects.length === 1 ? 'Mission Active' : 'Missions Active'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Projects Scroll/Grid */}
                                    {stationProjects.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {stationProjects.map(project => {
                                                const progress = project.steps ? Math.round((project.steps.filter(s => s.status === 'done').length / (project.steps.length || 1)) * 100) : 0;

                                                return (
                                                    <div key={project.id} onClick={() => openActiveProject(project)} className="group bg-white rounded-[2rem] border border-slate-100 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                                        {/* Card Image */}
                                                        <div className="h-48 bg-slate-100 relative overflow-hidden">
                                                            {project.mediaUrls?.[0] ? (
                                                                <img src={project.mediaUrls[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                            ) : (
                                                                <div className={`w-full h-full flex items-center justify-center ${theme.bgSoft}`}>
                                                                    <ImageIcon size={40} style={{ color: theme.colorHex }} className="opacity-50" />
                                                                </div>
                                                            )}

                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#2D2B6B]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                                            {/* Status Badge */}
                                                            {/* Status Badge */}
                                                            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                                                <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase shadow-lg backdrop-blur-md border flex items-center gap-1.5 transition-all ${project.status === 'published' ? 'bg-emerald-500 text-white border-emerald-400' :
                                                                    project.status === 'submitted' ? 'bg-indigo-600 text-white border-indigo-400 animate-pulse' :
                                                                        'bg-white/90 text-slate-700 border-white/50'
                                                                    }`}>
                                                                    {project.status === 'submitted' && <Clock size={10} />}
                                                                    {project.status.replace('_', ' ')}
                                                                </span>
                                                                {project.status === 'published' && !project.isPresentationCompleted && (
                                                                    <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase shadow-lg backdrop-blur-md border bg-indigo-600 text-white border-indigo-400 animate-pulse flex items-center gap-1.5">
                                                                        <LucideIcons.Video size={10} />
                                                                        Add Presentation
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Card Content */}
                                                        <div className="p-6">
                                                            <h4 className="text-lg font-bold text-slate-800 mb-3 line-clamp-1 group-hover:text-[#2D2B6B] transition-colors">{project.title}</h4>

                                                            {/* Progress Bar */}
                                                            <div className="mb-6">
                                                                <div className="flex justify-between text-xs mb-2">
                                                                    <span className="text-slate-400 font-bold uppercase tracking-wider">Progress</span>
                                                                    <span className="text-[#2D2B6B] font-bold">{progress}%</span>
                                                                </div>
                                                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${theme.gradient}`}
                                                                        style={{ width: `${progress}%` }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Footer */}
                                                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                                                <div className="flex -space-x-2">
                                                                    {/* Skills Badges */}
                                                                    {project.skillsAcquired?.slice(0, 3).map((skill, i) => (
                                                                        <div key={i} className="w-8 h-8 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm" title={skill}>
                                                                            {skill[0]}
                                                                        </div>
                                                                    ))}
                                                                    {project.skillsAcquired && project.skillsAcquired.length > 3 && (
                                                                        <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                                            +{project.skillsAcquired.length - 3}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (project.externalLink) {
                                                                            window.open(project.externalLink, '_blank');
                                                                        } else if (project.embedUrl) {
                                                                            window.open(project.embedUrl, '_blank');
                                                                        } else {
                                                                            openActiveProject(project);
                                                                        }
                                                                    }}
                                                                    className="bg-[#FFC107] text-[#2D2B6B] font-bold px-6 py-2 rounded-full hover:bg-amber-400 transition-colors shadow-md shadow-amber-200 text-sm flex items-center gap-2"
                                                                >
                                                                    View Project <ExternalLink size={14} />
                                                                </button>
                                                                {project.presentationUrl && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.open(project.presentationUrl, '_blank');
                                                                        }}
                                                                        className="bg-rose-500 text-white font-bold px-4 py-2 rounded-full hover:bg-rose-600 transition-colors shadow-md shadow-rose-200 text-sm flex items-center gap-2 ml-2"
                                                                        title="Watch Presentation"
                                                                    >
                                                                        <Play size={14} fill="currentColor" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* Locked/Empty State */
                                        <div className="bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center group hover:bg-slate-50 hover:border-slate-300 transition-all duration-300">
                                            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4 text-slate-300 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                                <Lock size={32} />
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-400 mb-2 group-hover:text-slate-600 transition-colors">Station Locked</h4>
                                            <p className="text-sm text-slate-400 mb-6 max-w-xs">Complete missions in other stations or start a new project to unlock this station.</p>
                                            <button onClick={() => setStudentTab('explore')} className="px-6 py-2 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-500 hover:text-[#2D2B6B] hover:border-[#2D2B6B] transition-all shadow-sm hover:shadow-md">
                                                Browse Missions
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- ENGINEERING WORKSPACE MODAL (Gamified) --- */}
            {/* --- ENGINEERING WORKSPACE MODAL (Gamified) --- */}
            {/* --- ENGINEERING WORKSPACE WIZARD (Full Page) --- */}
            {isProjectModalOpen && (
                <StudentProjectWizardView
                    onClose={() => setIsProjectModalOpen(false)}
                    projectForm={projectForm}
                    setProjectForm={setProjectForm}
                    activeProject={activeProject}
                    currentTheme={currentTheme}
                    workspaceTab={workspaceTab}
                    setWorkspaceTab={setWorkspaceTab}
                    selectedWorkflowId={selectedWorkflowId}
                    handleWorkflowChange={handleWorkflowChange}
                    processTemplates={processTemplates}
                    handleSaveProject={handleSaveProject}
                    handleStartBuilding={handleStartBuilding}
                    handleMoveStep={handleMoveStep}
                    handleAddStep={handleAddStep}
                    handleDeleteStep={handleDeleteStep}
                    newStepTitle={newStepTitle}
                    setNewStepTitle={setNewStepTitle}
                    apiConfig={settings.apiConfig}
                    isWorkflowLocked={!!projectTemplates.find(t => t.id === projectForm.templateId)?.defaultWorkflowId}
                    badges={badges}
                    handleSubmitForReview={handleSubmitForReview}
                />
            )}


            {/* Review Modal */}
            <Modal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} title="Review Submission">
                {selectedSubmission && (
                    <div className="space-y-6">
                        <div className="flex items-start gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800">
                            {selectedSubmission.mediaUrls?.[0] ? (
                                <img src={selectedSubmission.mediaUrls[0]} className="w-32 h-24 object-cover rounded-lg border border-slate-700" />
                            ) : (
                                <div className="w-32 h-24 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500"><ImageIcon size={24} /></div>
                            )}
                            <div>
                                <h3 className="font-bold text-white text-lg">{selectedSubmission.title}</h3>
                                <p className="text-slate-400 text-sm">Submitted by <span className="text-cyan-400 font-bold">{selectedSubmission.studentName}</span></p>
                                <div className="flex gap-2 mt-2">
                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">{selectedSubmission.station}</span>
                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-indigo-900/30 text-indigo-400 border border-indigo-800">Submitted</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2"><ListChecks size={16} className="text-cyan-400" /> Completed Steps</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-2 bg-slate-950 rounded-xl border border-slate-800">
                                {selectedSubmission.steps?.map(step => (
                                    <div key={step.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-900">
                                        <div className="bg-emerald-900/30 text-emerald-400 p-1 rounded-full"><CheckCircle2 size={14} /></div>
                                        <span className="text-sm text-slate-300">{step.title}</span>
                                        {step.proofUrl && (
                                            <a href={step.proofUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-cyan-400 hover:underline flex items-center gap-1">
                                                View Proof <ExternalLink size={10} />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Instructor Feedback</label>
                            <textarea
                                value={feedback}
                                onChange={e => setFeedback(e.target.value)}
                                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500 outline-none h-32"
                                placeholder="Great job! I really liked how you..."
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-800">
                            <button onClick={() => handleReviewAction('changes_requested')} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2">
                                <AlertCircle size={18} /> Request Changes
                            </button>
                            <button onClick={() => handleReviewAction('published')} className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2">
                                <CheckCircle2 size={18} /> Approve & Publish
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Proof of Work Modal */}
            <Modal isOpen={isProofModalOpen} onClose={() => setIsProofModalOpen(false)} title="Proof of Work Required 📸" size="md">
                <div className="p-6 text-center">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-800 shadow-xl">
                        <Upload size={32} className="text-cyan-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Show Us Your Progress!</h3>
                    <p className="text-slate-400 mb-8">To complete this step, you need to upload a photo or screenshot of your work.</p>

                    <div className="mb-8">
                        <label className={`cursor-pointer block w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${proofFile ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700 bg-slate-900 hover:border-cyan-500 hover:bg-slate-800'}`}>
                            {proofFile ? (
                                <div className="relative w-full h-full group">
                                    <img src={proofFile} className="w-full h-full object-contain rounded-xl" />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                        <span className="text-white font-bold flex items-center gap-2"><Upload size={20} /> Change Photo</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <ImageIcon size={48} className="text-slate-600 mb-4" />
                                    <span className="text-slate-300 font-bold">Click to Upload Proof</span>
                                    <span className="text-slate-500 text-sm mt-2">Supports JPG, PNG</span>
                                </>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleProofFileSelect} />
                        </label>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setIsProofModalOpen(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors">Cancel</button>
                        <button
                            onClick={handleProofSubmit}
                            disabled={!proofFile}
                            className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            Submit Proof <CheckCircle2 size={18} />
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Success Modal */}
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Mission Submitted! 🚀"
                message="Your project has been submitted for review. Great work following the engineering process! Your instructor will review it soon."
            />

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
};
