
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { Student, Program, Enrollment, Payment, Expense, ExpenseTemplate, AppSettings, ViewState, ViewParams, WorkshopTemplate, WorkshopSlot, Booking, AttendanceRecord, Task, Project, ChatMessage, UserProfile, MarketingPost, Campaign, Lead, ProjectTemplate, StudentProject, ToolLink, GalleryItem, Asset, PickupEntry, Notification, ProcessTemplate, Station, Badge } from '../types';
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
  academyName: 'Edufy Makerlab',
  academicYear: '2024-2025',
  logoUrl: '',
  language: 'en',
  receiptContact: 'contact@edufy.com',
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
  const { userProfile } = useAuth();
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

    // We wait for the SETTINGS to load specifically before unblocking the UI to ensure branding is correct.
    const settingsUnsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      setLoading(false); // Unblock UI immediately
      if (doc.exists()) {
        setSettings(doc.data() as AppSettings);
      } else {
        // Attempt to create default settings if they don't exist
        setDoc(doc.ref, DEFAULT_SETTINGS).catch(err => {
          console.error("Failed to create default settings:", err);
          // Fallback to default settings in case of write error
          setSettings(DEFAULT_SETTINGS);
        });
      }
    }, (error) => {
      // Handle listener errors (e.g., permissions)
      console.error("Error fetching global settings:", error);
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
    });

    const unsubs = [
      settingsUnsub,
      onSnapshot(collection(db, 'students'), (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)))),
      onSnapshot(collection(db, 'programs'), (snap) => setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Program)))),
      onSnapshot(collection(db, 'enrollments'), (snap) => setEnrollments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment)))),
      onSnapshot(query(collection(db, 'payments'), orderBy('date', 'desc')), (snap) => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)))),
      onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snap) => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)))),
      onSnapshot(collection(db, 'expense_templates'), (snap) => setExpenseTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExpenseTemplate)))),

      // Workshop Listeners
      onSnapshot(collection(db, 'workshop_templates'), (snap) => setWorkshopTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopTemplate)))),
      onSnapshot(collection(db, 'workshop_slots'), (snap) => setWorkshopSlots(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopSlot)))),
      onSnapshot(query(collection(db, 'bookings'), orderBy('bookedAt', 'desc')), (snap) => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)))),

      // Attendance
      onSnapshot(collection(db, 'attendance'), (snap) => setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)))),

      // Team Listeners
      onSnapshot(collection(db, 'users'), (snap) => setTeamMembers(snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)))),
      onSnapshot(collection(db, 'tasks'), (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)))),
      onSnapshot(collection(db, 'projects'), (snap) => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)))),
      onSnapshot(query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
        // Reverse for chat display
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
        setChatMessages(msgs.reverse());
      }),

      // Marketing Listeners
      onSnapshot(collection(db, 'marketing_posts'), (snap) => setMarketingPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketingPost)))),
      onSnapshot(collection(db, 'campaigns'), (snap) => setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)))),
      onSnapshot(collection(db, 'leads'), (snap) => setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)))),

      // Learning Listeners
      onSnapshot(collection(db, 'project_templates'), (snap) => setProjectTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectTemplate)))),
      onSnapshot(collection(db, 'student_projects'), (snap) => setStudentProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentProject)))),

      // Setup Factory Listeners
      onSnapshot(collection(db, 'process_templates'), (snap) => setProcessTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProcessTemplate)))),
      onSnapshot(collection(db, 'stations'), (snap) => setStations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Station)))),
      onSnapshot(collection(db, 'badges'), (snap) => setBadges(snap.docs.map(d => ({ id: d.id, ...d.data() } as Badge)))),

      // Toolkit & Media
      onSnapshot(collection(db, 'tool_links'), (snap) => setToolLinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as ToolLink)))),
      onSnapshot(query(collection(db, 'gallery_items'), orderBy('createdAt', 'desc')), (snap) => setGalleryItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem)))),

      // Hardware & Pickup
      onSnapshot(collection(db, 'assets'), (snap) => setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)))),
      onSnapshot(collection(db, 'pickup_queue'), (snap) => setPickupQueue(snap.docs.map(d => ({ id: d.id, ...d.data() } as PickupEntry)))),
    ];

    return () => unsubs.forEach(u => u());
  }, []);

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
      toolLinks, galleryItems, assets, pickupQueue,
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