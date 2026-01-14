import React, { useState } from 'react';
import { Key, UserPlus, Loader2, RefreshCw, Printer, MessageCircle } from 'lucide-react';
import { Student } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';

interface AccessAndAccountsTabProps {
  student: Student;
  handleGenerateAccess: () => void;
  handleCreateParentAccess: () => void;
  isGeneratingAccess: boolean;
  generateAccessCardPrint: (student: Student, settings: any) => void;
  shareCredentialsWhatsApp: () => void;
  setCredentialsModal: (modal: { isOpen: boolean; data: any }) => void;
  settings: any;
  isAdult?: boolean;
}

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
  const { impersonateUser } = useAuth();
  const { navigateTo } = useAppContext();
  const [showPassword, setShowPassword] = useState(false);
  const [showParentPassword, setShowParentPassword] = useState(false);

  return (
    <div className="space-y-6">
      {/* STUDENT ACCESS CARD */}
      <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-5 relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            <Key size={14} /> {isAdult ? 'MakerPro Portal Access' : 'Student Portal Access'}
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
              <div className="text-white font-mono text-sm select-all">{student.loginInfo.email}</div>
            </div>
            <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50">
              <div className="flex justify-between items-center mb-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Password</div>
                <button onClick={() => setShowPassword(!showPassword)} className="text-[10px] text-indigo-400 hover:text-white">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="text-white font-mono text-sm select-all">
                {showPassword ? student.loginInfo.initialPassword || '********' : '••••••••'}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
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
              onClick={handleGenerateAccess}
              disabled={isGeneratingAccess}
              className="w-full mt-2 py-2 bg-indigo-950/30 hover:bg-indigo-900/50 text-indigo-300 text-xs font-bold rounded border border-indigo-900/30 flex items-center justify-center gap-1 transition-colors"
            >
              {isGeneratingAccess ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}{' '}
              Regenerate / Reset Access
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-500 text-xs italic mb-3">Account not generated yet.</p>
            <button
              onClick={handleGenerateAccess}
              disabled={isGeneratingAccess}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2"
            >
              {isGeneratingAccess ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />} Generate
              Access
            </button>
          </div>
        )}

        {/* MASQUERADE BUTTON - ADMIN ONLY */}
        {student.loginInfo?.uid && (
          <div className="mt-4 pt-4 border-t border-indigo-900/30">
            <button
              onClick={async () => {
                if (!student.loginInfo?.uid) return;

                if (confirm(`You are about to log in as ${student.name} (Student). \n\nYou will see exactly what they see. \n\nTo return to Admin, you must Sign Out.`)) {
                  await impersonateUser(student.loginInfo.uid, student.loginInfo.email, 'student');
                  navigateTo('dashboard', {});
                }
              }}
              className="w-full py-2 bg-slate-900 hover:bg-indigo-900/50 text-slate-400 hover:text-indigo-400 text-xs font-bold rounded border border-slate-800 hover:border-indigo-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <UserPlus size={14} /> Log in as Student (Simulate)
            </button>
          </div>
        )}
      </div>

      {/* NEW: PARENT ACCESS SECTION */}
      {!isAdult && (
        <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-5">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
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
                <div className="text-white font-mono text-sm select-all">{student.parentLoginInfo.email}</div>
              </div>
              <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Password</div>
                  <button
                    onClick={() => setShowParentPassword(!showParentPassword)}
                    className="text-[10px] text-indigo-400 hover:text-white"
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
                onClick={handleCreateParentAccess}
                disabled={isGeneratingAccess}
                className="w-full mt-2 py-2 bg-indigo-950/30 hover:bg-indigo-900/50 text-indigo-300 text-xs font-bold rounded border border-indigo-900/30 flex items-center justify-center gap-1 transition-colors"
              >
                {isGeneratingAccess ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}{' '}
                Regenerate / Reset Access
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-500 text-xs italic mb-3">Create a separate login for the parent.</p>
              <button
                onClick={handleCreateParentAccess}
                disabled={isGeneratingAccess}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2"
              >
                {isGeneratingAccess ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />} Create Parent
                Account
              </button>
            </div>
          )}

          {/* MASQUERADE BUTTON - ADMIN ONLY */}
          {student.parentLoginInfo && (
            <div className="mt-4 pt-4 border-t border-indigo-900/30">
              {!student.parentLoginInfo.uid ? (
                <div className="text-center">
                  <p className="text-xs text-amber-500 font-bold mb-1">Feature Unavailable</p>
                  <p className="text-[10px] text-slate-500">
                    This is a legacy account (missing UID). Please click "Regenerate / Reset Access" above to enable parent login simulation.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      if (!student.parentLoginInfo?.uid) return;

                      if (confirm(`You are about to log in as ${student.parentName || 'Parent'}. \n\nYou will see exactly what they see (Real Data). \n\nTo return to Admin, you must Sign Out.`)) {
                        await impersonateUser(student.parentLoginInfo.uid, student.parentLoginInfo.email, 'parent');
                        navigateTo('dashboard', {}); // Parent dashboard is the default 'dashboard' view for parent role
                      }
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-400 text-xs font-bold rounded border border-slate-800 hover:border-emerald-500/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <UserPlus size={14} /> Log in as Parent (Simulate)
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
    </div>
  );
};
