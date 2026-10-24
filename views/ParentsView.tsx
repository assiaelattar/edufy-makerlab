import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Copy, CreditCard, FileDown, KeyRound, Link2,
  Loader2, Mail, Phone, RefreshCw, Search, ShieldCheck, UserRound, Users
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { AtlasCommandHeader, AtlasSignalCard } from '../components/atlas/AtlasSurface';
import {
  EducationBadge, EducationButton, EducationField, EducationNotice, EducationState,
  EducationStatusPill, EducationSurface
} from '../components/education-ui/EducationPrimitives';
import { Modal } from '../components/Modal';
import { getParentDirectory, manageParentAccess, type ParentDirectoryAccount } from '../services/parentAccess';
import { formatCurrency, generateParentStatementPrint, normalizePhone } from '../utils/helpers';
import { getEnrollmentFinancialSummary } from '../utils/enrollmentFinancials';
import type { Student } from '../types';

type FamilyRecord = {
  key: string;
  parentName: string;
  phone: string;
  contactEmail: string;
  students: Student[];
  account?: ParentDirectoryAccount;
  recordedLogin?: string;
  conflict: boolean;
};

const contactEmail = (student: Student) => {
  const legacyEmail = student.email && student.email !== student.loginInfo?.email && student.email !== student.parentLoginInfo?.email
    ? student.email
    : '';
  return (student.parentEmail || legacyEmail || '').trim().toLowerCase();
};

export const ParentsView = () => {
  const { students, enrollments, programs, settings, navigateTo } = useAppContext();
  const { can, currentOrganization } = useAuth();
  const { alert: showAlert } = useConfirm();
  const [directory, setDirectory] = useState<ParentDirectoryAccount[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [parentName, setParentName] = useState('');
  const [aliasBasis, setAliasBasis] = useState('');
  const [targetUid, setTargetUid] = useState('');
  const [relationshipVerified, setRelationshipVerified] = useState(false);
  const [working, setWorking] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string; count: number } | null>(null);

  const refreshDirectory = async () => {
    if (!currentOrganization?.id) {
      setDirectory([]);
      setDirectoryLoading(false);
      return;
    }
    setDirectoryLoading(true);
    setDirectoryError('');
    try {
      setDirectory(await getParentDirectory(currentOrganization.id));
    } catch (error) {
      setDirectoryError((error as Error).message);
    } finally {
      setDirectoryLoading(false);
    }
  };

  useEffect(() => { void refreshDirectory(); }, [currentOrganization?.id]);

  const familyRecords = useMemo(() => {
    const activeStudents = students.filter(student => student.status !== 'inactive' && student.organizationId === currentOrganization?.id);
    const studentById = new Map(activeStudents.map(student => [student.id, student]));
    const accountByUid = new Map(directory.map(account => [account.uid, account]));
    const linkedByUid = new Map<string, Student[]>();
    const phoneToUids = new Map<string, Set<string>>();

    activeStudents.forEach(student => {
      const uid = student.parentLoginInfo?.uid;
      const phone = normalizePhone(student.parentPhone || '');
      if (uid) {
        linkedByUid.set(uid, [...(linkedByUid.get(uid) || []), student]);
        if (phone) phoneToUids.set(phone, new Set([...(phoneToUids.get(phone) || []), uid]));
      }
    });
    directory.forEach(account => {
      const linked = account.children.map(child => studentById.get(child.id)).filter(Boolean) as Student[];
      if (linked.length) linkedByUid.set(account.uid, Array.from(new Map([...(linkedByUid.get(account.uid) || []), ...linked].map(item => [item.id, item])).values()));
    });

    const claimedUnassigned = new Set<string>();
    const records: FamilyRecord[] = Array.from(linkedByUid, ([uid, linked]) => {
      const phones = new Set(linked.map(student => normalizePhone(student.parentPhone || '')).filter(Boolean));
      const candidates = activeStudents.filter(student => {
        if (student.parentLoginInfo?.uid || claimedUnassigned.has(student.id)) return false;
        const phone = normalizePhone(student.parentPhone || '');
        return Boolean(phone && phones.has(phone) && phoneToUids.get(phone)?.size === 1);
      });
      candidates.forEach(student => claimedUnassigned.add(student.id));
      const account = accountByUid.get(uid);
      const combined = Array.from(new Map([...linked, ...candidates].map(student => [student.id, student])).values());
      return {
        key: `account:${uid}`,
        parentName: account?.parentName || linked[0]?.parentName || 'Parent access to review',
        phone: linked[0]?.parentPhone || candidates[0]?.parentPhone || '',
        contactEmail: combined.map(contactEmail).find(Boolean) || '',
        students: combined,
        account,
        recordedLogin: linked[0]?.parentLoginInfo?.email,
        conflict: Array.from(phones).some(phone => (phoneToUids.get(phone)?.size || 0) > 1)
      };
    });

    const remaining = activeStudents.filter(student => !student.parentLoginInfo?.uid && !claimedUnassigned.has(student.id));
    const contactGroups = new Map<string, Student[]>();
    remaining.forEach(student => {
      const phone = normalizePhone(student.parentPhone || '');
      const key = phone ? `contact:${phone}` : `learner:${student.id}`;
      contactGroups.set(key, [...(contactGroups.get(key) || []), student]);
    });
    contactGroups.forEach((group, key) => records.push({
      key,
      parentName: group.map(student => student.parentName).find(Boolean) || 'Parent contact to verify',
      phone: group[0]?.parentPhone || '',
      contactEmail: group.map(contactEmail).find(Boolean) || '',
      students: group,
      conflict: false
    }));

    return records.sort((a, b) => a.parentName.localeCompare(b.parentName));
  }, [students, directory, currentOrganization?.id]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return familyRecords;
    return familyRecords.filter(record => [record.parentName, record.phone, record.contactEmail, record.account?.email,
      ...record.students.map(student => student.name)].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [familyRecords, search]);

  const selected = familyRecords.find(record => record.key === selectedKey) || filteredRecords[0] || familyRecords[0];
  useEffect(() => {
    if (!selected) return;
    const unassigned = selected.students.filter(student => !student.parentLoginInfo?.uid).map(student => student.id);
    setSelectedKey(selected.key);
    setSelectedStudentIds(unassigned);
    setParentName(selected.account?.parentName || selected.parentName || '');
    setAliasBasis((selected.account?.parentName || selected.parentName || '').replace(/\s+family$/i, ''));
    setTargetUid(selected.account?.uid || '');
    setRelationshipVerified(false);
  }, [selected?.key]);

  const selectedEnrollments = useMemo(() => selected ? selected.students.map(student => ({
    student,
    enrollments: enrollments.filter(enrollment => enrollment.studentId === student.id && enrollment.status === 'active')
  })) : [], [selected, enrollments]);
  const totals = useMemo(() => selectedEnrollments.reduce((summary, child) => {
    child.enrollments.forEach(enrollment => {
      const finance = getEnrollmentFinancialSummary(enrollment, programs);
      summary.expected += finance.agreedAmount;
      summary.paid += Number(enrollment.paidAmount || 0);
      summary.balance += Math.max(0, Number(enrollment.balance ?? finance.agreedAmount - Number(enrollment.paidAmount || 0)));
    });
    return summary;
  }, { expected: 0, paid: 0, balance: 0 }), [selectedEnrollments, programs]);

  const statementData = selected ? {
    parentName: selected.parentName,
    phone: selected.phone,
    children: selectedEnrollments,
    totalExpected: totals.expected,
    totalPaid: totals.paid,
    totalBalance: totals.balance
  } : null;

  const runFamilyAction = async (mode: 'issueFamily' | 'linkFamily') => {
    if (!currentOrganization?.id || working || !can('students.edit')) return;
    if (!selectedStudentIds.length) {
      await showAlert('Select learners', 'Select at least one learner who does not already have parent access.', 'warning');
      return;
    }
    setWorking(true);
    try {
      const account = directory.find(item => item.uid === targetUid);
      const result = await manageParentAccess({
        action: mode,
        organizationId: currentOrganization.id,
        studentIds: selectedStudentIds,
        parentName: mode === 'linkFamily' ? account?.parentName : parentName,
        aliasBasis,
        relationshipVerified,
        reuseParentUid: mode === 'linkFamily' ? account?.uid : undefined,
        reuseParentEmail: mode === 'linkFamily' ? account?.email : undefined
      });
      if (result.password) setCredentials({ email: result.email, password: result.password, count: result.linkedLearnerCount || selectedStudentIds.length });
      await refreshDirectory();
      await showAlert('Parent access updated', `${result.linkedLearnerCount || selectedStudentIds.length} learner record${selectedStudentIds.length === 1 ? '' : 's'} now use ${result.email}.`, 'success');
    } catch (error) {
      await showAlert('Parent access could not be updated', (error as Error).message, 'danger');
    } finally {
      setWorking(false);
    }
  };

  const resetPassword = async () => {
    const linked = selected?.students.find(student => student.parentLoginInfo?.uid === selected.account?.uid);
    if (!linked || !selected?.account || !currentOrganization?.id || working) return;
    setWorking(true);
    try {
      const result = await manageParentAccess({
        action: 'reset', studentId: linked.id, organizationId: currentOrganization.id,
        parentName: selected.account.parentName, relationshipVerified
      });
      if (result.password) setCredentials({ email: result.email, password: result.password, count: result.linkedLearnerCount || 1 });
    } catch (error) {
      await showAlert('Password could not be issued', (error as Error).message, 'danger');
    } finally {
      setWorking(false);
    }
  };

  const verifiedCount = familyRecords.filter(record => record.account).length;
  const reviewCount = familyRecords.filter(record => !record.account).length;
  const conflictCount = familyRecords.filter(record => record.conflict).length;

  if (!can('students.view')) return <EducationState kind="restricted" title="Parents access restricted" description="Your role cannot view learner family records." />;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <AtlasCommandHeader eyebrow="Family operations" title="Parents" icon={Users}
        description="Verify one parent, link each learner explicitly, and manage family access and billing from one record."
        actions={<EducationButton icon={RefreshCw} onClick={() => void refreshDirectory()} disabled={directoryLoading}>Refresh accounts</EducationButton>} />

      <div className="grid gap-3 sm:grid-cols-3">
        <AtlasSignalCard label="Verified logins" value={verifiedCount} detail="Trusted parent accounts" icon={ShieldCheck} tone="emerald" />
        <AtlasSignalCard label="Contact groups" value={reviewCount} detail="Require staff verification" icon={UserRound} tone="amber" />
        <AtlasSignalCard label="Access conflicts" value={conflictCount} detail="Resolve learner by learner" icon={AlertTriangle} tone={conflictCount ? 'red' : 'slate'} />
      </div>

      {directoryError && <EducationNotice status="danger">{directoryError}</EducationNotice>}
      <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.65fr)]">
        <EducationSurface className="overflow-hidden">
          <div className="border-b border-slate-700/50 p-4">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <span className="sr-only">Search parents</span>
              <input className="w-full rounded-xl border border-slate-600 bg-slate-950/40 py-2.5 pl-10 pr-3 text-sm" value={search}
                onChange={event => setSearch(event.target.value)} placeholder="Parent, child, phone or email" />
            </label>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {directoryLoading && !familyRecords.length ? <EducationState kind="loading" title="Loading parents" description="Checking verified family accounts." /> :
              filteredRecords.length === 0 ? <EducationState title="No parent records" description="No matching family contacts were found." /> :
                filteredRecords.map(record => (
                  <button key={record.key} type="button" onClick={() => setSelectedKey(record.key)}
                    className={`mb-1 w-full rounded-xl border p-3 text-left transition ${selected?.key === record.key ? 'border-teal-400 bg-teal-400/10' : 'border-transparent hover:border-slate-600 hover:bg-slate-800/50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><strong className="block truncate text-sm">{record.parentName}</strong><span className="text-xs text-slate-400">{record.students.length} learner{record.students.length === 1 ? '' : 's'}</span></div>
                      {record.conflict ? <EducationBadge status="danger">Conflict</EducationBadge> : record.account ? <EducationBadge status="success">Login</EducationBadge> : <EducationBadge status="attention">Review</EducationBadge>}
                    </div>
                    <div className="mt-2 truncate text-xs text-slate-400">{record.account?.email || record.recordedLogin || record.contactEmail || record.phone || 'Contact missing'}</div>
                  </button>
                ))}
          </div>
        </EducationSurface>

        {!selected ? <EducationState title="Select a parent" description="Choose a family record to review its children and access." /> : (
          <div className="space-y-5">
            <EducationSurface className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black">{selected.parentName}</h3>{selected.account && <EducationBadge status="success" icon={ShieldCheck}>Verified account</EducationBadge>}</div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                    <span className="flex items-center gap-2"><Phone size={15} />{selected.phone || 'No phone'}</span>
                    <span className="flex items-center gap-2"><Mail size={15} />{selected.contactEmail || 'No contact email'}</span>
                  </div>
                  {selected.account && <p className="mt-3 text-sm"><span className="text-slate-400">MakerLab sign-in ID:</span> <strong>{selected.account.email}</strong></p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <EducationButton icon={CreditCard} onClick={() => navigateTo('finance')}>Open Finance</EducationButton>
                  <EducationButton icon={FileDown} disabled={!statementData} onClick={() => statementData && generateParentStatementPrint(statementData, settings, programs)}>Print statement</EducationButton>
                </div>
              </div>
            </EducationSurface>

            {selected.conflict && <EducationNotice status="danger">This contact phone appears on learners assigned to different parent logins. Verify the exact parent and use each learner’s Access tab to transfer or repair the record.</EducationNotice>}
            {!selected.account && selected.recordedLogin && !selected.conflict && <EducationNotice status="warning">This recorded login is not a verified generated MakerLab family account. Open the learner’s Access tab to repair or replace it after staff verification.</EducationNotice>}

            <div className="grid gap-3 sm:grid-cols-3">
              <AtlasSignalCard label="Agreed fees" value={formatCurrency(totals.expected)} icon={CreditCard} tone="blue" />
              <AtlasSignalCard label="Received" value={formatCurrency(totals.paid)} icon={CheckCircle2} tone="emerald" />
              <AtlasSignalCard label="Balance" value={formatCurrency(totals.balance)} icon={AlertTriangle} tone={totals.balance > 0 ? 'amber' : 'slate'} />
            </div>

            <EducationSurface className="overflow-hidden">
              <div className="border-b border-slate-700/50 p-4"><h3 className="font-black">Linked children</h3><p className="mt-1 text-sm text-slate-400">Phone and surname similarities are shown for review; access changes require an explicit learner selection.</p></div>
              <div className="divide-y divide-slate-700/50">
                {selected.students.map(student => {
                  const linked = Boolean(student.parentLoginInfo?.uid);
                  const canSelect = !linked && !selected.conflict;
                  return <div key={student.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex min-w-0 items-start gap-3">
                      <input type="checkbox" className="mt-1" disabled={!canSelect} checked={selectedStudentIds.includes(student.id)}
                        onChange={event => setSelectedStudentIds(ids => event.target.checked ? [...ids, student.id] : ids.filter(id => id !== student.id))} />
                      <span><strong className="block">{student.name}</strong><span className="mt-1 block text-xs text-slate-400">{linked ? student.parentLoginInfo?.email : 'No parent login assigned'}</span></span>
                    </label>
                    <div className="flex items-center gap-2">
                      <EducationStatusPill status={linked ? 'success' : 'attention'}>{linked ? 'Linked' : 'Ready to verify'}</EducationStatusPill>
                      <EducationButton variant="quiet" onClick={() => navigateTo('student-details', { studentId: student.id, studentTab: linked && (!selected.account || selected.conflict) ? 'Access' : 'Overview' })}>{linked && (!selected.account || selected.conflict) ? 'Resolve access' : 'Open profile'}</EducationButton>
                    </div>
                  </div>;
                })}
              </div>
            </EducationSurface>

            {can('students.edit') && !selected.conflict && (
              <EducationSurface className="p-5">
                <div className="mb-4"><h3 className="font-black">Parent access</h3><p className="mt-1 text-sm text-slate-400">The recorded contact email remains separate from the generated MakerLab sign-in ID.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <EducationField label="Verified parent name"><input value={parentName} onChange={event => setParentName(event.target.value)} /></EducationField>
                  <EducationField label="Login alias" hint="Used only when creating a new p.*@makerlab.academy ID."><input value={aliasBasis} onChange={event => setAliasBasis(event.target.value)} /></EducationField>
                  <EducationField label="Existing verified account" hint="Choose this to add the selected learners to an account already in this organization.">
                    <select value={targetUid} onChange={event => setTargetUid(event.target.value)}>
                      <option value="">Create a new family login</option>
                      {directory.map(account => <option key={account.uid} value={account.uid}>{account.parentName} — {account.email} ({account.children.length})</option>)}
                    </select>
                  </EducationField>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 p-3 text-sm">
                    <input type="checkbox" checked={relationshipVerified} onChange={event => setRelationshipVerified(event.target.checked)} />
                    I verified this parent’s identity and relationship to every selected learner.
                  </label>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <EducationButton variant="primary" icon={targetUid ? Link2 : KeyRound} disabled={working || !relationshipVerified || !selectedStudentIds.length || (!targetUid && (!parentName.trim() || !aliasBasis.trim()))}
                    onClick={() => void runFamilyAction(targetUid ? 'linkFamily' : 'issueFamily')}>
                    {working ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : targetUid ? `Link ${selectedStudentIds.length} to account` : `Create login for ${selectedStudentIds.length}`}
                  </EducationButton>
                  {selected.account && <EducationButton icon={KeyRound} disabled={working || !relationshipVerified} onClick={() => void resetPassword()}>Issue new password</EducationButton>}
                </div>
              </EducationSurface>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={Boolean(credentials)} onClose={() => setCredentials(null)} title="One-time parent credentials" designSystem>
        {credentials && <div className="space-y-4">
          <EducationNotice status="success">One login now covers {credentials.count} linked learner{credentials.count === 1 ? '' : 's'}. Share the password securely; it will not be stored in Edufy.</EducationNotice>
          <div className="rounded-xl border border-slate-700 p-4"><div className="text-xs uppercase text-slate-400">Sign-in ID</div><strong className="mt-1 block break-all">{credentials.email}</strong></div>
          <div className="rounded-xl border border-slate-700 p-4"><div className="text-xs uppercase text-slate-400">Temporary password</div><strong className="mt-1 block break-all font-mono text-lg">{credentials.password}</strong></div>
          <EducationButton variant="primary" icon={Copy} onClick={() => void navigator.clipboard.writeText(`MakerLab login: ${credentials.email}\nTemporary password: ${credentials.password}`)}>Copy credentials</EducationButton>
        </div>}
      </Modal>
    </div>
  );
};
