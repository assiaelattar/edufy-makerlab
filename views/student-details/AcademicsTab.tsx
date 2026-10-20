
import React, { useState } from 'react';
import { BookOpen, Plus, Pencil, ArrowRightLeft, Trash2, Award } from 'lucide-react';
import { Enrollment } from '../../types';
import { formatCurrency } from '../../utils/helpers';


import { useAppContext } from '../../context/AppContext';
import { generateRegistrationCertificate, generateCompletionCertificate } from '../../utils/certificateGenerator';
import { Modal } from '../../components/Modal';
import { EducationActionMenu, EducationButton, EducationField, EducationState, EducationStatusPill } from '../../components/education-ui/EducationPrimitives';
import { useConfirm } from '../../context/ConfirmContext';
import './education-student-learning-polish.css';

interface AcademicsTabProps {
  studentEnrollments: Enrollment[];
  onQuickEnroll: (id: string) => void;
  navigateTo: (view: string, params: any) => void;
  setEditEnrollment: (enrollment: Enrollment) => void;
  initiateDeleteEnrollment: (id: string) => void;
  studentId: string;
  canEnroll: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export const AcademicsTab: React.FC<AcademicsTabProps> = ({
  studentEnrollments,
  onQuickEnroll,
  navigateTo,
  setEditEnrollment,
  initiateDeleteEnrollment,
  studentId,
  canEnroll,
  canEdit,
  canDelete,
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
    try {
      const opened = generateRegistrationCertificate(student, attestationModal.enrollment, settings, {
        admissionDate: customAdmissionDate,
        issueDate: customIssueDate
      });
      if (!opened) {
        await showAlert('Print preview was blocked', 'Allow pop-ups for Edufy, then try generating the certificate again.', 'warning');
        return;
      }
      setAttestationModal({ isOpen: false, enrollment: null });
    } catch {
      await showAlert('Certificate could not be prepared', 'Review the dates and try again. The enrollment is unchanged.', 'danger');
    }
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
    try {
      const opened = generateCompletionCertificate(student, completionModal.enrollment, settings, {
        academyName: completionAcademyName.trim(),
        logoUrl: completionLogoUrl.trim(),
        issueDate: completionIssueDate,
        modules: completionModules.split('\n').map(m => m.trim()).filter(m => m.length > 0)
      });
      if (!opened) {
        await showAlert('Print preview was blocked', 'Allow pop-ups for Edufy, then try generating the certificate again.', 'warning');
        return;
      }
      setCompletionModal({ isOpen: false, enrollment: null });
    } catch {
      await showAlert('Certificate could not be prepared', 'Review the details and try again. The enrollment is unchanged.', 'danger');
    }
  };

  return (
    <section className="edu-student-surface edu-student-surface--learning edu-student-learning">
      <header className="edu-student-learning__intro">
        <div className="edu-student-learning__identity">
          <span className="edu-student-learning__icon"><BookOpen size={23} aria-hidden="true" /></span>
          <div>
            <span className="edu-student-learning__eyebrow">Learning record</span>
            <h3>Enrollments</h3>
            <p>Programs, weekly groups, tuition and documents</p>
          </div>
        </div>
        <div className="edu-student-learning__header-actions">
          <span className="edu-student-learning__count">{studentEnrollments.length} {studentEnrollments.length === 1 ? 'program' : 'programs'}</span>
          {canEnroll && studentEnrollments.length > 0 && <EducationButton icon={Plus} variant="primary" onClick={() => onQuickEnroll(studentId)}>New enrollment</EducationButton>}
        </div>
      </header>

      {studentEnrollments.length === 0 ? (
        <div className="edu-student-learning__empty">
          <EducationState
            title="No enrollments yet"
            description={canEnroll ? "Add a program to connect this learner's schedule, attendance and billing." : "Programs will appear here when this learner is enrolled."}
          >
            {canEnroll && <EducationButton icon={Plus} variant="primary" onClick={() => onQuickEnroll(studentId)}>Enroll student</EducationButton>}
          </EducationState>
        </div>
      ) : (
        <div className="edu-student-learning__list">
          {studentEnrollments.map((e) => (
            <article key={e.id} className="edu-student-learning__record">
              <div className="edu-student-learning__record-head">
                <div className="edu-student-learning__program">
                  <span className="edu-student-learning__program-icon"><BookOpen size={21} aria-hidden="true" /></span>
                  <div>
                    <h4 title={e.programName}>{e.programName || 'Program not named'}</h4>
                    <p>{[e.gradeName, e.groupName].filter(Boolean).join(' · ') || 'Level and group not set'}</p>
                  </div>
                </div>
                <EducationStatusPill status={e.balance > 0 ? 'warning' : 'success'}>{e.balance > 0 ? 'Payment due' : 'Paid'}</EducationStatusPill>
              </div>

              <div className="edu-student-learning__record-body">
                <div className="edu-student-learning__schedule" aria-label="Weekly schedule">
                  <span className="edu-student-learning__field-label">Weekly group</span>
                  <strong>{e.groupTime || 'Time not set'}</strong>
                  {e.secondGroupTime && <small>{e.secondGroupName ? e.secondGroupName + ' · ' : 'Second group · '}{e.secondGroupTime}</small>}
                </div>
                <dl className="edu-student-learning__amounts">
                  <div><dt>Tuition</dt><dd>{formatCurrency(e.totalAmount)}</dd></div>
                  <div data-due={e.balance > 0}><dt>Balance</dt><dd>{e.balance > 0 ? formatCurrency(e.balance) : 'Settled'}</dd></div>
                </dl>
              </div>

              <div className="edu-student-learning__record-actions" role="group" aria-label={e.programName + ' enrollment actions'}>
                <EducationButton icon={ArrowRightLeft} variant="secondary" onClick={() => navigateTo('activity-details', { activityId: { type: 'enrollment', id: e.id } })}>View details</EducationButton>
                {canEdit && <EducationButton icon={Pencil} variant="quiet" onClick={() => setEditEnrollment(e)}>Edit</EducationButton>}
                <EducationActionMenu label="Certificates">
                  <button type="button" onClick={() => handleOpenAttestationModal(e)}><BookOpen size={16} aria-hidden="true" />Registration certificate</button>
                  <button type="button" onClick={() => setCompletionModal({ isOpen: true, enrollment: e })}><Award size={16} aria-hidden="true" />Completion certificate</button>
                </EducationActionMenu>
                {canDelete && <button type="button" className="edu-student-learning__delete" onClick={() => initiateDeleteEnrollment(e.id)} aria-label={'Delete ' + e.programName + ' enrollment'} title="Delete enrollment"><Trash2 size={17} aria-hidden="true" /></button>}
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal
        designSystem
        isOpen={attestationModal.isOpen}
        onClose={() => setAttestationModal({ isOpen: false, enrollment: null })}
        title="Configuration de l'Attestation"
      >
        <div className="edu-student-learning-dialog">
          <p>Choisissez les dates à afficher sur l'attestation d'inscription avant de l'imprimer.</p>
          <div className="edu-student-learning-dialog__fields">
            <EducationField label="Date d'admission / Début" hint="Date à laquelle l'étudiant a commencé le programme.">
              <input type="date" value={customAdmissionDate} onChange={(event) => setCustomAdmissionDate(event.target.value)} />
            </EducationField>
            <EducationField label="Fait à Casablanca, le" hint="Date de délivrance du document.">
              <input type="date" value={customIssueDate} onChange={(event) => setCustomIssueDate(event.target.value)} />
            </EducationField>
          </div>
          <div className="edu-student-learning-dialog__actions">
            <EducationButton variant="quiet" onClick={() => setAttestationModal({ isOpen: false, enrollment: null })}>Annuler</EducationButton>
            <EducationButton variant="primary" icon={BookOpen} onClick={handleGenerateAttestation}>Générer l'attestation</EducationButton>
          </div>
        </div>
      </Modal>

      <Modal
        designSystem
        isOpen={completionModal.isOpen}
        onClose={() => setCompletionModal({ isOpen: false, enrollment: null })}
        title="Attestation de réussite / Programme"
      >
        <div className="edu-student-learning-dialog">
          <p>Précisez les informations à afficher sur l'attestation de fin de programme.</p>
          <div className="edu-student-learning-dialog__fields">
            <EducationField label="Nom de l'Académie">
              <input type="text" value={completionAcademyName} onChange={(event) => setCompletionAcademyName(event.target.value)} placeholder="e.g. Edufy Academy" />
            </EducationField>
            <EducationField label="URL du Logo (optionnel)">
              <input type="text" value={completionLogoUrl} onChange={(event) => setCompletionLogoUrl(event.target.value)} placeholder="https://..." />
            </EducationField>
            <EducationField label="Fait à Casablanca, le">
              <input type="date" value={completionIssueDate} onChange={(event) => setCompletionIssueDate(event.target.value)} />
            </EducationField>
            <EducationField label="Modules / Compétences acquises (1 par ligne)">
              <textarea value={completionModules} onChange={(event) => setCompletionModules(event.target.value)} rows={4} placeholder={"Introduction à la robotique\nProgrammation Python\nModélisation 3D..."} />
            </EducationField>
          </div>
          <div className="edu-student-learning-dialog__actions">
            <EducationButton variant="quiet" onClick={() => setCompletionModal({ isOpen: false, enrollment: null })}>Annuler</EducationButton>
            <EducationButton variant="primary" icon={Award} onClick={handleGenerateCompletion}>Générer l'attestation</EducationButton>
          </div>
        </div>
      </Modal>
    </section>
  );
};
