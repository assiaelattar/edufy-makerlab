
import React, { useState } from 'react';
import { useFactoryData } from '../hooks/useFactoryData';
import { WorkflowManager } from './factory/WorkflowManager';
import { BadgeManager } from './factory/BadgeManager';
import { StationManager } from './factory/StationManager';
import { ProjectManager } from './factory/ProjectManager';
import { FactoryDashboard } from './factory/FactoryDashboard';
import { FactoryToolbox } from './factory/FactoryToolbox';
import { Layout, Briefcase, GitMerge, Hexagon, Award, LogOut, Menu, X, User, Bell, Trash2, Users, Hammer } from 'lucide-react';

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
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${active
      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
      : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
  >
    <Icon size={18} />
    {label}
  </button>
);

import { ReviewModal } from './factory/ReviewModal';

import { StudentManager } from './factory/StudentManager';

export const InstructorFactory: React.FC = () => {
  const { userProfile, signOut } = useAuth();
  const [view, setView] = useState<'dashboard' | 'projects' | 'workflows' | 'stations' | 'badges' | 'makers' | 'toolbox'>('dashboard');
  const [reviewingProjectId, setReviewingProjectId] = useState<string | null>(null);
  const [filterTemplateId, setFilterTemplateId] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // If Review Modal is open
  if (reviewingProjectId) {
    return <ReviewModal projectId={reviewingProjectId} onClose={() => setReviewingProjectId(null)} />;
  }

  const handleViewSubmissions = (templateId: string) => {
    setFilterTemplateId(templateId);
    setView('dashboard');
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Fixed on Mobile, Static/Fixed on Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:relative
      `}>
        <div className="p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              SparkFactory
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">Instructor Command</p>
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarItem icon={Layout} label="Dashboard" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setFilterTemplateId(null); setIsMobileOpen(false); }} />

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Missions</p>
          </div>
          <SidebarItem icon={Briefcase} label="All Missions" active={view === 'projects'} onClick={() => { setView('projects'); setIsMobileOpen(false); }} />
          <SidebarItem icon={GitMerge} label="Workflows" active={view === 'workflows'} onClick={() => { setView('workflows'); setIsMobileOpen(false); }} />

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Studio Command</p>
          </div>
          <SidebarItem icon={Hexagon} label="Stations" active={view === 'stations'} onClick={() => { setView('stations'); setIsMobileOpen(false); }} />
          <SidebarItem icon={Award} label="Badges" active={view === 'badges'} onClick={() => { setView('badges'); setIsMobileOpen(false); }} />
          <SidebarItem icon={Hammer} label="Toolbox" active={view === 'toolbox'} onClick={() => { setView('toolbox'); setIsMobileOpen(false); }} />

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Community</p>
          </div>
          <SidebarItem icon={Users} label="Students" active={view === 'makers'} onClick={() => { setView('makers'); setIsMobileOpen(false); }} />

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">System</p>
          </div>
          <button
            onClick={() => {
              if ((window as any).wipeAllData) {
                (window as any).wipeAllData();
              } else {
                alert("Cleanup script not loaded. Please refresh.");
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all text-rose-400 hover:text-white hover:bg-rose-900/30"
          >
            <Trash2 size={18} />
            Reset Data
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          {/* Legacy Exit Button can go here or be removed if creating a header dropdown */}
          {/* Keeping it for quick exit */}
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
        <header className="h-20 bg-white border-b border-indigo-50 flex items-center justify-between px-8 text-black shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Menu size={24} />
            </button>
            <div className="hidden md:block">
              <h2 className="text-xl font-bold text-slate-800 capitalize">{view.replace('-', ' ')}</h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>

            <div className="h-8 w-[1px] bg-slate-200"></div>

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-800">{userProfile?.name || 'Instructor'}</p>
                <p className="text-xs text-slate-500 font-medium">Command Access</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                {userProfile?.name?.[0] || 'I'}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto w-full bg-slate-50 p-6 md:p-10">
          {view === 'dashboard' && (
            <FactoryDashboard
              onReviewProject={(id) => setReviewingProjectId(id)}
              onNavigate={(v: any) => setView(v)}
              filterTemplateId={filterTemplateId}
              onClearFilter={() => setFilterTemplateId(null)}
            />
          )}
          {view === 'projects' && <ProjectManager onViewSubmissions={handleViewSubmissions} />}
          {view === 'workflows' && <WorkflowManager />}
          {view === 'stations' && <StationManager />}
          {view === 'badges' && <BadgeManager />}
          {view === 'toolbox' && <FactoryToolbox />}
          {view === 'makers' && <StudentManager onReviewProject={(id) => setReviewingProjectId(id)} />}
        </main>
      </div>
    </div>
  );
};
