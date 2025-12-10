
import { Timestamp } from 'firebase/firestore';

export interface Group {
  id: string;
  name: string;
  day: string;
  time: string;
}

export interface Grade {
  id: string;
  name: string;
  groups: Group[];
}

export interface ProgramPack {
  name: string;
  workshopsPerWeek?: number;
  priceAnnual?: number;
  priceTrimester?: number;
  price?: number;
}

export interface Program {
  id: string;
  name: string;
  type: 'Regular Program' | 'Holiday Camp' | 'Workshop';
  description: string;
  status: 'active' | 'archived';
  packs: ProgramPack[];
  grades: Grade[];
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  parentPhone: string;
  parentName?: string;
  address?: string;
  school?: string;
  birthDate?: string;
  medicalInfo?: string;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  loginInfo?: {
    username: string;
    email: string;
    initialPassword?: string; // Stored only for initial distribution
    uid: string;
  };
  parentLoginInfo?: {
    email: string;
    initialPassword?: string; // Stored only for initial distribution
    uid: string;
  };
  badges?: string[]; // Array of Badge IDs
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  programId: string;
  programName: string;
  packName: string;
  gradeId?: string;
  groupId?: string;
  gradeName?: string;
  groupName?: string;
  groupTime?: string;
  secondGroupId?: string;
  secondGroupName?: string;
  secondGroupTime?: string;
  paymentPlan: 'annual' | 'trimester' | 'full';
  totalAmount: number;
  paidAmount: number;
  balance: number;
  discountAmount?: number; // Track negotiated discount
  status: 'active' | 'completed' | 'dropped';
  startDate: string;
  session?: string; // Academic Year (e.g. "2024-2025")
  createdAt?: Timestamp;
}

export interface Payment {
  id: string;
  enrollmentId: string;
  studentName: string;
  amount: number;
  date: string;
  method: 'cash' | 'check' | 'virement';
  status: 'paid' | 'pending_verification' | 'verified' | 'check_received' | 'check_deposited' | 'check_bounced';
  checkNumber?: string;
  bankName?: string;
  depositDate?: string;
  issueDate?: string;
  proofUrl?: string;
  session?: string; // Academic Year (e.g. "2024-2025")
  createdAt: Timestamp;
}

// --- EXPENSE TYPES ---
export interface Expense {
  id: string;
  title: string;
  category: 'rent' | 'salary' | 'utilities' | 'material' | 'marketing' | 'other';
  amount: number;
  date: string;
  method: 'cash' | 'check' | 'virement';
  status: 'paid' | 'pending';
  beneficiary: string;
  receiptUrl?: string;
  notes?: string;
  session?: string;
  templateId?: string; // ID of the template that generated this
  createdAt: Timestamp;
}

export interface ExpenseTemplate {
  id: string;
  title: string;
  category: 'rent' | 'salary' | 'utilities' | 'material' | 'marketing' | 'other';
  amount: number;
  beneficiary: string;
  recurring?: boolean;
  frequency?: 'monthly' | 'weekly';
  dayDue?: number; // 1-31
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  enrollmentId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  markedBy?: string;
  createdAt: Timestamp;
}

// --- NEW WORKSHOP MODULE TYPES ---

export interface WorkshopTemplate {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  recurrenceType: 'one-time' | 'weekly' | 'custom';
  recurrencePattern: {
    days?: number[]; // 0=Sunday, 1=Monday for weekly
    time?: string;   // "14:00"
    date?: string;   // "2024-05-20" for one-time
  };
  capacityPerSlot: number;
  isActive: boolean;
  shareableSlug: string;
  createdAt: Timestamp;
}

export interface WorkshopSlot {
  id: string;
  workshopTemplateId: string; // References WorkshopTemplate
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  capacity: number;
  bookedCount: number;
  status: 'available' | 'full' | 'cancelled';
}

export interface Booking {
  id: string;
  workshopSlotId: string;
  workshopTemplateId: string; // Denormalized for easy querying
  parentName: string;
  phoneNumber: string;
  kidName: string;
  kidAge: number;
  kidInterests?: string;
  status: 'confirmed' | 'attended' | 'no-show' | 'cancelled';
  bookedAt: Timestamp;
  notes?: string;
}

// --- TEAM & TASK MANAGEMENT TYPES ---

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on_hold';
  dueDate?: string;
  createdAt: Timestamp;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string; // User UID
  assignedToName?: string;
  projectId?: string; // Optional link to project
  dueDate?: string;
  createdAt: Timestamp;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Timestamp;
  type: 'text' | 'image'; // For future expansion
}

// --- MARKETING & CRM TYPES ---

export interface MarketingPost {
  id: string;
  platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok';
  content: string;
  date: string; // Planned date
  status: 'planned' | 'in_progress' | 'review' | 'approved' | 'published';
  imageUrl?: string;
  attachments?: string[]; // Links to Google Drive/Canva/Files
  feedback?: string; // Admin feedback for rejection
  assignee?: string; // Who is working on it
  createdAt: Timestamp;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'planned' | 'active' | 'completed';
  budget: number;
  spend: number;
  startDate: string;
  endDate: string;
  goals: string;
  createdAt: Timestamp;
}

export interface Lead {
  id: string;
  name: string;
  parentName: string;
  phone: string;
  email?: string;
  source: string; // e.g., 'Facebook', 'Walk-in'
  status: 'new' | 'contacted' | 'interested' | 'converted' | 'closed';
  notes?: string;
  createdAt: Timestamp;
}

// --- LEARNING & PORTFOLIO TYPES (LMS) ---

export type StationType = 'robotics' | 'coding' | 'game_design' | 'multimedia' | 'engineering' | 'branding' | 'general';

export interface ProjectResource {
  id: string;
  title: string;
  type: 'video' | 'file' | 'link';
  url: string;
}

export interface ProjectStep {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  isLocked?: boolean;
  proofUrl?: string; // Proof of work (image/link)
  proofStatus?: 'pending' | 'approved' | 'rejected';
  // Approval workflow fields
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string; // Instructor UID
  reviewedAt?: Timestamp;
  reviewNotes?: string; // Instructor feedback
}

export interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  skills: string[]; // e.g. "Python", "3D Design"
  defaultSteps?: string[]; // e.g. ["Design", "Build", "Test"]
  station: StationType; // Category for theming
  processTemplateId?: string; // Link to workflow
  thumbnailUrl?: string;
  resources?: ProjectResource[]; // Instructor attached resources
  status?: 'draft' | 'featured' | 'assigned'; // Publishing status
  targetAudience?: {
    grades?: string[];
    groups?: string[];
  };
  dueDate?: Timestamp;
  createdAt: Timestamp;
}

export interface StudentProject {
  id: string;
  studentId: string;
  studentName: string;
  templateId?: string | null; // If based on a template. Nullable to prevent undefined issues.
  currentPhaseId?: string; // Current phase in the process
  station: StationType; // Inherited or Selected
  title: string;
  description: string;
  externalLink?: string; // Scratch, Tinkercad link
  embedUrl?: string; // NEW: For iframes (Scratch, YouTube, Tinkercad)
  mediaUrls?: string[]; // Screenshots
  resources?: ProjectResource[]; // Copied from template
  skillsAcquired: string[];
  skills?: string[]; // Alias for compatibility
  steps: ProjectStep[]; // The engineering process steps
  status: 'planning' | 'building' | 'testing' | 'delivered' | 'submitted' | 'changes_requested' | 'published'; // Expanded workflow
  instructorFeedback?: string;
  dueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  commits?: {
    id: string;
    message: string;
    timestamp: Timestamp;
    snapshot: ProjectStep[];
    stepId?: string;
    evidenceLink?: string;
  }[];
}

export interface Notification {
  id: string;
  userId: string; // student or parent ID
  type: 'project_assigned' | 'feedback_received' | 'status_changed' | 'reminder' | 'project_submitted';
  title: string;
  message: string;
  projectId?: string;
  projectTitle?: string;
  read: boolean;
  link?: string;
  createdAt: Timestamp;
}

// --- SETUP FACTORY TYPES ---

export interface ProcessPhase {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  description?: string;
}

export interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  phases: ProcessPhase[];
  isDefault?: boolean;
  createdAt: Timestamp;
}

export interface Station {
  id: string;
  label: string;
  color: string;
  icon: string;
  description?: string;
  order?: number;
  gradeIds?: string[]; // Array of grade IDs this station belongs to
  gradeNames?: string[]; // Array of grade names for display
  activeForGradeIds?: string[]; // IDs of grades where this station is currently active
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria: {
    type: 'skill' | 'project_count';
    target: string;
    count: number;
  };
  createdAt: Timestamp;
}

// --- TOOLKIT, ASSETS & MEDIA TYPES ---

export interface ToolLink {
  id: string;
  title: string;
  url: string;
  category: 'robotics' | 'coding' | 'design' | 'engineering' | 'multimedia' | 'other';
  description?: string;
  icon?: string;
  createdAt: Timestamp;
}

export interface Asset {
  id: string;
  name: string; // e.g., "Lego Spike Prime Set #4"
  category: 'robotics' | 'computer' | 'tools' | 'other';
  serialNumber?: string;
  status: 'available' | 'in_use' | 'maintenance' | 'lost';
  assignedTo?: string; // Student ID
  assignedToName?: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface GalleryItem {
  id: string;
  url: string; // Image URL
  caption?: string;
  type: 'image' | 'video';
  createdAt: Timestamp;
}

// --- PICKUP & OPERATIONS ---

export interface PickupEntry {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  status: 'waiting' | 'arrived' | 'dismissed';
  createdAt: Timestamp;
}

// --- NOTIFICATIONS ---

export interface AppNotification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: Timestamp;
}

// --- AUTH & RBAC TYPES ---

export type RoleType = 'admin' | 'admission_officer' | 'accountant' | 'instructor' | 'content_manager' | 'parent' | 'student' | 'guest';

export interface UserProfile {
  uid?: string; // Firebase Auth UID (optional if invitation only)
  email: string;
  name: string;
  role: RoleType;
  status: 'active' | 'disabled';
  createdAt: Timestamp;
  lastLogin?: Timestamp;
}

export interface RoleDefinition {
  id: RoleType;
  label: string;
  description: string;
  permissions: string[]; // e.g., ["finance.view", "students.edit"]
  isSystem?: boolean; // Prevent deletion
}

// Settings
export interface FormFieldConfig {
  active: boolean;
  required: boolean;
}

export interface ApiConfig {
  googleApiKey?: string;
  openaiApiKey?: string;
  elevenLabsApiKey?: string;
}

export interface AppSettings {
  academyName: string;
  academicYear: string;
  logoUrl: string;
  language: 'en' | 'fr';
  receiptContact: string;
  receiptFooter: string;
  googleReviewUrl?: string;
  apiConfig?: ApiConfig;
  studentFormConfig: {
    parentName: FormFieldConfig;
    email: FormFieldConfig;
    address: FormFieldConfig;
    school: FormFieldConfig;
    birthDate: FormFieldConfig;
    medicalInfo: FormFieldConfig;
  };
}

// Navigation Types
export type ViewState = 'dashboard' | 'classes' | 'students' | 'programs' | 'finance' | 'expenses' | 'settings' | 'tools' | 'student-details' | 'activity-details' | 'workshops' | 'attendance' | 'team' | 'marketing' | 'learning' | 'toolkit' | 'media' | 'pickup' | 'parent-dashboard' | 'test-design';

export interface ViewParams {
  classId?: { pId: string, gId: string, grpId: string };
  studentId?: string;
  activityId?: { type: 'payment' | 'enrollment' | 'booking', id: string };
  filter?: string;
}
