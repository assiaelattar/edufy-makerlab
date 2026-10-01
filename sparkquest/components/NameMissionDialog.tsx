import React, { useCallback, useId } from 'react';
import { Rocket } from 'lucide-react';
import { SparkbookDialog } from './SparkbookDialog';

interface Props {
  isOpen: boolean;
  name: string;
  showcase?: boolean;
  busy?: boolean;
  error?: string;
  onChange: (name: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

/** Shared real/fixture form; persistence stays with the verified project selector. */
export function NameMissionDialog({ isOpen, name, showcase, busy = false, error, onChange, onClose, onSubmit }: Props) {
  const id = useId();
  const close = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  return <SparkbookDialog isOpen={isOpen} onClose={close} size="sm" tone="lime" eyebrow={showcase ? 'Independent showcase' : 'Your own idea'} title="Name your mission" description="Every great build starts with an idea. Give yours a name you’ll recognize." icon={<Rocket size={24} />} bodyClassName="sq-name-mission">
    <form onSubmit={event => { event.preventDefault(); if (name.trim() && !busy) onSubmit(); }} aria-busy={busy}>
      <label htmlFor={id}>Mission name</label>
      <input id={id} value={name} onChange={event => onChange(event.target.value)} maxLength={120} required disabled={busy} placeholder="e.g. My moon base" aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} />
      <p id={`${id}-hint`}>{showcase ? 'Next, add your project media or a link and send it to your instructor.' : 'Next, plan your build and collect proof as you go.'}</p>
      {error && <p id={`${id}-error`} role="alert" className="sq-form-error">{error}</p>}
      <div className="sq-name-mission-actions"><button type="button" className="sq-action sq-action--quiet" disabled={busy} onClick={close}>Cancel</button><button type="submit" className="sq-action sq-action--primary" disabled={busy || !name.trim()}><Rocket size={18} />{busy ? 'Creating mission…' : 'Create mission'}</button></div>
    </form>
  </SparkbookDialog>;
}
