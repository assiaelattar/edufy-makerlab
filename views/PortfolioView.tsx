import React, { useMemo } from 'react';
import { Award, BookOpen, Calendar, ExternalLink, Grid3X3, Rocket, Share2, Sparkles, Trophy } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard } from '../components/atlas/AtlasSurface';
import { config } from '../utils/config';
import { formatDate } from '../utils/helpers';
import { useWorkspaceScroll } from '../components/education-ui/useWorkspaceViewState';
import '../components/education-ui/education-system-v1.css';
import './learning/education-learning-v1.css';
import './learning/education-learning-focus.css';
import './learning/education-learning-playful.css';

export const PortfolioView = () => {
    const showEducationLearningV1 = new URLSearchParams(window.location.search).get('ui') !== 'atlas-legacy';
    const { studentProjects, badges, students } = useAppContext();
    const { userProfile, currentOrganization, user } = useAuth();
    const workspaceScope = `portfolio:${currentOrganization?.id || userProfile?.organizationId || 'none'}:${user?.uid || userProfile?.uid || 'guest'}`;
    useWorkspaceScroll(workspaceScope);
    const { alert } = useConfirm();
    const isLearnerPortfolio = userProfile?.role === 'student';

    const myProjects = useMemo(() => {
        if (!userProfile) return [];
        const matchedStudent = students.find(student => student.email === userProfile.email || student.loginInfo?.email === userProfile.email);
        return studentProjects.filter(project => project.studentId === userProfile.uid || (matchedStudent && project.studentId === matchedStudent.id));
    }, [studentProjects, userProfile, students]);

    const publishedProjects = myProjects.filter(project => project.status === 'published');
    const activeProjects = myProjects.filter(project => ['planning', 'building', 'testing', 'changes_requested'].includes(project.status));
    const submittedProjects = myProjects.filter(project => project.status === 'submitted');
    const workInProgress = myProjects.length - publishedProjects.length;
    const xp = publishedProjects.length * 150 + myProjects.length * 50;
    const level = Math.floor(xp / 500) + 1;
    const levelProgress = ((xp % 500) / 500) * 100;

    const myBadges = useMemo(() => {
        if (!userProfile) return [];
        const student = students.find(item => item.id === userProfile.uid || item.email === userProfile.email);
        const badgeIds = student?.badges || [];
        return badges.filter(badge => badgeIds.includes(badge.id));
    }, [students, userProfile, badges]);

    const shareProject = async (projectId: string, title: string) => {
        const url = `${config.sparkQuestUrl}/?projectId=${projectId}`;
        try {
            if (navigator.share) {
                await navigator.share({ title, url });
                return;
            }
            await navigator.clipboard.writeText(url);
            alert('Project link copied', 'The portfolio link is ready to share.', 'success');
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error(error);
            alert('Project not shared', 'Sharing is unavailable in this browser. Open the project and copy its address.', 'danger');
        }
    };

    return (
        <div data-edu-system={showEducationLearningV1 ? '1' : undefined} className={`space-y-5 pb-24 md:pb-8 ${showEducationLearningV1 ? 'edu-v1 edu-portfolio-v1' : ''}`} data-testid={showEducationLearningV1 ? 'education-portfolio-v1' : undefined}>
            <AtlasCommandHeader
                eyebrow="Maker portfolio"
                title={`${userProfile?.name || 'My'}'s work`}
                description="A focused record of shipped projects, earned badges, and the next level in progress."
                icon={Trophy}
                badges={<span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold text-amber-200">Level {level}</span>}
                actions={<AtlasActionButton icon={Rocket} variant="primary" onClick={() => window.open(config.sparkQuestUrl, '_blank')}>Open SparkQuest</AtlasActionButton>}
            />

            {showEducationLearningV1 && isLearnerPortfolio && (
                <section className="edu-portfolio-v1__focus" aria-label="Next portfolio action">
                    <div>
                        <span>Portfolio / next step</span>
                        <h2>{activeProjects.length > 0 ? `Continue ${activeProjects[0].title}` : submittedProjects.length > 0 ? `${submittedProjects.length} ${submittedProjects.length === 1 ? 'project is' : 'projects are'} awaiting review` : publishedProjects.length > 0 ? `${publishedProjects.length} published ${publishedProjects.length === 1 ? 'project' : 'projects'} to explore` : 'Start the first project'}</h2>
                        <p>{activeProjects.length > 0 ? 'Return to this build in SparkQuest.' : submittedProjects.length > 0 ? 'Your submitted work is waiting for an instructor decision. You can open it to see its current state.' : publishedProjects.length > 0 ? 'Open a finished build or share it from the portfolio below.' : 'Choose a mission in SparkQuest to begin your maker portfolio.'}</p>
                    </div>
                    <button type="button" onClick={() => {
                        if (activeProjects[0] || submittedProjects[0]) window.open(`${config.sparkQuestUrl}/?projectId=${(activeProjects[0] || submittedProjects[0]).id}`, '_blank');
                        else if (publishedProjects.length > 0) document.getElementById('portfolio-published')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        else window.open(config.sparkQuestUrl, '_blank');
                    }}>{activeProjects.length > 0 ? 'Continue project' : submittedProjects.length > 0 ? 'View submission' : publishedProjects.length > 0 ? 'View published work' : 'Open SparkQuest'} <ExternalLink size={16} /></button>
                </section>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AtlasSignalCard label="Level" value={level} detail={`${Math.round(levelProgress)}% to the next level`} icon={Sparkles} tone="amber" />
                <AtlasSignalCard label="Experience" value={`${xp} XP`} detail="Project progress" icon={Trophy} tone="teal" />
                <AtlasSignalCard label="Shipped" value={publishedProjects.length} detail="Published portfolio projects" icon={Rocket} tone="emerald" />
                <AtlasSignalCard label="Not published" value={workInProgress} detail="Projects before publication" icon={BookOpen} tone="blue" />
            </div>

            <section className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><div className="text-[10px] font-black uppercase text-amber-200">Level {level} progress</div><div className="mt-1 text-sm font-bold text-white">{500 - (xp % 500)} XP until level {level + 1}</div></div>
                    <div className="font-mono text-xs text-slate-500">{xp % 500} / 500 XP</div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuenow={Math.round(levelProgress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level"><div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-amber-300 transition-[width] duration-300" style={{ width: `${levelProgress}%` }} /></div>
            </section>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <section id="portfolio-published" className="rounded-lg border border-white/10 bg-slate-950/45 p-4 lg:col-span-2">
                    <AtlasSectionHeader title="Published projects" description="Every shipped project is ready to open or share." icon={Grid3X3} meta={<span className="text-xs text-slate-500">{publishedProjects.length}</span>} />
                    {publishedProjects.length === 0 ? (
                        <div className="mt-4"><AtlasEmptyState title="Ship the first project" description="Complete a mission and publish it to start building this portfolio." icon={BookOpen} action={<AtlasActionButton icon={Rocket} variant="primary" onClick={() => window.open(config.sparkQuestUrl, '_blank')}>Continue building</AtlasActionButton>} /></div>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {publishedProjects.map(project => (
                                <article key={project.id} className="overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.025] transition-colors hover:border-teal-300/25">
                                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-900">
                                        {project.mediaUrls?.[0] ? <img src={project.mediaUrls[0]} className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]" alt={project.title} /> : <div className="flex h-full items-center justify-center text-slate-700"><BookOpen size={32} /></div>}
                                        <span className="absolute right-2 top-2 rounded-full border border-white/15 bg-slate-950/85 px-2.5 py-1 text-[10px] font-black uppercase text-slate-200">{project.station || 'General'}</span>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="truncate text-base font-black text-white">{project.title}</h3>
                                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Calendar size={12} />{formatDate(project.createdAt)}</div>
                                        {project.earnedBadgeIds && project.earnedBadgeIds.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{project.earnedBadgeIds.map(badgeId => { const badge = badges.find(item => item.id === badgeId); return badge ? <span key={badgeId} className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-300/15 bg-amber-400/10 text-amber-200" title={badge.name}><Award size={14} /></span> : null; })}</div>}
                                        <div className="mt-4 flex gap-2"><AtlasActionButton className="flex-1" icon={Share2} onClick={() => shareProject(project.id, project.title)}>Share</AtlasActionButton><AtlasActionButton className="flex-1" icon={ExternalLink} variant="primary" onClick={() => window.open(`${config.sparkQuestUrl}/?projectId=${project.id}`, '_blank')}>Open</AtlasActionButton></div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
                    <AtlasSectionHeader title="Badge collection" description="Skills recognized across completed missions." icon={Award} meta={<span className="text-xs text-slate-500">{myBadges.length}</span>} />
                    {myBadges.length === 0 ? (
                        <div className="mt-4"><AtlasEmptyState title="Badges are waiting" description="Complete mission milestones to earn the first skill badge." icon={Award} /></div>
                    ) : (
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                            {myBadges.map(badge => (
                                <div key={badge.id} className="flex min-h-[118px] flex-col items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 text-center transition-colors hover:border-amber-300/20 hover:bg-amber-300/[0.035]">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-amber-300/15 bg-amber-400/10 text-amber-200"><Award size={23} /></div>
                                    <div className="mt-2 line-clamp-2 text-xs font-black leading-4 text-white">{badge.name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};
