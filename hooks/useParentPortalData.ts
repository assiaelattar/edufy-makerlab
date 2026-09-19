import { useCallback, useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Enrollment, GalleryItem, GuardianLink, Payment, PickupEntry, Student, StudentProject } from '../types';

export interface ParentPortalData {
  children: Student[];
  enrollments: Enrollment[];
  payments: Payment[];
  projects: StudentProject[];
  galleryItems: GalleryItem[];
  pickupEntries: PickupEntry[];
}

const EMPTY_DATA: ParentPortalData = {
  children: [],
  enrollments: [],
  payments: [],
  projects: [],
  galleryItems: [],
  pickupEntries: []
};

const uniqueById = <T extends { id: string }>(items: T[]) => Array.from(
  new Map(items.map(item => [item.id, item])).values()
);

const readSuccessfulQueries = <T extends { id: string }>(results: PromiseSettledResult<T[]>[]) =>
  uniqueById(results.flatMap(result => result.status === 'fulfilled' ? result.value : []));

const runCollectionQuery = async <T extends { id: string }>(collectionName: string, field: string, value: string) => {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, collectionName), where(field, '==', value)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as T));
};

export const useParentPortalData = (parentUid?: string, organizationId?: string) => {
  const [data, setData] = useState<ParentPortalData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey(value => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!db || !parentUid || !organizationId) {
        if (!cancelled) {
          setData(EMPTY_DATA);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [linkResult, legacyResult, parentArrayResult] = await Promise.allSettled([
          runCollectionQuery<GuardianLink>('guardian_links', 'parentUid', parentUid),
          runCollectionQuery<Student>('students', 'parentLoginInfo.uid', parentUid),
          getDocs(query(collection(db, 'students'), where('parentUids', 'array-contains', parentUid)))
            .then(snapshot => snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Student)))
        ]);

        const discoveryResults = [linkResult, legacyResult, parentArrayResult];
        if (discoveryResults.every(result => result.status === 'rejected')) {
          throw new Error('All parent-to-student link queries were rejected.');
        }

        const links = linkResult.status === 'fulfilled'
          ? linkResult.value.filter(link => link.organizationId === organizationId && link.status === 'active')
          : [];
        const discoveredStudents = [legacyResult, parentArrayResult]
          .flatMap(result => result.status === 'fulfilled' ? result.value : [])
          .filter(student => student.organizationId === organizationId);
        const studentIds = new Set([
          ...links.map(link => link.studentId),
          ...discoveredStudents.map(student => student.id)
        ]);

        const linkedStudentResults = await Promise.allSettled(Array.from(studentIds).map(async studentId => {
          const snapshot = await getDoc(doc(db!, 'students', studentId));
          if (!snapshot.exists()) return null;
          return { id: snapshot.id, ...snapshot.data() } as Student;
        }));
        const children = uniqueById([
          ...discoveredStudents,
          ...linkedStudentResults.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : [])
        ].filter(student => student.organizationId === organizationId));

        const subjects = uniqueById(children.flatMap(student => [
          { id: student.id },
          ...(student.loginInfo?.uid ? [{ id: student.loginInfo.uid }] : [])
        ])).map(subject => subject.id);

        const [projectResults, enrollmentResults, galleryResults, pickupResults] = await Promise.all([
          Promise.allSettled(subjects.map(subjectId => runCollectionQuery<StudentProject>('student_projects', 'studentId', subjectId))),
          Promise.allSettled(children.map(student => runCollectionQuery<Enrollment>('enrollments', 'studentId', student.id))),
          Promise.allSettled(subjects.map(subjectId => runCollectionQuery<GalleryItem>('gallery_items', 'studentId', subjectId))),
          Promise.allSettled(children.map(student => runCollectionQuery<PickupEntry>('pickup_queue', 'studentId', student.id)))
        ]);

        const projects = readSuccessfulQueries(projectResults).filter(item => item.organizationId === organizationId);
        const enrollments = readSuccessfulQueries(enrollmentResults).filter(item => item.organizationId === organizationId);
        const galleryItems = readSuccessfulQueries(galleryResults).filter(item => item.organizationId === organizationId);
        const pickupEntries = readSuccessfulQueries(pickupResults).filter(item => item.organizationId === organizationId);

        const paymentResults = await Promise.allSettled(enrollments.map(enrollment =>
          runCollectionQuery<Payment>('payments', 'enrollmentId', enrollment.id)
        ));
        const payments = readSuccessfulQueries(paymentResults).filter(item => item.organizationId === organizationId);

        if (!cancelled) {
          setData({ children, enrollments, payments, projects, galleryItems, pickupEntries });
        }
      } catch (loadError) {
        console.error('Unable to load the family workspace:', loadError);
        if (!cancelled) {
          setData(EMPTY_DATA);
          setError('Your family workspace could not be loaded. Please try again or contact the academy.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [organizationId, parentUid, reloadKey]);

  return { ...data, loading, error, refresh };
};
