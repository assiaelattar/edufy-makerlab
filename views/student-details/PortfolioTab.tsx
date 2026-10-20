import React from 'react';
import { ArrowUpRight, FolderKanban, ImageIcon, Sparkles, Zap } from 'lucide-react';
import { StudentProject } from '../../types';
import { EducationState } from '../../components/education-ui/EducationPrimitives';
import './education-student-learning-polish.css';

interface PortfolioTabProps {
  publishedProjects: StudentProject[];
  setSelectedProject: (project: StudentProject) => void;
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({ publishedProjects, setSelectedProject }) => (
  <section className="edu-student-surface edu-student-surface--portfolio edu-student-portfolio">
    <header className="edu-student-portfolio__intro">
      <div className="edu-student-portfolio__identity">
        <span className="edu-student-portfolio__icon"><FolderKanban size={23} aria-hidden="true" /></span>
        <div>
          <span className="edu-student-portfolio__eyebrow">Learning record</span>
          <h3>Published portfolio</h3>
          <p>Projects and skills ready to share</p>
        </div>
      </div>
      <span className="edu-student-portfolio__count">{publishedProjects.length} {publishedProjects.length === 1 ? 'project' : 'projects'}</span>
    </header>

    {publishedProjects.length === 0 ? (
      <div className="edu-student-portfolio__empty">
        <EducationState title="No published projects" description="Approved work will appear here with its media, description and acquired skills.">
          <Sparkles size={24} aria-hidden="true" />
        </EducationState>
      </div>
    ) : (
      <div className="edu-student-portfolio__grid" data-single={publishedProjects.length === 1}>
        {publishedProjects.map(project => {
          const projectMedia = project as StudentProject & { coverImage?: string; thumbnailUrl?: string };
          const cover = project.mediaUrls?.[0] || projectMedia.coverImage || projectMedia.thumbnailUrl;
          const skills = project.skillsAcquired || [];
          return (
            <button key={project.id} type="button" onClick={() => setSelectedProject(project)} className="edu-student-portfolio__card" aria-label={'Open ' + project.title + ' project'}>
              <span className="edu-student-portfolio__media">
                {cover ? <img src={cover} alt={project.title + ' cover'} loading="lazy" /> : <span className="edu-student-portfolio__placeholder"><ImageIcon size={32} aria-hidden="true" /><span>Project media not added</span></span>}
                {project.embedUrl && <span className="edu-student-portfolio__interactive"><Zap size={14} aria-hidden="true" /> Interactive</span>}
              </span>
              <span className="edu-student-portfolio__body">
                <span className="edu-student-portfolio__type">Published project</span>
                <strong title={project.title}>{project.title}</strong>
                <span className="edu-student-portfolio__description">{project.description || 'No project description added.'}</span>
                <span className="edu-student-portfolio__skills">
                  {skills.slice(0, 4).map(skill => <span key={skill}>{skill}</span>)}
                  {skills.length === 0 && <span data-muted="true">No skills tagged</span>}
                  {skills.length > 4 && <span data-muted="true">+{skills.length - 4} more</span>}
                </span>
                <span className="edu-student-portfolio__open">View project <ArrowUpRight size={17} aria-hidden="true" /></span>
              </span>
            </button>
          );
        })}
      </div>
    )}
  </section>
);
