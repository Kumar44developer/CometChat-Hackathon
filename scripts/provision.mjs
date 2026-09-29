// MentorRoom provisioner — creates demo users and multi-tenant cohort rooms
// via the CometChat REST API, so you don't have to click through the dashboard.
//
//   npm run provision
//
// Reads credentials from a root .env (or environment). See .env.example.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- tiny .env loader (no dependency) --------------------------------------
function loadEnv() {
  for (const p of [path.join(__dirname, "..", ".env"), path.join(__dirname, "..", ".env.example")]) {
    if (fs.existsSync(p)) {
      for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (m && !(m[1] in process.env)) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
      if (p.endsWith(".env")) break;
    }
  }
}
loadEnv();

const APP_ID = process.env.COMETCHAT_APP_ID;
const AUTH_KEY = process.env.COMETCHAT_AUTH_KEY;
// Group creation needs a REST API key with fullAccess scope. If you set
// COMETCHAT_REST_API_KEY we use it; otherwise we fall back to the auth key.
const REST_KEY = process.env.COMETCHAT_REST_API_KEY || AUTH_KEY;
const REGION = process.env.COMETCHAT_REGION || "us";
const API_BASE =
  process.env.COMETCHAT_API_BASE || `https://${APP_ID}.api-${REGION}.cometchat.io/v3`;

const BOT_UID = process.env.COMETCHAT_BOT_UID || "mentor_bot";
const STUDENTS = [
  { uid: process.env.COMETCHAT_STUDENT_1 || "student1", name: "Student One" },
  { uid: process.env.COMETCHAT_STUDENT_2 || "student2", name: "Student Two" },
];

// Multi-tenant rooms: two cohorts, each with its own topic rooms.
const ROOMS = [
  { guid: "room_ds", name: "Data Structures", topic: "Data Structures", cohort: "batch-2026" },
  { guid: "room_sd", name: "System Design", topic: "System Design", cohort: "batch-2026" },
  { guid: "room_fe", name: "Frontend Help", topic: "Frontend Help", cohort: "batch-2026" },
  { guid: "room_algo", name: "Algorithms", topic: "Algorithms", cohort: "web-devs" },
  { guid: "room_db", name: "Databases", topic: "Databases", cohort: "web-devs" },
];

if (!APP_ID || !AUTH_KEY || APP_ID.includes("your_") || AUTH_KEY.includes("your_")) {
  console.error(
    "\n✖ Missing credentials. Copy .env.example to .env and set COMETCHAT_APP_ID,\n" +
      "  COMETCHAT_AUTH_KEY and COMETCHAT_REGION (from app.cometchat.com → Credentials).\n"
  );
  process.exit(1);
}

const headers = {
  accept: "application/json",
  "content-type": "application/json",
  apikey: REST_KEY,
};

async function post(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

// 409 / "already exists" is fine — provision is idempotent.
function isExists(data) {
  const s = JSON.stringify(data || {}).toLowerCase();
  return s.includes("already") || s.includes("exist") || s.includes("duplicate");
}

async function ensureUser({ uid, name }) {
  // subscription_mode user_presence lets the SDK track this user's presence.
  const { ok, status, data } = await post("/users", {
    uid,
    name,
    auth_headers: { subscription_mode: "user_presence" },
  });
  if (ok) console.log(`  ✓ user ${uid}`);
  else if (isExists(data) || status === 409) console.log(`  • user ${uid} already exists`);
  else console.warn(`  ✖ user ${uid}:`, data);
}

async function ensureRoom(room) {
  // CometChat create-group members format: arrays of UIDs per scope.
  const members = {
    participants: STUDENTS.map((s) => s.uid),
    admins: [BOT_UID],
  };
  const { ok, status, data } = await post("/groups", {
    guid: room.guid,
    name: room.name,
    type: "public",
    owner: BOT_UID,
    members,
    metadata: { cohort: room.cohort, topic: room.topic },
  });
  if (ok) console.log(`  ✓ room ${room.name} (${room.cohort})`);
  else if (isExists(data) || status === 409) console.log(`  • room ${room.guid} already exists`);
  else if (status === 403) {
    console.warn(
      `  ✖ room ${room.guid}: 403 AUTH_ERR_NO_ACCESS — your key cannot create groups.\n` +
        `    Set COMETCHAT_REST_API_KEY (a fullAccess REST key) in .env and re-run,\n` +
        `    or create the rooms in the dashboard (Groups → Create).`
    );
  } else console.warn(`  ✖ room ${room.guid}:`, data);
}

async function run() {
  console.log(`\nMentorRoom provision → ${API_BASE}\n`);
  console.log("Users:");
  await ensureUser({ uid: BOT_UID, name: "Mentor AI" });
  for (const s of STUDENTS) await ensureUser(s);

  console.log("\nRooms (cohorts):");
  for (const r of ROOMS) await ensureRoom(r);

  console.log(
    "\nDone. Log in as student1 / student2 in two browsers.\n" +
      "Enable presence + moderation in the dashboard if prompted:\n" +
      "  • App Settings → Presence → ON\n" +
      "  • Extensions → Moderation → install & set rules\n"
  );
}

run().catch((e) => {
  console.error("Provision failed:", e);
  process.exit(1);
});
