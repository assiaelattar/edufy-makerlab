import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfirmProvider, useConfirm } from '../../context/ConfirmContext';
import './confirm-modal-v1.css';

const params = new URLSearchParams(location.search);
const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
document.body.dataset.eduTheme = theme;
document.body.className = 'education-ui-v1-active';
document.documentElement.style.colorScheme = theme;

function Fixture() {
  const { confirm, alert } = useConfirm();
  const [result, setResult] = useState('No decision yet');
  const [pending, setPending] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const longMessage = 'Review the complete details before continuing.\n' + 'This line demonstrates long dialog content and internal scrolling. '.repeat(90);
  const ask = async (variant, title, message = 'Only synthetic fixture state changes after this decision.') => {
    const approved = await confirm({ title, message, variant, confirmText: variant === 'danger' ? 'Remove record' : 'Approve', cancelText: 'Keep record' });
    setResult(approved ? `${title}: approved` : `${title}: canceled`);
  };
  const show = async (variant) => { await alert(`${variant} alert`, `This ${variant} alert is synthetic.`, variant); setResult(`${variant} alert acknowledged`); };
  const calendar = async () => {
    const approved = await confirm({ title:'Remove instructor assignment?', message:'Ms Rivera will be removed from Robotics on 20 October.', confirmText:'Remove assignment', cancelText:'Keep assignment', variant:'warning' });
    setResult(approved ? 'Calendar assignment removed (synthetic)' : 'Calendar assignment retained (synthetic)');
  };
  const finance = async () => {
    const approved = await confirm({ title:'Reconcile enrollment balances?', message:'2 enrollments differ from cleared payment history. Update only those tenant records?', confirmText:'Reconcile balances', cancelText:'Cancel', variant:'warning' });
    if (!approved) { setResult('Finance reconciliation canceled (synthetic)'); return; }
    setPending(true); setResult('Finance reconciliation pending (synthetic)');
    window.setTimeout(() => { setPending(false); setResult('Finance save failed; no record changed (synthetic)'); alert('Reconciliation failed', 'The synthetic save failed. Retry later.', 'danger'); }, 700);
  };
  return <main className="fixture-page" data-edu-system="1" data-edu-theme={theme}>
    <h1>Shared confirmation and alert review</h1>
    <p>Isolated fixture: all decisions and outcomes stay in memory.</p>
    <div className="fixture-grid">
      <section><h2>Confirmation variants</h2><button onClick={() => ask('info','Approve information?')}>Info confirm</button><button onClick={() => ask('success','Complete this step?')}>Success confirm</button><button onClick={() => ask('warning','Review schedule change?')}>Warning confirm</button><button onClick={() => ask('danger','Remove record?')}>Danger confirm</button><button onClick={() => ask('warning','Long review message',longMessage)}>Long message</button></section>
      <section><h2>Alert variants</h2>{['info','success','warning','danger'].map(variant => <button key={variant} onClick={() => show(variant)}>{variant} alert</button>)}</section>
      <section><h2>Representative callers</h2><button onClick={calendar} disabled={restricted}>Calendar remove assignment</button><button onClick={finance} disabled={restricted || pending}>Finance reconcile and fail</button><label><input type="checkbox" checked={restricted} onChange={event => setRestricted(event.target.checked)} /> Restricted role (actions disabled)</label><span aria-live="polite">{pending ? 'Saving…' : 'Ready'}</span></section>
    </div>
    <output aria-live="polite">{result}</output>
  </main>;
}
createRoot(document.getElementById('root')).render(<ConfirmProvider><Fixture /></ConfirmProvider>);
