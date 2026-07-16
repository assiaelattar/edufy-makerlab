import { getDb, serverTimestamp } from "./firebaseAdmin.js";
import { getRequestMeta } from "./http.js";

export async function auditAgentAction(req, entry) {
  try {
    const db = getDb();

    await db.collection("agent_audit_logs").add({
      ...entry,
      request: getRequestMeta(req),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("[Edufy Agent API] Failed to write audit log", error);
  }
}
