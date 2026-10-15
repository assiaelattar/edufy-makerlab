import React, { useEffect, useRef, useState } from 'react';
import { Loader2, LockKeyhole, MessageCircle, Send } from 'lucide-react';
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import './pickup-private-notes.css';

interface PickupMessage {
  id: string;
  senderUid: string;
  senderRole: 'parent' | 'student';
  body: string;
  createdAt?: { toMillis?: () => number };
}

interface Props {
  entryId: string;
  organizationId: string;
  studentId: string;
  currentUid: string;
  role: 'parent' | 'student';
  closed?: boolean;
  previewMode?: boolean;
  hideIntro?: boolean;
}

const previewMessages: PickupMessage[] = [
  { id: 'preview-parent', senderUid: 'parent-preview', senderRole: 'parent', body: 'N’oublie pas ta veste et ton projet.' },
];

export const PickupPrivateNotes: React.FC<Props> = ({
  entryId,
  organizationId,
  studentId,
  currentUid,
  role,
  closed = false,
  previewMode = false,
  hideIntro = false,
}) => {
  const [messages, setMessages] = useState<PickupMessage[]>(previewMode ? previewMessages : []);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(!previewMode);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (previewMode || !db) return;
    setLoading(true);
    const messagesQuery = query(
      collection(db, 'pickup_queue', entryId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(40),
    );
    return onSnapshot(messagesQuery, snapshot => {
      setMessages(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PickupMessage)));
      setLoading(false);
      setError(null);
    }, () => {
      setLoading(false);
      setError('Les notes privées sont momentanément indisponibles.');
    });
  }, [entryId, previewMode]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || body.length > 500 || closed || sending) return;
    setSending(true);
    setError(null);
    try {
      if (previewMode) {
        setMessages(current => [...current, { id: `preview-${Date.now()}`, senderUid: currentUid, senderRole: role, body }]);
      } else {
        await addDoc(collection(db!, 'pickup_queue', entryId, 'messages'), {
          organizationId,
          studentId,
          senderUid: currentUid,
          senderRole: role,
          body,
          createdAt: serverTimestamp(),
        });
      }
      setDraft('');
    } catch {
      setError('La note n’a pas été envoyée. Vérifiez la connexion et réessayez.');
    } finally {
      setSending(false);
    }
  };

  return <section className="sq-pickup-notes" aria-labelledby={hideIntro ? undefined : `pickup-notes-${entryId}`} aria-label={hideIntro ? 'Conversation privée parent et enfant' : undefined}>
    {!hideIntro && <><header><span><LockKeyhole size={17} /></span><div><small>Canal privé</small><strong id={`pickup-notes-${entryId}`}>Parent ↔ enfant</strong></div></header><p className="sq-pickup-notes-help">Visible seulement par l’enfant et le parent qui a lancé cette sortie.</p></>}
    <div className="sq-pickup-notes-list" ref={listRef} aria-live="polite">
      {loading && <span className="sq-pickup-notes-state"><Loader2 className="sq-spin" size={16} /> Chargement des notes…</span>}
      {!loading && messages.length === 0 && <span className="sq-pickup-notes-state"><MessageCircle size={16} /> « N’oublie pas ta veste », « J’ai rangé mon projet »…</span>}
      {messages.map(message => {
        const mine = message.senderUid === currentUid;
        const sender = mine ? 'Vous' : message.senderRole === 'parent' ? 'Parent' : 'Enfant';
        return <article key={message.id} className={mine ? 'is-mine' : ''}><small>{sender}</small><p>{message.body}</p></article>;
      })}
    </div>
    {error && <p className="sq-pickup-notes-error" role="alert">{error}</p>}
    {closed ? <p className="sq-pickup-notes-closed">La sortie est terminée. Les notes restent visibles en lecture seule.</p> : <form onSubmit={send}>
      <label className="sr-only" htmlFor={`pickup-note-message-${entryId}`}>Écrire une note privée</label>
      <textarea id={`pickup-note-message-${entryId}`} rows={2} maxLength={500} value={draft} onChange={event => setDraft(event.target.value)} placeholder={role === 'parent' ? 'Ex. N’oublie pas ta veste…' : 'Ex. J’ai rangé mon projet…'} />
      <small className="sq-pickup-notes-count">{draft.length}/500</small>
      <button type="submit" disabled={!draft.trim() || sending}>{sending ? <Loader2 className="sq-spin" size={16} /> : <Send size={16} />} Envoyer</button>
    </form>}
  </section>;
};
