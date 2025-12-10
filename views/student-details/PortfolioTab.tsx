
import React from 'react';
import { BookOpen, ImageIcon, Zap } from 'lucide-react';
import { StudentProject } from '../../types';

interface PortfolioTabProps {
  publishedProjects: StudentProject[];
  setSelectedProject: (project: StudentProject) => void;
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({ publishedProjects, setSelectedProject }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-950/30">
        <h3 className="font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" /> Student Portfolio
        </h3>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        {publishedProjects.length === 0 ? (
          <div className="col-span-2 text-center text-slate-500 text-sm italic py-4">
            No published projects yet.
          </div>
        ) : (
          publishedProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProject(p)}
              className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden group cursor-pointer hover:border-indigo-500/50 transition-colors"
            >
              <div className="h-32 bg-slate-800 relative overflow-hidden">
                {p.mediaUrls?.[0] ? (
                  <img src={p.mediaUrls[0]} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600">
                    <ImageIcon size={24} />
                  </div>
                )}
                {p.embedUrl && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-md shadow-md">
                    <Zap size={10} />
                  </div>
                )}
              </div>
              <div className="p-3">
                <h4 className="font-bold text-white text-sm truncate group-hover:text-indigo-400">{p.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.skillsAcquired.map((s, i) => (
                    <span
                      key={i}
                      className="text-[9px] bg-cyan-900/30 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-900/50"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
