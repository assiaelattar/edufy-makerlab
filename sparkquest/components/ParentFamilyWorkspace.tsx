import React from 'react';
import { useParentFamily, type FamilyChild } from '../hooks/useParentFamily';
import { ParentFamilyJourney } from './ParentFamilyJourney';

interface Props {
  parentUid: string;
  organizationId: string;
  parentName?: string;
  onSignOut: () => void;
  previewChildren?: FamilyChild[];
}

export const ParentFamilyWorkspace: React.FC<Props> = ({ parentUid, organizationId, parentName, onSignOut, previewChildren }) => {
  const family = useParentFamily(previewChildren ? undefined : parentUid, previewChildren ? undefined : organizationId);
  const { children, loading, error, refresh } = previewChildren
    ? { children: previewChildren, loading: false, error: null, refresh: () => undefined }
    : family;
  return <ParentFamilyJourney parentUid={parentUid} children={children} loading={loading} error={error} parentName={parentName} onRefresh={refresh} onSignOut={onSignOut} previewMode={Boolean(previewChildren)} />;
};
