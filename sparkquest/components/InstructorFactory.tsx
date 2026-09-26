
import React, { useState } from 'react';
import { useFactoryData } from '../hooks/useFactoryData';
import { WorkflowManager } from './factory/WorkflowManager';
import { BadgeManager } from './factory/BadgeManager';
import { StationManager } from './factory/StationManager';
import { ProjectManager } from './factory/ProjectManager';
import { FactoryDashboard } from './factory/FactoryDashboard';
import { FactoryToolbox } from './factory/FactoryToolbox';
import { GradeProjectFilter } from './factory/GradeProjectFilter';
import { ProjectSelector } from './ProjectSelector';
import { MissionGallery } from './factory/MissionGallery';
import { GamificationManager } from './admin/GamificationManager';
import { Layout, Briefcase, GitMerge, Hexagon, Award, LogOut, Menu, X, Users, Hammer, Filter, Eye, Settings, BookOpen, Trophy, MonitorPlay, Upload, FolderKanban } from 'lucide-react';
import { config } from '../utils/config';

import { useAuth } from '../context/AuthContext'; // Import useAuth for user profile

interface SidebarItemProps {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`group relative flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${active
      ? 'bg-white text-slate-950 shadow-sm'
      : 'text-slate-400 hover:bg-white/8 hover:text-white'
      }`}
  >
    <Icon size={18} className={`relative z-10 ${active ? 'text-blue-700' : ''}`} />
    <span className="relative z-10">{label}</span>
    {active && <div className="absolute right-3 z-10 h-1.5 w-1.5 rounded-full bg-blue-600"></div>}
  </button>
);

import { ReviewModal } from './factory/ReviewModal';

import { StudentManager } from './factory/StudentManager';
import { ProjectEditor } from './factory/ProjectEditor';
import { ProjectImporter } from './factory/ProjectImporter';
import { ProjectDetailsEnhanced } from './ProjectDetailsEnhanced';
import { FactoryEmptyState, FactoryPage, FactoryPageHeader, factoryButton } from './factory/FactoryPage';

export const InstructorFactory: React.FC = () => {
  // Destructure projectTemplates here
  const { projectTemplates, processTemplates } = useFactoryData();
  const { userProfile, signOut } = useAuth();
  const [view, setView] = useState<'dashboard' | 'projects' | 'gallery' | 'grades' | 'workflows' | 'stations' | 'badges' | 'makers' | 'toolbox' | 'preview' | 'gamification'>('dashboard');
  const [reviewingProjectId, setReviewingProjectId] = useState<string | null>(null);
  const [filterTemplateId, setFilterTemplateId] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const viewLabels: Record<typeof view, string> = {
    dashboard: 'Overview',
    projects: 'Mission library',
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
    <div className="sparkfactory-shell flex h-screen bg-[#f4f7fb] font-sans text-slate-950">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      {/* Sidebar - Fixed on Mobile, Static/Fixed on Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[252px] bg-[#0b172a] text-white flex flex-col shrink-0 shadow-2xl transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:relative
      `}>
        <div className="flex items-center justify-between px-5 pb-5 pt-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              SparkFactory
            </h1>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-300">Instructor studio</p>
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white md:hidden" aria-label="Close navigation">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarItem icon={Layout} label="Overview" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setFilterTemplateId(null); setIsMobileOpen(false); }} />

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Operate</p>
          </div>
          <SidebarItem icon={Briefcase} label="Missions" active={view === 'projects'} onClick={() => { setView('projects'); setIsMobileOpen(false); }} />
          <SidebarItem icon={Users} label="Students" active={view === 'makers'} onClick={() => { setView('makers'); setIsMobileOpen(false); }} />
          <SidebarItem icon={Filter} label="Class Progress" active={view === 'grades'} onClick={() => { setView('grades'); setIsMobileOpen(false); }} />

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Build</p>
          </div>
          <SidebarItem icon={BookOpen} label="Templates" active={view === 'gallery'} onClick={() => { setView('gallery'); setIsMobileOpen(false); }} />
          <SidebarItem icon={GitMerge} label="Workflows" active={view === 'workflows'} onClick={() => { setView('workflows'); setIsMobileOpen(false); }} />

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Configure</p>
          </div>
          <SidebarItem icon={Hexagon} label="Stations" active={view === 'stations'} onClick={() => { setView('stations'); setIsMobileOpen(false); }} />
          <SidebarItem icon={Award} label="Badges" active={view === 'badges'} onClick={() => { setView('badges'); setIsMobileOpen(false); }} />
          <SidebarItem icon={Trophy} label="Gamification" active={view === 'gamification'} onClick={() => { setView('gamification'); setIsMobileOpen(false); }} />
          <SidebarItem icon={Hammer} label="Toolbox" active={view === 'toolbox'} onClick={() => { setView('toolbox'); setIsMobileOpen(false); }} />

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Classroom Access</p>
          </div>
          <div className="mx-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200">
            <div className="mb-1 flex items-center gap-2 font-black"><MonitorPlay size={16} /> Classroom PIN mode</div>
            Secure kiosk sign-in is being rebuilt. Students should use their Edufy learner accounts for now.
          </div>

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Preview</p>
          </div>
          <SidebarItem icon={Eye} label="Student View" active={view === 'preview'} onClick={() => { setView('preview'); setIsMobileOpen(false); }} />

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">System</p>
          </div>
          <button
            onClick={() => {
              window.open(config.erpUrl, '_blank', 'noopener,noreferrer');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all text-slate-400 hover:text-white hover:bg-slate-800"
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

        {/* Top Header */}
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 text-black sm:px-7">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileOpen(true)} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Open navigation">
              <Menu size={24} />
            </button>
            <div className="hidden md:block">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Instructor studio</p>
              <h2 className="text-lg font-black text-slate-950">{viewLabels[view]}</h2>
            </div>
            {view === 'projects' && (
              <button
                onClick={() => setIsImportOpen(true)}
                className={`${factoryButton.secondary} ml-2`}
              >
                <Upload size={16} /> Import CSV
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-800">{userProfile?.name || 'Instructor'}</p>
                <p className="text-xs text-slate-500 font-medium">Command Access</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm">
                {userProfile?.name?.[0] || 'I'}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="w-full flex-1 overflow-y-auto bg-[#f4f7fb]">
          {view === 'dashboard' && (
            <FactoryDashboard
              onReviewProject={(id) => setReviewingProjectId(id)}
              onNavigate={(v: any) => setView(v)}
              filterTemplateId={filterTemplateId}
              onClearFilter={() => setFilterTemplateId(null)}
            />
          )}
          {view === 'projects' && <ProjectManager onViewSubmissions={handleViewSubmissions} onPreviewProject={handlePreviewProject} />}
          {view === 'gallery' && <MissionGallery onSelectTemplate={(t) => handleCreateMission()} />}
          {view === 'grades' && <GradeProjectFilter onCreateMission={handleCreateMission} />}
          {view === 'workflows' && <FactoryPage><WorkflowManager /></FactoryPage>}
          {view === 'stations' && <FactoryPage><StationManager /></FactoryPage>}
          {view === 'badges' && <FactoryPage><BadgeManager /></FactoryPage>}
          {view === 'gamification' && (
            <FactoryPage><GamificationManager /></FactoryPage>
          )}
          {view === 'toolbox' && <FactoryPage><FactoryToolbox /></FactoryPage>}
          {view === 'makers' && <StudentManager onReviewProject={(id) => setReviewingProjectId(id)} />}
          {view === 'preview' && (
            <div className="h-full bg-slate-50 relative">
              {filterTemplateId ? (
                <ProjectDetailsEnhanced
                  project={projectTemplates.find(p => p.id === filterTemplateId)!}
                  workflow={processTemplates.find(workflow => workflow.id === projectTemplates.find(project => project.id === filterTemplateId)?.defaultWorkflowId)}
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
            onClose={() => setReviewingProjectId(null)}
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
