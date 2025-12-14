
import { Timestamp } from 'firebase/firestore';

export type ProjectStatus = 'planning' | 'building' | 'submitted' | 'published';
export type TaskStatus = 'todo' | 'doing' | 'done' | 'PENDING_REVIEW' | 'REJECTED';

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
  type: 'video' | 'link' | 'file';
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
  presentationUrl?: string;
  mediaUrls?: string[];

  // Meta
  skills: string[];
  resources: Resource[];
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
  };
  defaultWorkflowId?: string; // Legacy or specific workflow overide
  dueDate?: Timestamp;
  createdAt?: Timestamp;
}
