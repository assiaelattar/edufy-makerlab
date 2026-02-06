
import { Timestamp } from 'firebase/firestore';

export type ProjectStatus = 'planning' | 'building' | 'submitted' | 'published';
export type TaskStatus = 'todo' | 'doing' | 'done' | 'PENDING_REVIEW' | 'REJECTED';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

// Stations
export type StationType = 'Robotics' | 'Coding' | 'Design' | 'Circuits' | 'Engineering' | 'Game Design' | 'Multimedia' | 'Branding';

export interface Station {
  id: string;
  label: string;
  color: string;
  icon: string;
  description?: string;
  order?: number;
  gradeIds?: string[];
  activeForGradeIds?: string[];
  startDate?: Timestamp;
  endDate?: Timestamp;
}

// Badges
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
  createdAt?: Timestamp;
}

// Workflows (Process Templates)
export interface ProcessPhase {
  id: string;
  name: string;
  color: string;
  icon: string; // Lucide icon name
  order: number;
  description?: string;
  resources?: Resource[]; // Default resources for this phase
}

export interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  phases: ProcessPhase[];
  isDefault?: boolean;
  createdAt?: Timestamp;
}

// Resources
export interface Resource {
  id: string;
  title: string;
  type: 'video' | 'link' | 'file' | 'image';
  url: string;
}

// Project Structure
export interface ProjectStep {
  id: string;
  title: string;
  status: TaskStatus;
  evidence?: string; // URL or Base64
  note?: string; // Student reflection
  resources?: Resource[]; // Tool links
  reviewNotes?: string; // Instructor feedback
  reviewedAt?: string;
  isLocked?: boolean;
}

export interface Commit {
  id: string;
  message: string;
  timestamp: Date;
  stepId?: string;
  link?: string;
}

export interface StudentProject {
  id: string;
  studentId?: string;
  studentName?: string;
  studentEmail?: string; // For account recovery/linking fallback
  organizationId?: string; // SaaS Tenant ID

  // Core
  title: string;
  description: string;
  station: string;
  status: ProjectStatus;
  templateId?: string;

  // Strategy
  workflowId?: string;

  // Process
  steps: ProjectStep[];
  commits: Commit[];

  // Media
  coverImage?: string;
  thumbnailUrl?: string; // Consistent with ProjectTemplate
  presentationUrl?: string;
  mediaUrls?: string[];
  videoUrl?: string; // Optional: Project video
  gallery?: string[]; // Optional: Gallery images

  // Meta
  skills: string[];
  resources: Resource[];
  stepResources?: Record<string, Resource[]>; // Map stepId/phaseId -> specific resources
  dueDate?: Date;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Data coming from the Instructor/LMS for a specific assignment
export interface Assignment {
  id: string;
  title: string;
  station: string;
  description: string;
  badges: Badge[];
  recommendedWorkflow: string;
  stepResources?: Record<string, Resource[]>; // Map stepId/phaseId -> specific resources
  resources?: Resource[]; // Global mission resources
}

// Legacy Roadmap Types
export enum StepStatus {
  LOCKED = 'LOCKED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export interface RoadmapStep {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  proofType: 'image' | 'link';
  xpReward: number;
}

export interface Peer {
  id: string;
  name: string;
  avatarColor: string;
  currentStepId: number;
}

export interface User {
  name: string;
  level: number;
  xp: number;
  currentStepId: number;
}

export interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  hook?: string; // New: Engagement hook
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  skills: string[];
  defaultSteps?: string[];
  station: StationType;
  processTemplateId?: string;
  thumbnailUrl?: string;
  resources?: Resource[]; // Instructor attached resources
  status?: 'draft' | 'featured' | 'assigned' | 'archived'; // Publishing status
  targetAudience?: {
    grades?: string[];
    groups?: string[];
    students?: string[]; // Specific student UIDs
  };
  defaultWorkflowId?: string; // Legacy or specific workflow overide
  stepResources?: Record<string, Resource[]>; // Mission-specific resources for workflow steps

  // Enhanced Fields
  realWorldApp?: {
    title?: string;
    description: string;
    companies: { name: string, color?: string }[]
  };
  keyChallenges?: { title: string, desc: string, color?: string }[];
  learningOutcomes?: { id: number | string, title: string, desc: string, theme: string }[];
  technologies?: { name: string, icon: string, color?: string, bg?: string }[];
  duration?: string; // "4 Sessions (8 Hours)"

  dueDate?: Timestamp;
  createdAt?: Timestamp;
}

// Toolkit & Assets
export interface ToolLink {
  id: string;
  title: string;
  url: string;
  category: 'robotics' | 'coding' | 'design' | 'engineering' | 'multimedia' | 'other';
  description: string;
  createdAt?: Timestamp;
}

export interface Asset {
  id: string;
  name: string;
  category: 'robotics' | 'computer' | 'tools' | 'other';
  status: 'available' | 'in_use' | 'maintenance' | 'lost';
  serialNumber?: string;
  notes?: string;
  assignedTo?: string; // Student ID
  assignedToName?: string;
  createdAt?: Timestamp;
}

// Global Electron API
export interface ElectronAPI {
  onFocusChange: (callback: (focused: boolean) => void) => void;
  startSession: (url: string) => void;
  endSession: () => void;
  sessionControl: (action: string) => void;
  captureSession: () => Promise<string | null>;
  getConfig: () => Promise<any>;
  updateConfig: (config: any) => Promise<{ success: boolean; requiresRestart?: boolean }>;
}


export interface Credential {
  id: string;
  service: string; // 'Tinkercad', 'Canva', 'Google', 'Scratch', etc.
  label: string;
  username: string;
  password?: string;
  url?: string;
}

export interface UserProfile {
  uid: string;
  organizationId?: string; // SaaS Tenant ID (optional for backward compatibility)
  name: string;
  email: string;
  role: string;
  schoolId?: string;
  photoURL?: string;
  credentials?: Credential[];
  arcadeCredits?: number;
}

export interface Gadget {
  id: string;
  name: string;
  description: string;
  cost: number; // XP or Coins
  image: string;
  stock: number;
  type: 'physical' | 'service'; // 'physical' = drone, 'service' = 3D print
  category?: 'electronics' | 'robotics' | 'merch' | 'service';
}

export interface PurchaseRequest {
  id: string;
  userId: string;
  userName: string;
  gadgetId: string;
  gadgetName: string;
  cost: number;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  createdAt: Timestamp;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  image: string; // Banner
  rewardId?: string; // Link to a Gadget
  rewardText?: string; // "Win a Drone!" if direct

  // Criteria
  targetMissions?: string[]; // IDs of specific missions to complete
  targetGrades?: string[]; // IDs of grades this contest is active for
  targetExploreCount?: number; // "Complete 5 Exploration Missions"
  targetXP?: number; // "Earn 1000 XP in Robotics"

  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    sparkquest: ElectronAPI;
  }
}

