import React, { useRef, useEffect } from 'react';
import { RoadmapStep, Peer, User } from '../types';
import { StageNode } from './StageNode';

interface RoadmapProps {
  steps: RoadmapStep[];
  peers: Peer[];
  user: User;
  onStepClick: (step: RoadmapStep) => void;
}

export const Roadmap: React.FC<RoadmapProps> = ({ steps, peers, user, onStepClick }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active step on load
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Find index of active step
      const activeIndex = steps.findIndex(s => s.id === user.currentStepId);
      if (activeIndex !== -1) {
        // Simple calculation: roughly 300px per item
        // Center the active item: (Item position) - (Screen Width / 2) + (Item Width / 2)
        const itemWidth = 300; 
        const scrollPos = (activeIndex * itemWidth) + 100 - (window.innerWidth / 2) + (itemWidth / 2);
        
        scrollContainerRef.current.scrollTo({
          left: Math.max(0, scrollPos),
          behavior: 'smooth'
        });
      }
    }
  }, [user.currentStepId, steps]);

  return (
    <div className="flex-1 bg-white relative overflow-hidden flex flex-col justify-center">
      
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%">
             <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
               <path d="M 60 0 L 0 0 0 60" fill="none" stroke="black" strokeWidth="2"/>
             </pattern>
             <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Cloud Decoration Top */}
      <div className="absolute top-10 left-10 text-sky-100 animate-float opacity-80 pointer-events-none">
           <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
      </div>
      <div className="absolute bottom-10 right-10 text-sky-100 animate-float opacity-80 pointer-events-none" style={{animationDelay: '1.5s'}}>
           <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
      </div>

      {/* Horizontal Scroll Container */}
      <div 
        ref={scrollContainerRef}
        className="relative z-10 w-full overflow-x-auto overflow-y-hidden no-scrollbar h-[600px] flex items-center"
      >
        <div className="flex items-center px-[50vw] space-x-24 h-full relative">
            
            {/* The Path Line Behind Buttons */}
            <div className="absolute left-0 right-0 top-1/2 h-4 bg-slate-200 -translate-y-[20px] -z-10 w-full min-w-full"></div>
            
            {steps.map((step, index) => {
              // Creating a slight up/down zig zag even in horizontal layout for fun
              // Even: Center, Odd: slightly lower or higher? 
              // Let's keep it straight-ish but let the node itself handle the visuals.
              // Actually, varying marginTop helps the organic feel.
              
              const offsetClass = index % 2 === 0 ? 'mt-0' : 'mt-16';

              return (
                <div key={step.id} className={`transform ${offsetClass} transition-transform hover:scale-105 duration-300`}>
                   <StageNode 
                     step={step} 
                     peers={peers.filter(p => p.currentStepId === step.id)}
                     isCurrentUserHere={user.currentStepId === step.id}
                     onClick={onStepClick}
                   />
                </div>
              );
            })}
            
            {/* Finish Flag */}
            <div className="flex flex-col items-center justify-center opacity-50 ml-12">
                <div className="text-8xl">🏁</div>
                <div className="font-black text-slate-300 uppercase mt-4">Goal</div>
            </div>
        </div>
      </div>

    </div>
  );
};
