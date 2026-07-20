import type { Enrollment, Student } from '../types';

export type StudentDirectoryIssueCode =
  | 'missing_contact'
  | 'missing_profile'
  | 'no_enrollment'
  | 'unassigned_group'
  | 'possible_duplicate';

export interface StudentDuplicateGroup {
  id: string;
  studentIds: string[];
  reasons: Array<'email' | 'name_and_birth_date' | 'name_and_parent_phone'>;
}

export interface StudentDirectoryHealthRecord {
  studentId: string;
  issues: StudentDirectoryIssueCode[];
}

export const STUDENT_DIRECTORY_ISSUE_LABELS: Record<StudentDirectoryIssueCode, string> = {
  missing_contact: 'Parent contact',
  missing_profile: 'Profile details',
  no_enrollment: 'No enrollment',
  unassigned_group: 'No class group',
  possible_duplicate: 'Possible duplicate'
};

const normalizeIdentityText = (value?: string) => (value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

const normalizeIdentityPhone = (value?: string) => (value || '').replace(/\D/g, '');

const addFingerprint = (
  fingerprints: Map<string, Student[]>,
  key: string,
  student: Student
) => {
  if (!key) return;
  const matches = fingerprints.get(key) || [];
  matches.push(student);
  fingerprints.set(key, matches);
};

export const findStudentDuplicateGroups = (students: Student[]): StudentDuplicateGroup[] => {
  const activeStudents = students.filter(student => student.status === 'active');
  const fingerprints = new Map<string, Student[]>();

  activeStudents.forEach(student => {
    const organizationId = student.organizationId || 'unknown';
    const name = normalizeIdentityText(student.name);
    const email = normalizeIdentityText(student.email);
    const birthDate = normalizeIdentityText(student.birthDate);
    const parentPhone = normalizeIdentityPhone(student.parentPhone);

    if (email) addFingerprint(fingerprints, `${organizationId}:email:${email}`, student);
    if (name && birthDate) addFingerprint(fingerprints, `${organizationId}:birth:${name}:${birthDate}`, student);
    if (name && parentPhone) addFingerprint(fingerprints, `${organizationId}:phone:${name}:${parentPhone}`, student);
  });

  const groups = new Map<string, StudentDuplicateGroup>();

  fingerprints.forEach((matches, fingerprint) => {
    const uniqueIds = Array.from(new Set(matches.map(student => student.id))).sort();
    if (uniqueIds.length < 2) return;

    const reason: StudentDuplicateGroup['reasons'][number] = fingerprint.includes(':email:')
      ? 'email'
      : fingerprint.includes(':birth:')
        ? 'name_and_birth_date'
        : 'name_and_parent_phone';
    const id = uniqueIds.join(':');
    const existing = groups.get(id);

    if (existing) {
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      return;
    }

    groups.set(id, { id, studentIds: uniqueIds, reasons: [reason] });
  });

  return Array.from(groups.values()).sort((a, b) => a.id.localeCompare(b.id));
};

export const buildStudentDirectoryHealth = (
  students: Student[],
  enrollments: Enrollment[]
): {
  records: Map<string, StudentDirectoryHealthRecord>;
  duplicateGroups: StudentDuplicateGroup[];
} => {
  const duplicateGroups = findStudentDuplicateGroups(students);
  const duplicateStudentIds = new Set(duplicateGroups.flatMap(group => group.studentIds));
  const activeEnrollmentsByStudent = new Map<string, Enrollment[]>();

  enrollments.forEach(enrollment => {
    if (enrollment.status !== 'active') return;
    const current = activeEnrollmentsByStudent.get(enrollment.studentId) || [];
    current.push(enrollment);
    activeEnrollmentsByStudent.set(enrollment.studentId, current);
  });

  const records = new Map<string, StudentDirectoryHealthRecord>();

  students.forEach(student => {
    const issues: StudentDirectoryIssueCode[] = [];

    if (student.status === 'active') {
      const studentEnrollments = activeEnrollmentsByStudent.get(student.id) || [];

      if (!normalizeIdentityPhone(student.parentPhone)) {
        issues.push('missing_contact');
      }
      if (!normalizeIdentityText(student.parentName) || !normalizeIdentityText(student.birthDate) || !normalizeIdentityText(student.school)) {
        issues.push('missing_profile');
      }
      if (studentEnrollments.length === 0) {
        issues.push('no_enrollment');
      } else if (studentEnrollments.some(enrollment => !enrollment.groupId && !normalizeIdentityText(enrollment.groupName))) {
        issues.push('unassigned_group');
      }
      if (duplicateStudentIds.has(student.id)) issues.push('possible_duplicate');
    }

    records.set(student.id, { studentId: student.id, issues });
  });

  return { records, duplicateGroups };
};
