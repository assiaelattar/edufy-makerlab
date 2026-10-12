import React, { useEffect } from 'react';
import { ParentFamilyLoading } from './ParentFamilyLoading';

interface LoadingScreenProps {
  mode?: 'boot' | 'standard' | 'inline';
  message?: string;
  onComplete?: () => void;
}

/** Preserve the boot completion contract while using one SparkQuest loading scene. */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ mode = 'standard', onComplete }) => {
  useEffect(() => {
    if (mode !== 'boot' || !onComplete) return;
    const timer = window.setTimeout(onComplete, 2500);
    return () => window.clearTimeout(timer);
  }, [mode, onComplete]);

  return <ParentFamilyLoading audience="studio" />;
};
