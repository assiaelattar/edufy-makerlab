const CLEARED_PAYMENT_STATUSES = new Set(["paid", "verified"]);

export function normalizeSearchValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

export function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return null;
}

export function publicStudent(student) {
  return {
    id: student.id,
    name: student.name || "",
    email: student.email || null,
    parentName: student.parentName || null,
    parentPhone: student.parentPhone || null,
    school: student.school || null,
    status: student.status || null,
    createdAt: serializeTimestamp(student.createdAt),
  };
}

export function detailedStudent(student) {
  return {
    ...publicStudent(student),
    address: student.address || null,
    birthDate: student.birthDate || null,
    authorizedPickups: student.authorizedPickups || [],
    badges: student.badges || [],
    loginInfo: student.loginInfo
      ? {
          username: student.loginInfo.username || null,
          email: student.loginInfo.email || null,
          uid: student.loginInfo.uid || null,
        }
      : null,
    parentLoginInfo: student.parentLoginInfo
      ? {
          email: student.parentLoginInfo.email || null,
          uid: student.parentLoginInfo.uid || null,
        }
      : null,
  };
}

export function serializeEnrollment(enrollment) {
  return {
    id: enrollment.id,
    programId: enrollment.programId || null,
    programName: enrollment.programName || null,
    packName: enrollment.packName || null,
    gradeId: enrollment.gradeId || null,
    gradeName: enrollment.gradeName || null,
    groupId: enrollment.groupId || null,
    groupName: enrollment.groupName || null,
    groupTime: enrollment.groupTime || null,
    secondGroupId: enrollment.secondGroupId || null,
    secondGroupName: enrollment.secondGroupName || null,
    secondGroupTime: enrollment.secondGroupTime || null,
    paymentPlan: enrollment.paymentPlan || null,
    totalAmount: Number(enrollment.totalAmount || 0),
    paidAmount: Number(enrollment.paidAmount || 0),
    balance: Number(enrollment.balance || 0),
    status: enrollment.status || null,
    startDate: enrollment.startDate || null,
    session: enrollment.session || null,
    createdAt: serializeTimestamp(enrollment.createdAt),
  };
}

export function serializePayment(payment) {
  return {
    id: payment.id,
    enrollmentId: payment.enrollmentId || null,
    studentName: payment.studentName || null,
    amount: Number(payment.amount || 0),
    date: payment.date || null,
    method: payment.method || null,
    status: payment.status || null,
    session: payment.session || null,
    proofUrl: payment.proofUrl || null,
    receiptSharedAt: serializeTimestamp(payment.receiptSharedAt),
    createdAt: serializeTimestamp(payment.createdAt),
  };
}

export function accountSummary(enrollments, payments) {
  const clearedPayments = payments.filter((payment) => CLEARED_PAYMENT_STATUSES.has(payment.status));
  const pendingPayments = payments.filter((payment) => !CLEARED_PAYMENT_STATUSES.has(payment.status));

  return {
    totalAmount: enrollments.reduce((sum, enrollment) => sum + Number(enrollment.totalAmount || 0), 0),
    paidAmount: clearedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    recordedBalance: enrollments.reduce((sum, enrollment) => sum + Number(enrollment.balance || 0), 0),
    activeEnrollments: enrollments.filter((enrollment) => enrollment.status === "active").length,
    paymentCount: payments.length,
    pendingPaymentCount: pendingPayments.length,
  };
}
