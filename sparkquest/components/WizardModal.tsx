import React from 'react';
import { SparkbookDialog } from './SparkbookDialog';

interface WizardModalProps {
  title: string;
  subtitle?: string;
  icon?: string;
  color?: 'blue' | 'green' | 'pink' | 'orange' | 'indigo';
  onClose: () => void;
  children: React.ReactNode;
}

export const WizardModal: React.FC<WizardModalProps> = ({ title, subtitle, icon, color = 'blue', onClose, children }) => {
  const tone = color === 'orange' ? 'orange' : color === 'pink' ? 'rose' : color === 'green' ? 'lime' : 'blue';
  return <SparkbookDialog eyebrow="Studio worksheet" title={title} description={subtitle} icon={icon} tone={tone} size="lg" onClose={onClose} bodyClassName="sq-wizard-content">{children}</SparkbookDialog>;
};
