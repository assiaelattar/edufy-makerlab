const issue = (severity, code, recordType, recordId, message, relatedIds = []) => ({
  severity,
  code,
  recordType,
  recordId,
  message,
  relatedIds: [...new Set(relatedIds.filter(Boolean))].sort(),
});

const addToIndex = (index, key, value) => {
  if (!key) return;
  const existing = index.get(key) || [];
  existing.push(value);
  index.set(key, existing);
};

export const reconcileSparkQuestIdentity = ({ organizationId, users = [], students = [], projects = [] }) => {
  if (!organizationId) throw new Error('organizationId is required');

  const scopedUsers = users.filter(record => record?.organizationId === organizationId && record.id);
  const scopedStudents = students.filter(record => record?.organizationId === organizationId && record.id);
  const scopedProjects = projects.filter(record => record?.organizationId === organizationId && record.id);
  const usersById = new Map(scopedUsers.map(record => [record.id, record]));
  const studentsByAuthUid = new Map();
  const studentsByOwnerAlias = new Map();
  const issues = [];

  for (const student of scopedStudents) {
    const uid = student.loginInfo?.uid;
    addToIndex(studentsByAuthUid, uid, student);
    addToIndex(studentsByOwnerAlias, student.id, student);
    addToIndex(studentsByOwnerAlias, uid, student);
  }

  for (const student of scopedStudents) {
    const uid = student.loginInfo?.uid;
    if (!uid) {
      issues.push(issue('error', 'STUDENT_AUTH_UID_MISSING', 'student', student.id, 'Learner has no linked Firebase Auth UID.'));
      continue;
    }

    const duplicates = studentsByAuthUid.get(uid) || [];
    if (duplicates.length > 1) {
      issues.push(issue('error', 'STUDENT_AUTH_UID_DUPLICATED', 'student', student.id, 'Firebase Auth UID is linked to multiple learner records.', duplicates.map(record => record.id)));
    }

    const user = usersById.get(uid);
    if (!user) {
      issues.push(issue('error', 'STUDENT_AUTH_USER_MISSING', 'student', student.id, 'Linked Firebase Auth UID has no tenant user profile.', [uid]));
      continue;
    }
    if (user.role !== 'student') {
      issues.push(issue('error', 'STUDENT_AUTH_USER_WRONG_ROLE', 'student', student.id, 'Linked user profile is not a student account.', [uid]));
    }
    if (user.status !== 'active') {
      issues.push(issue('error', 'STUDENT_AUTH_USER_INACTIVE', 'student', student.id, 'Linked student user profile is not active.', [uid]));
    }
    if (user.studentId && user.studentId !== student.id) {
      issues.push(issue('error', 'USER_STUDENT_POINTER_MISMATCH', 'user', user.id, 'User profile studentId points to a different learner record.', [student.id, user.studentId]));
    }
  }

  for (const user of scopedUsers.filter(record => record.role === 'student')) {
    const links = studentsByAuthUid.get(user.id) || [];
    if (links.length === 0) {
      issues.push(issue('error', 'USER_STUDENT_LINK_MISSING', 'user', user.id, 'Student user profile has no learner record linked by Auth UID.'));
    } else if (links.length > 1) {
      issues.push(issue('error', 'USER_STUDENT_LINK_DUPLICATED', 'user', user.id, 'Student user profile is linked to multiple learner records.', links.map(record => record.id)));
    }
  }

  for (const project of scopedProjects) {
    if (!project.studentId) {
      issues.push(issue('error', 'PROJECT_OWNER_MISSING', 'project', project.id, 'Project has no learner owner ID.'));
      continue;
    }

    const owners = studentsByOwnerAlias.get(project.studentId) || [];
    if (owners.length === 0) {
      issues.push(issue('error', 'PROJECT_OWNER_UNKNOWN', 'project', project.id, 'Project owner ID does not resolve to a learner in this workspace.', [project.studentId]));
      continue;
    }
    if (owners.length > 1) {
      issues.push(issue('error', 'PROJECT_OWNER_AMBIGUOUS', 'project', project.id, 'Project owner ID resolves to multiple learner records.', owners.map(record => record.id)));
      continue;
    }

    const owner = owners[0];
    if (owner.status !== 'active') {
      issues.push(issue('warning', 'PROJECT_OWNER_INACTIVE', 'project', project.id, 'Project belongs to an inactive learner record.', [owner.id]));
    }
    if (project.studentId !== owner.id) {
      issues.push(issue('warning', 'PROJECT_OWNER_AUTH_UID_ALIAS', 'project', project.id, 'Project uses the accepted legacy Auth UID owner alias instead of the canonical learner document ID.', [owner.id]));
    }
  }

  issues.sort((left, right) => (
    left.severity.localeCompare(right.severity)
    || left.code.localeCompare(right.code)
    || left.recordId.localeCompare(right.recordId)
  ));

  const errors = issues.filter(entry => entry.severity === 'error').length;
  const warnings = issues.length - errors;

  return {
    version: 1,
    organizationId,
    generatedAt: new Date().toISOString(),
    status: errors === 0 ? (warnings === 0 ? 'ready' : 'review_warnings') : 'needs_repair',
    summary: {
      users: scopedUsers.length,
      students: scopedStudents.length,
      projects: scopedProjects.length,
      errors,
      warnings,
      excludedOutsideTenant: (users.length - scopedUsers.length) + (students.length - scopedStudents.length) + (projects.length - scopedProjects.length),
    },
    issues,
  };
};
