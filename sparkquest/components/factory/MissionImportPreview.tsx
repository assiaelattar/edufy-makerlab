import React, { useRef } from 'react';
import { MissionImportWizard } from './MissionImportWizard';
import { importDocumentId, type ImportCatalog } from '../../domain/missionImport';

const catalog: ImportCatalog = {
  stations: [{ id: 'Circuits', label: 'Circuits' }, { id: 'Coding', label: 'Coding' }], workflows: [],
  programs: [{ id: 'preview-stem', label: 'STEMQuest' }],
  grades: [{ id: 'preview-grade', label: 'Grade 5', programId: 'preview-stem' }],
  groups: [{ id: 'Wednesday', label: 'Wednesday', gradeId: 'preview-grade', programId: 'preview-stem' }],
  students: [{ id: 'preview-learner', label: 'Sample learner' }],
};

/** Local development fixture: no auth, network calls, or application writes. */
export default function MissionImportPreview() {
  const saved = useRef(new Set<string>());
  return <MissionImportWizard catalog={catalog} canWrite sessionKey="preview" onSuccess={() => {}} onClose={() => { window.location.href = window.location.pathname; }}
    saveMission={async draft => {
      const id = await importDocumentId('preview', draft.importKey);
      const state = saved.current.has(id) ? 'exists' : 'created'; saved.current.add(id);
      return { id, state, message: state === 'created' ? 'Preview draft created locally. No application data written.' : 'Already imported in this preview.' };
    }} assignMission={async () => {}}
    uploadFile={async (file, _scope, progress) => { progress(100); return `${window.location.origin}/mission-plant-guardian.svg#${encodeURIComponent(file.name)}`; }} />;
}
