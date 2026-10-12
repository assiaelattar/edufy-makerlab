import React from 'react';
import { CalendarDays, Clock3, MapPin, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import type { FamilyChild } from '../hooks/useParentFamily';
import { ParentPickupControl } from './ParentPickupControl';
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

interface Props {
  child: FamilyChild;
  parentUid: string;
  organizationId: string;
  currentParentName?: string;
  onRefresh: () => void;
  previewMode: boolean;
}

export const ParentPickupExperience: React.FC<Props> = ({ child, parentUid, organizationId, currentParentName, onRefresh, previewMode }) => {
  const workshop = child.operations.workshop;
  const pickup = child.operations.pickup;
  const next = workshop.status === 'ready' ? workshop.data.next : null;
  const date = next ? dateParts(next.date) : null;
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

    <div className="pf-pickup-live-control">
      <ParentPickupControl child={child} parentUid={parentUid} organizationId={organizationId} currentParentName={currentParentName} initialSource={pickup} previewMode={previewMode} />
    </div>
    {!previewMode && <button type="button" className="pf-pickup-refresh" onClick={onRefresh}><RefreshCw size={18} /> Actualiser le suivi</button>}
    <p className="pf-pickup-readonly"><ShieldCheck size={18} /> L’équipe MakerLab reste la seule autorisée à vérifier l’identité et à enregistrer la remise physique de l’enfant.</p>
  </div>;
};
