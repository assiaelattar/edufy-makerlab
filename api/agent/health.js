import { requireAgentAuth } from "./_lib/auth.js";
import { methodNotAllowed, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  const auth = requireAgentAuth(req, res);
  if (!auth) return;

  return sendJson(res, 200, {
    ok: true,
    service: "edufy-agent-api",
    actor: auth.actor,
    timestamp: new Date().toISOString(),
  });
}
