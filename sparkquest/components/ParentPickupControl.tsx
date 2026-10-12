import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Car,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  isCanonicalPickupEntry,
  pickupEntryId,
  pickupSessionDate,
  previousPickupDate,
  selectOpenPickup,
  type PickupStatus,
} from '../../modules/pickup/domain/pickupLifecycle';
import type { FamilyPickupSummary, FamilySource } from '../domain/parentFamilyOperations';
import type { FamilyChild } from '../hooks/useParentFamily';
import { db } from '../services/firebase';
import { advanceParentPickup, announceParentPickup } from '../services/parentPickupCommands';
import './parent-pickup-control.css';

type ParentAction = 'announce' | 'arrive' | 'cancel' | 'confirm';

interface PickupRecord {
  id: string;
  organizationId: string;
  studentId: string;
  studentName?: string;
  parentName?: string;
  parentUid?: string;
  pickerName?: string;
  sessionDate?: string;
  sessionId?: string;
  status: PickupStatus | 'waiting';
}

interface Props {
  child: FamilyChild;
  parentUid: string;
  organizationId: string;
  currentParentName?: string;
  initialSource: FamilySource<FamilyPickupSummary>;
  previewMode?: boolean;
}

const steps = [
  { status: 'on_the_way', label: 'En route', icon: Car },
  { status: 'arrived', label: 'Sur place', icon: MapPin },
  { status: 'released', label: 'Remise équipe', icon: ShieldCheck },
  { status: 'confirmed', label: 'Terminé', icon: CheckCircle2 },
] as const;

const statusPosition = (status?: string) => steps.findIndex(step => step.status === status);
const activeStatuses = ['waiting', 'on_the_way', 'arrived', 'released'];

const friendlyError = (error: unknown) => {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('permission-denied')) return 'L’accès à la sortie a changé. Demandez à l’académie de vérifier le lien familial.';
  if (code.includes('failed-precondition')) return 'Le suivi attend son index Firestore. Demandez à l’académie de terminer la mise en service.';
  if (code.includes('unavailable') || code.includes('network')) return 'Le suivi en direct ne peut pas se connecter. Vérifiez la connexion puis réessayez.';
  return error instanceof Error ? error.message : 'Le suivi n’a pas pu être mis à jour. Actualisez puis réessayez.';
};

const previewRecord = (
  source: FamilySource<FamilyPickupSummary>, child: FamilyChild, organizationId: string, parentUid: string,
): PickupRecord | null => {
  if (source.status !== 'ready' || !source.data.status) return null;
  const { status, sessionDate, pickerName, initiatedByCurrentGuardian } = source.data;
  return {
    id: pickupEntryId(organizationId, child.id, sessionDate),
    organizationId,
    studentId: child.id,
    studentName: child.name,
    parentName: child.pickupProfile?.parentName,
    parentUid: initiatedByCurrentGuardian === false ? 'another-guardian' : parentUid,
    pickerName: pickerName || undefined,
    sessionDate,
    sessionId: 'daily',
    status,
  };
};

export const ParentPickupControl: React.FC<Props> = ({
  child,
  parentUid,
  organizationId,
  currentParentName,
  initialSource,
  previewMode = false,
}) => {
  const [sessionDate, setSessionDate] = useState(() => pickupSessionDate());
  const [entry, setEntry] = useState<PickupRecord | null>(() => previewMode
    ? previewRecord(initialSource, child, organizationId, parentUid)
    : null);
  const [conflicts, setConflicts] = useState<PickupRecord[]>([]);
  const [loading, setLoading] = useState(!previewMode);
  const [readError, setReadError] = useState<string | null>(initialSource.status === 'error' ? initialSource.reason : null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<ParentAction | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const allowed = child.permissions.includes('pickup') && Boolean(child.pickupProfile?.active);
  const pickerOptions = useMemo(() => Array.from(new Set([
    child.pickupProfile?.parentName,
    ...(child.pickupProfile?.authorizedPickups || []),
  ].map(name => name?.trim()).filter((name): name is string => Boolean(name)))), [child.pickupProfile]);
  const [pickerName, setPickerName] = useState(pickerOptions[0] || '');
  const canConfirmReceipt = Boolean(entry?.pickerName && currentParentName &&
    entry.pickerName.trim().toLocaleLowerCase() === currentParentName.trim().toLocaleLowerCase());

  useEffect(() => setPickerName(pickerOptions[0] || ''), [child.id, pickerOptions]);
  useEffect(() => {
    const timer = window.setInterval(() => setSessionDate(pickupSessionDate()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setActionError(null);
    setSuccess(null);
    setConflicts([]);
    if (previewMode) {
      setEntry(previewRecord(initialSource, child, organizationId, parentUid));
      setLoading(false);
      setReadError(initialSource.status === 'error' ? initialSource.reason : null);
      return;
    }
    if (!allowed || !db) {
      setEntry(null);
      setLoading(false);
      setReadError(!db && allowed ? 'Le suivi est indisponible car l’application ne peut pas se connecter.' : null);
      return;
    }

    let datedRecords: PickupRecord[] = [];
    let activeRecords: PickupRecord[] = [];
    let datedReady = false;
    let activeReady = false;
    let stopped = false;
    setLoading(true);
    setReadError(null);

    const sync = () => {
      if (stopped || !datedReady || !activeReady) return;
      const selected = selectOpenPickup(datedRecords, organizationId, child.id, sessionDate);
      const blockers = activeRecords.filter(record =>
        !isCanonicalPickupEntry(record) || (selected ? record.id !== selected.id : true));
      setEntry(selected);
      setConflicts(blockers);
      setLoading(false);
      setReadError(null);
    };
    const failed = (error: unknown) => {
      if (stopped) return;
      setLoading(false);
      setReadError(friendlyError(error));
    };

    const datedQuery = query(
      collection(db, 'pickup_queue'),
      where('organizationId', '==', organizationId),
      where('studentId', '==', child.id),
      where('sessionDate', 'in', [sessionDate, previousPickupDate(sessionDate)]),
    );
    const activeQuery = query(
      collection(db, 'pickup_queue'),
      where('organizationId', '==', organizationId),
      where('studentId', '==', child.id),
      where('status', 'in', activeStatuses),
    );
    const stopDated = onSnapshot(datedQuery, snapshot => {
      datedRecords = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PickupRecord));
      datedReady = true;
      sync();
    }, failed);
    const stopActive = onSnapshot(activeQuery, snapshot => {
      activeRecords = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PickupRecord));
      activeReady = true;
      sync();
    }, failed);
    return () => {
      stopped = true;
      stopDated();
      stopActive();
    };
  }, [allowed, child, initialSource, organizationId, parentUid, previewMode, retryKey, sessionDate]);

  const perform = async (action: ParentAction) => {
    if (pending || !allowed) return;
    setPending(action);
    setActionError(null);
    setSuccess(null);
    try {
      if (previewMode) {
        if (action === 'announce') {
          setEntry({
            id: pickupEntryId(organizationId, child.id, sessionDate), organizationId, studentId: child.id,
            studentName: child.name, parentName: child.pickupProfile?.parentName, parentUid, pickerName,
            sessionDate, sessionId: 'daily', status: 'on_the_way',
          });
        } else if (entry) {
          setEntry({ ...entry, status: action === 'arrive' ? 'arrived' : action === 'confirm' ? 'confirmed' : 'cancelled' });
        }
      } else if (action === 'announce') {
        if (conflicts.length) throw new Error('Une sortie précédente est encore ouverte. Demandez à l’académie de la régulariser avant de commencer celle d’aujourd’hui.');
        await announceParentPickup(db!, organizationId, child.id, parentUid, pickerName);
      } else {
        if (!entry || entry.status === 'waiting') throw new Error('Le suivi a changé. Actualisez puis réessayez.');
        const next = action === 'arrive' ? 'arrived' : action === 'confirm' ? 'confirmed' : 'cancelled';
        await advanceParentPickup(db!, organizationId, entry.id, parentUid, entry.status, next, cancelReason);
      }
      setSuccess(action === 'announce'
        ? 'L’équipe voit maintenant que la personne autorisée est en route.'
        : action === 'arrive'
          ? 'L’équipe voit maintenant que la personne autorisée est sur place.'
          : action === 'confirm'
            ? 'Réception confirmée. La remise d’aujourd’hui est terminée.'
            : 'La demande a été annulée et conservée dans l’historique.');
      if (action === 'cancel') {
        setShowCancel(false);
        setCancelReason('');
      }
    } catch (error) {
      setActionError(friendlyError(error));
    } finally {
      setPending(null);
    }
  };

  if (!allowed) return <section className="sq-pickup-control is-locked" aria-labelledby="sq-pickup-control-title">
    <div className="sq-pickup-control-head"><span><ShieldCheck size={21} /></span><div><p>Remise familiale sécurisée</p><h3 id="sq-pickup-control-title">Le suivi de sortie n’est pas activé</h3></div></div>
    <p>Demandez à l’académie d’activer l’autorisation de sortie pour {child.name}.</p>
  </section>;

  const position = statusPosition(entry?.status);
  const previousDay = Boolean(entry?.sessionDate && entry.sessionDate !== sessionDate);
  const title = !entry ? `Préparer la sortie de ${child.name}`
    : entry.status === 'on_the_way' ? 'L’équipe vous attend'
      : entry.status === 'arrived' ? 'La personne autorisée est sur place'
        : entry.status === 'released' ? `${child.name} a été remis par l’équipe`
          : entry.status === 'confirmed' ? 'Récupération terminée'
            : entry.status === 'cancelled' ? 'Sortie annulée'
              : 'Vérification nécessaire par l’équipe';

  return <section className="sq-pickup-control" aria-labelledby="sq-pickup-control-title">
    <div className="sq-pickup-control-head">
      <span><Car size={21} /></span>
      <div><p>{previousDay ? 'Ouvert depuis la veille' : 'Remise sécurisée du jour'} · {entry?.sessionDate || sessionDate}</p><h3 id="sq-pickup-control-title">{title}</h3></div>
      {entry?.pickerName && <em>{entry.pickerName}</em>}
    </div>

    <ol className="sq-pickup-progress" aria-label="Pickup progress">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return <li key={step.status} className={position >= index ? 'is-complete' : ''}><span><Icon size={15} /></span><small>{step.label}</small></li>;
      })}
    </ol>

    {loading && <div className="sq-pickup-message"><Loader2 className="sq-spin" size={19} /><span>Connexion au bureau de sortie…</span></div>}
    {readError && <div className="sq-pickup-message is-error" role="alert"><AlertCircle size={19} /><span>{readError}</span><button type="button" onClick={() => setRetryKey(value => value + 1)}><RefreshCw size={15} /> Réessayer</button></div>}
    {conflicts.length > 0 && <div className="sq-pickup-message is-warning" role="alert"><AlertCircle size={19} /><span>Une sortie précédente doit être régularisée par l’équipe. La nouvelle demande reste bloquée afin de protéger l’historique.</span></div>}
    {actionError && <div className="sq-pickup-message is-error" role="alert"><AlertCircle size={19} /><span>{actionError}</span></div>}
    {success && <div className="sq-pickup-message is-success" role="status"><CheckCircle2 size={19} /><span>{success}</span></div>}

    {!loading && !readError && <div className="sq-pickup-actions">
      {!entry && <>
        <label htmlFor={`sq-picker-${child.id}`}>Qui récupère {child.name} ?</label>
        {pickerOptions.length > 0 ? <select id={`sq-picker-${child.id}`} value={pickerName} onChange={event => setPickerName(event.target.value)}>
          {pickerOptions.map(name => <option key={name} value={name}>{name}</option>)}
        </select> : <p className="sq-pickup-inline-warning">Aucune personne autorisée n’est enregistrée. Demandez à l’académie de mettre la fiche à jour.</p>}
        <button type="button" className="sq-pickup-primary" onClick={() => void perform('announce')} disabled={pending !== null || conflicts.length > 0 || !pickerOptions.length}>
          {pending === 'announce' ? <Loader2 className="sq-spin" size={17} /> : <Car size={17} />} Je suis en route
        </button>
      </>}
      {entry?.status === 'on_the_way' && <>
        <p><Clock3 size={17} /> L’équipe voit que <strong>{entry.pickerName}</strong> est en route vers l’académie.</p>
        <button type="button" className="sq-pickup-primary" onClick={() => void perform('arrive')} disabled={pending !== null}>
          {pending === 'arrive' ? <Loader2 className="sq-spin" size={17} /> : <MapPin size={17} />} Je suis sur place
        </button>
      </>}
      {entry?.status === 'arrived' && <div className="sq-pickup-wait"><UserCheck size={22} /><div><strong>Merci d’attendre l’équipe d’accueil.</strong><p>L’équipe doit vérifier {entry.pickerName || 'la personne autorisée'} avant de remettre {child.name}.</p></div></div>}
      {entry?.status === 'released' && <>
        <div className="sq-pickup-wait is-released"><ShieldCheck size={22} /><div><strong>L’équipe a enregistré la remise physique.</strong><p>Confirmez uniquement lorsque {child.name} est bien avec la personne autorisée.</p></div></div>
        {canConfirmReceipt ? <button type="button" className="sq-pickup-primary" onClick={() => void perform('confirm')} disabled={pending !== null}>
          {pending === 'confirm' ? <Loader2 className="sq-spin" size={17} /> : <CheckCircle2 size={17} />} Confirmer la réception
        </button> : <p className="sq-pickup-inline-warning">{entry.pickerName || 'La personne autorisée'} a terminé la remise. Seule cette personne peut confirmer depuis son compte familial vérifié.</p>}
      </>}
      {entry?.status === 'confirmed' && <div className="sq-pickup-complete"><CheckCircle2 size={26} /><div><strong>La remise d’aujourd’hui est terminée.</strong><p>La remise par l’équipe et la confirmation familiale restent dans l’historique.</p></div></div>}
      {(entry?.status === 'cancelled' || entry?.status === 'exception') && <div className="sq-pickup-wait"><AlertCircle size={22} /><div><strong>{entry.status === 'cancelled' ? 'Cette sortie a été annulée.' : 'Une vérification par l’équipe est nécessaire.'}</strong><p>Contactez l’académie avant tout départ avec {child.name}.</p></div></div>}

      {entry && ['on_the_way', 'arrived'].includes(entry.status) && <div className="sq-pickup-cancel">
        {!showCancel ? <button type="button" onClick={() => setShowCancel(true)}>Annuler cette sortie</button> : <>
          <label htmlFor={`sq-pickup-reason-${child.id}`}>Pourquoi cette sortie est-elle annulée ?</label>
          <textarea id={`sq-pickup-reason-${child.id}`} rows={2} minLength={8} maxLength={500} value={cancelReason} onChange={event => setCancelReason(event.target.value)} />
          <div><button type="button" className="sq-pickup-danger" disabled={pending !== null || cancelReason.trim().length < 8} onClick={() => void perform('cancel')}>Confirmer l’annulation</button><button type="button" onClick={() => setShowCancel(false)}>Conserver la sortie</button></div>
        </>}
      </div>}
    </div>}
  </section>;
};
