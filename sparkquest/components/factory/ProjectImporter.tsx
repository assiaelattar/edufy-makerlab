import React, { useMemo } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { MissionImportWizard } from './MissionImportWizard';
import type { ImportCatalog } from '../../domain/missionImport';

interface ProjectImporterProps { onClose: () => void; onSuccess: () => void }

export const ProjectImporter: React.FC<ProjectImporterProps> = ({ onClose, onSuccess }) => {
  const { stations, processTemplates, programs, students, actions } = useFactoryData();
  const { user, userProfile } = useAuth();
  const organizationId = userProfile?.organizationId;
  const catalog = useMemo<ImportCatalog>(() => ({
    stations: stations.filter(s => !s.organizationId || s.organizationId === organizationId).map(s => ({ id: s.id, label: s.label })),
    workflows: processTemplates.filter(w => (!w.organizationId || w.organizationId === organizationId) && w.status !== 'archived'),
    programs: programs.filter(p => p.organizationId === organizationId).map(p => ({ id: p.id, label: p.name || p.title || p.id })),
    grades: programs.filter(p => p.organizationId === organizationId).flatMap(p => (p.grades || []).map(g => ({ id: g.id, label: g.name || g.id, programId: p.id }))),
    groups: programs.filter(p => p.organizationId === organizationId).flatMap(p => (p.grades || []).flatMap(g => (g.groups || []).filter(group => group.name).map(group => ({ id: group.name, label: group.name, programId: p.id, gradeId: g.id })))),
    students: students.filter(s => s.organizationId === organizationId && s._source !== 'user_auth').map(s => ({ id: s.id, label: s.name || s.firstName || s.id, aliases: s.loginInfo?.uid ? [s.loginInfo.uid] : [] })),
  }), [stations, processTemplates, programs, students, organizationId]);
  return <MissionImportWizard catalog={catalog} onClose={onClose} onSuccess={onSuccess}
    sessionKey={`${organizationId || ''}/${user?.uid || ''}`}
    canWrite={Boolean(user?.uid && organizationId && ['admin', 'instructor'].includes(userProfile?.role || ''))}
    saveMission={actions.importMission} assignMission={actions.assignImportedMission}
    uploadFile={async (file, scope, progress) => {
      if (!organizationId || !user?.uid) throw new Error('Refresh your instructor session before uploading.');
      return api.uploadFile(file, `instructor-projects/${organizationId}/${user.uid}/${scope}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`, progress);
    }} />;
};
