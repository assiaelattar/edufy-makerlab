import React from 'react';
import { FolderKanban, ImageIcon, Sparkles, Zap } from 'lucide-react';
import { StudentProject } from '../../types';
import { AtlasEmptyState, AtlasSectionHeader } from '../../components/atlas/AtlasSurface';

interface PortfolioTabProps {
  publishedProjects: StudentProject[];
  setSelectedProject: (project: StudentProject) => void;
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({ publishedProjects, setSelectedProject }) => (
  <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/55">
    <div className="p-4">
      <AtlasSectionHeader
        title="Published portfolio"
        description="Projects, evidence, and skills ready to share"
        icon={FolderKanban}
        meta={<span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-slate-400">{publishedProjects.length}</span>}
      />
    </div>

    {publishedProjects.length === 0 ? (
      <div className="p-4 pt-0">
        <AtlasEmptyState icon={Sparkles} title="No published projects" description="Approved projects will collect here as the student's shareable body of work." />
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-px border-t border-white/10 bg-white/5 sm:grid-cols-2">
        {publishedProjects.map(project => {
          const projectMedia = project as StudentProject & { coverImage?: string; thumbnailUrl?: string };
          const cover = project.mediaUrls?.[0] || projectMedia.coverImage || projectMedia.thumbnailUrl;
          const skills = project.skillsAcquired || [];
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelectedProject(project)}
              className="group min-w-0 bg-slate-950/80 text-left transition-colors hover:bg-slate-900 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400/60"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-900">
                {cover ? (
                  <img src={cover} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none" alt={`${project.title} cover`} loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-700"><ImageIcon size={28} /></div>
                )}
                {project.embedUrl && <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-500 text-slate-950" title="Interactive project"><Zap size={13} /></span>}
              </div>
              <div className="p-4">
                <h4 className="truncate text-sm font-black text-white transition-colors group-hover:text-teal-300" title={project.title}>{project.title}</h4>
                <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{project.description || 'No project description added.'}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {skills.slice(0, 4).map(skill => <span key={skill} className="rounded-full border border-teal-400/15 bg-teal-400/10 px-2 py-0.5 text-[10px] font-bold text-teal-200">{skill}</span>)}
                  {skills.length === 0 && <span className="text-[10px] text-slate-600">No skills tagged</span>}
                  {skills.length > 4 && <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-slate-500">+{skills.length - 4}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    )}
  </section>
);
