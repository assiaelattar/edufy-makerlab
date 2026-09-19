import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, MessageCircle, Send, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../services/firebase';
import { normalizePhoneForWhatsApp } from '../../../utils/whatsappPhone';
import {
  ADMISSION_INTERACTION_OUTCOMES,
  buildAdmissionWhatsAppUrl,
  renderAdmissionWhatsAppTemplate,
  validateAdmissionMessageBody,
  type AdmissionActivity,
  type AdmissionCase,
  type AdmissionInteractionOutcome,
  type AdmissionWhatsAppConsentState,
  type AdmissionWhatsAppState,
} from '../domain';
import { recordAdmissionWhatsAppActivity } from '../application';
import {
  FirebaseAdmissionWhatsAppStore,
  loadAdmissionWhatsAppContext,
  type AdmissionWhatsAppContext,
} from '../infrastructure/firebaseAdmissionWhatsAppStore';

const STATE_LABELS: Record<AdmissionWhatsAppState, string> = {
  consent_updated: 'Consent updated',
  prepared: 'Message prepared',
  launched: 'WhatsApp opened',
  operator_confirmed_sent: 'Operator confirmed sent',
  operator_confirmed_not_sent: 'Operator confirmed not sent',
  parent_response_recorded: 'Parent response recorded',
};

const OUTCOME_LABELS: Record<AdmissionInteractionOutcome, string> = {
  connected: 'Connected / answered',
  no_answer: 'No answer',
  asked_to_follow_up: 'Asked for follow-up',
  interested: 'Interested',
  not_interested: 'Not interested',
  wrong_contact: 'Wrong contact',
};

const createCommandId = () => {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `wa_${Date.now().toString(36)}_${random}`;
};

const formatActivityTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const EducationAdmissionsWhatsAppAssistant = ({
  admissionCase,
  programName,
  isOpen,
  onClose,
}: {
  admissionCase: AdmissionCase;
  programName: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { currentOrganization, userProfile, roleDefinition, can } = useAuth();
  const [context, setContext] = useState<AdmissionWhatsAppContext | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [consentDraft, setConsentDraft] = useState<AdmissionWhatsAppConsentState>('unknown');
  const [responseOutcome, setResponseOutcome] = useState<AdmissionInteractionOutcome>('asked_to_follow_up');
  const [responseBody, setResponseBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<AdmissionWhatsAppState | null>(null);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const loadGeneration = useRef(0);

  const storedConsent = context?.consentState || 'unknown';
  const selectedTemplate = context?.templates.find(template => template.id === selectedTemplateId) || null;
  const messagePreview = useMemo(() => validateAdmissionMessageBody(messageBody), [messageBody]);
  const whatsappActivities = useMemo(
    () => (context?.activities || []).filter(activity => activity.channel === 'whatsapp'),
    [context?.activities],
  );

  const loadContext = async () => {
    const generation = ++loadGeneration.current;
    setContext(null);
    if (!db || !currentOrganization?.id || admissionCase.organizationId !== currentOrganization.id) {
      setError('This Admissions case is not available in the active organization.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const nextContext = await loadAdmissionWhatsAppContext(db, currentOrganization.id, admissionCase.id);
      if (generation !== loadGeneration.current) return;
      setContext(nextContext);
      setConsentDraft(nextContext.consentState);
      const firstTemplate = nextContext.templates[0] || null;
      setSelectedTemplateId(firstTemplate?.id || '');
      if (firstTemplate) {
        setMessageBody(renderAdmissionWhatsAppTemplate(firstTemplate, currentOrganization.id, {
          parentName: admissionCase.repairFlags.includes('missing_parent_name') ? '' : admissionCase.parentName,
          learnerName: admissionCase.repairFlags.includes('missing_lead_name') ? '' : admissionCase.learnerName,
          programName,
          academyName: currentOrganization.name,
        }).body);
      }
    } catch (loadError) {
      if (generation !== loadGeneration.current) return;
      console.error('Admissions WhatsApp context failed to load', loadError);
      setError('Templates and activity history could not be loaded. Try again before opening WhatsApp.');
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void loadContext();
    return () => { loadGeneration.current += 1; };
  }, [admissionCase.id, currentOrganization?.id, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'));
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleDialogKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!selectedTemplate || !currentOrganization?.id) return;
    setMessageBody(renderAdmissionWhatsAppTemplate(selectedTemplate, currentOrganization.id, {
      parentName: admissionCase.repairFlags.includes('missing_parent_name') ? '' : admissionCase.parentName,
      learnerName: admissionCase.repairFlags.includes('missing_lead_name') ? '' : admissionCase.learnerName,
      programName,
      academyName: currentOrganization.name,
    }).body);
  }, [admissionCase.id, currentOrganization?.id, currentOrganization?.name, programName, selectedTemplate]);

  const recordActivity = async (
    communicationState: AdmissionWhatsAppState,
    body: string,
    outcome: AdmissionInteractionOutcome | null,
    consentState: AdmissionWhatsAppConsentState = storedConsent,
    templateId: string = selectedTemplate?.id || 'custom',
    expectedVersion: number = context?.caseVersion || 0,
  ) => {
    if (!db || !context || !currentOrganization?.id || !userProfile?.uid || userProfile.status !== 'active' || !can('admissions.whatsapp')) {
      setError('You do not have permission to record WhatsApp activity.');
      throw new Error('You do not have permission to record WhatsApp activity.');
    }
    if (admissionCase.organizationId !== currentOrganization.id) throw new Error('The case belongs to another organization.');

    setSaving(communicationState);
    setError('');
    try {
      const result = await recordAdmissionWhatsAppActivity(
        { store: new FirebaseAdmissionWhatsAppStore(db) },
        {
          id: userProfile.uid,
          organizationId: currentOrganization.id,
          role: userProfile.role,
          status: 'active',
          permissions: roleDefinition?.permissions || [],
        },
        {
          commandId: createCommandId(),
          organizationId: currentOrganization.id,
          admissionCaseId: admissionCase.id,
          legacyLeadId: admissionCase.legacyLeadId,
          expectedVersion,
          communicationState,
          consentState,
          templateId,
          body,
          outcome,
        },
      );
      const occurredAt = new Date().toISOString();
      const localActivity: AdmissionActivity = {
        id: result.activityId,
        organizationId: currentOrganization.id,
        admissionCaseId: admissionCase.id,
        legacyLeadId: admissionCase.legacyLeadId,
        kind: 'follow_up',
        channel: 'whatsapp',
        body: body.trim(),
        outcome,
        communicationState,
        consentState,
        templateId,
        occurredAt,
        actorId: userProfile.uid,
        caseVersion: result.caseVersion,
        commandFingerprint: '',
        createdAt: occurredAt,
      };
      setContext(previous => previous ? {
        ...previous,
        consentState: communicationState === 'consent_updated' ? consentState : previous.consentState,
        caseVersion: result.caseVersion,
        activities: [localActivity, ...previous.activities],
      } : previous);
      return result;
    } catch (recordError) {
      const message = recordError instanceof Error ? recordError.message : 'The activity could not be recorded.';
      setError(message);
      throw recordError;
    } finally {
      setSaving(null);
    }
  };

  const saveConsent = async () => {
    try {
      await recordActivity(
        'consent_updated',
        `WhatsApp consent set to ${consentDraft.replace('_', ' ')} by the operator.`,
        null,
        consentDraft,
        'consent',
      );
    } catch {
      // The inline error keeps the failed state visible.
    }
  };

  const recordMessageState = async (state: 'prepared' | 'operator_confirmed_sent' | 'operator_confirmed_not_sent') => {
    try {
      await recordActivity(state, messagePreview.body, null);
    } catch {
      // The inline error keeps the failed state visible.
    }
  };

  const openWhatsApp = async () => {
    if (!db || !context || saving || !currentOrganization?.id || admissionCase.organizationId !== currentOrganization.id || !userProfile?.uid || userProfile.status !== 'active' || !can('admissions.whatsapp')) {
      setError('Reload this case with an active Admissions account before opening WhatsApp.');
      return;
    }
    if (storedConsent !== 'granted') {
      setError('Record granted consent before opening WhatsApp.');
      return;
    }
    let opened: Window | null = null;
    let navigated = false;
    setSaving('launched');
    try {
      const url = buildAdmissionWhatsAppUrl(normalizePhoneForWhatsApp(admissionCase.phone), messagePreview.body);
      opened = window.open('about:blank', '_blank');
      if (!opened) {
        setError('WhatsApp did not open. Allow pop-ups and try again; no launch was recorded.');
        return;
      }
      opened.opener = null;
      const latest = await loadAdmissionWhatsAppContext(db, currentOrganization.id, admissionCase.id);
      if (latest.consentState !== 'granted') {
        setContext(latest);
        setConsentDraft(latest.consentState);
        throw new Error('Consent changed. Review it before opening WhatsApp.');
      }
      opened.location.replace(url);
      navigated = true;
      await recordActivity('launched', messagePreview.body, null, latest.consentState, selectedTemplate?.id || 'custom', latest.caseVersion);
    } catch (openError) {
      if (!navigated) opened?.close();
      setError(navigated ? 'WhatsApp opened, but the launch could not be recorded. Reload the history before recording the result.' : openError instanceof Error ? openError.message : 'WhatsApp could not be opened.');
    } finally {
      setSaving(null);
    }
  };

  const saveResponse = async () => {
    try {
      await recordActivity('parent_response_recorded', responseBody, responseOutcome, storedConsent, 'parent_response');
      setResponseBody('');
    } catch {
      // The inline error keeps the failed state visible.
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edu-admissions-wa" role="dialog" aria-modal="true" aria-labelledby="admissions-wa-title" aria-describedby="admissions-wa-description">
      <button type="button" className="edu-admissions-wa__backdrop" tabIndex={-1} onClick={onClose} aria-label="Close WhatsApp assistant" />
      <section ref={dialogRef} className="edu-admissions-wa__panel" tabIndex={-1}>
        <header>
          <div><span><MessageCircle size={18} /></span><div><small>WhatsApp · assisted operation</small><h2 id="admissions-wa-title">Follow up with {admissionCase.parentName}</h2><p id="admissions-wa-description">Edufy records operator facts. It does not know delivery or read status.</p></div></div>
          <button type="button" onClick={onClose} aria-label="Close WhatsApp assistant"><X size={18} /></button>
        </header>

        {loading ? <div className="edu-admissions-wa__loading"><Loader2 size={20} className="animate-spin" /><span>Loading tenant templates and activity history…</span></div> : (
          <div className="edu-admissions-wa__grid">
            <div className="edu-admissions-wa__compose">
              {error && <div className="edu-admissions-wa__error" role="alert">{error}<button type="button" onClick={() => void loadContext()} disabled={saving !== null}>Reload history and consent</button></div>}

              <section className="edu-admissions-wa__consent">
                <div><strong>1. Consent</strong><span>Required before WhatsApp can be opened.</span></div>
                <div role="group" aria-label="WhatsApp consent">
                  {(['unknown', 'granted', 'opted_out'] as AdmissionWhatsAppConsentState[]).map(state => <button key={state} type="button" aria-pressed={consentDraft === state} data-state={state} onClick={() => setConsentDraft(state)}>{state === 'unknown' ? 'Unknown' : state === 'granted' ? 'Granted' : 'Opted out'}</button>)}
                </div>
                <button type="button" onClick={saveConsent} disabled={saving !== null || consentDraft === storedConsent}><ShieldCheck size={15} />{saving === 'consent_updated' ? 'Saving…' : 'Save consent'}</button>
              </section>

              <section className="edu-admissions-wa__message">
                <div><strong>2. Prepare and preview</strong><span>To: +{normalizePhoneForWhatsApp(admissionCase.phone) || 'phone missing'}</span></div>
                <label><span>Template</span><select value={selectedTemplateId} onChange={event => setSelectedTemplateId(event.target.value)}>{context?.templates.map(template => <option key={`${template.source}:${template.id}`} value={template.id}>{template.title}{template.source === 'tenant_library' ? ' · library' : ' · starter'}</option>)}</select></label>
                <label><span>Message preview</span><textarea value={messageBody} onChange={event => setMessageBody(event.target.value)} rows={7} /></label>
                {messagePreview.unresolvedTokens.length > 0 && <div className="edu-admissions-wa__tokens"><strong>Resolve before opening:</strong>{messagePreview.unresolvedTokens.map(token => <span key={token}>{token}</span>)}</div>}
                <div className="edu-admissions-wa__message-actions">
                  <button type="button" onClick={() => recordMessageState('prepared')} disabled={!messagePreview.ready || storedConsent === 'opted_out' || saving !== null}><CheckCircle2 size={15} />{saving === 'prepared' ? 'Recording…' : 'Record prepared'}</button>
                  <button type="button" className="primary" onClick={openWhatsApp} disabled={!messagePreview.ready || storedConsent !== 'granted' || saving !== null}><ExternalLink size={15} />{saving === 'launched' ? 'Recording launch…' : 'Open WhatsApp'}</button>
                </div>
                <div className="edu-admissions-wa__manual-result">
                  <span>After returning to Edufy:</span>
                  <button type="button" onClick={() => recordMessageState('operator_confirmed_sent')} disabled={!messagePreview.ready || storedConsent !== 'granted' || saving !== null}><Send size={14} />I sent it</button>
                  <button type="button" onClick={() => recordMessageState('operator_confirmed_not_sent')} disabled={!messagePreview.ready || saving !== null}>Not sent</button>
                </div>
              </section>

              <section className="edu-admissions-wa__response">
                <div><strong>3. Parent response</strong><span>Record the result without changing the pipeline stage.</span></div>
                <select aria-label="Parent response outcome" value={responseOutcome} onChange={event => setResponseOutcome(event.target.value as AdmissionInteractionOutcome)}>{ADMISSION_INTERACTION_OUTCOMES.map(outcome => <option key={outcome} value={outcome}>{OUTCOME_LABELS[outcome]}</option>)}</select>
                <textarea aria-label="Parent response notes" value={responseBody} onChange={event => setResponseBody(event.target.value)} rows={3} maxLength={2000} placeholder="What did the parent say? What should happen next?" />
                <button type="button" onClick={saveResponse} disabled={!responseBody.trim() || saving !== null}>{saving === 'parent_response_recorded' ? 'Recording…' : 'Record parent response'}</button>
              </section>
            </div>

            <aside className="edu-admissions-wa__history">
              <div><strong>Activity history</strong><span>{whatsappActivities.length} WhatsApp fact{whatsappActivities.length === 1 ? '' : 's'}</span></div>
              {whatsappActivities.length === 0 ? <p>No WhatsApp activity is recorded for this case.</p> : <ol>{whatsappActivities.map(activity => <li key={activity.id}><i data-state={activity.communicationState || 'prepared'} /><div><strong>{activity.communicationState ? STATE_LABELS[activity.communicationState] : 'WhatsApp activity'}</strong><small>{formatActivityTime(activity.occurredAt)} · {activity.consentState?.replace('_', ' ') || 'consent unknown'}</small><p>{activity.body}</p>{activity.outcome && <b>{OUTCOME_LABELS[activity.outcome]}</b>}</div></li>)}</ol>}
            </aside>
          </div>
        )}
      </section>
    </div>
  );
};
