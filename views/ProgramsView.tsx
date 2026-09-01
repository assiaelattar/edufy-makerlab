import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Clock, Trash2, X, Palette, Check, CalendarDays, Percent, Printer, Tablet, FileText, Search, AlertCircle, Save, Settings2, ChevronRight, Users, Layers3 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { Modal } from '../components/Modal';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasToolbar } from '../components/atlas/AtlasSurface';
import { formatCurrency } from '../utils/helpers';
import { addDoc, collection, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Program, ProgramPack, Grade, Group, Lead } from '../types';
import { useReactToPrint } from 'react-to-print';
import { FormTemplateRenderer } from '../components/enrollment/FormTemplateRenderer';
import { DevisTemplateRenderer } from '../components/enrollment/DevisTemplateRenderer';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, UserPlus, User } from 'lucide-react';

import { ProgramDetailsView } from './ProgramDetailsView';
import { ProgramSetupWizard } from '../components/programs/ProgramSetupWizard';
import { AcademicYearRolloverModal } from '../components/programs/AcademicYearRolloverModal';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { compressImage } from '../utils/image-compression';
import { getProgramReadiness } from '../utils/program-readiness';
import { buildProgramDuplicateDraft, getNextAcademicPeriod } from '../utils/programLifecycle';
import { buildPublicEnrollmentUrl } from '../utils/publicEnrollment';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';

interface ProgramsViewProps {
  onEnrollLead?: (lead: Lead) => void;
}

export const ProgramsView: React.FC<ProgramsViewProps> = ({ onEnrollLead }) => {
  const { programs, enrollments, navigateTo, leads, settings, viewParams } = useAppContext();
  const { currentOrganization, can } = useAuth();
  const { alert: showAlert, confirm } = useConfirm();
  const [isProgramModalOpen, setProgramModalOpen] = useState(false);
  const [viewDetailProgramId, setViewDetailProgramId] = useState<string | null>(viewParams.programId || null);
  const [isEditingProgram, setIsEditingProgram] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Program['status'] | 'needs_setup'>('active');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [isPreparingYear, setIsPreparingYear] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setViewDetailProgramId(viewParams.programId || null);
  }, [viewParams.programId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.atlas-module-content')?.scrollTo({ top: 0, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewDetailProgramId]);

  // Printing & Kiosk State
  const [qrProgram, setQrProgram] = useState<Program | null>(null);
  const printComponentRef = React.useRef(null);
  const [printTargetProgram, setPrintTargetProgram] = useState<Program | null>(null);

  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `Inscription_${printTargetProgram?.name || 'Form'}`,
  });

  // Devis State
  const devisPrintComponentRef = React.useRef(null);
  const [isDevisModalOpen, setIsDevisModalOpen] = useState(false);
  const [devisTargetProgram, setDevisTargetProgram] = useState<Program | null>(null);
  const [devisError, setDevisError] = useState('');
  const [devisConfig, setDevisConfig] = useState({
      parentName: '',
      childName: '',
      sessionDetails: '', // NEW
      selectedPacks: [] as string[],
      discount: 0
  });

  const handlePrintDevis = useReactToPrint({
    contentRef: devisPrintComponentRef,
    documentTitle: `Devis_${devisTargetProgram?.name || 'Program'}`,
  });

  const openDevisModal = (program: Program) => {
      setDevisTargetProgram(program);
      setDevisConfig({ parentName: '', childName: '', sessionDetails: '', selectedPacks: program.packs.length > 0 ? [program.packs[0].name] : [], discount: 0 });
      setDevisError('');
      setIsDevisModalOpen(true);
  };

  const generateQuote = () => {
    if (!devisConfig.parentName.trim()) {
      setDevisError('Enter the parent or client name for the quote.');
      return;
    }
    if (devisConfig.selectedPacks.length === 0) {
      setDevisError('Select at least one pricing plan.');
      return;
    }
    if (devisConfig.discount < 0) {
      setDevisError('The discount amount cannot be negative.');
      return;
    }
    setDevisError('');
    window.setTimeout(() => {
      handlePrintDevis();
      setIsDevisModalOpen(false);
    }, 100);
  };

  // Image Upload State
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [copiedProgramId, setCopiedProgramId] = useState<string | null>(null);

  const copyEnrollmentLink = async (program: Program) => {
    if (program.status !== 'active') {
      await showAlert('Enrollment link disabled', 'Activate the program before sharing its public enrollment form.', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(buildPublicEnrollmentUrl(program.id));
      setCopiedProgramId(program.id);
      window.setTimeout(() => {
        setCopiedProgramId(current => current === program.id ? null : current);
      }, 1800);
    } catch (error) {
      console.error('Unable to copy enrollment link', error);
      await showAlert('Link could not be copied', 'Open the enrollment form and copy its address from the browser.', 'warning');
    }
  };

  const openEnrollmentAccess = async (program: Program) => {
    if (program.status !== 'active') {
      await showAlert('Enrollment link disabled', 'Activate the program before opening its public enrollment form.', 'warning');
      return;
    }
    const groupCount = (program.grades || []).reduce((sum, grade) => sum + (grade.groups?.length || 0), 0);
    if ((program.packs?.length || 0) === 0 || groupCount === 0) {
      await showAlert('Complete enrollment setup', 'Add at least one pricing plan and one scheduled group before sharing the public form.', 'warning');
      return;
    }
    setQrProgram(program);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'thumbnailUrl' | 'partnerLogoUrl') => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!storage) {
      await showAlert('Upload unavailable', 'Firebase Storage is not initialized for this workspace.', 'warning');
      return;
    }
    if (!currentOrganization?.id) {
      await showAlert('Organization required', 'Select an organization before uploading program assets.', 'warning');
      return;
    }
    const file = e.target.files[0];
    const target = e.target; // Capture target to reset value

    // 20s Timeout Safety
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Upload timed out")), 20000)
    );

    try {
      setUploadingField(field);

      // Race between Upload/Compress and Timeout
      const url = await Promise.race([
        (async () => {
          // Compress
          const compressedBlob = await compressImage(file, 800, 0.82);

          // Upload
          const storageRef = ref(storage, `organizations/${currentOrganization.id}/programs/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);
          await uploadBytes(storageRef, compressedBlob);

          return await getDownloadURL(storageRef);
        })(),
        timeoutPromise
      ]) as string;

      setProgramForm(prev => ({ ...prev, [field]: url }));
    } catch (error) {
      console.error("[Upload] Failed:", error);
      await showAlert('Upload failed', 'The image upload failed or timed out. Please check the connection and try again.', 'danger');
    } finally {
      setUploadingField(null);
      target.value = ''; // Reset input so same file can be selected again
    }
  };

  const triggerPrint = (program: Program) => {
    setPrintTargetProgram(program);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const academicYears = settings.academicYear?.match(/(20\d{2})\D+(20\d{2})/);
  const defaultRunSetup = {
    startDate: academicYears ? `${academicYears[1]}-09-01` : `${new Date().getFullYear()}-01-01`,
    endDate: academicYears ? `${academicYears[2]}-08-31` : `${new Date().getFullYear()}-12-31`,
    timezone: 'Africa/Casablanca'
  };

  const initialProgramForm: Partial<Program> = {
    name: '',
    type: 'Regular Program',
    description: '',
    status: 'active',
    targetAudience: 'kids',
    formatPreset: 'weekly_academy',
    runSetup: defaultRunSetup,
    academicPeriod: { label: settings.academicYear, startDate: defaultRunSetup.startDate, endDate: defaultRunSetup.endDate },
    enrollmentPolicy: { mode: 'fixed_run', allowJoinAnytime: false },
    registrationSetup: { enabled: true, mode: 'fast', allowWaitlist: true, requiresReview: true, qrEnabled: true },
    documentSetup: { registrationConfirmation: true, enrollmentAttestation: false, completionCertificate: false },
    packs: [],
    grades: [],
    themeColor: 'blue',
    duration: '',
    paymentTerms: []
  };
  const [programForm, setProgramForm] = useState<Partial<Program>>(initialProgramForm);
  const [tempPack, setTempPack] = useState<ProgramPack>({ name: '', workshopsPerWeek: 1, priceAnnual: 0, priceTrimester: 0, price: 0 });
  const [tempGradeName, setTempGradeName] = useState('');
  const [tempGroup, setTempGroup] = useState<Group>({ id: '', name: '', day: 'Monday', time: '10:00' });
  const [newPaymentTerm, setNewPaymentTerm] = useState('');

  // Inline editing state
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGradeName, setEditGradeName] = useState('');
  const [editGroup, setEditGroup] = useState<Partial<Group>>({});
  const [editingPackIndex, setEditingPackIndex] = useState<number | null>(null);

  const openAddProgram = () => {
    if (!can('programs.create')) return;
    setProgramForm(initialProgramForm);
    setIsEditingProgram(false);
    setSelectedProgram(null);
    setFormError('');
    setProgramModalOpen(true);
  };

  const openEditProgram = (program: Program) => {
    if (!can('programs.edit')) return;
    setProgramForm({
      ...program,
      runSetup: program.runSetup || { ...defaultRunSetup, name: `${program.name} / ${settings.academicYear}` }
    });
    setSelectedProgram(program);
    setIsEditingProgram(true);
    setFormError('');
    setProgramModalOpen(true);
  };

  const openDuplicateProgram = (program: Program) => {
    if (!can('programs.create') || !currentOrganization?.id) return;
    const targetPeriod = getNextAcademicPeriod(program.academicPeriod?.label || settings.academicYear);
    setProgramForm(buildProgramDuplicateDraft(program, targetPeriod, { appendPeriodWhenNameHasNoYear: false }));
    setSelectedProgram(null);
    setIsEditingProgram(false);
    setFormError('');
    setProgramModalOpen(true);
  };

  const handleDeleteProgram = async (program: Program) => {
    if (!db || !currentOrganization?.id || program.organizationId !== currentOrganization.id) return;
    const relatedEnrollments = enrollments.filter(enrollment => enrollment.organizationId === currentOrganization.id && enrollment.programId === program.id);

    if (relatedEnrollments.length > 0) {
      if (!can('programs.edit')) return;
      const shouldArchive = await confirm({
        title: 'Archive this program?',
        message: `${program.name} has ${relatedEnrollments.length} enrollment record${relatedEnrollments.length === 1 ? '' : 's'}, so it cannot be deleted safely. Archive it instead? Historical learner and finance records will stay intact.`,
        confirmText: 'Archive program',
        cancelText: 'Keep program',
        variant: 'warning'
      });
      if (!shouldArchive) return;
      try {
        await updateDoc(doc(db, 'programs', program.id), { status: 'archived', updatedAt: new Date().toISOString() });
        await showAlert('Program archived', `${program.name} is hidden from new enrollment while its history remains available.`, 'success');
      } catch (error) {
        console.error('Unable to archive program', error);
        await showAlert('Program not archived', 'The program could not be archived. Check your permission and connection, then try again.', 'danger');
      }
      return;
    }

    if (!can('programs.delete')) return;
    const shouldDelete = await confirm({
      title: 'Delete this program?',
      message: `${program.name} has no enrollment history. This removes only the program setup and cannot be undone.`,
      confirmText: 'Delete program',
      cancelText: 'Keep program',
      variant: 'danger'
    });
    if (!shouldDelete) return;
    try {
      await deleteDoc(doc(db, 'programs', program.id));
      await showAlert('Program deleted', `${program.name} was removed.`, 'success');
    } catch (error) {
      console.error('Unable to delete program', error);
      await showAlert('Program not deleted', 'The program could not be deleted. Check your permission and connection, then try again.', 'danger');
    }
  };

  const prepareAcademicYear = async (request: { period: { label: string; startDate: string; endDate: string }; programIds: string[] }) => {
    const firestore = db;
    if (!firestore || !currentOrganization?.id || !can('programs.create')) return;
    const selectedPrograms = programs.filter(program => request.programIds.includes(program.id) && program.organizationId === currentOrganization.id);
    const sourcesToClone = selectedPrograms.filter(source => !programs.some(existing =>
      existing.organizationId === currentOrganization.id
      && existing.templateSourceProgramId === source.id
      && existing.academicPeriod?.label === request.period.label
    ));

    if (!sourcesToClone.length) {
      await showAlert('Year already prepared', `The selected setups already have copies for ${request.period.label}.`, 'info');
      return;
    }

    try {
      setIsPreparingYear(true);
      const batch = writeBatch(firestore);
      sourcesToClone.forEach(source => {
        const duplicate = buildProgramDuplicateDraft(source, request.period);
        const programRef = doc(collection(firestore, 'programs'));
        batch.set(programRef, JSON.parse(JSON.stringify({
          ...duplicate,
          organizationId: currentOrganization.id,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })));
      });
      await batch.commit();
      setIsRolloverOpen(false);
      setStatusFilter('draft');
      const skipped = selectedPrograms.length - sourcesToClone.length;
      await showAlert('New academic year prepared', `${sourcesToClone.length} program setup${sourcesToClone.length === 1 ? '' : 's'} copied into ${request.period.label} as drafts${skipped ? `; ${skipped} existing copy${skipped === 1 ? ' was' : 'ies were'} skipped` : ''}. No enrollments were copied.`, 'success');
    } catch (error) {
      console.error('Unable to prepare academic year', error);
      await showAlert('Year setup not completed', 'No successful rollover was recorded. Check the connection and try again.', 'danger');
    } finally {
      setIsPreparingYear(false);
    }
  };

  const handleSaveProgram = async (draftOverride?: Partial<Program>) => {
    setFormError('');
    const draft = draftOverride || programForm;
    if (!db) {
      setFormError('The database is unavailable. Check the connection and try again.');
      return;
    }
    if (!currentOrganization?.id) {
      setFormError('Select an organization before saving a program.');
      return;
    }
    if (isEditingProgram ? !can('programs.edit') : !can('programs.create')) {
      setFormError('Your role can view programs but cannot change the catalog.');
      return;
    }

    const name = draft.name?.trim() || '';
    if (name.length < 3) {
      setFormError('Enter a program name with at least 3 characters.');
      return;
    }

    const packs = (draft.packs || []).map(pack => ({ ...pack, name: pack.name.trim() }));
    const packNames = packs.map(pack => pack.name.toLowerCase());
    if (packs.some(pack => !pack.name || Math.max(pack.priceAnnual || 0, pack.priceTrimester || 0, pack.price || 0) <= 0)) {
      setFormError('Each pricing plan needs a name and at least one price greater than zero.');
      return;
    }
    if (new Set(packNames).size !== packNames.length) {
      setFormError('Pricing plan names must be unique within a program.');
      return;
    }
    if (packs.some(pack => (pack.promoPrice || 0) < 0)) {
      setFormError('Promotional prices cannot be negative.');
      return;
    }

    const grades = (draft.grades || []).map(grade => ({
      ...grade,
      organizationId: currentOrganization.id,
      name: grade.name.trim(),
      groups: (grade.groups || []).map(group => ({ ...group, name: group.name.trim() }))
    }));
    if (grades.some(grade => !grade.name || grade.groups.some(group =>
      !group.name
      || !group.day
      || !group.time
      || (group.capacity !== undefined && (!Number.isInteger(group.capacity) || group.capacity < 1 || group.capacity > 200))
      || (group.scheduleBlocks || []).some(block => !block.day || !block.startTime || !block.endTime || block.endTime <= block.startTime)
    ))) {
      setFormError('Every group needs a valid timetable and a capacity between 1 and 200 when provided. End times must be after start times.');
      return;
    }

    if (draft.runSetup) {
      if (!draft.runSetup.startDate || !draft.runSetup.endDate || draft.runSetup.endDate < draft.runSetup.startDate) {
        setFormError('Choose valid run dates. The end date must be on or after the start date.');
        return;
      }
      if (draft.runSetup.enrollmentOpenDate && draft.runSetup.enrollmentCloseDate && draft.runSetup.enrollmentCloseDate < draft.runSetup.enrollmentOpenDate) {
        setFormError('Registration must close on or after its opening date.');
        return;
      }
    }
    if (draft.enrollmentPolicy?.mode === 'rolling_membership' && (!Number.isInteger(draft.enrollmentPolicy.membershipDurationMonths) || (draft.enrollmentPolicy.membershipDurationMonths || 0) < 1 || (draft.enrollmentPolicy.membershipDurationMonths || 0) > 36)) {
      setFormError('Rolling memberships need a duration between 1 and 36 months.');
      return;
    }
    if (draft.enrollmentPolicy?.mode === 'modular' && !draft.enrollmentPolicy.moduleLabel?.trim()) {
      setFormError('Modular enrollment needs a clear part name, such as Week or Module.');
      return;
    }

    try {
      setIsSaving(true);
      const { id: _programId, ...formValues } = draft as Program;
      const payload = JSON.parse(JSON.stringify({
        ...formValues,
        name,
        description: draft.description?.trim() || '',
        duration: draft.duration?.trim() || '',
        packs,
        grades,
        paymentTerms: (draft.paymentTerms || []).map(term => term.trim()).filter(Boolean),
        organizationId: currentOrganization.id,
        updatedAt: new Date().toISOString()
      }));

      if (isEditingProgram && selectedProgram) {
        if (selectedProgram.organizationId !== currentOrganization.id) {
          setFormError(selectedProgram.organizationId
            ? 'This program belongs to another organization and cannot be edited here.'
            : 'This program has no organization ID and cannot be edited from this workspace. Assign its tenant through an authorized migration first.');
          return;
        }
        await updateDoc(doc(db, 'programs', selectedProgram.id), payload);
      } else {
        await addDoc(collection(db, 'programs'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
      }
      setProgramModalOpen(false);
      if (draft.status === 'draft') setStatusFilter('draft');
      await showAlert(
        isEditingProgram ? 'Program updated' : 'Program created',
        draft.status === 'draft' ? `${name} is saved as a draft and remains closed for enrollment.` : `${name} is active in the enrollment catalog.`,
        'success'
      );
    } catch (err) {
      console.error('Unable to save program', err);
      setFormError('The program could not be saved. Check the connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const addGradeToForm = () => {
    const name = tempGradeName.trim();
    if (!name) {
      setFormError('Enter a level name before adding it.');
      return;
    }
    if ((programForm.grades || []).some(grade => grade.name.trim().toLowerCase() === name.toLowerCase())) {
      setFormError('Level names must be unique within a program.');
      return;
    }
    const newGrade: Grade = { id: Date.now().toString(), organizationId: currentOrganization?.id || '', name, groups: [] };
    setProgramForm(prev => ({ ...prev, grades: [...(prev.grades || []), newGrade] }));
    setTempGradeName('');
    setFormError('');
  };

  const addGroupToGrade = (gradeIndex: number) => {
    const name = tempGroup.name.trim();
    if (!name || !tempGroup.day || !tempGroup.time) {
      setFormError('Enter a group name, day, and time before adding it.');
      return;
    }
    const updatedGrades = [...(programForm.grades || [])];
    if (updatedGrades[gradeIndex].groups.some(group => group.name.trim().toLowerCase() === name.toLowerCase())) {
      setFormError('Group names must be unique within the same level.');
      return;
    }
    if (tempGroup.capacity !== undefined && (!Number.isInteger(tempGroup.capacity) || tempGroup.capacity < 1 || tempGroup.capacity > 200)) {
      setFormError('Group capacity must be a whole number between 1 and 200.');
      return;
    }
    updatedGrades[gradeIndex].groups.push({ ...tempGroup, name, id: Date.now().toString() });
    setProgramForm(prev => ({ ...prev, grades: updatedGrades }));
    setTempGroup({ id: '', name: '', day: 'Monday', time: '10:00' });
    setFormError('');
  };

  const resetPackDraft = () => {
    setTempPack({ name: '', priceAnnual: 0, priceTrimester: 0, price: 0, promoPrice: 0 });
    setEditingPackIndex(null);
  };

  const commitPack = () => {
    const name = tempPack.name.trim();
    const basePrice = Math.max(tempPack.priceAnnual || 0, tempPack.priceTrimester || 0, tempPack.price || 0);
    if (!name || basePrice <= 0) {
      setFormError('A pricing plan needs a name and at least one price greater than zero.');
      return;
    }
    if ((tempPack.promoPrice || 0) < 0) {
      setFormError('The promotional price cannot be negative.');
      return;
    }
    const duplicateIndex = (programForm.packs || []).findIndex((pack, index) =>
      index !== editingPackIndex && pack.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicateIndex >= 0) {
      setFormError('Pricing plan names must be unique within a program.');
      return;
    }

    const nextPack = { ...tempPack, name };
    setProgramForm(prev => {
      const packs = [...(prev.packs || [])];
      if (editingPackIndex === null) packs.push(nextPack);
      else packs[editingPackIndex] = nextPack;
      return { ...prev, packs };
    });
    resetPackDraft();
    setFormError('');
  };

  const colorOptions = [
    { id: 'blue', hex: '#3B82F6' },
    { id: 'purple', hex: '#8B5CF6' },
    { id: 'emerald', hex: '#10B981' },
    { id: 'amber', hex: '#F59E0B' },
    { id: 'rose', hex: '#F43F5E' },
    { id: 'cyan', hex: '#06B6D4' },
    { id: 'slate', hex: '#64748B' }
  ] as const;
  const activePrograms = programs.filter(program => program.status === 'active');
  const totalPacks = programs.reduce((sum, program) => sum + (program.packs?.length || 0), 0);
  const canCreatePrograms = can('programs.create');
  const canEditPrograms = can('programs.edit');
  const canDeletePrograms = can('programs.delete');
  const programOperations = useMemo(() => programs.map(program => {
    const readiness = getProgramReadiness(program);
    const groups = readiness.validGroups;
    const enrollmentHistory = enrollments.filter(enrollment =>
      enrollment.organizationId === currentOrganization?.id
      && enrollment.programId === program.id
    );
    const activeEnrollments = enrollmentHistory.filter(enrollment =>
      enrollment.status === 'active'
      && (!enrollment.session || enrollment.session === settings.academicYear)
    );
    const activeGroupIds = new Set(activeEnrollments.flatMap(enrollment => [enrollment.groupId, enrollment.secondGroupId]).filter(Boolean));
    const openLeads = leads.filter(lead =>
      (lead.programId === program.id || lead.interests?.includes(program.name))
      && lead.status !== 'converted'
      && lead.status !== 'closed'
    );
    const { hasPricing, hasSchedule } = readiness;
    const needsSetup = program.status === 'active' && (!hasPricing || !hasSchedule);
    const emptyGroupCount = groups.filter(group => !activeGroupIds.has(group.id)).length;
    const nextGroup = groups[0];

    return {
      program,
      groups,
      activeEnrollments,
      enrollmentHistoryCount: enrollmentHistory.length,
      openLeads,
      hasPricing,
      hasSchedule,
      needsSetup,
      emptyGroupCount,
      nextGroup
    };
  }), [programs, enrollments, leads, currentOrganization?.id, settings.academicYear]);
  const activeEnrollmentCount = programOperations.reduce((sum, item) => sum + item.activeEnrollments.length, 0);
  const setupNeededCount = programOperations.filter(item => item.needsSetup).length;
  const filteredPrograms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return programOperations.filter(item => {
      const { program } = item;
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'needs_setup' ? item.needsSetup : program.status === statusFilter);
      const matchesQuery = !query || [program.name, program.type, program.description, program.partnerName]
        .some(value => value?.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    }).sort((a, b) => {
      if (a.needsSetup !== b.needsSetup) return a.needsSetup ? -1 : 1;
      if (a.openLeads.length !== b.openLeads.length) return b.openLeads.length - a.openLeads.length;
      return a.program.name.localeCompare(b.program.name);
    });
  }, [programOperations, searchQuery, statusFilter]);

  // Render Full Page Details if selected
  if (viewDetailProgramId) {
    return (
      <ProgramDetailsView
        programIdProp={viewDetailProgramId}
        onEnrollLead={(lead) => {
          setViewDetailProgramId(null);
          if (onEnrollLead) onEnrollLead(lead);
        }}
        onClose={() => setViewDetailProgramId(null)}
        onPrintProgram={triggerPrint}
        onQuoteProgram={openDevisModal}
        onOpenEnrollmentAccess={openEnrollmentAccess}
        onEditProgram={(program) => {
          setViewDetailProgramId(null);
          openEditProgram(program);
        }}
      />
    );
  }

  return (
    <div className="atlas-module atlas-programs-module flex flex-col gap-5 pb-8">

      {/* Header Section */}
      <AtlasCommandHeader
        eyebrow="Academy programs"
        title="Programs"
        description="See what is running, what needs setup, and where families are waiting."
        icon={Palette}
        badges={
          <>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-400">{settings.academicYear}</span>
            {setupNeededCount > 0 && <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">{setupNeededCount} need setup</span>}
          </>
        }
        actions={canCreatePrograms ? (
          <>
            <AtlasActionButton icon={CalendarDays} onClick={() => setIsRolloverOpen(true)}>Prepare next year</AtlasActionButton>
            <AtlasActionButton icon={Plus} variant="primary" onClick={openAddProgram}>New program</AtlasActionButton>
          </>
        ) : (
          <span className="text-xs font-bold text-slate-500">View-only catalog access</span>
        )}
      />

      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
        <button type="button" onClick={() => setStatusFilter('active')} className="bg-slate-950 px-3 py-3 text-left transition-colors hover:bg-white/[0.04] sm:px-4">
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500"><Check size={13} className="text-emerald-300" /> Running</span>
          <span className="mt-1 block text-lg font-black text-white sm:text-xl">{activePrograms.length}</span>
        </button>
        <div className="bg-slate-950 px-3 py-3 sm:px-4">
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500"><Users size={13} className="text-sky-300" /> Learners</span>
          <span className="mt-1 block text-lg font-black text-white sm:text-xl">{activeEnrollmentCount}</span>
        </div>
        <button type="button" onClick={() => setStatusFilter('needs_setup')} className="bg-slate-950 px-3 py-3 text-left transition-colors hover:bg-amber-300/[0.05] sm:px-4">
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500"><AlertCircle size={13} className="text-amber-200" /> Need setup</span>
          <span className="mt-1 block text-lg font-black text-white sm:text-xl">{setupNeededCount}</span>
        </button>
      </div>

      <AtlasToolbar
        leading={(
          <label className="relative min-w-0 flex-1 sm:max-w-sm">
            <span className="sr-only">Search programs</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search programs, types, or partners"
              className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/15"
            />
          </label>
        )}
        trailing={(
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-300">
            <Settings2 size={15} className="text-slate-500" />
            <span className="sr-only">Filter by status</span>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} className="bg-transparent font-bold outline-none">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="needs_setup">Needs setup</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        )}
      >
        <span className="text-xs font-bold text-slate-500">{filteredPrograms.length} of {programs.length} programs</span>
      </AtlasToolbar>

      {/* Programs workspace */}
      {filteredPrograms.length === 0 ? (
        <AtlasEmptyState
          icon={Search}
          title={programs.length === 0 ? 'Build your first program' : 'No programs match this view'}
          description={programs.length === 0 ? 'Create the pricing and schedule foundation used by enrollment and classes.' : 'Clear the search or change the status filter.'}
          action={programs.length === 0 && canCreatePrograms
            ? <AtlasActionButton icon={Plus} variant="primary" onClick={openAddProgram}>Create program</AtlasActionButton>
            : programs.length > 0
              ? <AtlasActionButton onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>Clear filters</AtlasActionButton>
              : undefined}
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredPrograms.map((item, index) => {
              const { program, groups, activeEnrollments, enrollmentHistoryCount, openLeads, hasPricing, hasSchedule, needsSetup, emptyGroupCount, nextGroup } = item;
              const actionLabel = needsSetup && canEditPrograms ? 'Complete setup' : 'Open program';
              const action = needsSetup && canEditPrograms ? () => openEditProgram(program) : () => setViewDetailProgramId(program.id);
              const attentionText = program.status === 'draft'
                ? 'Draft setup - not open for enrollment'
                : !hasPricing
                ? 'Add a pricing plan'
                : !hasSchedule
                  ? 'Add the first class schedule'
                  : openLeads.length > 0
                    ? `${openLeads.length} ${openLeads.length === 1 ? 'family is' : 'families are'} waiting`
                    : emptyGroupCount > 0
                      ? `${emptyGroupCount} ${emptyGroupCount === 1 ? 'group has' : 'groups have'} no active learners`
                      : 'Ready for enrollment';

              return (
                <motion.article
                  layout
                  key={program.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18, delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.12) }}
                  className="group rounded-lg border border-white/10 bg-slate-900/55 p-4 transition-colors hover:border-teal-300/25 hover:bg-slate-900/75"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <button type="button" onClick={() => setViewDetailProgramId(program.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                      <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${needsSetup ? 'border-amber-300/20 bg-amber-300/10 text-amber-200' : program.status === 'archived' ? 'border-white/10 bg-white/[0.04] text-slate-500' : 'border-teal-300/20 bg-teal-300/10 text-teal-200'}`}>
                        {needsSetup ? <AlertCircle size={18} /> : <Layers3 size={18} />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-black text-white transition-colors group-hover:text-teal-100">{program.name}</span>
                          <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{program.type}</span>
                          {program.enrollmentPolicy && <span className="rounded-md border border-sky-300/15 bg-sky-300/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-sky-200">{program.enrollmentPolicy.mode === 'rolling_membership' ? `${program.enrollmentPolicy.membershipDurationMonths || 12} mo rolling` : program.enrollmentPolicy.mode === 'modular' ? `By ${program.enrollmentPolicy.moduleLabel || 'module'}` : 'Fixed dates'}</span>}
                          {program.status === 'draft' && <span className="rounded-md border border-sky-300/20 bg-sky-300/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-200">Draft</span>}
                          {program.status === 'archived' && <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold text-slate-500">Archived</span>}
                        </span>
                        <span className="mt-1 block truncate text-xs text-slate-500">{program.description || 'Add a short description for staff and families.'}</span>
                      </span>
                    </button>

                    <div className="grid grid-cols-3 gap-3 border-y border-white/10 py-3 lg:w-[310px] lg:border-x lg:border-y-0 lg:px-5 lg:py-0">
                      <span><span className="block text-sm font-black text-white">{activeEnrollments.length}</span><span className="text-[10px] font-bold uppercase text-slate-600">Learners</span></span>
                      <span><span className="block text-sm font-black text-white">{groups.length}</span><span className="text-[10px] font-bold uppercase text-slate-600">Groups</span></span>
                      <span><span className="block text-sm font-black text-white">{program.packs?.length || 0}</span><span className="text-[10px] font-bold uppercase text-slate-600">Plans</span></span>
                    </div>

                    <div className="flex min-w-0 items-center gap-3 lg:w-[280px]">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${needsSetup ? 'bg-amber-300' : openLeads.length > 0 ? 'bg-sky-300' : 'bg-emerald-300'}`} />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xs font-bold ${needsSetup ? 'text-amber-100' : 'text-slate-300'}`}>{attentionText}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-600">
                          {nextGroup ? `${nextGroup.day} at ${nextGroup.time}` : program.targetAudience === 'adults' ? 'Adult program' : 'Youth program'}
                        </span>
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button type="button" onClick={action} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 ${needsSetup && canEditPrograms ? 'bg-amber-300 text-slate-950 hover:bg-amber-200' : 'border border-white/10 bg-white/[0.04] text-slate-200 hover:border-teal-300/30 hover:bg-teal-300/10 hover:text-teal-100'}`}>
                        {actionLabel} <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                      </button>
                      {canCreatePrograms && <button type="button" onClick={() => openDuplicateProgram(program)} title="Duplicate setup" aria-label={`Duplicate ${program.name}`} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-sky-300/30 hover:bg-sky-300/10 hover:text-sky-200"><Copy size={15} /></button>}
                      {((enrollmentHistoryCount > 0 && canEditPrograms) || (enrollmentHistoryCount === 0 && canDeletePrograms)) && <button type="button" onClick={() => handleDeleteProgram(program)} title={enrollmentHistoryCount ? 'Archive program' : 'Delete program'} aria-label={`${enrollmentHistoryCount ? 'Archive' : 'Delete'} ${program.name}`} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition-colors hover:border-red-300/25 hover:bg-red-300/10 hover:text-red-300"><Trash2 size={15} /></button>}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <ProgramSetupWizard
        key={selectedProgram?.id || (isEditingProgram ? 'edit-program' : 'new-program')}
        isOpen={isProgramModalOpen}
        onClose={() => !isSaving && setProgramModalOpen(false)}
        initialProgram={programForm}
        organizationId={currentOrganization?.id || ''}
        isEditing={isEditingProgram}
        isSaving={isSaving}
        externalError={formError}
        onSave={handleSaveProgram}
      />

      <AcademicYearRolloverModal
        isOpen={isRolloverOpen}
        onClose={() => !isPreparingYear && setIsRolloverOpen(false)}
        programs={programs.filter(program => program.organizationId === currentOrganization?.id)}
        defaultPeriod={getNextAcademicPeriod(settings.academicYear)}
        isSaving={isPreparingYear}
        onPrepare={prepareAcademicYear}
      />

      {/* Legacy editor retained temporarily as a rollback surface while the wizard settles. */}
      <Modal isOpen={false} onClose={() => setProgramModalOpen(false)} title={isEditingProgram ? "Edit Program" : "New Program"} size="lg">
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-teal-300/15 bg-teal-300/[0.05] p-4">
          <Settings2 className="mt-0.5 shrink-0 text-teal-300" size={18} />
          <div>
            <p className="text-sm font-black text-white">ERP program setup</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">Configure the catalog, prices, levels, and class groups used by admissions and enrollment.</p>
          </div>
        </div>

        <div className="space-y-8 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
          <>
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Program Name</label>
                  <input className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 font-medium text-white outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-400/15" value={programForm.name} onChange={e => setProgramForm({ ...programForm, name: e.target.value })} placeholder="e.g. Robotics foundations" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Type</label>
                  <select className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-white outline-none focus:border-teal-400" value={programForm.type} onChange={e => setProgramForm({ ...programForm, type: e.target.value as Program['type'] })}>
                    <option>Regular Program</option>
                    <option>Holiday Camp</option>
                    <option>Camp</option>
                    <option>Workshop</option>
                    <option>Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Catalog status</label>
                  <select className="w-full min-h-10 p-3 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-teal-400" value={programForm.status || 'active'} onChange={e => setProgramForm({ ...programForm, status: e.target.value as Program['status'] })}>
                    <option value="active">Active and public</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Enrollment audience</label>
                  <select className="w-full min-h-10 p-3 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-teal-400" value={programForm.targetAudience || 'kids'} onChange={e => setProgramForm({ ...programForm, targetAudience: e.target.value as Program['targetAudience'] })}>
                    <option value="kids">Youth learner and guardian</option>
                    <option value="adults">Adult learner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Duration / Frequency</label>
                  <input className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 font-medium text-white outline-none focus:border-teal-400" value={programForm.duration || ''} onChange={e => setProgramForm({ ...programForm, duration: e.target.value })} placeholder="e.g. Annual, 3 months, 2 days" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Theme Color</label>
                  <div className="flex gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setProgramForm({ ...programForm, themeColor: color.id })}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-opacity ${programForm.themeColor === color.id ? 'border-white opacity-100' : 'border-transparent opacity-55 hover:opacity-100'}`}
                        style={{ backgroundColor: color.hex }}
                        aria-label={`Use ${color.id} program color`}
                        aria-pressed={programForm.themeColor === color.id}
                      >
                        {programForm.themeColor === color.id && <Check size={14} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Description</label>
                  <textarea className="h-24 w-full resize-none rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-white outline-none focus:border-teal-400" value={programForm.description} onChange={e => setProgramForm({ ...programForm, description: e.target.value })} placeholder="What families and staff need to know" />
                </div>

                {/* VISUAL ASSETS */}
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4 md:col-span-2">
                  <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Visual Assets
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Background Thumbnail
                      <span className="block text-[10px] text-slate-600 font-normal mt-0.5">Rec: 800x800px or 1200x630px. Max 500KB.</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs pr-8"
                          placeholder="https://..." value={programForm.thumbnailUrl || ''} onChange={e => setProgramForm({ ...programForm, thumbnailUrl: e.target.value })} />
                        {programForm.thumbnailUrl && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded overflow-hidden border border-slate-700">
                            <img src={programForm.thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <label className={`cursor-pointer p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors ${uploadingField === 'thumbnailUrl' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploadingField === 'thumbnailUrl' ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Upload size={16} className="text-slate-400" />}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'thumbnailUrl')} disabled={!!uploadingField} />
                      </label>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Brochure PDF URL</label>
                    <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                      placeholder="https://..." value={programForm.brochureUrl || ''} onChange={e => setProgramForm({ ...programForm, brochureUrl: e.target.value })} />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Partner Logo URL</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs pr-8"
                          placeholder="https://..." value={programForm.partnerLogoUrl || ''} onChange={e => setProgramForm({ ...programForm, partnerLogoUrl: e.target.value })} />
                        {programForm.partnerLogoUrl && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded overflow-hidden border border-slate-700 bg-white p-0.5">
                            <img src={programForm.partnerLogoUrl} alt="Preview" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                      <label className={`cursor-pointer p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors ${uploadingField === 'partnerLogoUrl' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploadingField === 'partnerLogoUrl' ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Upload size={16} className="text-slate-400" />}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'partnerLogoUrl')} disabled={!!uploadingField} />
                      </label>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Partner Name</label>
                    <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                      placeholder="e.g. Algorora Center" value={programForm.partnerName || ''} onChange={e => setProgramForm({ ...programForm, partnerName: e.target.value })} />
                  </div>
                </div>

                {/* NEW: Payment Facilities */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">Payment Terms / Facilities</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        placeholder="e.g. Advance 50%"
                        className="flex-1 p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                        value={newPaymentTerm}
                        onChange={e => setNewPaymentTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = newPaymentTerm.trim();
                            if (val) {
                              setProgramForm(prev => ({ ...prev, paymentTerms: [...(prev.paymentTerms || []), val] }));
                              setNewPaymentTerm('');
                            }
                          }
                        }}
                      />
                      <button type="button" className="px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold" onClick={() => {
                        const val = newPaymentTerm.trim();
                        if (val) {
                          setProgramForm(prev => ({ ...prev, paymentTerms: [...(prev.paymentTerms || []), val] }));
                          setNewPaymentTerm('');
                        }
                      }}>Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {programForm.paymentTerms?.map((term, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-lg">
                          <span className="text-sm text-slate-300">{term}</span>
                          <button onClick={() => {
                            const newTerms = [...(programForm.paymentTerms || [])];
                            newTerms.splice(i, 1);
                            setProgramForm({ ...programForm, paymentTerms: newTerms });
                          }} className="text-slate-500 hover:text-red-400"><X size={14} /></button>
                        </div>
                      ))}
                      {(!programForm.paymentTerms || programForm.paymentTerms.length === 0) && (
                        <p className="text-xs text-slate-600 italic">No custom payment terms defined. Defaults (Annual/Trimester) will be used if empty.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* NEW: Discount / Promo Configuration */}
                <div className="md:col-span-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase text-amber-200">
                      <Percent size={14} /> Promotional Discount
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">{programForm.discountAvailable ? 'Enabled' : 'Disabled'}</span>
                      <button
                        onClick={() => setProgramForm({ ...programForm, discountAvailable: !programForm.discountAvailable })}
                        className={`relative h-5 w-10 rounded-full transition-colors ${programForm.discountAvailable ? 'bg-teal-500' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${programForm.discountAvailable ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  {programForm.discountAvailable && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                      <div className="flex flex-col justify-center">
                        <p className="text-xs text-amber-100">
                          Enable this to activate promo pricing. Set the specific "Promo Price" for each Pack in the <strong>Pricing Plans</strong> section below.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Offer Ends On</label>
                        <input
                          type="date"
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:border-indigo-500 outline-none"
                          value={programForm.discountEndDate || ''}
                          onChange={e => setProgramForm({ ...programForm, discountEndDate: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Structure */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2"><Clock size={16} className="text-blue-400" /> Structure & Classes</h4>
                </div>

                <div className="flex gap-2 mb-4">
                  <input placeholder="New level name (e.g. Level 1)" className="min-h-10 flex-1 rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-white outline-none focus:border-teal-400" value={tempGradeName} onChange={e => setTempGradeName(e.target.value)} />
                  <button onClick={addGradeToForm} className="min-h-10 rounded-lg bg-teal-500 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-teal-400">Add</button>
                </div>

                <div className="space-y-4">
                  {programForm.grades?.map((grade, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                      <div className="flex justify-between items-center mb-3">
                        {editingGradeId === grade.id ? (
                          <div className="flex flex-1 gap-2 mr-2">
                            <input className="flex-1 bg-slate-900 border border-blue-500 rounded px-2 py-1 text-sm text-white" value={editGradeName} onChange={(e) => setEditGradeName(e.target.value)} autoFocus />
                            <button onClick={() => {
                              const name = editGradeName.trim();
                              if (!name) {
                                setFormError('A level name cannot be empty.');
                                return;
                              }
                              const ng = [...(programForm.grades || [])];
                              ng[idx].name = name;
                              setProgramForm({ ...programForm, grades: ng });
                              setEditingGradeId(null);
                              setFormError('');
                            }} className="text-xs bg-emerald-600 px-2 rounded text-white font-bold">Save</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{grade.name}</span>
                            <button onClick={() => { setEditingGradeId(grade.id); setEditGradeName(grade.name); }} className="text-slate-500 hover:text-blue-400 transition-colors"><Pencil size={14} /></button>
                          </div>
                        )}
                        <button onClick={() => { const ng = [...(programForm.grades || [])]; ng.splice(idx, 1); setProgramForm({ ...programForm, grades: ng }); }} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {grade.groups.map((grp, gIdx) => (
                          <div key={gIdx} className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800/50 group/item hover:border-slate-700">
                            {editingGroupId === grp.id ? (
                              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(100px,1fr)_110px_90px_86px_auto]">
                                <input aria-label="Group name" className="min-h-9 rounded-lg border border-teal-400/40 bg-slate-800 px-2 text-white" value={editGroup.name || ''} onChange={e => setEditGroup({ ...editGroup, name: e.target.value })} />
                                <select aria-label="Group day" className="min-h-9 rounded-lg border border-slate-700 bg-slate-800 px-2 text-white" value={editGroup.day || 'Monday'} onChange={e => setEditGroup({ ...editGroup, day: e.target.value })}>
                                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => <option key={day} value={day}>{day}</option>)}
                                </select>
                                <input aria-label="Group time" type="time" className="min-h-9 rounded-lg border border-slate-700 bg-slate-800 px-2 text-white" value={editGroup.time || '10:00'} onChange={e => setEditGroup({ ...editGroup, time: e.target.value })} />
                                <input aria-label="Group capacity" title="Seat capacity" type="number" min={1} max={200} step={1} placeholder="Seats" className="min-h-9 rounded-lg border border-slate-700 bg-slate-800 px-2 text-white" value={editGroup.capacity ?? ''} onChange={e => setEditGroup({ ...editGroup, capacity: e.target.value ? Number(e.target.value) : undefined })} />
                                <button onClick={() => {
                                  if (!editGroup.name?.trim() || !editGroup.day || !editGroup.time) {
                                    setFormError('A group needs a name, day, and time.');
                                    return;
                                  }
                                  if (editGroup.capacity !== undefined && (!Number.isInteger(editGroup.capacity) || editGroup.capacity < 1 || editGroup.capacity > 200)) {
                                    setFormError('Group capacity must be a whole number between 1 and 200.');
                                    return;
                                  }
                                  const ng = [...(programForm.grades || [])];
                                  ng[idx].groups[gIdx] = { ...grp, ...editGroup, name: editGroup.name.trim() } as Group;
                                  setProgramForm({ ...programForm, grades: ng });
                                  setEditingGroupId(null);
                                  setFormError('');
                                }} className="min-h-9 rounded-lg bg-teal-500 px-3 text-[10px] font-bold text-slate-950">Save</button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-300 font-bold">{grp.name}</span>
                                  <span className="text-slate-500">{grp.day} {grp.time}</span>
                                  {grp.capacity && <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{grp.capacity} seats</span>}
                                  <button type="button" onClick={() => { setEditingGroupId(grp.id); setEditGroup(grp); }} aria-label={`Edit ${grp.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-teal-300"><Pencil size={12} /></button>
                                </div>
                                <button onClick={() => { const ng = [...(programForm.grades || [])]; ng[idx].groups.splice(gIdx, 1); setProgramForm({ ...programForm, grades: ng }); }} className="text-slate-600 hover:text-red-400"><X size={14} /></button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Group Row */}
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800/50">
                        <input placeholder="Group Name" className="flex-1 min-w-[100px] p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" value={tempGroup.name} onChange={e => setTempGroup({ ...tempGroup, name: e.target.value })} />
                        <select className="flex-1 min-w-[80px] p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" value={tempGroup.day} onChange={e => setTempGroup({ ...tempGroup, day: e.target.value })}>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}</select>
                        <input type="time" className="w-24 p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" value={tempGroup.time} onChange={e => setTempGroup({ ...tempGroup, time: e.target.value })} />
                        <input aria-label="New group capacity" title="Seat capacity" type="number" min={1} max={200} step={1} placeholder="Seats" className="w-20 rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-white" value={tempGroup.capacity ?? ''} onChange={e => setTempGroup({ ...tempGroup, capacity: e.target.value ? Number(e.target.value) : undefined })} />
                        <button onClick={() => addGroupToGrade(idx)} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"><Plus size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
                <h4 className="text-sm font-black text-white uppercase tracking-wide mb-3">Pricing Plans</h4>
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-3"><input placeholder="Plan name" className="min-h-10 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-white" value={tempPack.name} onChange={e => setTempPack({ ...tempPack, name: e.target.value })} /></div>
                  {programForm.type === 'Regular Program' ? (
                    <>
                      <div className="sm:col-span-2"><input min="0" type="number" placeholder="Annual price" className="min-h-10 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-white" value={tempPack.priceAnnual || ''} onChange={e => setTempPack({ ...tempPack, priceAnnual: Number(e.target.value) })} /></div>
                      <div className="sm:col-span-2"><input min="0" type="number" placeholder="Trimester price" className="min-h-10 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-white" value={tempPack.priceTrimester || ''} onChange={e => setTempPack({ ...tempPack, priceTrimester: Number(e.target.value) })} /></div>
                    </>
                  ) : (
                    <div className="sm:col-span-4"><input min="0" type="number" placeholder="Total price" className="min-h-10 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-white" value={tempPack.price || ''} onChange={e => setTempPack({ ...tempPack, price: Number(e.target.value) })} /></div>
                  )}
                  <div className="sm:col-span-3"><input min="0" type="number" placeholder="Promo price (optional)" className="min-h-10 w-full rounded-lg border border-dashed border-slate-700 bg-slate-950 p-2 text-xs text-white" value={tempPack.promoPrice || ''} onChange={e => setTempPack({ ...tempPack, promoPrice: Number(e.target.value) })} /></div>
                  <div className="flex gap-1 sm:col-span-2">
                    <button onClick={commitPack} className="min-h-10 flex-1 rounded-lg bg-teal-500 px-2 text-xs font-bold text-slate-950 transition-colors hover:bg-teal-400">
                      {editingPackIndex !== null ? 'Save' : 'Add'}
                    </button>
                    {editingPackIndex !== null && (
                      <button onClick={resetPackDraft} aria-label="Cancel pricing plan edit" className="min-h-10 w-9 rounded-lg bg-slate-800 text-white transition-colors hover:bg-slate-700"><X className="mx-auto" size={14} /></button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {programForm.packs?.map((p, i) => (
                    <div key={i} className={`group flex items-center justify-between rounded-lg border p-3 text-xs text-slate-300 ${editingPackIndex === i ? 'border-teal-400/50 bg-teal-400/10' : 'border-slate-800/50 bg-slate-950'}`}>
                      <div>
                        <span className="font-bold block">{p.name}</span>
                        {p.promoPrice && p.promoPrice > 0 && <span className="text-[10px] text-red-400 font-bold">Promo: {formatCurrency(p.promoPrice)}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono mr-2">{p.priceAnnual ? `${formatCurrency(p.priceAnnual)}` : formatCurrency(p.price || 0)}</span>
                        <button onClick={() => { setTempPack(p); setEditingPackIndex(i); }} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => { const newRes = [...(programForm.packs || [])]; newRes.splice(i, 1); setProgramForm({ ...programForm, packs: newRes }); }} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
        </div>

        {formError && (
          <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 shrink-0" size={17} /> {formError}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-800/50 pt-4 sm:flex-row sm:justify-end">
          <AtlasActionButton onClick={() => setProgramModalOpen(false)} disabled={isSaving}>Cancel</AtlasActionButton>
          <AtlasActionButton icon={Save} variant="primary" onClick={() => handleSaveProgram()} disabled={isSaving}>
            {isSaving ? 'Saving program...' : 'Save program'}
          </AtlasActionButton>
        </div>
      </Modal>

      {/* QR Code Modal for Kiosk */}
      {qrProgram && (
        <Modal isOpen={!!qrProgram} onClose={() => setQrProgram(null)} title="Kiosk Access Link" size="md">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white">{qrProgram.name}</h3>
            <p className="text-sm text-slate-400">Scan to open the public enrollment form</p>
          </div>

          <div className="mb-6 flex justify-center rounded-lg border border-slate-200 bg-[#F7F1E4] p-4">
            <QRCodeSVG value={buildPublicEnrollmentUrl(qrProgram.id)} size={200} />
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.open(buildPublicEnrollmentUrl(qrProgram.id), '_blank', 'noopener,noreferrer')}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-teal-500 py-3 font-bold text-slate-950 transition-colors hover:bg-teal-400"
            >
              <Tablet size={18} /> Open Kiosk Mode
            </button>
            <button
              onClick={() => copyEnrollmentLink(qrProgram)}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] py-3 font-bold text-slate-200 transition-colors hover:bg-white/[0.08]"
            >
              {copiedProgramId === qrProgram.id ? <Check size={18} /> : <Copy size={18} />}
              {copiedProgramId === qrProgram.id ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        </Modal>
      )}

      {/* Hidden Print Renderer */}
      <div className="absolute left-0 top-0 h-0 overflow-hidden" aria-hidden="true">
        <div ref={printComponentRef}>
          {printTargetProgram && (
            <FormTemplateRenderer program={printTargetProgram} />
          )}
        </div>
      </div>

      {/* Devis Modal */}
      <Modal isOpen={isDevisModalOpen} onClose={() => setIsDevisModalOpen(false)} title={`Generate Devis: ${devisTargetProgram?.name}`} size="md">
        {devisTargetProgram && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Parent / Client Name</label>
              <input 
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-white outline-none focus:border-teal-400"
                value={devisConfig.parentName}
                onChange={e => setDevisConfig(prev => ({ ...prev, parentName: e.target.value }))}
                placeholder="e.g., M. Dupont" 
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Child Name (Optional)</label>
              <input 
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-white outline-none focus:border-teal-400"
                value={devisConfig.childName}
                onChange={e => setDevisConfig(prev => ({ ...prev, childName: e.target.value }))}
                placeholder="e.g., Leo" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Session Details / Dates (Optional)</label>
              <textarea 
                className="h-20 w-full resize-none rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-white outline-none focus:border-teal-400"
                value={devisConfig.sessionDetails}
                onChange={e => setDevisConfig(prev => ({ ...prev, sessionDetails: e.target.value }))}
                placeholder="e.g., Du 15 Juillet au 25 Juillet, Lundi au Vendredi..." 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Select Packs to Include</label>
              {devisTargetProgram.packs.length === 0 && (
                <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-200">
                  Add a pricing plan to this program before generating a quote.
                </div>
              )}
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                {devisTargetProgram.packs.map((pack, idx) => {
                  const isSelected = devisConfig.selectedPacks.includes(pack.name);
                  const price = devisTargetProgram.type === 'Regular Program' ? (pack.priceAnnual || pack.price || 0) : (pack.price || 0);
                  return (
                    <label key={idx} className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${isSelected ? 'border-teal-400 bg-teal-400/10' : 'border-slate-800 bg-slate-950 hover:bg-slate-900'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        <span className="text-sm font-bold text-white">{pack.name}</span>
                      </div>
                      <span className="text-sm font-mono text-slate-400">{formatCurrency(price)}</span>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={isSelected} 
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDevisConfig(prev => ({ ...prev, selectedPacks: [...prev.selectedPacks, pack.name] }));
                          } else {
                            setDevisConfig(prev => ({ ...prev, selectedPacks: prev.selectedPacks.filter(p => p !== pack.name) }));
                          }
                        }} 
                      />
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Discount Amount (Optional)</label>
              <input 
                type="number"
                min="0"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-white outline-none focus:border-teal-400"
                value={devisConfig.discount || ''}
                onChange={e => setDevisConfig(prev => ({ ...prev, discount: Number(e.target.value) }))}
                placeholder="e.g., 500" 
              />
            </div>
            {devisError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200">
                <AlertCircle className="mt-0.5 shrink-0" size={15} /> {devisError}
              </div>
            )}
            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 mt-6">
              <button onClick={() => setIsDevisModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white font-medium">Cancel</button>
              <button 
                onClick={generateQuote}
                disabled={devisConfig.selectedPacks.length === 0}
                className="flex min-h-10 items-center gap-2 rounded-lg bg-teal-500 px-6 py-2 font-bold text-slate-950 transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText size={18} /> Generate Devis
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Hidden Devis Print Renderer */}
      <div style={{ display: 'none' }}>
        <div ref={devisPrintComponentRef}>
          {devisTargetProgram && (
            <DevisTemplateRenderer 
              program={devisTargetProgram} 
              settings={settings}
              parentName={devisConfig.parentName}
              childName={devisConfig.childName}
              sessionDetails={devisConfig.sessionDetails}
              selectedPacks={devisConfig.selectedPacks}
              discount={devisConfig.discount}
            />
          )}
        </div>
      </div>
    </div>
  );
};
