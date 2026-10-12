import { useCallback, useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { ProjectTemplate, StudentProject } from '../types';
import type { Enrollment, Program } from '../../types';
import { childHasCanonicalPermission, childPermissions, familyChildIds, permittedSubjectsForChild, projectSubjectsForChild, type GuardianFamilyLink } from '../domain/parentFamily';
import { summarizeAttendance, summarizeFinance, type AttendanceSummaryInput, type EnrollmentSummaryInput, type FamilyOperations, type FamilySource, type PaymentSummaryInput } from '../domain/parentFamilyOperations';
import { pickupSessionDate, previousPickupDate, selectOpenPickup, type PickupStatus } from '../domain/pickupLifecycle';
import { isSafeProjectImage, resolveParentProjectImage } from '../domain/parentProjectVisual';
import { upcomingForChild, type FamilyUpcomingMission } from '../domain/parentUpcoming';
import { nextWorkshopFromSchedule } from '../domain/parentNextWorkshop';
import { currentAcademicYear, matchesAcademicYear, normalizeAcademicYear } from '../utils/academicYear';

export interface FamilyProject extends StudentProject {
  familyCoverImage?: string;
}

export interface FamilyChild {
  id: string;
  name: string;
  projects: FamilyProject[];
  issue: string | null;
  permissions: string[];
  pickupProfile?: {
    active: boolean;
    parentName: string;
    authorizedPickups: string[];
  };
  operations: FamilyOperations;
  media: FamilySource<FamilyMediaItem[]>;
  upcoming: FamilySource<{ missions: FamilyUpcomingMission[]; contextNote: string | null }>;
}

export interface FamilyMediaItem {
  id: string;
  url: string;
  caption: string;
  date: string | null;
}

interface StudentRecord {
  organizationId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  loginInfo?: { uid?: string };
  parentName?: string;
  authorizedPickups?: string[];
  status?: string;
}

interface ProjectTemplateVisual {
  organizationId?: string;
  thumbnailUrl?: string;
  coverImage?: string;
}

interface EnrollmentRecord extends EnrollmentSummaryInput {
  organizationId?: string; studentId?: string;
  programId?: string; gradeId?: string; gradeName?: string; groupId?: string; groupName?: string;
}
interface PaymentRecord extends PaymentSummaryInput { id: string; organizationId?: string; enrollmentId?: string }
interface AttendanceRecord extends AttendanceSummaryInput { id: string; organizationId?: string; studentId?: string }
interface GalleryRecord { id: string; organizationId?: string; studentId?: string; url?: string; caption?: string; type?: string; createdAt?: { toDate?: () => Date }; uploadedAt?: { toDate?: () => Date } }
interface PickupRecord {
  id: string;
  organizationId: string;
  studentId: string;
  sessionDate?: string;
  status: PickupStatus;
  pickerName?: string;
  parentUid?: string;
}

const childName = (student: StudentRecord, id: string) =>
  student.name?.trim() || [student.firstName, student.lastName].filter(Boolean).join(' ').trim() || `Learner ${id.slice(0, 6)}`;

const sourceError = (source: string, cause: unknown) => {
  const code = typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : '';
  if (code.includes('permission-denied')) return `${source} access is not available yet. Ask the academy to check this learner’s family permissions.`;
  if (code.includes('unavailable') || code.includes('network')) return `${source} could not be reached. Check your connection and retry.`;
  return `${source} could not be loaded. Retry, then ask the academy to check this learner’s records.`;
};

const galleryDate = (record: GalleryRecord): string | null => {
  const value = record.createdAt || record.uploadedAt;
  const date = value?.toDate?.();
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
};

export const useParentFamily = (parentUid?: string, organizationId?: string) => {
  const [children, setChildren] = useState<FamilyChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = useCallback(() => setReloadKey(value => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setChildren([]);
      if (!db || !parentUid || !organizationId) {
        if (!cancelled) {
          setError('Your SparkQuest family account is missing a verified organization. Ask the academy to check your access.');
          setLoading(false);
        }
        return;
      }

      try {
        const linkDocs = await getDocs(query(
          collection(db, 'guardian_links'),
          where('parentUid', '==', parentUid),
          where('organizationId', '==', organizationId)
        ));
        const links = linkDocs.docs.map(item => ({ id: item.id, ...item.data() } as GuardianFamilyLink))
          .filter(link => link.parentUid === parentUid && link.organizationId === organizationId && link.status === 'active');
        const canonicalIds = familyChildIds(links, parentUid, organizationId);

        const family = await Promise.all(canonicalIds.map(async (id): Promise<FamilyChild> => {
          try {
            const studentDoc = await getDoc(doc(db!, 'students', id));
            if (!studentDoc.exists()) throw new Error('Learner record is missing.');
            const student = studentDoc.data() as StudentRecord;
            if (student.organizationId !== organizationId) throw new Error('Learner organization does not match this account.');
            const name = childName(student, id);
            const permissions = childPermissions(links, id, parentUid, organizationId);
            const subjects = projectSubjectsForChild(links, id, student.loginInfo?.uid, parentUid, organizationId);
            const gallerySubjects = permittedSubjectsForChild(links, id, student.loginInfo?.uid, parentUid, organizationId, 'gallery');
            const canSeeEnrollments = childHasCanonicalPermission(links, id, 'enrollments', parentUid, organizationId);
            const enrollmentSnapshotPromise = canSeeEnrollments
              ? getDocs(query(collection(db!, 'enrollments'), where('studentId', '==', id), where('organizationId', '==', organizationId)))
              : null;
            const [projectResult, media, finance, attendance, pickup, workshop] = await Promise.all([
              Promise.allSettled(subjects.map(subjectId => getDocs(query(
                collection(db!, 'student_projects'),
                where('studentId', '==', subjectId),
                where('organizationId', '==', organizationId)
              )))),
              (async (): Promise<FamilyChild['media']> => {
                if (!gallerySubjects.length) return { status: 'unavailable', reason: 'Media access is not enabled for this learner.' };
                try {
                  const results = await Promise.all(gallerySubjects.map(subjectId => getDocs(query(
                    collection(db!, 'gallery_items'), where('studentId', '==', subjectId),
                    where('organizationId', '==', organizationId)
                  ))));
                  const items = new Map<string, FamilyMediaItem>();
                  results.forEach(snapshot => snapshot.docs.forEach(item => {
                    const record = { id: item.id, ...item.data() } as GalleryRecord;
                    if (record.organizationId !== organizationId || !gallerySubjects.includes(record.studentId || '') ||
                      (record.type && record.type !== 'image') || !isSafeProjectImage(record.url)) return;
                    items.set(record.id, { id: record.id, url: record.url, caption: record.caption || 'A moment from the workshop', date: galleryDate(record) });
                  }));
                  return { status: 'ready', data: [...items.values()].sort((a, b) => (b.date || '').localeCompare(a.date || '')) };
                } catch (cause) {
                  console.error('Unable to load family media', id, cause);
                  return { status: 'error', reason: sourceError('Media', cause) };
                }
              })(),
              (async (): Promise<FamilyOperations['finance']> => {
                const canSeePayments = childHasCanonicalPermission(links, id, 'payments', parentUid, organizationId);
                if (!canSeeEnrollments || !canSeePayments) return { status: 'unavailable', reason: 'Payment access is not enabled for this learner.' };
                try {
                  const enrollmentSnapshot = await enrollmentSnapshotPromise!;
                  const enrollments = enrollmentSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as EnrollmentRecord))
                    .filter(item => item.studentId === id && item.organizationId === organizationId);
                  const paymentResults = await Promise.allSettled(enrollments.map(enrollment => getDocs(query(
                    collection(db!, 'payments'), where('enrollmentId', '==', enrollment.id), where('organizationId', '==', organizationId)
                  ))));
                  if (paymentResults.some(result => result.status === 'rejected')) throw paymentResults.find(result => result.status === 'rejected')?.reason;
                  const payments = paymentResults.flatMap(result => result.status === 'fulfilled' ? result.value.docs.map(item => ({ id: item.id, ...item.data() } as PaymentRecord)) : [])
                    .filter(item => item.organizationId === organizationId && enrollments.some(enrollment => enrollment.id === item.enrollmentId));
                  return { status: 'ready', data: summarizeFinance(enrollments, payments) };
                } catch (cause) {
                  console.error('Unable to load family finance', id, cause);
                  return { status: 'error', reason: sourceError('Payments', cause) };
                }
              })(),
              (async (): Promise<FamilyOperations['attendance']> => {
                if (!canSeeEnrollments) {
                  return { status: 'unavailable', reason: 'Attendance access is not enabled for this learner.' };
                }
                try {
                  const snapshot = await getDocs(query(collection(db!, 'attendance'), where('studentId', '==', id), where('organizationId', '==', organizationId)));
                  const records = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AttendanceRecord))
                    .filter(item => item.studentId === id && item.organizationId === organizationId);
                  return { status: 'ready', data: summarizeAttendance(records) };
                } catch (cause) {
                  console.error('Unable to load family attendance', id, cause);
                  return { status: 'error', reason: sourceError('Attendance', cause) };
                }
              })(),
              (async (): Promise<FamilyOperations['pickup']> => {
                if (!childHasCanonicalPermission(links, id, 'pickup', parentUid, organizationId)) {
                  return { status: 'unavailable', reason: 'Pickup access is not enabled for this learner.' };
                }
                const today = pickupSessionDate();
                try {
                  const snapshot = await getDocs(query(
                    collection(db!, 'pickup_queue'), where('organizationId', '==', organizationId), where('studentId', '==', id),
                    where('sessionDate', 'in', [today, previousPickupDate(today)])
                  ));
                  const records = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PickupRecord));
                  const entry = selectOpenPickup(records, organizationId, id, today);
                  return { status: 'ready', data: {
                    status: entry?.status || null,
                    sessionDate: entry?.sessionDate || today,
                    pickerName: entry?.pickerName || null,
                    isPreviousDay: Boolean(entry?.sessionDate && entry.sessionDate !== today),
                    initiatedByCurrentGuardian: entry ? entry.parentUid === parentUid : null
                  } };
                } catch (cause) {
                  console.error('Unable to load family pickup', id, cause);
                  return { status: 'error', reason: sourceError('Pickup', cause) };
                }
              })(),
              (async (): Promise<FamilyOperations['workshop']> => {
                if (!canSeeEnrollments) {
                  return { status: 'unavailable', reason: 'Workshop schedule access is not enabled for this learner.' };
                }
                try {
                  const snapshot = await enrollmentSnapshotPromise!;
                  const enrollments = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Enrollment))
                    .filter(item => item.studentId === id && item.organizationId === organizationId && item.status === 'active');
                  const programIds = [...new Set(enrollments.map(item => item.programId).filter(Boolean))];
                  const programResults = await Promise.all(programIds.map(programId => getDoc(doc(db!, 'programs', programId))));
                  const programs = programResults.filter(item => item.exists()).map(item => ({ id: item.id, ...item.data() } as Program))
                    .filter(item => item.organizationId === organizationId);
                  return { status: 'ready', data: { next: nextWorkshopFromSchedule(enrollments, programs) } };
                } catch (cause) {
                  console.error('Unable to load family workshop timetable', id, cause);
                  return { status: 'error', reason: sourceError('Workshop schedule', cause) };
                }
              })()
            ]);
            const results = projectResult;
            const projects = new Map<string, StudentProject>();
            results.forEach(result => {
              if (result.status !== 'fulfilled') return;
              result.value.docs.forEach(item => {
                const project = { id: item.id, ...item.data() } as StudentProject;
                if (project.organizationId === organizationId) projects.set(project.id, project);
              });
            });
            const projectList = [...projects.values()];
            const failed = results.some(result => result.status === 'rejected');
            const upcoming: FamilyChild['upcoming'] = !subjects.length
              ? { status: 'unavailable', reason: 'Project access is not enabled for this learner.' }
              : failed
                ? { status: 'error', reason: 'Projects did not fully load, so upcoming assignments cannot be checked safely.' }
                : await (async (): Promise<FamilyChild['upcoming']> => {
                    try {
                      const templateSnapshot = await getDocs(query(collection(db!, 'project_templates'), where('organizationId', '==', organizationId)));
                      const templates = templateSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as ProjectTemplate));
                      let enrollments: EnrollmentRecord[] = [];
                      let contextNote: string | null = null;
                      if (canSeeEnrollments) {
                        try {
                          const snapshot = await enrollmentSnapshotPromise!;
                          const active = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as EnrollmentRecord))
                            .filter(item => item.studentId === id && item.organizationId === organizationId && item.status === 'active');
                          const year = currentAcademicYear();
                          const current = active.filter(item => matchesAcademicYear(item.session, year));
                          const latest = [...active].sort((a, b) => String(normalizeAcademicYear(b.session) || '').localeCompare(String(normalizeAcademicYear(a.session) || '')))[0];
                          enrollments = current.length ? current : active.filter(item => Boolean(latest?.session) && matchesAcademicYear(item.session, latest.session!));
                          if (!enrollments.length) contextNote = 'No active enrollment was available to verify class assignments. Direct assignments are shown.';
                        } catch (cause) {
                          console.error('Unable to load family assignment context', id, cause);
                          contextNote = 'Class assignments could not be checked. Direct assignments are shown.';
                        }
                      } else {
                        contextNote = 'Class assignments require enrollment access. Direct assignments are shown.';
                      }
                      const missions = upcomingForChild(templates, projectList, organizationId, {
                        ownerIds: subjects,
                        programIds: [...new Set(enrollments.flatMap(item => [item.programId, item.programName].filter(Boolean) as string[]))],
                        gradeIds: [...new Set(enrollments.flatMap(item => [item.gradeId, item.gradeName].filter(Boolean) as string[]))],
                        groupIds: [...new Set(enrollments.flatMap(item => [item.groupId, item.groupName].filter(Boolean) as string[]))],
                      });
                      return { status: 'ready', data: { missions, contextNote } };
                    } catch (cause) {
                      console.error('Unable to load family assignments', id, cause);
                      return { status: 'error', reason: sourceError('Assigned missions', cause) };
                    }
                  })();
            const missingTemplateIds = [...new Set(projectList
              .filter(project => project.templateId && !resolveParentProjectImage(project))
              .map(project => project.templateId as string))];
            const templateResults = await Promise.allSettled(missingTemplateIds.map(async templateId => {
              const snapshot = await getDoc(doc(db!, 'project_templates', templateId));
              if (!snapshot.exists()) return [templateId, null] as const;
              const template = snapshot.data() as ProjectTemplateVisual;
              const sameTenantOrShared = !template.organizationId || template.organizationId === organizationId;
              return [templateId, sameTenantOrShared ? resolveParentProjectImage({}, template.thumbnailUrl || template.coverImage) : null] as const;
            }));
            const templateImages = new Map(templateResults.flatMap(result => result.status === 'fulfilled' ? [result.value] : []));
            const visualProjects: FamilyProject[] = projectList.map(project => ({
              ...project,
              familyCoverImage: resolveParentProjectImage(project, project.templateId ? templateImages.get(project.templateId) || undefined : undefined) || undefined
            }));
            const missingCanonicalLink = !subjects.includes(id);
            const missingLegacyLink = Boolean(student.loginInfo?.uid && student.loginInfo.uid !== id && !subjects.includes(student.loginInfo.uid));
            const issue = subjects.length === 0
              ? 'Project access is not enabled for this learner. Ask the academy to check the family link.'
              : failed
              ? 'Some projects could not be loaded. Retry, then ask the academy to check this learner’s project access.'
              : missingCanonicalLink || missingLegacyLink
                ? 'Some projects may require the academy to complete this learner’s family links.'
                : null;
            return {
              id,
              name,
              projects: visualProjects,
              issue,
              permissions,
              pickupProfile: {
                active: student.status === 'active',
                parentName: student.parentName?.trim() || '',
                authorizedPickups: student.authorizedPickups || []
              },
              operations: { finance, attendance, pickup, workshop },
              media,
              upcoming
            };
          } catch (cause) {
            console.error('Unable to load linked learner', id, cause);
            return {
              id, name: `Learner ${id.slice(0, 6)}`, projects: [], permissions: [],
              issue: 'This learner could not be loaded. Retry, then ask the academy to check the family link.',
              media: { status: 'error', reason: 'Media is unavailable while this learner record is unavailable.' },
              upcoming: { status: 'error', reason: 'Assigned missions are unavailable while this learner record is unavailable.' },
              operations: {
                finance: { status: 'error', reason: 'Payments are unavailable while this learner record is unavailable.' },
                attendance: { status: 'error', reason: 'Attendance is unavailable while this learner record is unavailable.' },
                pickup: { status: 'error', reason: 'Pickup is unavailable while this learner record is unavailable.' },
                workshop: { status: 'error', reason: 'Workshop schedule is unavailable while this learner record is unavailable.' }
              }
            };
          }
        }));

        if (!cancelled) setChildren(family);
      } catch (cause) {
        console.error('Unable to load verified family links', cause);
        if (!cancelled) setError('Your family links could not be loaded. Retry, then ask the academy to check your account.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [parentUid, organizationId, reloadKey]);

  return { children, loading, error, refresh };
};
