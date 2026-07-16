import { requireAgentAuth, requireOrganizationId } from "../_lib/auth.js";
import { auditAgentAction } from "../_lib/audit.js";
import { getDb } from "../_lib/firebaseAdmin.js";
import { badRequest, methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { digitsOnly, normalizeSearchValue, publicStudent } from "../_lib/students.js";

function matchesStudent(student, normalizedQuery, phoneQuery) {
  const textFields = [
    student.name,
    student.parentName,
    student.email,
    student.parentPhone,
    student.school,
    student.loginInfo?.username,
    student.parentLoginInfo?.email,
  ].map(normalizeSearchValue);

  const phoneFields = [student.parentPhone, student.phone, student.whatsappNumber].map(digitsOnly);

  const textMatch = normalizedQuery
    ? textFields.some((value) => value.includes(normalizedQuery))
    : false;

  const phoneMatch = phoneQuery
    ? phoneFields.some((value) => value.includes(phoneQuery))
    : false;

  return textMatch || phoneMatch;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  const auth = requireAgentAuth(req, res);
  if (!auth) return;

  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  const rawQuery = req.query.q || req.query.query || "";
  const rawPhone = req.query.phone || "";
  const normalizedQuery = normalizeSearchValue(rawQuery);
  const phoneQuery = digitsOnly(rawPhone || rawQuery);
  const limit = Math.min(Number(req.query.limit || 20), 50);

  if (normalizedQuery.length < 2 && phoneQuery.length < 4) {
    return badRequest(res, "Search requires at least 2 text characters or 4 phone digits.");
  }

  try {
    const db = getDb();
    const snapshot = await db
      .collection("students")
      .where("organizationId", "==", organizationId)
      .get();

    const students = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((student) => matchesStudent(student, normalizedQuery, phoneQuery))
      .slice(0, limit)
      .map(publicStudent);

    await auditAgentAction(req, {
      organizationId,
      actor: auth.actor,
      tool: auth.tool,
      action: "students.search",
      permissionLevel: "read",
      approvalRequired: false,
      params: {
        q: rawQuery || null,
        phone: rawPhone || null,
        limit,
      },
      result: {
        count: students.length,
      },
    });

    return sendJson(res, 200, {
      ok: true,
      data: {
        students,
      },
    });
  } catch (error) {
    return serverError(res, error);
  }
}
