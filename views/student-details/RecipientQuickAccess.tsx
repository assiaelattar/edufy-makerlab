import React, { useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, Link2, Loader2, MessageCircle, Printer, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '../../components/Modal';
import { Student } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { issueRecipientQuickLink, type RecipientQuickLink } from '../../services/recipientQuickAccess';
import { config } from '../../utils/config';
import { normalizePhoneForWhatsApp } from '../../utils/whatsappPhone';

type AccessMode = 'manual' | 'quick';

export const RecipientQuickAccess: React.FC<{ student: Student; role: 'parent' | 'student' }> = ({ student, role }) => {
  const { currentOrganization, userProfile } = useAuth();
  const { alert: showAlert } = useConfirm();
  const [mode, setMode] = useState<AccessMode | null>(null);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quickLink, setQuickLink] = useState<RecipientQuickLink | null>(null);
  const [clock, setClock] = useState(Date.now());
  const qrRef = useRef<HTMLDivElement>(null);
  const account = role === 'parent' ? student.parentLoginInfo : student.loginInfo;
  const manualUrl = new URL(role === 'parent' ? '?role=parent#login' : '#login', config.sparkQuestUrl).toString();
  const link = mode === 'quick' ? quickLink?.launchUrl : mode === 'manual' ? manualUrl : null;
  const expired = mode === 'quick' && !!quickLink && clock >= new Date(quickLink.expiresAt).getTime();
  const canIssue = ['super_admin', 'owner', 'admin'].includes(userProfile?.role || '') &&
    !!currentOrganization?.id && currentOrganization.id === student.organizationId && !!account?.uid;

  useEffect(() => {
    setMode(null);
    setQuickLink(null);
    setVerified(false);
  }, [student.id, role, account?.uid]);

  useEffect(() => {
    if (!quickLink || mode !== 'quick') return;
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [quickLink, mode]);

  const createQuickLink = async () => {
    if (!verified || !canIssue || !currentOrganization?.id) return;
    setBusy(true);
    try {
      const result = await issueRecipientQuickLink({ studentId: student.id, organizationId: currentOrganization.id, role });
      setQuickLink(result);
      setMode('quick');
    } catch (error) {
      await showAlert('Could not create quick access', error instanceof Error ? error.message : 'Try again.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!link || expired) return;
    try {
      await navigator.clipboard.writeText(link);
      await showAlert('Link copied', mode === 'quick' ? 'Share it with the verified recipient before it expires.' : 'The recipient will sign in with their account password.', 'success');
    } catch {
      await showAlert('Copy unavailable', 'Select the link shown on the card and copy it manually.', 'warning');
    }
  };

  const shareWhatsApp = async () => {
    if (!link || expired) return;
    const phone = normalizePhoneForWhatsApp(student.parentPhone);
    if (!phone) return void await showAlert('Phone missing', 'Add the verified parent phone number first.', 'warning');
    const message = mode === 'quick'
      ? `Your one-click SparkQuest ${role === 'parent' ? 'family' : 'learner'} access (use within 5 minutes, once only): ${link}`
      : `Open your SparkQuest ${role === 'parent' ? 'family' : 'learner'} sign-in: ${link}\nLogin ID: ${account?.email}\nUse your existing password.`;
    const popup = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    if (popup) popup.opener = null;
    else await showAlert('WhatsApp did not open', 'Allow pop-ups and try again.', 'warning');
  };

  const printCard = () => {
    if (!link || expired) return;
    const svg = qrRef.current?.querySelector('svg');
    const popup = window.open('', '_blank', 'width=480,height=680');
    if (!popup || !svg) return;
    popup.opener = null;
    const doc = popup.document;
    doc.title = 'SparkQuest access';
    const style = doc.createElement('style');
    style.textContent = 'body{font:16px system-ui;margin:32px;color:#11241f}main{max-width:360px;margin:auto;border:2px solid #1b8068;border-radius:18px;padding:24px}h1{font-size:22px}svg{display:block;margin:24px auto}p{line-height:1.5;overflow-wrap:anywhere}.url{font-size:11px}';
    doc.head.append(style);
    const main = doc.createElement('main');
    const heading = doc.createElement('h1');
    heading.textContent = `SparkQuest ${role === 'parent' ? 'family' : 'learner'} access`;
    main.append(heading, svg.cloneNode(true));
    for (const value of [
      mode === 'quick' ? 'One-click access: valid once for 5 minutes. Share only with the verified recipient.' : 'Scan to open the sign-in page. Enter the login ID and your password.',
      ...(mode === 'manual' ? [`Login ID: ${account?.email || ''}`] : []),
      link,
    ]) {
      const paragraph = doc.createElement('p');
      paragraph.textContent = value;
      if (value === link) paragraph.className = 'url';
      main.append(paragraph);
    }
    doc.body.append(main);
    popup.focus();
    popup.print();
  };

  if (!account?.email) return null;
  return <>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button type="button" onClick={() => { setMode('manual'); setQuickLink(null); }} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-teal-300/35 bg-teal-500/10 px-3 py-2 text-sm font-bold text-teal-100 hover:bg-teal-500/20">
        <QrCode size={17} /> Manual link & QR
      </button>
      <button type="button" disabled={!canIssue || busy} onClick={() => { setMode('quick'); setQuickLink(null); setVerified(false); }} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-teal-400 disabled:opacity-50">
        <Link2 size={17} /> One-click access
      </button>
    </div>
    {!canIssue && <p className="text-xs text-amber-200">One-click access needs an active linked account and an Edufy administrator in this organization.</p>}
    <Modal designSystem isOpen={mode !== null} onClose={() => { setMode(null); setQuickLink(null); }} title={mode === 'quick' ? 'One-click SparkQuest access' : 'Manual SparkQuest access'}>
      <div className="space-y-4 text-sm text-slate-200">
        {mode === 'quick' && !quickLink && <>
          <p>This creates a single-use link for the exact {role} account linked to <strong>{student.name}</strong>. It expires after five minutes. Anyone holding it before use can open that account.</p>
          <label className="flex items-start gap-2 leading-5"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} className="mt-1" />I verified the recipient’s identity and their relationship to this learner. I will share the link privately.</label>
          <button type="button" onClick={createQuickLink} disabled={!verified || busy || !canIssue} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 font-bold text-slate-950 disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" />}Create one-click link</button>
        </>}
        {link && <>
          <div ref={qrRef} className="mx-auto w-fit rounded-xl bg-white p-4"><QRCodeSVG value={link} size={196} level="M" /></div>
          <p className="break-all rounded-lg bg-slate-900 p-3 font-mono text-xs select-all">{link}</p>
          {mode === 'manual' ? <p>Reusable QR. Login ID: <strong className="select-all">{account.email}</strong>. The recipient enters their existing password.</p>
            : quickLink && <p>Single-use link, expires {new Date(quickLink.expiresAt).toLocaleTimeString()}. Share it only with the verified recipient. After it is used or expires, create a new one.</p>}
          {expired && <p className="text-amber-200">This link has expired. Create a new one.</p>}
          {expired && <button type="button" onClick={createQuickLink} disabled={!verified || busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 font-bold text-slate-950 disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" />}Create new one-click link</button>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={copyLink} disabled={!!expired} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-700 font-bold disabled:opacity-50"><Copy size={16} />Copy link</button>
            <button type="button" onClick={shareWhatsApp} disabled={!!expired} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 font-bold disabled:opacity-50"><MessageCircle size={16} />WhatsApp</button>
            <button type="button" onClick={printCard} disabled={!!expired} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-700 font-bold disabled:opacity-50"><Printer size={16} />Print QR</button>
            {mode === 'manual' && <a href={link} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-700 font-bold"><ExternalLink size={16} />Open login</a>}
          </div>
        </>}
      </div>
    </Modal>
  </>;
};
