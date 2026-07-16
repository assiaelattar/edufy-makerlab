import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const port = Number(process.env.PORT || 3001);

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");

  try {
    const content = readFileSync(envPath, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([^#=]+)=(.*)$/);
      if (!match) continue;

      const [, key, value] = match;
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    console.warn("[agent-dev-server] .env.local was not found.");
  }
}

function createReq(nodeReq, url, query, body) {
  return {
    method: nodeReq.method,
    headers: nodeReq.headers,
    query,
    body,
    socket: nodeReq.socket,
  };
}

function createRes(nodeRes) {
  let statusCode = 200;

  return {
    setHeader(name, value) {
      nodeRes.setHeader(name, value);
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      nodeRes.statusCode = statusCode;
      nodeRes.setHeader("Content-Type", "application/json; charset=utf-8");
      nodeRes.end(JSON.stringify(payload, null, 2));
    },
  };
}

async function readBody(nodeReq) {
  const chunks = [];

  for await (const chunk of nodeReq) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return undefined;

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return undefined;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function resolveHandler(pathname, query) {
  if (pathname === "/dev/agent-test") {
    return {
      devPage: true,
      query,
    };
  }

  if (pathname === "/api/agent/health") {
    return {
      mod: await import("../api/agent/health.js"),
      query,
    };
  }

  if (pathname === "/api/agent/students/search") {
    return {
      mod: await import("../api/agent/students/search.js"),
      query,
    };
  }

  const accountMatch = pathname.match(/^\/api\/agent\/students\/([^/]+)\/account$/);
  if (accountMatch) {
    return {
      mod: await import("../api/agent/students/[id]/account.js"),
      query: { ...query, id: accountMatch[1] },
    };
  }

  const studentMatch = pathname.match(/^\/api\/agent\/students\/([^/]+)$/);
  if (studentMatch) {
    return {
      mod: await import("../api/agent/students/[id].js"),
      query: { ...query, id: studentMatch[1] },
    };
  }

  return null;
}

loadEnvLocal();

const server = createServer(async (nodeReq, nodeRes) => {
  const url = new URL(nodeReq.url || "/", `http://${nodeReq.headers.host || `localhost:${port}`}`);
  const query = Object.fromEntries(url.searchParams.entries());

  try {
    const resolved = await resolveHandler(url.pathname, query);

    if (!resolved) {
      nodeRes.statusCode = 404;
      nodeRes.setHeader("Content-Type", "application/json; charset=utf-8");
      nodeRes.end(JSON.stringify({ ok: false, error: { code: "not_found", message: "Endpoint not found." } }));
      return;
    }

    if (resolved.devPage) {
      nodeRes.statusCode = 200;
      nodeRes.setHeader("Content-Type", "text/html; charset=utf-8");
      nodeRes.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Edufy Agent API Test</title>
    <style>
      body { font-family: Inter, system-ui, sans-serif; margin: 32px; background: #f8fafc; color: #0f172a; }
      main { max-width: 900px; margin: 0 auto; }
      input, button { font: inherit; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; }
      button { background: #0f172a; color: white; cursor: pointer; }
      .row { display: flex; gap: 8px; margin: 16px 0; }
      input { flex: 1; }
      pre { white-space: pre-wrap; background: #020617; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow: auto; }
      .muted { color: #64748b; }
    </style>
  </head>
  <body>
    <main>
      <h1>Edufy Agent API Test</h1>
      <p class="muted">Local-only helper page. It sends the required headers for you.</p>
      <div class="row">
        <input id="query" value="an" placeholder="Search student name or phone" />
        <button id="search">Search Students</button>
        <button id="health">Health</button>
      </div>
      <pre id="output">Ready.</pre>
    </main>
    <script>
      const token = ${JSON.stringify(process.env.EDUFY_AGENT_API_TOKEN || "")};
      const orgId = "makerlab-academy";
      const output = document.getElementById("output");

      async function callApi(path) {
        output.textContent = "Loading...";
        const response = await fetch(path, {
          headers: {
            Authorization: "Bearer " + token,
            "x-edufy-organization-id": orgId
          }
        });
        const data = await response.json();
        output.textContent = JSON.stringify(data, null, 2);
      }

      document.getElementById("health").addEventListener("click", () => callApi("/api/agent/health"));
      document.getElementById("search").addEventListener("click", () => {
        const q = encodeURIComponent(document.getElementById("query").value || "an");
        callApi("/api/agent/students/search?q=" + q + "&limit=3");
      });
    </script>
  </body>
</html>`);
      return;
    }

    const body = await readBody(nodeReq);
    const req = createReq(nodeReq, url, resolved.query, body);
    const res = createRes(nodeRes);

    await resolved.mod.default(req, res);
  } catch (error) {
    console.error("[agent-dev-server]", error);
    nodeRes.statusCode = 500;
    nodeRes.setHeader("Content-Type", "application/json; charset=utf-8");
    nodeRes.end(JSON.stringify({ ok: false, error: { code: "server_error", message: error.message } }));
  }
});

server.listen(port, () => {
  console.log(`[agent-dev-server] listening on http://localhost:${port}`);
});
