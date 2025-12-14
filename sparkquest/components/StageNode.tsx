import React from 'react';
import { RoadmapStep, StepStatus, Peer } from '../types';
import { PeerAvatar } from './PeerAvatar';

interface StageNodeProps {
  step: RoadmapStep;
  peers: Peer[];
  onClick: (step: RoadmapStep) => void;
  isCurrentUserHere: boolean;
}

export const StageNode: React.FC<StageNodeProps> = ({ step, peers, onClick, isCurrentUserHere }) => {
  const isLocked = step.status === StepStatus.LOCKED;
  const isCompleted = step.status === StepStatus.COMPLETED;
  const isActive = step.status === StepStatus.ACTIVE;

  // Visual Configuration based on state
  let mainColor = "bg-gray-200";
  let borderColor = "border-gray-300";
  let iconColor = "text-gray-400";
  let titleColor = "text-gray-400";
  let titleBg = "bg-transparent";
  
  if (isActive) {
    mainColor = "bg-green-500";
    borderColor = "border-green-700";
    iconColor = "text-white";
    titleColor = "text-white";
    titleBg = "bg-green-600";
  } else if (isCompleted) {
    mainColor = "bg-yellow-400";
    borderColor = "border-yellow-600";
    iconColor = "text-yellow-700";
    titleColor = "text-yellow-600";
    titleBg = "bg-transparent";
  }

  // 3 Stars Calculation (Mock visual for now)
  const stars = isCompleted ? 3 : isActive ? 1 : 0;

  return (
    <div className="relative flex flex-col items-center justify-center w-48 z-10 flex-shrink-0"> 
      
      {/* "START" Floating Label for Active Step */}
      {isActive && (
        <div className="absolute -top-16 animate-bounce z-20 pointer-events-none">
          <div className="bg-white text-green-600 font-black px-6 py-2 rounded-2xl shadow-lg border-4 border-green-200 text-lg uppercase tracking-wider transform rotate-3">
            Start Here!
          </div>
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-green-200 mx-auto mt-[-4px]"></div>
        </div>
      )}

      {/* The 3D Button Node - BIGGER NOW */}
      <button
        onClick={() => !isLocked && onClick(step)}
        disabled={isLocked}
        className={`
          relative w-32 h-32 rounded-[2.5rem] flex items-center justify-center 
          border-b-[8px] transition-all duration-150 ease-in-out
          ${mainColor} ${borderColor} 
          ${isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:brightness-110 active:border-b-0 active:translate-y-[8px] btn-3d'}
        `}
      >
        {/* Step Icon / Content */}
        {isCompleted ? (
          <svg className="w-16 h-16 text-yellow-700 opacity-80" fill="currentColor" viewBox="0 0 24 24">
             <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        ) : isLocked ? (
          <svg className={`w-12 h-12 ${iconColor}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 10V8A6 6 0 006 8v2a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2zm-6 9a2 2 0 11-2-2 2 2 0 012 2zm3.1-9H8.9V8c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
        ) : (
          <svg className={`w-16 h-16 ${iconColor}`} fill="currentColor" viewBox="0 0 24 24">
             <path d="M8 5v14l11-7z"/> 
          </svg>
        )}

        {/* Shine effect overlay */}
        <div className="absolute top-3 left-4 w-6 h-3 bg-white opacity-20 rounded-full rotate-45 pointer-events-none"></div>

        {/* Peers Avatars - Floating around */}
        {peers.length > 0 && (
          <div className="absolute -top-4 -right-4 flex -space-x-4 pointer-events-none scale-125">
            {peers.map(peer => (
              <PeerAvatar key={peer.id} peer={peer} className="ring-4 ring-white" />
            ))}
          </div>
        )}
      </button>

      {/* Stars Rating Display */}
      {!isLocked && (
        <div className="flex gap-2 mt-4">
           {[1, 2, 3].map(i => (
             <svg 
              key={i} 
              className={`w-6 h-6 ${i <= stars ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-200'}`} 
              fill="currentColor" 
              viewBox="0 0 24 24"
             >
               <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
             </svg>
           ))}
        </div>
      )}

      {/* Enhanced Title - More important now */}
      <div className={`mt-4 px-4 py-2 rounded-xl ${titleBg} transition-colors duration-300`}>
        <div className={`text-center font-black text-xl uppercase tracking-wider leading-none ${titleColor}`}>
            {step.title}
        </div>
      </div>
      
    </div>
  );
};
