import React, { useEffect, useState } from 'react';
import { Key, UserPlus, Loader2, RefreshCw, Printer, MessageCircle, Mail, Eye, EyeOff } from 'lucide-react';
import { Student } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/Modal';
import { useConfirm } from '../../context/ConfirmContext';
interface AccessAndAccountsTabProps {
  student: Student;
  handleGenerateAccess: () => void;
  handleCreateParentAccess: (action: 'issue' | 'link' | 'reset', reuseParentUid?: string, aliasBasis?: string, relationshipVerified?: boolean) => void;
  parentAccounts: Array<{ uid: string; email: string; parentName: string; childName: string; childId: string }>;
  isGeneratingAccess: boolean;
  generateAccessCardPrint: (student: Student, settings: any) => void;
  shareAccount: (role: 'student' | 'parent', channel: 'email' | 'whatsapp') => void;
  setCredentialsModal: (modal: { isOpen: boolean; data: any }) => void;
  settings: any;
  isAdult?: boolean;
}

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export const AccessAndAccountsTab: React.FC<AccessAndAccountsTabProps> = ({
  student,
  handleGenerateAccess,
  handleCreateParentAccess,
  parentAccounts,
  isGeneratingAccess,
  generateAccessCardPrint,
  shareAccount,
  setCredentialsModal,
  settings,
  isAdult = false,
}) => {
  const { currentOrganization, userProfile } = useAuth();
  const canManageParentAccess = ['super_admin', 'owner', 'admin'].includes(userProfile?.role || '');
  const { confirm, alert: showAlert } = useConfirm();
  const [showPassword, setShowPassword] = useState(false);

  // New PIN State
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isParentChoiceModalOpen, setIsParentChoiceModalOpen] = useState(false);
  const [reuseParentUid, setReuseParentUid] = useState('');
  const [aliasBasis, setAliasBasis] = useState(student.parentName || '');
  const [relationshipVerified, setRelationshipVerified] = useState(false);
  const selectedParentAccount = parentAccounts.find(account => account.uid === reuseParentUid);
  const aliasPreview = aliasBasis.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 48).replace(/\.+$/, '');

  useEffect(() => {
    setReuseParentUid('');
    setAliasBasis(student.parentName || '');
    setRelationshipVerified(false);
    setShowPassword(false);
    setShowPin(false);
  }, [student.id, student.parentName]);

  const handleGeneratePin = async () => {
    if (student.organizationId && currentOrganization?.id && student.organizationId !== currentOrganization.id) {
      await showAlert('Record is outside this organization', 'Refresh the student directory before changing this classroom PIN.', 'danger');
      return;
    }
    if (student.pinCode) {
      const shouldRegenerate = await confirm({
        title: 'Regenerate classroom PIN',
        message: 'The current PIN will stop working immediately.',
        variant: 'warning',
        confirmText: 'Regenerate PIN'
      });
      if (!shouldRegenerate) return;
    }
    try {
      setIsUpdatingPin(true);
      if (!db) {
        throw new Error("Database not initialized");
      }
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();

      await updateDoc(doc(db, 'students', student.id), {
        pinCode: newPin
      });
      await showAlert('Classroom PIN ready', `The new classroom PIN is ${newPin}.`, 'success');
    } catch (err) {
      console.error(err);
      await showAlert('Could not generate PIN', 'The classroom PIN was not updated. Please try again.', 'danger');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* STUDENT ACCESS CARD */}
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-slate-900/55 p-4">
        <div className="flex justify-between items-start mb-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300">
            <Key size={14} /> Learner portal access
          </h3>
          {student.loginInfo ? (
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/50 font-bold">
              ACTIVE
            </span>
          ) : (
            <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-bold">
              NO ACCESS
            </span>
          )}
        </div>

        {student.loginInfo ? (
          <div className="space-y-3">
            <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Login Email</div>
              <div className="break-all font-mono text-sm text-white select-all">{student.loginInfo.email}</div>
            </div>
            <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50">
              <div className="flex justify-between items-center mb-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Password</div>
                <button onClick={() => setShowPassword(!showPassword)} className="text-[10px] font-bold text-teal-300 hover:text-white">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="text-white font-mono text-sm select-all">
                {showPassword ? student.loginInfo.initialPassword || '********' : '••••••••'}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => generateAccessCardPrint(student, settings)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors border border-slate-700"
              >
                <Printer size={12} /> Print Card
              </button>
              <button
                onClick={() => shareAccount('student', 'email')}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors border border-slate-700"
              >
                <Mail size={12} /> Email
              </button>
              <button
                onClick={() => shareAccount('student', 'whatsapp')}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors"
              >
                <MessageCircle size={12} /> WhatsApp
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Choose a channel to open a ready message. Review the recipient before sending.</p>
            <button
              disabled
              title="Secure password reset requires the server-side account administration service"
              className="mt-2 flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <RefreshCw size={12} /> Password reset requires admin service
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-500 text-xs italic mb-3">Account not generated yet.</p>
            <button
              onClick={handleGenerateAccess}
              disabled={isGeneratingAccess}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-teal-300/30 bg-teal-500 px-3 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-teal-400"
            >
              {isGeneratingAccess ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />} Generate
              Access
            </button>
          </div>
        )}

      </div>

      {/* NEW: CLASSROOM PIN (KIOSK MODE) */}
      <div className="rounded-lg border border-white/10 bg-slate-900/55 p-4">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Key size={14} /> Classroom PIN (Kiosk Mode)
          </h3>
          {student.pinCode ? (
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/50 font-bold">SET</span>
          ) : (
            <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-bold">NOT SET</span>
          )}
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 text-white font-mono text-xl tracking-widest min-w-[100px] text-center">
            {student.pinCode ? (showPin ? student.pinCode : '••••') : '----'}
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <button onClick={() => setShowPin(!showPin)} className="flex min-h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition-colors hover:text-white" title={showPin ? 'Hide PIN' : 'Show PIN'} aria-label={showPin ? 'Hide PIN' : 'Show PIN'}>
              {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button onClick={handleGeneratePin} disabled={isUpdatingPin} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700 sm:flex-none">
              {isUpdatingPin ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {student.pinCode ? 'Regenerate PIN' : 'Generate PIN'}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          This 4-digit PIN allows the student to log in quickly from the Classroom Kiosk mode without needing their email/password.
        </p>
      </div>

      {/* NEW: PARENT ACCESS SECTION */}
      {!isAdult && (
        <div className="rounded-lg border border-white/10 bg-slate-900/55 p-4">
          <div className="flex justify-between items-start mb-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300">
              <UserPlus size={14} /> Parent Access
            </h3>
            {student.parentLoginInfo ? (
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/50 font-bold">
                ACTIVE
              </span>
            ) : (
              <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-bold">
                NO ACCESS
              </span>
            )}
          </div>

          {student.parentLoginInfo ? (
            <div className="space-y-3">
              <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">SparkQuest parent login ID</div>
                <div className="break-all font-mono text-sm text-white select-all">{student.parentLoginInfo.email}</div>
              </div>
              <div className="rounded border border-teal-300/15 bg-teal-400/[0.06] p-3 text-xs leading-5 text-slate-300">
                This login ID is not an email inbox. The password appears once when staff issue or reset it; no setup email is sent. It opens the read-only family journey in SparkQuest.
              </div>
              <button
                onClick={() => handleCreateParentAccess('reset')}
                disabled={isGeneratingAccess || !canManageParentAccess}
                className="mt-2 flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                {isGeneratingAccess ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}{' '}
                Issue new password
              </button>
              <button type="button" onClick={() => shareAccount('parent', 'whatsapp')} className="flex min-h-11 w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 text-xs font-bold text-white hover:bg-emerald-500"><MessageCircle size={14} /> Share SparkQuest sign-in by WhatsApp</button>
              <p className="text-[11px] text-slate-400">This shares the SparkQuest address and login ID only. Share a new password from the one-time credentials card.</p>
            </div>
          ) : (
            <div className="text-center py-4">
            <p className="text-slate-500 text-xs italic mb-3">Issue a SparkQuest family login and one-time password. No working email inbox is required.</p>
              <button
                onClick={() => { setRelationshipVerified(false); setIsParentChoiceModalOpen(true); }}
                disabled={isGeneratingAccess || !canManageParentAccess}
                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-teal-300/30 bg-teal-500 px-3 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-teal-400"
              >
                {isGeneratingAccess ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />} Create Parent
                Account
              </button>
            </div>
          )}

        </div>
      )}
      <Modal isOpen={isParentChoiceModalOpen} onClose={() => setIsParentChoiceModalOpen(false)} title="Parent access">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Verify the real parent first. The login alias can differ from their full name; choosing an existing parent links this learner to that exact account.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Recorded parent full name</span>
            <strong>{student.parentName?.trim() || 'Missing — update the learner record first'}</strong>
          </div>
          <label className="block text-xs font-bold uppercase text-slate-400" htmlFor="parent-alias-basis">Login alias basis</label>
          <input id="parent-alias-basis" value={aliasBasis} onChange={event => setAliasBasis(event.target.value)} maxLength={80} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-white" placeholder="Ajlane" />
          <p className="text-xs text-slate-300">Preview: <strong className="break-all text-teal-300">{aliasPreview ? `p.${aliasPreview}@makerlab.academy` : 'Enter an alias basis'}</strong>. An existing login gets a numeric suffix.</p>
          <p className="text-xs text-slate-400">This email-shaped ID is for SparkQuest sign-in only. It does not need to receive messages.</p>
          <label className="flex items-start gap-2 text-xs leading-5 text-slate-300"><input type="checkbox" checked={relationshipVerified} onChange={event => setRelationshipVerified(event.target.checked)} className="mt-1" />I verified the real parent identity and this learner’s relationship. I am not relying on a shared surname.</label>
          <button 
            onClick={() => {
              setIsParentChoiceModalOpen(false);
              handleCreateParentAccess('issue', undefined, aliasBasis, relationshipVerified);
            }}
            disabled={!student.parentName?.trim() || !aliasPreview || !relationshipVerified || isGeneratingAccess || !canManageParentAccess}
            className="min-h-10 w-full rounded-lg border border-teal-300/30 bg-teal-500 px-4 py-2.5 font-bold text-slate-950 transition-colors hover:bg-teal-400 disabled:opacity-50"
          >
            Issue new parent login
          </button>
          {!student.parentName?.trim() && <p className="text-xs text-amber-300">Add the parent name to this learner record first.</p>}
          {parentAccounts.length > 0 && <div className="border-t border-white/10 pt-4">
            <label className="mb-2 block text-xs font-bold uppercase text-slate-400">Link an existing parent login</label>
            <select value={reuseParentUid} onChange={event => setReuseParentUid(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-white">
              <option value="">Choose the exact account</option>
              {parentAccounts.map(account => <option key={account.uid} value={account.uid}>{account.email} · {account.parentName || 'Parent name missing'} · {account.childName}</option>)}
            </select>
            {selectedParentAccount && <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300">
              <p><strong className="text-white">Recorded parent:</strong> {selectedParentAccount.parentName || 'Missing on source learner'}</p>
              <p><strong className="text-white">Source learner:</strong> {selectedParentAccount.childName} ({selectedParentAccount.childId})</p>
              <p className="break-all"><strong className="text-white">Exact parent UID:</strong> {selectedParentAccount.uid}</p>
              <p className="mt-2 text-amber-200">Confirm this is the same real parent of {student.name}. The login recorded on another learner is a candidate; the service checks its active parent profile and guardian link.</p>
            </div>}
            <button type="button" disabled={!reuseParentUid || !relationshipVerified || isGeneratingAccess || !canManageParentAccess} onClick={() => { setIsParentChoiceModalOpen(false); handleCreateParentAccess('link', reuseParentUid, undefined, relationshipVerified); }} className="mt-3 min-h-10 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 text-sm font-bold text-white disabled:opacity-50">Link selected parent</button>
          </div>}
        </div>
      </Modal>

    </div>
  );
};
