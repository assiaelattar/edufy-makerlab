import React, { useEffect, useState } from 'react';
import { Key, UserPlus, Loader2, RefreshCw, Printer, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { Student } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../../components/Modal';
import { useConfirm } from '../../context/ConfirmContext';
interface AccessAndAccountsTabProps {
  student: Student;
  handleGenerateAccess: () => void;
  handleCreateParentAccess: (email: string) => void;
  isGeneratingAccess: boolean;
  generateAccessCardPrint: (student: Student, settings: any) => void;
  shareCredentialsWhatsApp: () => void;
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
  isGeneratingAccess,
  generateAccessCardPrint,
  shareCredentialsWhatsApp,
  setCredentialsModal,
  settings,
  isAdult = false,
}) => {
  const { impersonateUser, currentOrganization } = useAuth();
  const { navigateTo } = useAppContext();
  const { confirm, alert: showAlert } = useConfirm();
  const [showPassword, setShowPassword] = useState(false);
  const [showParentPassword, setShowParentPassword] = useState(false);

  // New PIN State
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isParentEmailModalOpen, setIsParentEmailModalOpen] = useState(false);
  const [parentEmailInput, setParentEmailInput] = useState(student.parentLoginInfo?.email || '');
  const isParentEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmailInput.trim());

  useEffect(() => {
    setParentEmailInput(student.parentLoginInfo?.email || '');
    setShowPassword(false);
    setShowParentPassword(false);
    setShowPin(false);
  }, [student.id, student.parentLoginInfo?.email]);

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
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <button
                onClick={() => generateAccessCardPrint(student, settings)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors border border-slate-700"
              >
                <Printer size={12} /> Print Card
              </button>
              <button
                onClick={shareCredentialsWhatsApp}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors"
              >
                <MessageCircle size={12} /> WhatsApp
              </button>
            </div>
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

        {/* MASQUERADE BUTTON - ADMIN ONLY */}
        {student.loginInfo?.uid && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <button
              onClick={async () => {
                if (!student.loginInfo?.uid) return;

                const isConfirmed = await confirm({
                  title: 'Open student portal',
                  message: `You will enter the portal as ${student.name}. Sign out to return to the admin workspace.`,
                  variant: 'warning',
                  confirmText: 'Open portal'
                });
                if (isConfirmed) {
                  try {
                    await impersonateUser(student.loginInfo.uid, student.loginInfo.email, 'student');
                    navigateTo('dashboard', {});
                  } catch (error) {
                    console.error('Could not open student portal:', error);
                    await showAlert('Student portal did not open', 'The account session could not be started. Refresh and try again.', 'danger');
                  }
                }
              }}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-bold text-slate-400 transition-colors hover:border-teal-400/30 hover:text-teal-300"
            >
              <UserPlus size={14} /> Open student portal
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
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Parent Login Email</div>
                <div className="break-all font-mono text-sm text-white select-all">{student.parentLoginInfo.email}</div>
              </div>
              <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Password</div>
                  <button
                    onClick={() => setShowParentPassword(!showParentPassword)}
                    className="text-[10px] font-bold text-teal-300 hover:text-white"
                  >
                    {showParentPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="text-white font-mono text-sm select-all">
                  {showParentPassword ? student.parentLoginInfo.initialPassword || '********' : '••••••••'}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() =>
                    setCredentialsModal({
                      isOpen: true,
                      data: {
                        name: student.parentName || 'Parent',
                        email: student.parentLoginInfo!.email,
                        pass: student.parentLoginInfo!.initialPassword || '',
                        role: 'Parent',
                      },
                    })
                  }
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors border border-slate-700"
                >
                  <Printer size={12} /> Print / Share
                </button>
              </div>
              <button
                onClick={() => setIsParentEmailModalOpen(true)}
                disabled={isGeneratingAccess}
                className="mt-2 flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                {isGeneratingAccess ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}{' '}
                Change linked email
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-500 text-xs italic mb-3">Create a separate login for the parent.</p>
              <button
                onClick={() => setIsParentEmailModalOpen(true)}
                disabled={isGeneratingAccess}
                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-teal-300/30 bg-teal-500 px-3 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-teal-400"
              >
                {isGeneratingAccess ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />} Create Parent
                Account
              </button>
            </div>
          )}

          {/* MASQUERADE BUTTON - ADMIN ONLY */}
          {student.parentLoginInfo && (
            <div className="mt-4 border-t border-white/10 pt-4">
              {!student.parentLoginInfo.uid ? (
                <div className="text-center">
                  <p className="text-xs text-amber-500 font-bold mb-1">Feature Unavailable</p>
                  <p className="text-[10px] text-slate-500">
                    This legacy account is missing a user ID. Use "Change linked email" above to repair the portal link.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      if (!student.parentLoginInfo?.uid) return;

                      const isConfirmed = await confirm({
                        title: 'Open parent portal',
                        message: `You will enter the portal as ${student.parentName || 'this parent'}. Sign out to return to the admin workspace.`,
                        variant: 'warning',
                        confirmText: 'Open portal'
                      });
                      if (isConfirmed) {
                        try {
                          await impersonateUser(student.parentLoginInfo.uid, student.parentLoginInfo.email, 'parent');
                          navigateTo('dashboard', {});
                        } catch (error) {
                          console.error('Could not open parent portal:', error);
                          await showAlert('Parent portal did not open', 'The account session could not be started. Refresh and try again.', 'danger');
                        }
                      }
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-400 text-xs font-bold rounded border border-slate-800 hover:border-emerald-500/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <UserPlus size={14} /> Open parent portal
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-2">
                    View the portal as this parent. Use "Sign Out" to return.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
      {/* PARENT EMAIL MODAL */}
      <Modal isOpen={isParentEmailModalOpen} onClose={() => setIsParentEmailModalOpen(false)} title="Parent Account Email">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Please enter the parent's email address. If they already have an account, they will be linked automatically.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              value={parentEmailInput} 
              onChange={(e) => setParentEmailInput(e.target.value)}
              aria-invalid={parentEmailInput.length > 0 && !isParentEmailValid}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30"
              placeholder="parent@example.com"
            />
            {parentEmailInput.length > 0 && !isParentEmailValid && <p className="mt-1 text-xs text-amber-300">Enter a complete email address.</p>}
          </div>
          <button 
            onClick={() => {
              setIsParentEmailModalOpen(false);
              handleCreateParentAccess(parentEmailInput.trim());
            }}
            disabled={!isParentEmailValid || isGeneratingAccess}
            className="min-h-10 w-full rounded-lg border border-teal-300/30 bg-teal-500 px-4 py-2.5 font-bold text-slate-950 transition-colors hover:bg-teal-400 disabled:opacity-50"
          >
            Confirm & Proceed
          </button>
        </div>
      </Modal>

    </div>
  );
};
