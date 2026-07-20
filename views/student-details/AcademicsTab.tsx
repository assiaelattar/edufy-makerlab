
import React, { useState } from 'react';
import { BookOpen, Plus, Pencil, ArrowRightLeft, Trash2, Award } from 'lucide-react';
import { Enrollment } from '../../types';
import { formatCurrency } from '../../utils/helpers';


import { useAppContext } from '../../context/AppContext';
import { generateRegistrationCertificate, generateCompletionCertificate } from '../../utils/certificateGenerator';
import { Modal } from '../../components/Modal';
import { AtlasActionButton, AtlasEmptyState, AtlasSectionHeader } from '../../components/atlas/AtlasSurface';
import { useConfirm } from '../../context/ConfirmContext';

interface AcademicsTabProps {
  studentEnrollments: Enrollment[];
  onQuickEnroll: (id: string) => void;
  navigateTo: (view: string, params: any) => void;
  setEditEnrollment: (enrollment: Enrollment) => void;
  initiateDeleteEnrollment: (id: string) => void;
  studentId: string;
}

export const AcademicsTab: React.FC<AcademicsTabProps> = ({
  studentEnrollments,
  onQuickEnroll,
  navigateTo,
  setEditEnrollment,
  initiateDeleteEnrollment,
  studentId,
}) => {
  const { students, settings } = useAppContext();
  const { alert: showAlert } = useConfirm();
  const student = students.find(s => s.id === studentId); // Get student details

  // Attestation Modal State
  const [attestationModal, setAttestationModal] = useState<{ isOpen: boolean, enrollment: Enrollment | null }>({ isOpen: false, enrollment: null });
  const [customAdmissionDate, setCustomAdmissionDate] = useState('');
  const [customIssueDate, setCustomIssueDate] = useState(new Date().toISOString().split('T')[0]);

  // Completion Attestation State
  const [completionModal, setCompletionModal] = useState<{ isOpen: boolean, enrollment: Enrollment | null }>({ isOpen: false, enrollment: null });
  const [completionAcademyName, setCompletionAcademyName] = useState(settings.academyName || 'Edufy Academy');
  const [completionLogoUrl, setCompletionLogoUrl] = useState(settings.logoUrl || '');
  const [completionIssueDate, setCompletionIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [completionModules, setCompletionModules] = useState('');

  const handleOpenAttestationModal = (enrollment: Enrollment) => {
    // Default Admission Date to Enrollment Start Date
    const startDate = (enrollment.startDate as any)?.toDate ? (enrollment.startDate as any).toDate() : new Date(enrollment.startDate as any);
    const formattedStart = !isNaN(startDate.getTime()) ? startDate.toISOString().split('T')[0] : '';

    setCustomAdmissionDate(formattedStart);
    setCustomIssueDate(new Date().toISOString().split('T')[0]);
    setAttestationModal({ isOpen: true, enrollment });
  };

  const handleGenerateAttestation = async () => {
    if (!student || !attestationModal.enrollment) {
      await showAlert('Certificate is unavailable', 'The student or enrollment record is no longer available.', 'warning');
      return;
    }
    if (!customAdmissionDate || !customIssueDate) {
      await showAlert('Certificate dates required', 'Choose both the admission date and issue date.', 'warning');
      return;
    }
      generateRegistrationCertificate(student, attestationModal.enrollment, settings, {
        admissionDate: customAdmissionDate,
        issueDate: customIssueDate
      });
      setAttestationModal({ isOpen: false, enrollment: null });
  };

  const handleGenerateCompletion = async () => {
    if (!student || !completionModal.enrollment) {
      await showAlert('Certificate is unavailable', 'The student or enrollment record is no longer available.', 'warning');
      return;
    }
    if (!completionAcademyName.trim() || !completionIssueDate) {
      await showAlert('Certificate details required', 'Enter the academy name and issue date.', 'warning');
      return;
    }
      generateCompletionCertificate(student, completionModal.enrollment, settings, {
        academyName: completionAcademyName.trim(),
        logoUrl: completionLogoUrl.trim(),
        issueDate: completionIssueDate,
        modules: completionModules.split('\n').map(m => m.trim()).filter(m => m.length > 0)
      });
      setCompletionModal({ isOpen: false, enrollment: null });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/55">
      <div className="p-4">
        <AtlasSectionHeader
          title="Enrollments"
          description="Programs, schedules, tuition, and certificates"
          icon={BookOpen}
          meta={<span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-slate-400">{studentEnrollments.length}</span>}
          actions={<AtlasActionButton icon={Plus} variant="primary" onClick={() => onQuickEnroll(studentId)}>New enrollment</AtlasActionButton>}
        />
      </div>
      <div className="border-t border-white/10">
        {studentEnrollments.length === 0 ? (
          <div className="p-4">
            <AtlasEmptyState
              icon={BookOpen}
              title="No enrollments yet"
              description="Add the student's first program to connect schedules, attendance, and billing."
              action={<AtlasActionButton icon={Plus} variant="primary" onClick={() => onQuickEnroll(studentId)}>Enroll student</AtlasActionButton>}
            />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {studentEnrollments.map((e) => (
              <div key={e.id} className="group px-4 py-4 transition-colors hover:bg-white/[0.025]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-teal-300">
                      <BookOpen size={19} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-black text-white transition-colors group-hover:text-teal-300" title={e.programName}>{e.programName}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>{e.gradeName}</span><span className="text-slate-700">/</span><span>{e.groupName}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${e.balance > 0 ? 'bg-amber-500/10 text-amber-300 border-amber-400/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20'}`}>
                      {e.balance > 0 ? 'Payment Due' : 'Paid'}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1 text-xs font-mono text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                    {e.groupTime}
                  </div>
                  {e.secondGroupTime && (
                    <div className="flex items-center gap-2 rounded-lg border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-xs font-mono text-sky-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
                      + {e.secondGroupName}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-3 border-t border-white/5 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs">
                    <span className="mr-2 text-slate-500">Tuition</span>
                    <span className="font-mono font-bold text-white">{formatCurrency(e.totalAmount)}</span>
                    {e.balance > 0 && (
                      <span className="ml-3 font-mono text-amber-300">Due {formatCurrency(e.balance)}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      onClick={() => setEditEnrollment(e)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
                      title="Edit Enrollment"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => navigateTo('activity-details', { activityId: { type: 'enrollment', id: e.id } })}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
                      title="View Details"
                    >
                      <ArrowRightLeft size={16} />
                    </button>
                    <button
                      onClick={() => {
                        handleOpenAttestationModal(e);
                      }}
                      className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                      title="Attestation d'inscription"
                    >
                      <BookOpen size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setCompletionModal({ isOpen: true, enrollment: e });
                      }}
                      className="p-2 hover:bg-slate-700 text-slate-400 hover:text-amber-400 rounded-lg transition-colors"
                      title="Attestation de réussite"
                    >
                      <Award size={16} />
                    </button>
                    <button
                      onClick={(evt) => {
                        evt.stopPropagation();
                        initiateDeleteEnrollment(e.id);
                      }}
                      className="p-2 hover:bg-red-900/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                      title="Delete Enrollment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
            }
          </div>
        )}
      </div>

      {/* ATTESTATION DATE MODAL */}
      <Modal
        isOpen={attestationModal.isOpen}
        onClose={() => setAttestationModal({ isOpen: false, enrollment: null })}
        title="Configuration de l'Attestation"
      >
        <div className="space-y-6">
          <p className="text-slate-400 text-sm">
            Vous pouvez modifier les dates qui apparaîtront sur l'attestation avant de l'imprimer.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Date d'admission / Début</label>
              <input
                type="date"
                value={customAdmissionDate}
                onChange={(e) => setCustomAdmissionDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30"
              />
              <p className="text-xs text-slate-500 mt-1">Date à laquelle l'étudiant a commencé le programme.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Fait à Casablanca, le</label>
              <input
                type="date"
                value={customIssueDate}
                onChange={(e) => setCustomIssueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30"
              />
              <p className="text-xs text-slate-500 mt-1">Date de délivrance du document.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setAttestationModal({ isOpen: false, enrollment: null })}
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerateAttestation}
              className="flex min-h-10 items-center gap-2 rounded-lg border border-teal-300/30 bg-teal-500 px-5 py-2 font-bold text-slate-950 transition-colors hover:bg-teal-400"
            >
              <BookOpen size={18} />
              Générer Attestation
            </button>
          </div>
        </div>
      </Modal>

      {/* COMPLETION ATTESTATION MODAL */}
      <Modal
        isOpen={completionModal.isOpen}
        onClose={() => setCompletionModal({ isOpen: false, enrollment: null })}
        title="Attestation de réussite / Programme"
      >
        <div className="space-y-6">
          <p className="text-slate-400 text-sm">
            Personnalisez l'attestation de fin de programme avant de la générer.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nom de l'Académie</label>
              <input
                type="text"
                value={completionAcademyName}
                onChange={(e) => setCompletionAcademyName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30"
                placeholder="e.g. Edufy Academy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">URL du Logo (optionnel)</label>
              <input
                type="text"
                value={completionLogoUrl}
                onChange={(e) => setCompletionLogoUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Fait à Casablanca, le</label>
              <input
                type="date"
                value={completionIssueDate}
                onChange={(e) => setCompletionIssueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Modules / Compétences acquises (1 par ligne)</label>
              <textarea
                value={completionModules}
                onChange={(e) => setCompletionModules(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30"
                placeholder="Introduction à la robotique\nProgrammation Python\nModélisation 3D..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setCompletionModal({ isOpen: false, enrollment: null })}
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerateCompletion}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-lg shadow-amber-900/20 flex items-center gap-2"
            >
              <Award size={18} />
              Générer Attestation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
