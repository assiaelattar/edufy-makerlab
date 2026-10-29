import React from 'react';

export const Logo = ({ className = "w-10 h-10", alt = "Edufy" }: { className?: string; alt?: string }) => (
  <img src="/icon.svg" alt={alt} className={`object-contain ${className}`} />
);
