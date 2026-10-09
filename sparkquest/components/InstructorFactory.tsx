
import React, { useState } from 'react';
import { useFactoryData } from '../hooks/useFactoryData';
import { WorkflowManager } from './factory/WorkflowManager';
import { BadgeManager } from './factory/BadgeManager';
import { StationManager } from './factory/StationManager';
import { ProjectManager } from './factory/ProjectManager';
import { FactoryDashboard } from './factory/FactoryDashboard';
import { FactoryToolbox } from './factory/FactoryToolbox';
import { GradeProjectFilter } from './factory/GradeProjectFilter';
import { MissionGallery } from './factory/MissionGallery';
import { GamificationManager } from './admin/GamificationManager';
import { Layout, Briefcase, GitMerge, Hexagon, Award, LogOut, Menu, X, Users, Hammer, Filter, Eye, Settings, Trophy, MonitorPlay, Upload, FolderKanban, ClipboardCheck, LibraryBig, ChevronDown, Zap } from 'lucide-react';
import { config } from '../utils/config';

import { useAuth } from '../context/AuthContext'; // Import useAuth for user profile

interface SidebarItemProps {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    className={`sq-factory-nav-item ${active ? 'is-active' : ''}`}
  >
    <Icon size={18} aria-hidden="true" />
    <span>{label}</span>
    {Boolean(badge) && <span className="sq-factory-nav-badge" aria-label={`${badge} awaiting review`}>{badge}</span>}
  </button>
);

import { ReviewModal } from './factory/ReviewModal';
import { ReviewInbox } from './factory/ReviewInbox';
import { needsReview } from '../domain/projectReview';

import { StudentManager } from './factory/StudentManager';
import { ProjectEditor } from './factory/ProjectEditor';
import { ProjectImporter } from './factory/ProjectImporter';
import { ProjectDetailsEnhanced } from './ProjectDetailsEnhanced';
import { FactoryEmptyState, FactoryPage, FactoryPageHeader } from './factory/FactoryPage';
import { ReviewSubmissionAlerts } from './factory/ReviewSubmissionAlerts';
import { ResourceLibrary } from './ResourceLibrary';
import './factory/factory-dispatch.css';
import './factory/factory-modern.css';
import './factory/factory-learning-live.css';

export const InstructorFactory: React.FC = () => {
  // Destructure projectTemplates here
  const { projectTemplates, studentProjects, students, studentProjectsLoading } = useFactoryData();
  const { user, userProfile, signOut } = useAuth();
  const [view, setView] = useState<'dashboard' | 'reviews' | 'projects' | 'resources' | 'gallery' | 'grades' | 'workflows' | 'stations' | 'badges' | 'makers' | 'toolbox' | 'preview' | 'gamification'>('dashboard');
  const [reviewingProjectId, setReviewingProjectId] = useState<string | null>(null);
  const [reviewingStepId, setReviewingStepId] = useState<string | undefined>();
  const [reviewInitialTab, setReviewInitialTab] = useState<'proof' | 'history'>('proof');
  const [filterTemplateId, setFilterTemplateId] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  const viewLabels: Record<typeof view, string> = {
    dashboard: 'Overview',
    reviews: 'Review inbox',
    projects: 'Mission library',
    resources: 'Resources & tools',
    gallery: 'Template gallery',
    grades: 'Class progress',
    workflows: 'Workflows',
    stations: 'Stations',
    badges: 'Badges',
    makers: 'Students',
    toolbox: 'Toolbox',
    preview: 'Student preview',
    gamification: 'Gamification',
  };
  const pendingReviewCount = studentProjects.filter(needsReview).length;
  const openReviewAlert = (projectId: string, stepId?: string) => {
    setView('reviews');
    setReviewInitialTab('proof');
    setReviewingProjectId(projectId);
    setReviewingStepId(stepId);
    setFilterTemplateId(null);
    setIsMobileOpen(false);
  };

  // Project Editor State
  const [isProjectEditorOpen, setIsProjectEditorOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);



  const handlePreviewProject = (templateId: string) => {
    setFilterTemplateId(templateId);
    setView('preview');
  };

  const handleViewSubmissions = (templateId: string) => {
    setFilterTemplateId(templateId);
    setView('dashboard');
  };

  const handleCreateMission = (gradeId?: string, programId?: string) => {
    if (gradeId) {
      setEditingProject({
        targetAudience: { grades: [gradeId], groups: [] },
        programId: programId // Store programId for context
      });
    } else {
      setEditingProject(null);
    }
    setIsProjectEditorOpen(true);
  };

  return (
    <div className="sparkfactory-shell flex h-screen text-slate-950">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      {/* Sidebar - Fixed on Mobile, Static/Fixed on Desktop */}
      <aside className={`
        sq-factory-sidebar fixed inset-y-0 left-0 z-50 w-[252px] text-white flex flex-col shrink-0 transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:relative
      `}>
        <div className="sq-factory-brand flex items-center justify-between px-5 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <span className="sq-factory-brand-mark" aria-hidden="true"><Zap size={21} fill="currentColor" /></span>
            <div><h1>SparkQuest</h1><p>Factory · instructor studio</p></div>
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white md:hidden" aria-label="Close navigation">
            <X size={24} />
          </button>
        </div>

        <nav className="sq-factory-nav flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar" aria-label="Factory navigation">
          <SidebarItem icon={Layout} label="Overview" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setFilterTemplateId(null); setIsMobileOpen(false); }} />
          <SidebarItem icon={ClipboardCheck} label="Review Inbox" badge={pendingReviewCount} active={view === 'reviews'} onClick={() => { setView('reviews'); setFilterTemplateId(null); setIsMobileOpen(false); }} />
          <SidebarItem icon={Briefcase} label="Missions" active={view === 'projects' || view === 'gallery'} onClick={() => { setView('projects'); setIsMobileOpen(false); }} />
          <SidebarItem icon={Users} label="Students" active={view === 'makers'} onClick={() => { setView('makers'); setIsMobileOpen(false); }} />
          <SidebarItem icon={Filter} label="Class Progress" active={view === 'grades'} onClick={() => { setView('grades'); setIsMobileOpen(false); }} />
          <SidebarItem icon={LibraryBig} label="Resources & tools" active={view === 'resources'} onClick={() => { setView('resources'); setIsMobileOpen(false); }} />
          <div className="sq-factory-nav-divider" />
          <button type="button" className="sq-factory-nav-group" aria-expanded={isSetupOpen} onClick={() => setIsSetupOpen(value => !value)}><span>Studio setup</span><ChevronDown size={17} aria-hidden="true" /></button>
          {isSetupOpen && <div className="sq-factory-nav-subgroup">
            <SidebarItem icon={GitMerge} label="Workflows" active={view === 'workflows'} onClick={() => { setView('workflows'); setIsMobileOpen(false); }} />
            <SidebarItem icon={Hexagon} label="Stations" active={view === 'stations'} onClick={() => { setView('stations'); setIsMobileOpen(false); }} />
            <SidebarItem icon={Award} label="Badges" active={view === 'badges'} onClick={() => { setView('badges'); setIsMobileOpen(false); }} />
            <SidebarItem icon={Trophy} label="Gamification" active={view === 'gamification'} onClick={() => { setView('gamification'); setIsMobileOpen(false); }} />
            <SidebarItem icon={Hammer} label="Toolbox" active={view === 'toolbox'} onClick={() => { setView('toolbox'); setIsMobileOpen(false); }} />
            <p className="sq-factory-setup-note"><MonitorPlay size={15} aria-hidden="true" /> Classroom PIN mode is being rebuilt. Learners should use Edufy accounts.</p>
          </div>}
          <div className="sq-factory-nav-divider" />
          <SidebarItem icon={Eye} label="Student View" active={view === 'preview'} onClick={() => { setView('preview'); setIsMobileOpen(false); }} />
          <button
            onClick={() => {
              window.open(config.erpUrl, '_blank', 'noopener,noreferrer');
            }}
            className="sq-factory-nav-item"
          >
            <Settings size={18} />
            System Admin
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={async () => {
              if (confirm("Sign out of Factory Command?")) {
                await signOut();
                window.location.reload();
              }
            }}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 transition-colors text-slate-400 hover:text-white group"
          >
            <LogOut size={20} className="group-hover:text-red-400 transition-colors" />
            <span className="font-bold">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        <header className="sq-factory-topbar sq-modern-topbar">
          <div className="sq-modern-brand"><button type="button" className="sq-modern-menu" onClick={() => setIsMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><span className="sq-modern-brand-symbol" aria-hidden="true"><Zap size={19} fill="currentColor" /></span><span>SparkQuest <b>Factory</b></span></div>
          <nav className="sq-modern-topnav" aria-label="Factory sections">
            <button type="button" aria-current={view === 'dashboard' ? 'page' : undefined} onClick={() => { setView('dashboard'); setFilterTemplateId(null); }}><Layout size={15} /> Overview</button>
            <button type="button" aria-current={view === 'projects' || view === 'gallery' ? 'page' : undefined} onClick={() => setView('projects')}>Missions</button>
            <button type="button" aria-current={view === 'reviews' ? 'page' : undefined} onClick={() => { setView('reviews'); setFilterTemplateId(null); }}>Review {pendingReviewCount > 0 && <span>{pendingReviewCount}</span>}</button>
            <button type="button" aria-current={view === 'makers' ? 'page' : undefined} onClick={() => setView('makers')}>Students</button>
            <button type="button" aria-current={view === 'grades' ? 'page' : undefined} onClick={() => setView('grades')}>Progress</button>
          </nav>
          <div className="sq-modern-header-actions">
            <div className="sq-modern-setup-wrap"><button type="button" className="sq-modern-setup-trigger" aria-expanded={isSetupOpen} onClick={() => setIsSetupOpen(value => !value)}>More <ChevronDown size={15} /></button>{isSetupOpen && <div className="sq-modern-setup-menu"><button type="button" onClick={() => { setView('makers'); setIsSetupOpen(false); }}>Students</button><button type="button" onClick={() => { setView('grades'); setIsSetupOpen(false); }}>Class progress</button><button type="button" onClick={() => { setView('resources'); setIsSetupOpen(false); }}>Resources & tools</button><button type="button" onClick={() => { setView('workflows'); setIsSetupOpen(false); }}>Workflows</button><button type="button" onClick={() => { setView('stations'); setIsSetupOpen(false); }}>Stations</button><button type="button" onClick={() => { setView('badges'); setIsSetupOpen(false); }}>Badges</button><button type="button" onClick={() => { setView('gamification'); setIsSetupOpen(false); }}>Gamification</button><button type="button" onClick={() => { setView('toolbox'); setIsSetupOpen(false); }}>Toolbox</button><button type="button" onClick={() => { setView('preview'); setIsSetupOpen(false); }}>Student view</button><button type="button" onClick={() => { window.open(config.erpUrl, '_blank', 'noopener,noreferrer'); setIsSetupOpen(false); }}>System Admin</button><button type="button" onClick={async () => { if (confirm('Sign out of SparkQuest Factory?')) { await signOut(); window.location.reload(); } }}>Log out</button></div>}</div>
            <ReviewSubmissionAlerts
              projects={studentProjects}
              students={students}
              loading={studentProjectsLoading}
              organizationId={userProfile?.organizationId}
              instructorId={user?.uid}
              onOpenReview={openReviewAlert}
            />
            <div className="sq-modern-profile"><span>{userProfile?.name || 'Instructor'}</span><div className="sq-modern-avatar">{userProfile?.name?.[0] || 'I'}</div></div>
          </div>
        </header>
        {(view === 'projects' || view === 'gallery') && <div className="sq-modern-subbar"><span>{viewLabels[view]}</span><div className="sq-factory-mode-switch" aria-label="Mission views"><button type="button" aria-current={view === 'projects' ? 'page' : undefined} onClick={() => setView('projects')}>Library</button><button type="button" aria-current={view === 'gallery' ? 'page' : undefined} onClick={() => setView('gallery')}>Templates</button></div>{view === 'projects' && <button type="button" className="sq-modern-subbar-action" onClick={() => setIsImportOpen(true)}><Upload size={15} /> Import CSV</button>}</div>}

        {/* Scrollable Content */}
        <main id="factory-main" className="sq-factory-main w-full flex-1 overflow-y-auto">
          {view === 'dashboard' && (
            <FactoryDashboard
              onReviewProject={(id, stepId) => { setReviewInitialTab('proof'); setReviewingStepId(stepId); setReviewingProjectId(id); }}
              onNavigate={setView}
              onCreateMission={() => handleCreateMission()}
              onEditMission={(id) => { const mission = projectTemplates.find(project => project.id === id); if (mission) { setEditingProject(mission); setIsProjectEditorOpen(true); } else setView('projects'); }}
              filterTemplateId={filterTemplateId}
              onClearFilter={() => setFilterTemplateId(null)}
            />
          )}
          {view === 'projects' && <ProjectManager onViewSubmissions={handleViewSubmissions} onPreviewProject={handlePreviewProject} onBrowseTemplates={() => setView('gallery')} />}
          {view === 'resources' && <ResourceLibrary embedded />}
          {view === 'gallery' && <MissionGallery onSelectTemplate={(t) => handleCreateMission()} />}
          {view === 'grades' && <GradeProjectFilter onCreateMission={handleCreateMission} />}
          {view === 'workflows' && <FactoryPage><WorkflowManager /></FactoryPage>}
          {view === 'stations' && <FactoryPage><StationManager /></FactoryPage>}
          {view === 'badges' && <FactoryPage><BadgeManager /></FactoryPage>}
          {view === 'gamification' && (
            <FactoryPage><GamificationManager /></FactoryPage>
          )}
          {view === 'reviews' && (
            <ReviewInbox
              onReviewProject={(id, stepId) => { setReviewingStepId(stepId); setReviewingProjectId(id); }}
            />
          )}
          {view === 'toolbox' && <FactoryPage><FactoryToolbox /></FactoryPage>}
          {view === 'makers' && <StudentManager onReviewProject={(id, tab = 'proof') => { setReviewInitialTab(tab); setReviewingProjectId(id); }} />}
          {view === 'preview' && (
            <div className="h-full bg-slate-50 relative">
              {filterTemplateId ? (
                <ProjectDetailsEnhanced
                  project={projectTemplates.find(p => p.id === filterTemplateId)!}
                  role="instructor"
                  onBack={() => {
                    setFilterTemplateId(null);
                    setView('projects');
                  }}
                  onEdit={() => {
                    setEditingProject(projectTemplates.find(p => p.id === filterTemplateId));
                    setIsProjectEditorOpen(true);
                  }}
                />
              ) : (
                <FactoryPage>
                  <FactoryPageHeader icon={Eye} eyebrow="Student view" title="Preview a mission before dispatch" description="Open a mission exactly as an instructor and verify its brief, workflow, and resources before assigning it." />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {projectTemplates.map(p => (
                      <button type="button" key={p.id} onClick={() => setFilterTemplateId(p.id)} className="group min-h-40 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                        <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><FolderKanban size={20} /></div>
                        <h4 className="text-lg font-black text-slate-950 group-hover:text-blue-700">{p.title}</h4>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{p.hook || p.description}</p>
                      </button>
                    ))}
                    {projectTemplates.length === 0 && <FactoryEmptyState icon={FolderKanban} title="No missions to preview" description="Create a mission first, then return here to verify the learner experience." />}
                  </div>
                </FactoryPage>
              )}
            </div>
          )}
        </main>
      </div>
      {/* Review Modal Overlay */}
      {
        reviewingProjectId && (
          <ReviewModal
            projectId={reviewingProjectId}
            initialStepId={reviewingStepId}
            initialTab={reviewInitialTab}
            onClose={() => { setReviewingProjectId(null); setReviewingStepId(undefined); setReviewInitialTab('proof'); }}
          />
        )
      }

      {/* Project Editor Overlay */}
      {
        isProjectEditorOpen && (
          <div className="fixed inset-0 z-50 bg-white">
            <ProjectEditor
              templateId={editingProject?.id}
              initialViewProject={editingProject}
              onClose={() => setIsProjectEditorOpen(false)}
            />
          </div>
        )
      }

      {/* Importer Modal */}
      {
        isImportOpen && (
          <ProjectImporter
            onClose={() => setIsImportOpen(false)}
            onSuccess={() => {
              alert("Projects imported successfully!");
            }}
          />
        )
      }
    </div >
  );
};
