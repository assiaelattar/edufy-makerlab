import { requireAgentAuth, requireOrganizationId } from "../../_lib/auth.js";
import { auditAgentAction } from "../../_lib/audit.js";
import { getDb } from "../../_lib/firebaseAdmin.js";
import { methodNotAllowed, sendJson, serverError } from "../../_lib/http.js";
import {
  accountSummary,
  detailedStudent,
  serializeEnrollment,
  serializePayment,
} from "../../_lib/students.js";

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  const auth = requireAgentAuth(req, res);
  if (!auth) return;

  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  try {
    const db = getDb();
    const studentId = req.query.id;
    const studentDoc = await db.collection("students").doc(studentId).get();

    if (!studentDoc.exists || studentDoc.data().organizationId !== organizationId) {
      return sendJson(res, 404, {
        ok: false,
        error: {
          code: "student_not_found",
          message: "No student was found for this organization.",
        },
      });
    }

    const enrollmentSnapshot = await db
      .collection("enrollments")
      .where("organizationId", "==", organizationId)
      .where("studentId", "==", studentId)
      .get();

    const enrollments = enrollmentSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
    const payments = [];

    for (const enrollmentIdChunk of chunk(enrollmentIds, 30)) {
      const paymentSnapshot = await db
        .collection("payments")
        .where("organizationId", "==", organizationId)
        .where("enrollmentId", "in", enrollmentIdChunk)
        .get();

      payments.push(...paymentSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }

    payments.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    const serializedEnrollments = enrollments.map(serializeEnrollment);
    const serializedPayments = payments.map(serializePayment);

    await auditAgentAction(req, {
      organizationId,
      actor: auth.actor,
      tool: auth.tool,
      action: "students.account",
      permissionLevel: "read",
      approvalRequired: false,
      target: {
        type: "student",
        id: studentId,
      },
      result: {
        enrollmentCount: serializedEnrollments.length,
        paymentCount: serializedPayments.length,
      },
    });

    return sendJson(res, 200, {
      ok: true,
      data: {
        student: detailedStudent({ id: studentDoc.id, ...studentDoc.data() }),
        summary: accountSummary(enrollments, payments),
        enrollments: serializedEnrollments,
        payments: serializedPayments,
      },
    });
  } catch (error) {
    return serverError(res, error);
  }
}
