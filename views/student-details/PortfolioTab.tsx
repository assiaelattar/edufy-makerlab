import React from 'react';
import { FolderKanban, ImageIcon, Sparkles, Zap } from 'lucide-react';
import { StudentProject } from '../../types';
import { AtlasEmptyState, AtlasSectionHeader } from '../../components/atlas/AtlasSurface';

interface PortfolioTabProps {
  publishedProjects: StudentProject[];
  setSelectedProject: (project: StudentProject) => void;
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({ publishedProjects, setSelectedProject }) => (
  <section className="edu-student-surface edu-student-surface--portfolio overflow-hidden rounded-lg border border-white/10 bg-slate-900/55">
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
      <div className="edu-student-project-grid border-t sm:grid-cols-2">
        {publishedProjects.map(project => {
          const projectMedia = project as StudentProject & { coverImage?: string; thumbnailUrl?: string };
          const cover = project.mediaUrls?.[0] || projectMedia.coverImage || projectMedia.thumbnailUrl;
          const skills = project.skillsAcquired || [];
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelectedProject(project)}
              className="edu-student-project-card group min-w-0 text-left"
            >
              <div className="edu-student-project-card__media relative overflow-hidden">
                {cover ? (
                  <img src={cover} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none" alt={`${project.title} cover`} loading="lazy" />
                ) : (
                  <div className="edu-student-project-card__placeholder"><ImageIcon size={28} /><span>Project media not added</span></div>
                )}
                {project.embedUrl && <span className="edu-student-project-card__interactive absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg" title="Interactive project"><Zap size={13} /></span>}
              </div>
              <div className="edu-student-project-card__body p-4">
                <h4 className="truncate text-sm font-black" title={project.title}>{project.title}</h4>
                <p className="mt-1 line-clamp-2 text-xs leading-5">{project.description || 'No project description added.'}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {skills.slice(0, 4).map(skill => <span key={skill} className="edu-student-project-card__skill">{skill}</span>)}
                  {skills.length === 0 && <span className="edu-student-project-card__muted">No skills tagged</span>}
                  {skills.length > 4 && <span className="edu-student-project-card__muted">+{skills.length - 4}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    )}
  </section>
);
