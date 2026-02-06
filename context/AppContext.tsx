
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { Student, Program, Enrollment, Payment, Expense, ExpenseTemplate, AppSettings, ViewState, ViewParams, WorkshopTemplate, WorkshopSlot, Booking, AttendanceRecord, Task, Project, ChatMessage, UserProfile, MarketingPost, Campaign, Lead, ProjectTemplate, StudentProject, ToolLink, ArchiveLink, GalleryItem, Asset, PickupEntry, Notification, ProcessTemplate, Station, Badge } from '../types';
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

  // Attendance
  attendanceRecords: AttendanceRecord[];

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
  language: 'en' | 'fr';
  t: (key: string) => string;

  // Navigation
  currentView: ViewState;
  viewParams: ViewParams;
  navigateTo: (view: ViewState, params?: ViewParams) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  academyName: 'Edufy', // Safe default (user should configure)
  academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
  logoUrl: '',
  language: 'en',
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

  // Attendance
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

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
    if (!db) { setLoading(false); return; }

    // START SAAS TRANSFORMATION
    if (!currentOrganization) {
      // Stop loading if no organization is resolved yet
      setLoading(false);
      return;
    }
    const orgId = currentOrganization.id;
    const firestore = db;
    // END SAAS LOGIC

    // We wait for the SETTINGS to load specifically before unblocking the UI to ensure branding is correct.
    const settingsUnsub = onSnapshot(doc(firestore, 'organizations', orgId, 'settings', 'global'), (docSnap) => {
      setLoading(false); // Unblock UI immediately
      if (docSnap.exists()) {
        const savedData = docSnap.data() as AppSettings;
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...savedData,
          studentFormConfig: { ...DEFAULT_SETTINGS.studentFormConfig, ...savedData.studentFormConfig }
        };
        setSettings(mergedSettings);
      } else {
        // Try fallback to legacy global settings if migration hadn't moved them yet? 
        // Or just create default for new Org.
        setSettings(DEFAULT_SETTINGS);
      }
    }, (error) => {
      console.error("Error fetching settings:", error);
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
    });

    const unsubs = [
      settingsUnsub,
      onSnapshot(query(collection(firestore, 'students'), where('organizationId', '==', orgId)), (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)))),
      onSnapshot(query(collection(firestore, 'programs'), where('organizationId', '==', orgId)), (snap) => setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Program)))),
      onSnapshot(query(collection(firestore, 'enrollments'), where('organizationId', '==', orgId)), (snap) => setEnrollments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment)))),
      onSnapshot(query(collection(firestore, 'payments'), where('organizationId', '==', orgId)), (snap) => {
        const sortedPayments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPayments(sortedPayments);
      }),
      onSnapshot(query(collection(firestore, 'expenses'), where('organizationId', '==', orgId), orderBy('date', 'desc')), (snap) => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)))),
      onSnapshot(query(collection(firestore, 'expense_templates'), where('organizationId', '==', orgId)), (snap) => setExpenseTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExpenseTemplate)))),

      // Workshop Listeners
      onSnapshot(query(collection(firestore, 'workshop_templates'), where('organizationId', '==', orgId)), (snap) => setWorkshopTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopTemplate)))),
      onSnapshot(query(collection(firestore, 'workshop_slots'), where('organizationId', '==', orgId)), (snap) => setWorkshopSlots(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopSlot)))),
      onSnapshot(query(collection(firestore, 'bookings'), where('organizationId', '==', orgId), orderBy('bookedAt', 'desc')), (snap) => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)))),

      // Attendance
      onSnapshot(query(collection(firestore, 'attendance'), where('organizationId', '==', orgId)), (snap) => setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)))),

      // Team Listeners
      // Users are global but UserProfile has organizationId. We filter users by org.
      onSnapshot(query(collection(firestore, 'users'), where('organizationId', '==', orgId)), (snap) => setTeamMembers(snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)))),
      onSnapshot(query(collection(firestore, 'tasks'), where('organizationId', '==', orgId)), (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)))),
      onSnapshot(query(collection(firestore, 'projects'), where('organizationId', '==', orgId)), (snap) => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)))),
      onSnapshot(query(collection(firestore, 'messages'), where('organizationId', '==', orgId), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
        setChatMessages(msgs.reverse());
      }),

      // Marketing Listeners
      onSnapshot(query(collection(firestore, 'marketing_posts'), where('organizationId', '==', orgId)), (snap) => setMarketingPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketingPost)))),
      onSnapshot(query(collection(firestore, 'campaigns'), where('organizationId', '==', orgId)), (snap) => setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)))),
      onSnapshot(query(collection(firestore, 'leads'), where('organizationId', '==', orgId)), (snap) => setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)))),

      // Learning Listeners
      // Project Templates might be SHARED (Tenant Zero) vs PRIVATE. For now, strict isolation.
      onSnapshot(query(collection(firestore, 'project_templates'), where('organizationId', '==', orgId)), (snap) => setProjectTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectTemplate)))),
      onSnapshot(query(collection(firestore, 'student_projects'), where('organizationId', '==', orgId)), (snap) => setStudentProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentProject)))),

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
  }, [currentOrganization]);

  // Separate effect for Notifications based on userProfile
  useEffect(() => {
    if (!db || !userProfile) {
      setNotifications([]);
      return;
    }

    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
    // In a real app, we would filter by userId: where('userId', '==', userProfile.uid)
    // But for this demo/MVP where auth might be simulated or loose, we'll fetch all and filter in memory or just show all for now if no ID match.
    // Let's try to be specific if we have a UID.

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
      workshopTemplates, workshopSlots, bookings,
      attendanceRecords,
      tasks, projects, chatMessages, teamMembers,
      marketingPosts, campaigns, leads,
      projectTemplates, studentProjects,
      processTemplates, stations, badges,
      toolLinks, archiveLinks, galleryItems, assets, pickupQueue,
      notifications, unreadNotificationsCount, markAsRead, markAllAsRead, sendNotification,
      settings, loading, language: settings.language || 'en', t,
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