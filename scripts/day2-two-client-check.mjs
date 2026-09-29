// Day-2 verification: a SECOND real CometChat client (student2) exchanging
// live messages with the browser session (student1). Proves the two-browser
// requirement without needing a second physical window — same sockets, same
// SDK, same group. Run: node scripts/day2-two-client-check.mjs
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadCometChat } from "../bot/lib/browser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const p of [
  path.join(__dirname, "..", "bot", ".env"),
  path.join(__dirname, "..", ".env"),
]) {
  if (fs.existsSync(p)) process.loadEnvFile?.(p);
}

const APP_ID = process.env.COMETCHAT_APP_ID;
const AUTH_KEY = process.env.COMETCHAT_AUTH_KEY;
const ROOM = process.env.MR_TEST_ROOM || "room_algo";
const OTHER = "student1";

if (!APP_ID || !AUTH_KEY) {
  console.error("missing credentials");
  process.exit(1);
}

const CometChat = await loadCometChat();
await CometChat.init(APP_ID);
await CometChat.login("student2", AUTH_KEY);
console.log("[student2] logged in — listening on", ROOM);

let replied = false;

CometChat.addMessageListener(
  "day2_check",
  new CometChat.MessageListener({
    onTextMessageReceived: async (message) => {
      const sender = message.getSender?.() || message.sender;
      const suid = sender?.getUid?.() || sender?.uid;
      const receiver = message.getReceiver?.() || message.receiver;
      const rid = typeof receiver === "string" ? receiver : receiver?.guid;
      if (rid !== ROOM) return;
      const text = message.getText?.() || message.text || "";
      console.log(`[student2] LIVE RECEIVED from ${suid}: "${text}"`);
      if (suid === OTHER && !replied) {
        replied = true;
        const msg = new CometChat.TextMessage(
          ROOM,
          "hey student1! 👋 this is student2 (second live client) — Day 2 two-way chat confirmed.",
          CometChat.RECEIVER_TYPE.GROUP
        );
        await CometChat.sendMessage(msg);
        console.log("[student2] reply sent to", ROOM);
        setTimeout(() => process.exit(0), 3000);
      }
    },
  })
);

// Proactive hello from student2 (shows browser receiving live from client #2)
const hello = new CometChat.TextMessage(
  ROOM,
  "hello from student2 — second CometChat client is online (Day 2 check)",
  CometChat.RECEIVER_TYPE.GROUP
);
await CometChat.sendMessage(hello);
console.log("[student2] hello sent; waiting for student1 for up to 90s...");
setTimeout(() => {
  console.log("[student2] timeout — exiting");
  process.exit(replied ? 0 : 2);
}, 90000);
