import React from 'react';
import { Peer } from '../types';

interface PeerAvatarProps {
  peer: Peer;
  className?: string;
}

export const PeerAvatar: React.FC<PeerAvatarProps> = ({ peer, className = '' }) => {
  return (
    <div 
      className={`group relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-sm cursor-help ${peer.avatarColor} ${className}`}
      title={peer.name}
    >
      <span className="text-xs font-bold text-white">{peer.name.charAt(0)}</span>
      
      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center whitespace-nowrap z-20">
        <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg">
          {peer.name} is here!
        </div>
        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-800"></div>
      </div>
    </div>
  );
};
