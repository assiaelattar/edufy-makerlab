import crypto from "node:crypto";
import { forbidden, sendJson } from "./http.js";

function safeEqual(a, b) {
  const first = Buffer.from(a || "");
  const second = Buffer.from(b || "");

  if (first.length !== second.length) {
    return false;
  }

  return crypto.timingSafeEqual(first, second);
}

export function getAgentToken(req) {
  const authHeader = req.headers.authorization || "";

  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return req.headers["x-edufy-agent-token"] || "";
}

export function requireAgentAuth(req, res) {
  const configuredToken = process.env.EDUFY_AGENT_API_TOKEN;

  if (!configuredToken) {
    sendJson(res, 500, {
      ok: false,
      error: {
        code: "agent_token_not_configured",
        message: "Set EDUFY_AGENT_API_TOKEN before enabling the Edufy Agent API.",
      },
    });
    return null;
  }

  const providedToken = getAgentToken(req);

  if (!providedToken || !safeEqual(providedToken, configuredToken)) {
    forbidden(res);
    return null;
  }

  return {
    actor: req.headers["x-edufy-agent-actor"] || "chatgpt-work",
    tool: req.headers["x-edufy-agent-tool"] || "edufy-agent-api",
  };
}

export function requireOrganizationId(req, res) {
  const orgId = req.headers["x-edufy-organization-id"] || req.query.orgId;

  if (!orgId || typeof orgId !== "string") {
    sendJson(res, 400, {
      ok: false,
      error: {
        code: "organization_required",
        message: "Pass x-edufy-organization-id or orgId for every agent request.",
      },
    });
    return null;
  }

  return orgId;
}
