import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Layers3,
  Pencil,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';
import { AtlasActionButton, AtlasEmptyState, AtlasSectionHeader } from '../atlas/AtlasSurface';
import { ProgramOperationsPreview } from '../../utils/programOperations';
import { formatCurrency } from '../../utils/helpers';

interface ProgramOperationsPreviewProps {
  preview: ProgramOperationsPreview;
  onEditSetup?: () => void;
}

const presetLabels = {
  weekly_academy: 'Weekly academy',
  camp: 'Camp',
  bootcamp: 'Bootcamp',
  one_day_workshop: 'One-day workshop',
  workshop_series: 'Workshop series',
  school_term: 'School term',
  custom: 'Custom program'
} as const;

const billingLabels = {
  one_time: 'One time',
  weekly: 'Weekly',
  monthly: 'Monthly',
  term: 'Per term',
  semester: 'Per semester',
  annual: 'Annual'
} as const;

const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', options || {
  day: 'numeric',
  month: 'short'
}).format(new Date(`${value}T12:00:00`));

const formatTime = (value: string) => value.slice(11, 16);

export const ProgramOperationsPreviewPanel: React.FC<ProgramOperationsPreviewProps> = ({ preview, onEditSetup }) => {
  const groupsById = new Map(preview.groups.map(group => [group.id, group]));
  const nextOccurrences = preview.occurrences.slice(0, 6);
  const scheduledGroupIds = new Set(preview.scheduleBlocks.map(block => block.programGroupId));
  const scheduleReady = preview.groups.length > 0 && preview.groups.every(group => scheduledGroupIds.has(group.id));
  const capacityReady = preview.groups.length > 0 && preview.groups.every(group => group.capacity > 0);
  const offerReady = preview.pricingOffers.length > 0;
  const runDateLabel = `${formatDate(preview.run.startDate, { day: 'numeric', month: 'short', year: 'numeric' })} - ${formatDate(preview.run.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <section className="atlas-surface overflow-hidden rounded-lg border">
        <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="atlas-accent-well flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
              <CalendarRange size={19} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="atlas-text-strong text-base font-black">{preview.run.name}</p>
                <span className="rounded border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-black uppercase text-amber-200">Safe preview</span>
              </div>
              <p className="atlas-text-subtle mt-1 text-xs leading-5">Edufy translated the current setup into the adaptive run model. Nothing has been moved or saved.</p>
            </div>
          </div>
          {onEditSetup && <AtlasActionButton icon={Pencil} onClick={onEditSetup}>Edit current setup</AtlasActionButton>}
        </div>

        <dl className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-4 sm:divide-y-0">
          {[
            { label: 'Format', value: presetLabels[preview.run.formatPreset], detail: preview.run.status, icon: Sparkles },
            { label: 'Run dates', value: runDateLabel, detail: preview.run.timezone, icon: CalendarClock },
            { label: 'Delivery groups', value: `${preview.groups.length}`, detail: `${preview.scheduleBlocks.length} timetable${preview.scheduleBlocks.length === 1 ? '' : 's'}`, icon: Layers3 },
            { label: 'Family offers', value: `${preview.pricingOffers.length}`, detail: offerReady ? 'Ready to price' : 'Price required', icon: BadgeDollarSign }
          ].map(item => (
            <div key={item.label} className="min-h-[104px] p-3 sm:p-4">
              <div className="atlas-text-subtle flex items-center gap-1.5 text-[10px] font-black uppercase"><item.icon size={13} />{item.label}</div>
              <dd className="atlas-text-strong mt-2 break-words text-sm font-black">{item.value}</dd>
              <dd className="atlas-text-subtle mt-1 truncate text-xs capitalize">{item.detail}</dd>
            </div>
          ))}
        </dl>

        <div className="grid border-t border-white/10 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <div className="p-4 sm:p-5 lg:border-r lg:border-white/10">
            <AtlasSectionHeader
              title="Upcoming class preview"
              description="The first dates Edufy can generate from the current weekly timetable. Publishing will create the real occurrences later."
              icon={Clock3}
              meta={nextOccurrences.length ? <span className="text-xs font-black text-teal-300">Next {nextOccurrences.length}</span> : undefined}
            />
            {nextOccurrences.length ? (
              <div className="mt-4 divide-y divide-white/10">
                {nextOccurrences.map(occurrence => {
                  const group = groupsById.get(occurrence.programGroupId);
                  return (
                    <div key={occurrence.id} className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                      <div className="rounded-lg bg-teal-400/10 px-2 py-2 text-center text-teal-300">
                        <span className="block text-[10px] font-black uppercase">{formatDate(occurrence.date, { weekday: 'short' })}</span>
                        <span className="block text-base font-black leading-5">{formatDate(occurrence.date, { day: '2-digit' })}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="atlas-text-strong truncate text-sm font-black">{group?.name || occurrence.title}</p>
                        <p className="atlas-text-subtle truncate text-xs">{group?.level || 'Program group'}</p>
                      </div>
                      <p className="atlas-text-muted whitespace-nowrap text-xs font-bold">{formatTime(occurrence.startsAt)} - {formatTime(occurrence.endsAt)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4">
                <AtlasEmptyState icon={CalendarClock} title="No dates can be generated yet" description="Add a valid weekday and start time to at least one group." />
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5">
            <AtlasSectionHeader title="What families can buy" description="Pricing is separated from the timetable in the new model." icon={BadgeDollarSign} />
            <div className="mt-4 divide-y divide-white/10">
              {preview.pricingOffers.slice(0, 5).map(offer => (
                <div key={offer.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="atlas-text-strong truncate text-sm font-black">{offer.name}</p>
                    <p className="atlas-text-subtle mt-0.5 text-xs">{billingLabels[offer.billingMode]}</p>
                  </div>
                  <p className="atlas-text-strong shrink-0 text-sm font-black">{formatCurrency(offer.baseAmount)}</p>
                </div>
              ))}
              {!preview.pricingOffers.length && <p className="py-4 text-sm font-bold text-amber-200">No valid family offer is configured.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="atlas-surface rounded-lg border p-4 sm:p-5">
        <AtlasSectionHeader title="Ready for the autopilot setup" description="The compatibility check shows exactly what can move forward and what still needs an operator decision." icon={ShieldCheck} />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            { label: 'Groups and timetable', ready: scheduleReady, detail: scheduleReady ? 'Every group has a readable weekly block.' : 'One or more groups need a valid day and time.' },
            { label: 'Capacity and waitlist', ready: capacityReady, detail: capacityReady ? 'Every group has a seat policy.' : 'Set missing capacity before public registration.' },
            { label: 'Pricing offers', ready: offerReady, detail: offerReady ? 'Current plans can become family offers.' : 'Add a positive price before publishing.' }
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/10 p-3">
              {item.ready ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-teal-300" /> : <AlertCircle size={17} className="mt-0.5 shrink-0 text-amber-200" />}
              <div>
                <p className="atlas-text-strong text-sm font-black">{item.label}</p>
                <p className="atlas-text-subtle mt-1 text-xs leading-5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-teal-400/15 bg-teal-400/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Users size={17} className="mt-0.5 shrink-0 text-teal-300" />
            <p className="atlas-text-muted text-xs leading-5"><span className="atlas-text-strong font-black">Next architecture step:</span> one learner agreement will be able to include a run, a group, a second camp week, and add-ons without duplicating the learner.</p>
          </div>
          {onEditSetup && <AtlasActionButton icon={ArrowRight} variant="quiet" className="shrink-0" onClick={onEditSetup}>Resolve setup gaps</AtlasActionButton>}
        </div>
      </section>
    </div>
  );
};
