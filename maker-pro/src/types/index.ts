import { Timestamp } from 'firebase/firestore';

export interface Student {
    id: string;
    name: string;
    email?: string;
    loginInfo?: {
        email: string;
        username: string;
        uid?: string;
    };
    photoUrl?: string; // Creative Avatar URL
    badgeId?: string;
    badges?: string[];
    points?: number;
    level?: number;
    xp?: number;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    date: Timestamp;
    audience: 'all' | 'students' | 'instructors';
    type: 'info' | 'alert' | 'promo' | 'event';
    authorId: string;
    link?: string;
    imageUrl?: string;
    reads?: string[]; // IDs of users who read it
}

export interface Program {
    id: string;
    name: string;
    targetAudience?: 'kids' | 'adults';
    description?: string;
    dashboardConfig?: ProgramDashboardConfig;
    resources?: ToolLink[];
}

export interface ProgramDashboardConfig {
    welcomeMessage?: string;
    themeColor?: 'brand' | 'blue' | 'purple' | 'green' | 'orange';
    showStats?: boolean;
    showSchedule?: boolean;
    meetingUrl?: string; // ZOOM/MEET Link
    enableAttendanceTracking?: boolean;
    customLinks?: { label: string; url: string }[];
}

export interface Enrollment {
    id: string;
    studentId: string;
    programId: string;
    programName: string;
    status: 'active' | 'completed' | 'dropped' | 'cancelled';
    startDate?: string;
    balance?: number;
    totalAmount?: number;
    groupTime?: string; // "Monday 17:00"
}

export interface ProjectResource {
    id: string;
    title: string;
    type: 'video' | 'file' | 'link';
    url: string;
}

export interface ProjectStep {
    id: string;
    title: string;
    status: 'todo' | 'doing' | 'done' | 'PENDING_REVIEW' | 'REJECTED';
    evidence?: string;
    note?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    reviewedBy?: string;
    reviewNotes?: string;
}

export type ContentType = 'video' | 'article' | 'project' | 'quiz' | 'file' | 'embed' | 'image' | 'html';

export interface ContentBlock {
    id: string;
    type: ContentType;
    title: string;
    description?: string;
    content?: string; // URL or Markdown text
    duration?: number; // minutes
    isAssigned?: boolean;
    dueDate?: string;
    metadata?: Record<string, any>; // For flexible modern features
}

export interface CurriculumModule {
    id: string;
    title: string;
    description?: string;
    order: number;
    items: ContentBlock[];
    isPublished: boolean;
    isLocked?: boolean;
}

export interface Curriculum {
    id: string; // usually same as programId
    programId: string;
    modules: CurriculumModule[];
    lastUpdated: any; // Timestamp
    status?: 'draft' | 'published' | 'archived';
}

export interface StudentProject {
    id: string;
    studentId: string;
    studentName: string;
    title: string;
    description: string;
    station: string;
    status: 'planning' | 'building' | 'testing' | 'delivered' | 'submitted' | 'changes_requested' | 'published';
    steps: ProjectStep[];
    mediaUrls?: string[];
    embedUrl?: string;
    externalLink?: string;
    skillsAcquired: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
    earnedBadgeIds?: string[];
    instructorFeedback?: string;
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
}

export interface AttendanceRecord {
    id: string;
    date: string;
    studentId: string;
    status: 'present' | 'absent' | 'late' | 'excused';
}

export interface ToolLink {
    id: string;
    title: string;
    url: string;
    category: 'robotics' | 'coding' | 'design' | 'engineering' | 'multimedia' | 'other';
    description?: string;
    icon?: string;
    createdAt: Timestamp;
}

