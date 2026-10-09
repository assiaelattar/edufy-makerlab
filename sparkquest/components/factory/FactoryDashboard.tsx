import React from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { FactoryDashboardModern } from './FactoryDashboardModern';

export interface FactoryDashboardProps {
  onReviewProject: (projectId: string, stepId?: string) => void;
  onNavigate: (view: 'projects' | 'reviews' | 'makers' | 'grades' | 'resources') => void;
  onCreateMission: () => void;
  onEditMission: (missionId: string) => void;
  filterTemplateId?: string | null;
  onClearFilter?: () => void;
  initialFilter?: 'active' | 'review' | 'published' | null;
}

export const FactoryDashboard: React.FC<FactoryDashboardProps> = props => {
  const factory = useFactoryData();
  return <FactoryDashboardModern {...props} factory={factory} />;
};

export const FactoryDashboardContent = FactoryDashboardModern;
