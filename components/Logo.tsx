import React from 'react';

export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <img src="./icon.svg" alt="App Logo" className={`object-contain ${className}`} />
);