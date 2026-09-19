import React, { type ReactNode } from 'react';
import { AlertCircle, ExternalLink, Loader2, LogOut, PlugZap, Sparkles } from 'lucide-react';
import { AtlasActionButton } from '../../components/atlas/AtlasSurface';
import { useSignInWithChatGPT } from './client';

interface ChatGPTModuleGateProps {
  children: ReactNode;
  featureName: string;
}

export const ChatGPTModuleGate = ({ children, featureName }: ChatGPTModuleGateProps) => {
  const connection = useSignInWithChatGPT();

  if (connection.status === 'signed-in') {
    return (
      <div className="space-y-3">
        {children}
        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />ChatGPT connected for this browser</span>
          <button type="button" onClick={() => void connection.logout()} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"><LogOut size={12} />Disconnect</button>
        </div>
      </div>
    );
  }

  if (connection.status === 'checking' || connection.status === 'starting' || connection.status === 'redirecting') {
    return (
      <div className="atlas-surface-muted flex min-h-32 items-center justify-center rounded-lg border p-5 text-center">
        <div><Loader2 size={22} className="mx-auto animate-spin text-teal-300" /><p className="mt-3 text-sm font-bold text-white">Checking the creative connection</p><p className="mt-1 text-xs text-slate-500">No generation starts during connection.</p></div>
      </div>
    );
  }

  if (connection.status === 'needs-extension') {
    return (
      <div className="atlas-surface-muted rounded-lg border p-4">
        <div className="flex gap-3"><PlugZap size={20} className="mt-0.5 shrink-0 text-amber-300" /><div><p className="text-sm font-black text-white">One browser connection is required</p><p className="mt-1 text-xs leading-5 text-slate-400">Install Sign in with ChatGPT, then return here. Edufy never stores the ChatGPT session.</p></div></div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={connection.installUrl} target="_blank" rel="noreferrer" className="atlas-action inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-bold" data-atlas-variant="primary">Install connection <ExternalLink size={15} /></a>
          <AtlasActionButton onClick={() => void connection.login()}>Try again</AtlasActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="atlas-surface-muted rounded-lg border p-4">
      <div className="flex gap-3">
        {connection.status === 'error' ? <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-300" /> : <Sparkles size={20} className="mt-0.5 shrink-0 text-teal-300" />}
        <div>
          <p className="text-sm font-black text-white">Connect ChatGPT for {featureName}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">This is separate from your Edufy account. Connecting does not generate anything or consume usage.</p>
          {connection.status === 'error' && <p role="alert" className="mt-2 text-xs text-red-200">{connection.error?.message || 'The connection could not be completed.'}</p>}
        </div>
      </div>
      <AtlasActionButton variant="primary" icon={PlugZap} onClick={() => void connection.login()} className="mt-4 w-full sm:w-auto">Connect ChatGPT</AtlasActionButton>
    </div>
  );
};
