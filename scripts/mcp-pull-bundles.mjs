// Pull the five hackathon-required CometChat implementation bundles via the
// MCP server (tools/call -> get_cometchat_implementation_bundle) and save
// each under .cometchat/bundles/ for offline reference.
import fs from "fs";
import path from "path";

const ENDPOINT = "https://mcp.cometchat.com/mcp?ref=z2c";
const OUT = ".cometchat/bundles";

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
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    for (const l of text.split("\n").filter((x) => x.startsWith("data: "))) {
      try {
        payload = JSON.parse(l.slice(6));
      } catch {
        /* keep last good */
      }
    }
  }
  return { sid, payload };
}

const init = await rpc(
  "initialize",
  { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "mentorroom-setup", version: "1.0.0" } },
  null,
  1
);
if (!init.payload?.result) {
  console.error("initialize failed:", JSON.stringify(init.payload).slice(0, 400));
  process.exit(1);
}
const sid = init.sid;
await rpc("notifications/initialized", {}, sid);

// Guide's pull order (Day 2-4)
const bundles = [
  "js-sdk-messaging-basics", // JavaScript SDK -> bot
  "react-uikit-quickstart", // React -> web chat core
  "presence-and-typing", // mentor presence + typing
  "moderation-setup", // toxic-message blocking
  "multi-tenant-chat", // cohorts/roles
];

fs.mkdirSync(OUT, { recursive: true });
let id = 10;
for (const b of bundles) {
  const r = await rpc("tools/call", { name: "get_cometchat_implementation_bundle", arguments: { bundle: b } }, sid, id++);
  const result = r.payload?.result;
  if (!result || result.isError) {
    console.error("FAILED:", b, JSON.stringify(result).slice(0, 300));
    continue;
  }
  const text = (result.content || []).map((c) => c.text || "").join("\n\n");
  const file = path.join(OUT, b + ".md");
  fs.writeFileSync(file, "# MCP bundle pull: " + b + "\n\n" + text + "\n");
  console.log("pulled", b, "->", file, "(" + text.length, "chars )");
}
console.log("done");
