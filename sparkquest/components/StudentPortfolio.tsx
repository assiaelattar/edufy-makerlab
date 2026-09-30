import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Award, Download, ExternalLink, FileCheck2, Plus, Sparkles, Star, X } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { StudentProject } from '../types';

interface StudentPortfolioProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectProject?: (projectId: string) => void;
    onStartShowcase?: () => void;
    previewMode?: boolean;
}

const DEMO_PROJECTS: StudentProject[] = [
    {
        id: 'portfolio-plant-guardian',
        title: 'Smart plant guardian',
        description: 'A moisture-sensing device that warns its owner before the soil becomes too dry.',
        station: 'Circuits',
        status: 'published',
        steps: [
            { id: 'observe', title: 'Observe', status: 'done', evidence: 'proof' },
            { id: 'plan', title: 'Plan', status: 'done', evidence: 'proof' },
            { id: 'build', title: 'Build', status: 'done', evidence: 'proof' },
            { id: 'test', title: 'Test', status: 'done', evidence: 'proof' },
        ],
        commits: [{ id: 'commit-1', message: 'Improved the dry-soil threshold.', timestamp: new Date('2026-09-18') }],
        skills: ['Electronics', 'Prototyping', 'Testing'],
        resources: [],
        thumbnailUrl: '/mission-plant-guardian.svg',
    },
    {
        id: 'portfolio-weather-station',
        title: 'Pocket weather station',
        description: 'A compact sensor station that records temperature and explains changing conditions.',
        station: 'Coding',
        status: 'delivered',
        steps: [
            { id: 'research', title: 'Research', status: 'done' },
            { id: 'code', title: 'Code', status: 'done' },
            { id: 'calibrate', title: 'Calibrate', status: 'done' },
        ],
        commits: [
            { id: 'commit-2', message: 'Added a clearer temperature display.', timestamp: new Date('2026-08-28') },
            { id: 'commit-3', message: 'Calibrated the room sensor.', timestamp: new Date('2026-08-29') },
        ],
        skills: ['Python', 'Sensors', 'Data'],
        resources: [],
    },
    {
        id: 'portfolio-arcade-controller',
        title: 'Cardboard arcade controller',
        description: 'A playable controller made from recycled board, conductive tape, and careful iteration.',
        station: 'Engineering',
        status: 'submitted',
        steps: [
            { id: 'shape', title: 'Shape', status: 'done' },
            { id: 'wire', title: 'Wire', status: 'done' },
            { id: 'playtest', title: 'Play-test', status: 'PENDING_REVIEW' },
        ],
        commits: [{ id: 'commit-4', message: 'Reinforced the button panel.', timestamp: new Date('2026-09-26') }],
        skills: ['Creative engineering', 'Circuits', 'Iteration'],
        resources: [],
    },
];

const projectEmoji = (station: string) => {
    const normalized = station.toLowerCase();
    if (normalized.includes('robot')) return '🤖';
    if (normalized.includes('cod')) return '🌦️';
    if (normalized.includes('circuit')) return '🌱';
    if (normalized.includes('engineer')) return '🕹️';
    return '🛠️';
};

const statusLabel = (status: string) => {
    if (['APPROVED', 'published', 'delivered', 'DONE', 'COMPLETED', 'completed'].includes(status)) return { label: 'Approved', className: 'is-approved' };
    if (status === 'PENDING_REVIEW' || status === 'submitted') return { label: 'Mentor review', className: 'is-review' };
    return { label: status.replaceAll('_', ' '), className: 'is-neutral' };
};

export const StudentPortfolio: React.FC<StudentPortfolioProps> = ({ isOpen, onClose, onSelectProject, onStartShowcase, previewMode = false }) => {
    const { user, userProfile } = useAuth();
    const [projects, setProjects] = useState<StudentProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exportMessage, setExportMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        if (previewMode) {
            setProjects(DEMO_PROJECTS);
            setLoading(false);
            setError(null);
            return;
        }
        if (!user || !userProfile) {
            setLoading(false);
            setError('Sign in again to open your field log.');
            return;
        }
        void loadPortfolioData();
    }, [isOpen, previewMode, user, userProfile]);

    const loadPortfolioData = async () => {
        if (!db || !user || !userProfile) return;
        if (!userProfile.organizationId) {
            setLoading(false);
            setError('Your academy connection is missing. Ask an instructor to repair it before opening the portfolio.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const ownerIds = Array.from(new Set([user.uid, userProfile.studentId].filter(Boolean))) as string[];
            const results = await Promise.allSettled(ownerIds.map(ownerId => getDocs(query(
                collection(db, 'student_projects'),
                where('studentId', '==', ownerId),
                where('organizationId', '==', userProfile.organizationId),
            ))));
            if (results.length > 0 && results.every(result => result.status === 'rejected')) throw results[0].reason;

            const visibleStatuses = new Set(['submitted', 'published', 'delivered', 'completed', 'PENDING_REVIEW', 'APPROVED', 'DONE', 'COMPLETED']);
            const projectMap = new Map<string, StudentProject>();
            results.forEach(result => {
                if (result.status !== 'fulfilled') return;
                result.value.docs.forEach(projectDoc => {
                    const project = { id: projectDoc.id, ...projectDoc.data() } as StudentProject;
                    if (project.organizationId === userProfile.organizationId && visibleStatuses.has(project.status)) projectMap.set(project.id, project);
                });
            });
            setProjects(Array.from(projectMap.values()));
        } catch (portfolioError) {
            console.error('Error loading portfolio:', portfolioError);
            setError('Your field log could not load. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const totalXP = projects.length * 100;
    const level = Math.floor(totalXP / 500) + 1;
    const skills = useMemo(() => Array.from(new Set(projects.flatMap(project => project.skills || []))), [projects]);
    const proofCount = projects.reduce((total, project) => total + (project.steps || []).filter(step => Boolean(step.evidence)).length, 0);

    if (!isOpen) return null;

    return (
        <div className="sq-portfolio-overlay" role="dialog" aria-modal="true" aria-labelledby="portfolio-title">
            <button className="sq-portfolio-backdrop" type="button" onClick={onClose} aria-label="Close field log" />
            <section className="sq-portfolio-shell">
                <header className="sq-portfolio-header">
                    <div className="sq-portfolio-brand">
                        <span className="sq-portfolio-mark" aria-hidden="true"><Award size={26} /></span>
                        <div>
                            <p>MakerLab field log</p>
                            <h2 id="portfolio-title">Work worth remembering.</h2>
                        </div>
                    </div>
                    <div className="sq-portfolio-actions">
                        <button type="button" className="sq-portfolio-export" onClick={() => setExportMessage('PDF export is being prepared for a future release. Your projects remain saved here.')}><Download size={18} /> <span>Export log</span></button>
                        <button type="button" className="sq-portfolio-close" onClick={onClose} aria-label="Close field log"><X size={24} /></button>
                    </div>
                </header>

                {exportMessage && <div className="sq-portfolio-notice" role="status"><FileCheck2 size={18} /> {exportMessage}<button type="button" onClick={() => setExportMessage(null)} aria-label="Dismiss export message"><X size={16} /></button></div>}

                <div className="sq-portfolio-scroll">
                    <section className="sq-portfolio-hero">
                        <div>
                            <p className="sq-portfolio-eyebrow">Your making story</p>
                            <h3>Every build leaves a trail of proof.</h3>
                            <p>This is where finished projects, mentor feedback, and growing skills become a record you can share.</p>
                        </div>
                        <div className="sq-portfolio-stats" aria-label="Portfolio summary">
                            <div><strong>{projects.length}</strong><span>Projects</span></div>
                            <div><strong>{proofCount}</strong><span>Proof items</span></div>
                            <div><strong>{totalXP}</strong><span>Sparks earned</span></div>
                            <div><strong>L{level}</strong><span>Maker level</span></div>
                        </div>
                    </section>

                    {loading ? (
                        <div className="sq-portfolio-state"><span className="sq-portfolio-loader" /><h3>Opening your field log…</h3></div>
                    ) : error ? (
                        <div className="sq-portfolio-state is-error"><Award size={42} /><h3>Field log unavailable</h3><p>{error}</p><button type="button" onClick={() => void loadPortfolioData()}>Try again</button></div>
                    ) : projects.length === 0 ? (
                        <div className="sq-portfolio-state"><Award size={48} /><h3>Your first project belongs here.</h3><p>Complete and submit a mission to start your field log.</p></div>
                    ) : (
                        <>
                            <section className="sq-portfolio-skills" aria-labelledby="portfolio-skills-title">
                                <div>
                                    <p>Skills collected</p>
                                    <h3 id="portfolio-skills-title">What your work proves</h3>
                                </div>
                                <div className="sq-portfolio-skill-list">
                                    {skills.map((skill, index) => <span key={skill}><Star size={14} fill={index < 3 ? 'currentColor' : 'none'} /> {skill}</span>)}
                                </div>
                            </section>

                            <section className="sq-portfolio-projects" aria-labelledby="portfolio-projects-title">
                                <div className="sq-portfolio-section-head">
                                    <div><p>Project archive</p><h3 id="portfolio-projects-title">Built, tested, shared.</h3></div>
                                    {onStartShowcase && <button type="button" onClick={() => { onStartShowcase(); onClose(); }}><Plus size={18} /> Add outside work</button>}
                                </div>

                                <div className="sq-portfolio-grid">
                                    {projects.map((project, index) => {
                                        const status = statusLabel(String(project.status));
                                        const completedSteps = project.steps?.filter(step => step.status === 'done').length || 0;
                                        return (
                                            <article key={project.id} className="sq-portfolio-card">
                                                <div className="sq-portfolio-card-media">
                                                    {(project.thumbnailUrl || project.coverImage)
                                                        ? <img src={project.thumbnailUrl || project.coverImage} alt={`${project.title} project`} loading="lazy" />
                                                        : <span aria-hidden="true">{projectEmoji(project.station)}</span>}
                                                    <span className={`sq-portfolio-status ${status.className}`}>{status.label}</span>
                                                    <small>Log entry {String(index + 1).padStart(2, '0')}</small>
                                                </div>
                                                <div className="sq-portfolio-card-copy">
                                                    <p>{project.station || 'Maker project'}</p>
                                                    <h4>{project.title}</h4>
                                                    <div className="sq-portfolio-card-description">{project.description}</div>
                                                    <div className="sq-portfolio-card-proof">
                                                        <span><FileCheck2 size={15} /> {completedSteps}/{project.steps?.length || 0} stages</span>
                                                        <span><Sparkles size={15} /> {project.commits?.length || 0} improvements</span>
                                                    </div>
                                                    <div className="sq-portfolio-card-actions">
                                                        <button type="button" disabled={!onSelectProject} onClick={() => { onSelectProject?.(project.id); onClose(); }}>Open project <ArrowRight size={16} /></button>
                                                        {project.presentationUrl && <a href={project.presentationUrl} target="_blank" rel="noopener noreferrer">Presentation <ExternalLink size={15} /></a>}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
};
