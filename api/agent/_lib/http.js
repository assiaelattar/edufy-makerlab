export function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

export function methodNotAllowed(res, allowedMethods) {
  res.setHeader("Allow", allowedMethods.join(", "));
  sendJson(res, 405, {
    ok: false,
    error: {
      code: "method_not_allowed",
      message: `Use ${allowedMethods.join(" or ")} for this endpoint.`,
    },
  });
}

export function badRequest(res, message, details = undefined) {
  sendJson(res, 400, {
    ok: false,
    error: {
      code: "bad_request",
      message,
      details,
    },
  });
}

export function forbidden(res, message = "The Edufy Agent API token is invalid.") {
  sendJson(res, 403, {
    ok: false,
    error: {
      code: "forbidden",
      message,
    },
  });
}

export function serverError(res, error, message = "The Edufy Agent API could not complete the request.") {
  console.error("[Edufy Agent API]", error);
  sendJson(res, 500, {
    ok: false,
    error: {
      code: "server_error",
      message,
    },
  });
}

export function getRequestMeta(req) {
  return {
    requestId: req.headers["x-request-id"] || null,
    userAgent: req.headers["user-agent"] || null,
    ip:
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null,
  };
}
