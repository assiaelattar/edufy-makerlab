export interface StudentIdentityRecord {
  id: string;
  organizationId?: string;
  loginInfo?: { uid?: string };
}

export interface VerifiedStudentIdentity {
  authUid: string;
  organizationId: string;
  studentId: string;
  ownerIds: string[];
  source: 'student_record' | 'legacy_auth_uid';
}

const unique = (values: Array<string | undefined>) => Array.from(new Set(values.filter(Boolean) as string[]));

export const verifyStudentRecord = (
  student: StudentIdentityRecord,
  authUid: string,
  organizationId: string
) => student.organizationId === organizationId && (
  student.loginInfo?.uid === authUid || student.id === authUid
);

/**
 * Creates the only learner identity accepted by SparkQuest at runtime.
 * Names, email addresses, phone numbers and project titles are deliberately
 * excluded: they are useful repair evidence, never authorization evidence.
 */
export const createVerifiedStudentIdentity = ({
  authUid,
  organizationId,
  student,
}: {
  authUid: string;
  organizationId: string;
  student?: StudentIdentityRecord | null;
}): VerifiedStudentIdentity => {
  if (student && !verifyStudentRecord(student, authUid, organizationId)) {
    throw new Error('The learner record is not linked to the signed-in account.');
  }

  const studentId = student?.id || authUid;
  return {
    authUid,
    organizationId,
    studentId,
    ownerIds: unique([studentId, student?.loginInfo?.uid, authUid]),
    source: student ? 'student_record' : 'legacy_auth_uid',
  };
};

export const projectBelongsToStudent = (
  project: { studentId?: string; organizationId?: string },
  identity: VerifiedStudentIdentity
) => {
  if (!project.studentId || !identity.ownerIds.includes(project.studentId)) return false;
  return !project.organizationId || project.organizationId === identity.organizationId;
};
