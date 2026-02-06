
import React from 'react';
import { Share2, FileText, Bot, Megaphone, PenTool, Scan, ScanFace, BookOpen } from 'lucide-react';
import { SocialPosterView } from '../views/apps/SocialPosterView';
import { DocDesignerView } from '../views/apps/DocDesignerView';
import { PaperScannerView } from '../views/apps/PaperScannerView';
import { FaceAttendanceView } from '../views/apps/FaceAttendanceView';
import { StoryGeneratorView } from '../views/apps/StoryGeneratorView';

export interface AppManifest {
    id: string;
    name: string;
    description: string;
    fullDescription?: string; // NEW
    features?: string[]; // NEW
    pricing?: {
        price: number;
        currency: string;
        interval: 'monthly' | 'yearly' | 'one-time';
        isFree?: boolean;
    }; // NEW
    videoUrl?: string; // NEW
    icon: React.ElementType;
    category: 'marketing' | 'productivity' | 'design' | 'analytics';
    isPremium: boolean;
    component: React.ComponentType<any>;
    screenshots?: string[];
    version: string;
    developer: string;
}

export const AVAILABLE_APPS: AppManifest[] = [
    {
        id: 'social-poster-ai',
        name: 'Social Poster AI',
        description: 'Generate engagement-ready social media posts, captions, and visuals using AI.',
        fullDescription: 'Stop struggling with social media content. Social Poster AI analyzes your inputs and generates professional, engagement-ready posts for Instagram, LinkedIn, and Facebook in seconds. Includes image generation and hashtag suggestions.',
        features: ['Multi-platform support (IG, FB, LinkedIn)', 'AI Image Generation', 'Hashtag Optimization', 'Schedule Assistance'],
        pricing: { price: 99, currency: 'MAD', interval: 'monthly' },
        icon: Share2,
        category: 'marketing',
        isPremium: true,
        component: SocialPosterView,
        version: '1.0.0',
        developer: 'MakerLab AI',
        screenshots: ['https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80', 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=800&q=80']
    },
    {
        id: 'doc-designer-ai',
        name: 'Doc Designer AI',
        description: 'Create professional certificates, reports, and letters with smart templates.',
        fullDescription: 'Create stunning documents without a designer. From student certificates to formal letters, our AI engine picks the perfect layout and typography for your needs.',
        features: ['Smart Templates', 'Auto-Layout', 'PDF Export', 'Brand Integration'],
        pricing: { price: 150, currency: 'MAD', interval: 'one-time' },
        icon: FileText,
        category: 'productivity',
        isPremium: true,
        component: DocDesignerView,
        version: '1.0.0',
        developer: 'MakerLab AI',
        screenshots: ['https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80']
    },
    {
        id: 'paper-scanner-ai',
        name: 'Paper Note Scanner',
        description: 'Digitize handwritten notes and exams instantly using OCR.',
        fullDescription: 'Turn paper chaos into digital order. Upload photos of handwritten notes, exams, or whiteboards, and let our OCR convert them into editable, searchable text.',
        features: ['Handwriting Recognition', 'Exam Digitization', 'Searchable Text', 'Cloud Sync'],
        pricing: { price: 49, currency: 'MAD', interval: 'monthly' },
        icon: Scan,
        category: 'productivity',
        isPremium: true,
        component: PaperScannerView,
        version: '0.9.0',
        developer: 'MakerLab AI',
        screenshots: ['https://images.unsplash.com/photo-1555421689-491a97ff2040?w=800&q=80']
    },
    {
        id: 'face-attendance-ai',
        name: 'FaceID Attendance',
        description: 'Automate classroom entry with secure face recognition.',
        fullDescription: 'Modernize your attendance tracking. set up a kiosk at the entrance and let students check in simply by looking at the camera. Fast, secure, and contactless.',
        features: ['Real-time Recognition', 'Anti-Spoofing', 'Attendance Logs', 'Parent Notifications'],
        pricing: { price: 199, currency: 'MAD', interval: 'monthly' },
        icon: ScanFace,
        category: 'analytics',
        isPremium: true,
        component: FaceAttendanceView,
        version: '0.8.0',
        developer: 'MakerLab AI',
        screenshots: ['https://images.unsplash.com/photo-1555421689-d68471e189f2?w=800&q=80']
    },
    {
        id: 'story-generator-ai',
        name: 'DreamWeaver Library',
        description: 'Collaborative story generation for kids, creating a unique school library.',
        fullDescription: 'Spark creativity in your students. DreamWeaver helps kids co-author amazing stories with AI, complete with illustrations, building a unique digital library for your school.',
        features: ['Co-authoring Mode', 'AI Illustrations', 'Digital Bookshelf', 'Print-ready PDF'],
        pricing: { price: 299, currency: 'MAD', interval: 'yearly' },
        icon: BookOpen,
        category: 'productivity',
        isPremium: true,
        component: StoryGeneratorView,
        version: '1.0.0',
        developer: 'MakerLab AI',
        screenshots: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80']
    }
];

export const getAppById = (id: string) => AVAILABLE_APPS.find(a => a.id === id);
