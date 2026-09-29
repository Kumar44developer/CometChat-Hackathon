// Talk to the CometChat MCP server (Streamable HTTP transport) directly:
// initialize -> tools/list -> optional tools/call. Used to pull the hackathon
// bundles (list bundles / pull bundle) without needing an in-IDE connector.
const ENDPOINT = "https://mcp.cometchat.com/mcp?ref=z2c";

async function rpc(method, params, sessionId, id) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  const body = { jsonrpc: "2.0", method };
  if (id !== undefined) body.id = id;
  if (params !== undefined) body.params = params;
  const res = await fetch(ENDPOINT, { method: "POST", headers, body: JSON.stringify(body) });
  const sid = res.headers.get("mcp-session-id") || sessionId;
  const text = await res.text();
  // SSE frames: pull out the data: lines and parse the last JSON one
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    const lines = text.split("\n").filter((l) => l.startsWith("data: "));
    for (const l of lines) {
      try {
        payload = JSON.parse(l.slice(6));
      } catch {
        /* keep last good */
      }
    }
  }
  return { status: res.status, sid, payload };
}

function printResult(label, v) {
  console.log("\n=== " + label + " ===");
  console.log(JSON.stringify(v, null, 2).slice(0, 4000));
}

const init = await rpc(
  "initialize",
  {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "mentorroom-setup", version: "1.0.0" },
  },
  null,
  1
);
if (!init.payload?.result) {
  printResult("initialize FAILED", init);
  process.exit(1);
}
const sid = init.sid;
printResult("initialize ok — server info", init.payload.result.serverInfo || init.payload.result);
await rpc("notifications/initialized", {}, sid);

const tools = await rpc("tools/list", {}, sid, 2);
const list = tools.payload?.result?.tools || [];
console.log("\n=== tools (" + list.length + ") ===");
for (const t of list) console.log("-", t.name, "::", (t.description || "").split("\n")[0].slice(0, 100));
console.log("\nSCHEMAS:");
for (const t of list) {
  if (/bundle/i.test(t.name)) printResult(t.name + " inputSchema", t.inputSchema);
}

// If a bundles-listing tool exists, call it
const lister = list.find((t) => /list.*bundle|bundles/i.test(t.name));
if (lister) {
  const r = await rpc("tools/call", { name: lister.name, arguments: {} }, sid, 3);
  printResult("call " + lister.name, r.payload?.result ?? r.payload);
}
