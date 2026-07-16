import { requireAgentAuth, requireOrganizationId } from "../_lib/auth.js";
import { auditAgentAction } from "../_lib/audit.js";
import { getDb } from "../_lib/firebaseAdmin.js";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { detailedStudent } from "../_lib/students.js";

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

    const student = detailedStudent({ id: studentDoc.id, ...studentDoc.data() });

    await auditAgentAction(req, {
      organizationId,
      actor: auth.actor,
      tool: auth.tool,
      action: "students.get",
      permissionLevel: "read",
      approvalRequired: false,
      target: {
        type: "student",
        id: studentId,
      },
      result: {
        found: true,
      },
    });

    return sendJson(res, 200, {
      ok: true,
      data: {
        student,
      },
    });
  } catch (error) {
    return serverError(res, error);
  }
}
