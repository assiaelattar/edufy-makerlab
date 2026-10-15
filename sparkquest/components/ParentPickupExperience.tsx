import React from 'react';
import { CalendarDays, Clock3, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
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
  view: 'status' | 'notes';
  onViewChange: (view: 'status' | 'notes') => void;
}

export const ParentPickupExperience: React.FC<Props> = ({ child, parentUid, organizationId, currentParentName, onRefresh, previewMode, view, onViewChange }) => {
  const workshop = child.operations.workshop;
  const pickup = child.operations.pickup;
  const next = workshop.status === 'ready' ? workshop.data.next : null;
  const date = next ? dateParts(next.date) : null;
  const first = child.name.trim().split(/\s+/)[0] || 'Votre enfant';

  return <div className={`pf-pickup-experience is-${view}`}>
    <ParentPickupControl child={child} parentUid={parentUid} organizationId={organizationId} currentParentName={currentParentName} initialSource={pickup} previewMode={previewMode} view={view} onViewChange={onViewChange} />
    {view === 'status' && <>
      <section className="pf-pickup-workshop" aria-labelledby="pf-next-workshop-title">
        <div className="pf-pickup-workshop-icon"><CalendarDays size={23} /></div>
        <div className="pf-pickup-workshop-copy"><span>SON PROCHAIN ATELIER</span><h2 id="pf-next-workshop-title">{next && date ? `${date.weekday} ${date.day} ${date.month}` : 'Date à confirmer'}</h2><p>{next ? `${next.programName}${next.groupName ? ` · ${next.groupName}` : ''}` : workshop.status === 'error' ? 'Le planning ne peut pas être chargé pour le moment.' : `Le prochain créneau de ${first} n’est pas encore visible.`}</p>
          {next && <div className="pf-pickup-workshop-meta"><span><Clock3 size={16} /> {next.startTime}{next.endTime ? ` – ${next.endTime}` : ''}</span>{next.locationName && <span><MapPin size={16} /> {next.locationName}</span>}</div>}
        </div>
      </section>
      <details className="pf-pickup-more"><summary>Planning et sécurité de la remise</summary><div><p>La date et les horaires viennent du groupe enregistré. MakerLab peut confirmer un changement de planning.</p><p><ShieldCheck size={17} /> Seule l’équipe MakerLab vérifie l’identité et enregistre la remise physique de l’enfant.</p></div></details>
      {!previewMode && <button type="button" className="pf-pickup-refresh" onClick={onRefresh}><RefreshCw size={17} /> Actualiser le suivi</button>}
    </>}
  </div>;
};
