import React from 'react';

export interface WizardNodeProps {
  id: string;
  type: 'IDENTITY' | 'STRATEGY' | 'BLUEPRINT' | 'TASK' | 'PUBLISH';
  title: string;
  status: 'LOCKED' | 'ACTIVE' | 'COMPLETED' | 'REVIEW';
  icon?: string;
  onClick: () => void;
  onHover?: () => void;
  isFirst?: boolean;
}

export const WizardNode: React.FC<WizardNodeProps> = ({ id, type, title, status, icon, onClick, onHover, isFirst }) => {
  const isLocked = status === 'LOCKED';
  const isActive = status === 'ACTIVE';
  const isReview = status === 'REVIEW';
  const isCompleted = status === 'COMPLETED';

  // Visual Configuration
  // Default (Locked/Future)
  let mainColor = "bg-slate-800";
  let borderColor = "border-slate-900";
  let iconColor = "text-slate-600";
  let titleColor = "text-slate-500";
  let titleBg = "bg-slate-800/50";

  if (isActive) {
    mainColor = "bg-blue-500";
    borderColor = "border-blue-700";
    iconColor = "text-white";
    titleColor = "text-blue-200";
    titleBg = "bg-blue-900/50";

    if (type === 'TASK') {
      mainColor = "bg-indigo-500";
      borderColor = "border-indigo-700";
      titleColor = "text-indigo-200";
      titleBg = "bg-indigo-900/50";
    }
  } else if (isCompleted) {
    mainColor = "bg-emerald-500";
    borderColor = "border-emerald-700";
    iconColor = "text-white";
    titleColor = "text-emerald-400";
    titleBg = "bg-emerald-900/30";
  } else if (isReview) {
    mainColor = "bg-amber-500";
    borderColor = "border-amber-700";
    iconColor = "text-white";
    titleColor = "text-amber-400";
    titleBg = "bg-amber-900/30";
  }

  // Icons based on type if not provided
  const getIcon = () => {
    if (icon) return <span className="text-4xl filter drop-shadow-md">{icon}</span>;
    switch (type) {
      case 'IDENTITY': return <span className="text-4xl filter drop-shadow-md">✨</span>;
      case 'STRATEGY': return <span className="text-4xl filter drop-shadow-md">🧭</span>;
      case 'BLUEPRINT': return <span className="text-4xl filter drop-shadow-md">📝</span>;
      case 'TASK': return <span className="text-4xl filter drop-shadow-md">🔨</span>;
      case 'PUBLISH': return <span className="text-4xl filter drop-shadow-md">🚀</span>;
      default: return <span className="text-4xl filter drop-shadow-md">❓</span>;
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-48 z-10 flex-shrink-0 group">

      {/* "START" Floating Label for First Active Step */}
      {isActive && isFirst && (
        <div className="absolute -top-24 animate-bounce z-20 pointer-events-none">
          <div className="bg-blue-500 text-white font-black px-6 py-2 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)] border-4 border-blue-400 text-lg uppercase tracking-wider transform -rotate-3">
            Current Mission
          </div>
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-blue-400 mx-auto mt-[-4px]"></div>
        </div>
      )}

      {/* "REVIEW" Floating Label */}
      {isReview && (
        <div className="absolute -top-24 animate-pulse z-20 pointer-events-none">
          <div className="bg-amber-500 text-white font-black px-6 py-2 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)] border-4 border-amber-400 text-lg uppercase tracking-wider">
            In Review
          </div>
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-amber-400 mx-auto mt-[-4px]"></div>
        </div>
      )}

      {/* The 3D Button Node */}
      <button
        onClick={() => !isLocked && onClick()}
        onMouseEnter={() => !isLocked && onHover && onHover()}
        disabled={isLocked}
        className={`
          relative w-32 h-32 rounded-[2.5rem] flex items-center justify-center 
          border-b-[8px] transition-all duration-200 ease-out
          ${mainColor} ${borderColor} shadow-2xl
          ${isLocked ? 'cursor-not-allowed opacity-50 grayscale' : 'cursor-pointer hover:scale-110 hover:-translate-y-2 hover:brightness-110 active:border-b-0 active:translate-y-[8px] active:shadow-none'}
        `}
      >
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center opacity-30 text-emerald-900">
            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
          </div>
        )}

        <div className={`transform transition-transform duration-300 ${isLocked ? 'scale-90' : 'scale-100'}`}>
          {getIcon()}
        </div>

        {/* Shine effect */}
        <div className="absolute top-4 left-4 w-6 h-3 bg-white opacity-20 rounded-full rotate-45 pointer-events-none"></div>

        {/* Glow for active */}
        {isActive && (
          <div className="absolute inset-0 rounded-[2.5rem] shadow-[0_0_30px_rgba(59,130,246,0.6)] animate-pulse pointer-events-none"></div>
        )}
      </button>

      {/* Title */}
      <div className={`mt-6 px-4 py-2 rounded-xl ${titleBg} backdrop-blur-sm border border-white/5 transition-colors duration-300 max-w-[200px]`}>
        <div className={`text-center font-black text-lg uppercase tracking-wider leading-tight ${titleColor}`}>
          {title}
        </div>
      </div>

    </div>
  );
};
