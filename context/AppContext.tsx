
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { Student, Program, Enrollment, Payment, Expense, ExpenseTemplate, AppSettings, ViewState, ViewParams, WorkshopTemplate, WorkshopSlot, Booking, AttendanceRecord, Task, Project, ChatMessage, UserProfile, MarketingPost, Campaign, Lead, ProjectTemplate, StudentProject, ToolLink, ArchiveLink, GalleryItem, Asset, PickupEntry, Notification, ProcessTemplate, Station, Badge, StaffAttendanceRecord, WorkshopEvaluation, ClassSession } from '../types';
import { translations } from '../utils/translations';
import { useAuth } from './AuthContext';
import { addDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';

interface AppContextType {
  students: Student[];
  programs: Program[];
  enrollments: Enrollment[];
  payments: Payment[];
  expenses: Expense[];
  expenseTemplates: ExpenseTemplate[];

  // New Workshop Data
  workshopTemplates: WorkshopTemplate[];
  workshopSlots: WorkshopSlot[];
  bookings: Booking[];
  workshopEvaluations: WorkshopEvaluation[];
  classSessions: ClassSession[];

  // Attendance
  attendanceRecords: AttendanceRecord[];
  staffAttendanceRecords: StaffAttendanceRecord[];

  // Team Module Data
  tasks: Task[];
  projects: Project[];
  chatMessages: ChatMessage[];
  teamMembers: UserProfile[];

  // Marketing & CRM Data
  marketingPosts: MarketingPost[];
  campaigns: Campaign[];
  leads: Lead[];

  // Learning & Portfolio Data
  projectTemplates: ProjectTemplate[];
  studentProjects: StudentProject[];

  // Setup Factory Data
  processTemplates: ProcessTemplate[];
  stations: Station[];
  badges: Badge[];

  // Toolkit, Media, Assets
  toolLinks: ToolLink[];
  archiveLinks: ArchiveLink[];
  galleryItems: GalleryItem[];
  assets: Asset[];
  pickupQueue: PickupEntry[];

  // Notifications
  notifications: Notification[];
  unreadNotificationsCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  sendNotification: (userId: string, title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error', link?: string) => Promise<void>;

  settings: AppSettings;
  loading: boolean;
  workspaceError: string | null;
  language: 'en' | 'fr';
  t: (key: string) => string;

  // Navigation
  currentView: ViewState;
  viewParams: ViewParams;
  navigateTo: (view: ViewState, params?: ViewParams) => void;
}

const getCurrentAcademicYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  if (now.getMonth() < 7) { 
    return `${currentYear - 1}-${currentYear}`;
  }
  return `${currentYear}-${currentYear + 1}`;
};

const DEFAULT_SETTINGS: AppSettings = {
  academyName: 'MakerLab Academy', // Safe default (user should configure)
  academicYear: getCurrentAcademicYear(),
  logoUrl: '',
  language: 'en',
  currency: 'MAD',
  timezone: 'Africa/Casablanca',
  weekStartsOn: 1,
  receiptContact: '',
  receiptFooter: 'Thank you for your payment. No refunds after 30 days.',
  googleReviewUrl: '',
  studentFormConfig: {
    parentName: { active: true, required: true },
    email: { active: true, required: false },
    address: { active: true, required: false },
    school: { active: true, required: false },
    birthDate: { active: true, required: true },
    medicalInfo: { active: false, required: false }
  },
  documentConfig: {
    headerName: '',
    logoUrl: '',
    address: '',
    taxId: '',
    regId: '',
    patente: '',
    cnss: '',
    website: '',
    email: '',
    phone: ''
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, currentOrganization } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTemplates, setExpenseTemplates] = useState<ExpenseTemplate[]>([]);

  // New Workshop State
  const [workshopTemplates, setWorkshopTemplates] = useState<WorkshopTemplate[]>([]);
  const [workshopSlots, setWorkshopSlots] = useState<WorkshopSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workshopEvaluations, setWorkshopEvaluations] = useState<WorkshopEvaluation[]>([]);
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);

  // Attendance
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [staffAttendanceRecords, setStaffAttendanceRecords] = useState<StaffAttendanceRecord[]>([]);

  // Team State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);

  // Marketing State
  const [marketingPosts, setMarketingPosts] = useState<MarketingPost[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  // Learning State
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [studentProjects, setStudentProjects] = useState<StudentProject[]>([]);

  // Setup Factory State
  const [processTemplates, setProcessTemplates] = useState<ProcessTemplate[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  // Toolkit & Media
  const [toolLinks, setToolLinks] = useState<ToolLink[]>([]);
  const [archiveLinks, setArchiveLinks] = useState<ArchiveLink[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pickupQueue, setPickupQueue] = useState<PickupEntry[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [viewParams, setViewParams] = useState<ViewParams>({});

  const navigateTo = (view: ViewState, params: ViewParams = {}) => {
    setCurrentView(view);
    setViewParams(params);
  };

  // Translation Helper
  const t = (key: string): string => {
    const lang = settings.language || 'en';
    const dict = translations[lang] as Record<string, string>;
    return dict[key] || key;
  };

  // Notification Helpers
  const markAsRead = async (id: string) => {
    if (!db) return;
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const markAllAsRead = async () => {
    if (!db || notifications.length === 0) return;
    const batch = writeBatch(db);
    const firestore = db;
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(firestore, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const sendNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', link?: string) => {
    if (!db) return;
    // Note: We should probably add organizationId here too, but for now we leave it as shared/user-specific
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      link,
      createdAt: serverTimestamp()
    });
  };

  useEffect(() => {
    setLoading(true);
    setWorkspaceError(null);
    if (!db) {
      setWorkspaceError('The data connection is unavailable. Check your connection and try again.');
      setLoading(false);
      return;
    }

    // START SAAS TRANSFORMATION
    if (!currentOrganization) {
      setLoading(false);
      return;
    }
    const orgId = currentOrganization.id;
    const firestore = db;
    // END SAAS LOGIC

    // The public demo has a virtual account and no authenticated Firestore
    // session; keep its existing lightweight preview behavior separate.
    if (userProfile?.uid === 'demo-admin-id') {
      setLoading(false);
      return;
    }

    // Parent accounts use the dedicated family data loader. Never hydrate the
    // organization-wide operational context in a parent browser session.
    if (userProfile?.role === 'parent') {
      setStudents([]);
      setEnrollments([]);
      setPayments([]);
      setExpenses([]);
      setTeamMembers([]);
      setTasks([]);
      setProjects([]);
      setChatMessages([]);
      setMarketingPosts([]);
      setCampaigns([]);
      setLeads([]);
      setStudentProjects([]);
      setProjectTemplates([]);
      setGalleryItems([]);
      setAssets([]);
      setPickupQueue([]);
      setLoading(true);

      return onSnapshot(doc(firestore, 'organizations', orgId, 'settings', 'global'), snapshot => {
        const savedData = snapshot.exists() ? snapshot.data() as AppSettings : DEFAULT_SETTINGS;
        setSettings({
          ...DEFAULT_SETTINGS,
          ...savedData,
          studentFormConfig: { ...DEFAULT_SETTINGS.studentFormConfig, ...savedData.studentFormConfig }
        });
        setLoading(false);
      }, error => {
        console.error('Unable to load family workspace settings:', error);
        setWorkspaceError('We could not load your academy settings. Check your connection and try again.');
        setLoading(false);
      });
    }

    const adminWorkspace = ['admin', 'owner', 'super_admin'].includes(userProfile?.role || '');
    const learningWorkspace = ['student', 'instructor'].includes(userProfile?.role || '');
    const required = new Set([
      'settings', 'students', 'programs', 'enrollments',
      ...(learningWorkspace ? ['student_projects'] : []),
      ...(adminWorkspace ? ['payments', 'expenses', 'expense_templates', 'workshop_templates', 'workshop_slots', 'bookings', 'attendance', 'tasks', 'leads', 'student_projects'] : [])
    ]);
    let failed = false;
    const markReady = (name: string) => {
      required.delete(name);
      if (!failed && required.size === 0) setLoading(false);
    };
    const failRequired = (name: string, error: unknown) => {
      console.error(`Unable to load ${name} for the academy workspace:`, error);
      if (required.has(name)) {
        failed = true;
        const label = name.replace(/_/g, ' ');
        const code = (error as { code?: string })?.code;
        setWorkspaceError(code === 'permission-denied' || code === 'failed-precondition'
          ? `Your account cannot load ${label} for this academy. Contact your administrator.`
          : `We could not load ${label} for this academy. Check your connection and try again.`);
        setLoading(false);
      }
    };

    const settingsUnsub = onSnapshot(doc(firestore, 'organizations', orgId, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const savedData = docSnap.data() as AppSettings;
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...savedData,
          studentFormConfig: { ...DEFAULT_SETTINGS.studentFormConfig, ...savedData.studentFormConfig }
        };
        setSettings(mergedSettings);
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      markReady('settings');
    }, (error) => {
      failRequired('settings', error);
    });

    const unsubs = [
      settingsUnsub,
      onSnapshot(query(collection(firestore, 'class_sessions'), where('organizationId', '==', orgId)), (q) => setClassSessions(q.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession)))),
      onSnapshot(query(collection(firestore, 'students'), where('organizationId', '==', orgId)), (snap) => {
          setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
          markReady('students');
      }, error => failRequired('students', error)),
      onSnapshot(query(collection(firestore, 'programs'), where('organizationId', '==', orgId)), (snap) => { 
          setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Program)));
          markReady('programs');
      }, error => failRequired('programs', error)),
      onSnapshot(query(collection(firestore, 'enrollments'), where('organizationId', '==', orgId)), (snap) => {
          setEnrollments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment)));
          markReady('enrollments');
      }, error => failRequired('enrollments', error)),
      onSnapshot(query(collection(firestore, 'payments'), where('organizationId', '==', orgId)), (snap) => {
        const sortedPayments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPayments(sortedPayments);
        markReady('payments');
      }, error => failRequired('payments', error)),
      onSnapshot(query(collection(firestore, 'expenses'), where('organizationId', '==', orgId)), (snap) => {
        const sortedExpenses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setExpenses(sortedExpenses);
        markReady('expenses');
      }, error => failRequired('expenses', error)),
      onSnapshot(query(collection(firestore, 'expense_templates'), where('organizationId', '==', orgId)), (snap) => { setExpenseTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExpenseTemplate))); markReady('expense_templates'); }, error => failRequired('expense_templates', error)),

      // Workshop Listeners
      onSnapshot(query(collection(firestore, 'workshop_templates'), where('organizationId', '==', orgId)), (snap) => { setWorkshopTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopTemplate))); markReady('workshop_templates'); }, error => failRequired('workshop_templates', error)),
      onSnapshot(query(collection(firestore, 'workshop_slots'), where('organizationId', '==', orgId)), (snap) => { setWorkshopSlots(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopSlot))); markReady('workshop_slots'); }, error => failRequired('workshop_slots', error)),
      onSnapshot(query(collection(firestore, 'bookings'), where('organizationId', '==', orgId), orderBy('bookedAt', 'desc')), (snap) => { setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking))); markReady('bookings'); }, error => failRequired('bookings', error)),
      onSnapshot(query(collection(firestore, 'workshop_evaluations'), where('organizationId', '==', orgId), orderBy('createdAt', 'desc')), (snap) => setWorkshopEvaluations(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopEvaluation)))),

      // Attendance
      onSnapshot(query(collection(firestore, 'attendance'), where('organizationId', '==', orgId)), (snap) => { setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord))); markReady('attendance'); }, error => failRequired('attendance', error)),
      onSnapshot(query(collection(firestore, 'staff_attendance'), where('organizationId', '==', orgId)), (snap) => setStaffAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffAttendanceRecord)))),

      // Team Listeners
      // Users are global but UserProfile has organizationId. We filter users by org.
      onSnapshot(query(collection(firestore, 'users'), where('organizationId', '==', orgId)), (snap) => setTeamMembers(snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)))),
      onSnapshot(query(collection(firestore, 'tasks'), where('organizationId', '==', orgId)), (snap) => { setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))); markReady('tasks'); }, error => failRequired('tasks', error)),
      onSnapshot(query(collection(firestore, 'projects'), where('organizationId', '==', orgId)), (snap) => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)))),
      onSnapshot(query(collection(firestore, 'messages'), where('organizationId', '==', orgId), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
        setChatMessages(msgs.reverse());
      }),

      // Marketing Listeners
      onSnapshot(query(collection(firestore, 'marketing_posts'), where('organizationId', '==', orgId)), (snap) => setMarketingPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketingPost)))),
      onSnapshot(query(collection(firestore, 'campaigns'), where('organizationId', '==', orgId)), (snap) => setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)))),
      onSnapshot(query(collection(firestore, 'leads'), where('organizationId', '==', orgId)), (snap) => { setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead))); markReady('leads'); }, error => failRequired('leads', error)),

      // Learning Listeners
      // Project Templates might be SHARED (Tenant Zero) vs PRIVATE. For now, strict isolation.
      onSnapshot(query(collection(firestore, 'project_templates'), where('organizationId', '==', orgId)), (snap) => setProjectTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectTemplate)))),
      onSnapshot(query(collection(firestore, 'student_projects'), where('organizationId', '==', orgId)), (snap) => { setStudentProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentProject))); markReady('student_projects'); }, error => failRequired('student_projects', error)),

      // Setup Factory Listeners
      onSnapshot(query(collection(firestore, 'process_templates'), where('organizationId', '==', orgId)), (snap) => setProcessTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProcessTemplate)))),
      onSnapshot(query(collection(firestore, 'stations'), where('organizationId', '==', orgId)), (snap) => setStations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Station)))),
      onSnapshot(query(collection(firestore, 'badges'), where('organizationId', '==', orgId)), (snap) => setBadges(snap.docs.map(d => ({ id: d.id, ...d.data() } as Badge)))),

      // Toolkit & Media
      onSnapshot(query(collection(firestore, 'tool_links'), where('organizationId', '==', orgId)), (snap) => setToolLinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as ToolLink)))),
      onSnapshot(query(collection(firestore, 'archive_links'), where('organizationId', '==', orgId), orderBy('createdAt', 'desc')), (snap) => setArchiveLinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as ArchiveLink)))),
      onSnapshot(query(collection(firestore, 'gallery_items'), where('organizationId', '==', orgId)), (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem));
        // Sort client-side to be safe
        setGalleryItems(items.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return dateB - dateA;
        }));
      }),

      // Hardware & Pickup
      onSnapshot(query(collection(firestore, 'assets'), where('organizationId', '==', orgId)), (snap) => setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)))),
      onSnapshot(query(collection(firestore, 'pickup_queue'), where('organizationId', '==', orgId)), (snap) => setPickupQueue(snap.docs.map(d => ({ id: d.id, ...d.data() } as PickupEntry)))),
    ];

    return () => unsubs.forEach(u => u());
  }, [currentOrganization, userProfile?.role]);

  // Separate effect for Notifications based on userProfile
  useEffect(() => {
    if (!db || !userProfile) {
      setNotifications([]);
      return;
    }

    if (!userProfile.uid) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [userProfile.uid, 'all']),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const allNotes = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      // Filter for current user
      const myNotes = allNotes.filter(n => n.userId === userProfile.uid || n.userId === 'all');
      setNotifications(myNotes);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      students, programs, enrollments, payments, expenses, expenseTemplates,
      workshopTemplates, workshopSlots, bookings, workshopEvaluations, classSessions,
      attendanceRecords,
      staffAttendanceRecords,
      tasks, projects, chatMessages, teamMembers,
      marketingPosts, campaigns, leads,
      projectTemplates, studentProjects,
      processTemplates, stations, badges,
      toolLinks, archiveLinks, galleryItems, assets, pickupQueue,
      notifications, unreadNotificationsCount, markAsRead, markAllAsRead, sendNotification,
      settings, loading, workspaceError, language: settings.language || 'en', t,
      currentView, viewParams, navigateTo
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
