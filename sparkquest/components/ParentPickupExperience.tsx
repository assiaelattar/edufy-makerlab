import React from 'react';
import { CalendarDays, CarFront, Check, CircleAlert, Clock3, MapPin, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import type { FamilyChild } from '../hooks/useParentFamily';
import type { PickupStatus } from '../../modules/pickup/domain/pickupLifecycle';
import './parent-pickup-experience.css';

const dateParts = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(date),
    weekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(date),
    full: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
  };
};

const pickupCopy: Record<PickupStatus, { title: string; message: string; tone: string; stage: number }> = {
  on_the_way: { title: 'En route vers l’atelier', message: 'Le trajet vers MakerLab a été signalé.', tone: 'travel', stage: 0 },
  arrived: { title: 'Sur place à l’atelier', message: 'Une arrivée a été enregistrée. L’équipe poursuit la remise de votre enfant.', tone: 'arrived', stage: 1 },
  released: { title: 'Départ autorisé', message: 'L’équipe a autorisé le départ de votre enfant.', tone: 'released', stage: 2 },
  confirmed: { title: 'Récupération terminée', message: 'Le départ a été confirmé. À très bientôt pour le prochain atelier !', tone: 'confirmed', stage: 3 },
  cancelled: { title: 'Départ annulé', message: 'Ce suivi a été annulé. Contactez MakerLab si vous attendez une autre récupération.', tone: 'attention', stage: -1 },
  exception: { title: 'Vérification en cours', message: 'L’équipe vérifie ce départ. Contactez MakerLab si vous avez besoin d’une précision.', tone: 'attention', stage: -1 }
};
const stages = ['En route', 'Sur place', 'Autorisé', 'Terminé'];

export const ParentPickupExperience: React.FC<{ child: FamilyChild; onRefresh: () => void; previewMode: boolean }> = ({ child, onRefresh, previewMode }) => {
  const workshop = child.operations.workshop;
  const pickup = child.operations.pickup;
  const next = workshop.status === 'ready' ? workshop.data.next : null;
  const date = next ? dateParts(next.date) : null;
  const status = pickup.status === 'ready' && pickup.data.status ? pickupCopy[pickup.data.status] : null;
  const first = child.name.trim().split(/\s+/)[0] || 'Votre enfant';

  return <div className="pf-pickup-experience">
    <div className={`pf-pickup-ticket${next ? '' : ' is-empty'}`}>
      <div className="pf-pickup-ticket-top"><span><Sparkles size={16} /> PROCHAIN ATELIER PRÉVU</span><CalendarDays size={22} aria-hidden="true" /></div>
      {next && date ? <>
        <div className="pf-pickup-ticket-main"><div className="pf-pickup-calendar" aria-label={date.full}><strong>{date.day}</strong><span>{date.month}</span></div><div className="pf-pickup-ticket-message"><span className="pf-pickup-day">{date.weekday}</span><h2>{next.isUnderway ? 'Son atelier est en cours.' : 'On se retrouve bientôt !'}</h2><p>{first} a rendez-vous pour <b>{next.programName}</b>{next.groupName ? ` · ${next.groupName}` : ''}.</p></div></div>
        <div className="pf-pickup-ticket-details"><span><Clock3 size={18} /> {next.startTime}{next.endTime ? ` – ${next.endTime}` : ''}</span>{next.locationName && <span><MapPin size={18} /> {next.locationName}</span>}</div>
        <div className="pf-pickup-ticket-bottom"><span>FIN DE L’ATELIER PRÉVUE</span><strong>{next.endTime || 'Horaire non indiqué'}</strong></div>
      </> : <div className="pf-pickup-ticket-empty"><span className="pf-pickup-question">?</span><h2>Le prochain rendez-vous se prépare.</h2><p>{workshop.status === 'ready' ? 'Aucun créneau à venir n’est visible dans le planning enregistré de cet enfant.' : workshop.status === 'error' ? 'Le planning ne peut pas être chargé pour le moment.' : 'Le planning de cet enfant n’est pas accessible à ce compte.'}</p></div>}
    </div>
    <p className="pf-pickup-timetable-note"><CalendarDays size={16} /> {next ? 'Date et horaires issus du groupe enregistré. MakerLab peut confirmer tout changement de planning.' : 'Pour connaître la prochaine date, demandez confirmation à l’équipe MakerLab.'}</p>

    <section className="pf-pickup-tracking" aria-label="Suivi du départ"><div className="pf-pickup-tracking-head"><span className="pf-mini-label">{pickup.status === 'ready' && pickup.data.isPreviousDay ? 'DERNIER DÉPART ENREGISTRÉ' : 'SUIVI DU DÉPART'}</span>{pickup.status === 'ready' && <span className="pf-pickup-tracking-date">{dateParts(pickup.data.sessionDate)?.full || ''}</span>}</div>
      {pickup.status === 'ready' && status ? <><div className={`pf-pickup-status is-${status.tone}`}><span className="pf-pickup-status-icon">{status.tone === 'attention' ? <CircleAlert size={26} /> : status.tone === 'confirmed' ? <Check size={26} /> : <CarFront size={26} />}</span><div><h3>{status.title}</h3><p>{status.message}</p>{pickup.data.pickerName && <small>Personne indiquée · {pickup.data.pickerName}</small>}</div></div>{status.stage >= 0 && <div className="pf-pickup-stages" aria-label="Repères du départ">{stages.map((stage, index) => <span key={stage} className={index === status.stage ? 'is-current' : index < status.stage ? 'is-past' : ''}><i>{index < status.stage ? <Check size={13} /> : index + 1}</i><small>{stage}</small></span>)}</div>}</>
        : <div className="pf-pickup-no-status"><span className="pf-pickup-no-status-icon"><CarFront size={26} /></span><div><h3>{pickup.status === 'ready' ? 'Aucun départ en cours' : pickup.status === 'error' ? 'Suivi indisponible pour le moment' : 'Suivi non accessible'}</h3><p>{pickup.status === 'ready' ? 'Le suivi apparaîtra ici quand l’équipe enregistrera une étape de récupération.' : pickup.status === 'error' ? 'Réessayez ou demandez une mise à jour à MakerLab.' : 'Demandez à MakerLab de vérifier l’accès à la récupération.'}</p></div></div>}
      {pickup.status === 'ready' && pickup.data.isPreviousDay && <p className="pf-pickup-stale">Ce suivi date de la séance précédente. L’équipe MakerLab peut confirmer la situation actuelle.</p>}
    </section>

    {!previewMode && <button type="button" className="pf-pickup-refresh" onClick={onRefresh}><RefreshCw size={18} /> Actualiser le suivi</button>}
    <p className="pf-pickup-readonly"><ShieldCheck size={18} /> Pour modifier une personne autorisée ou organiser un départ, contactez directement l’équipe MakerLab.</p>
  </div>;
};
