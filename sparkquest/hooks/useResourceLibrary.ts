import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, type Firestore } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { ResourceLibraryItem } from '../types';

export function useResourceLibrary(organizationId?: string) {
  const [resources, setResources] = useState<ResourceLibraryItem[]>([]);
  const [loading, setLoading] = useState(Boolean(organizationId));
  const [error, setError] = useState('');
  const [readAttempt, setReadAttempt] = useState(0);

  useEffect(() => {
    setResources([]);
    setError('');
    if (!db || !organizationId) { setLoading(false); return; }
    setLoading(true);
    return onSnapshot(
      query(collection(db as Firestore, 'resource_library'), where('organizationId', '==', organizationId)),
      snapshot => {
        setResources(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as ResourceLibraryItem)));
        setLoading(false);
      },
      cause => {
        console.error('Resource library subscription failed:', cause);
        const code = typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : '';
        setError(code === 'permission-denied'
          ? 'The Resource & Tools Library is not available for this organization yet. Ask an administrator to finish the library access update.'
          : 'The Resource & Tools Library could not load. Check your connection and try again.');
        setLoading(false);
      },
    );
  }, [organizationId, readAttempt]);

  return { resources, loading, error, retry: () => setReadAttempt(attempt => attempt + 1) };
}
