// MentorRoom AI mentor bot.
// Logs in as the real CometChat user `mentor_bot`, so it has genuine presence
// (shows online), emits genuine typing indicators while it "thinks", and posts
// genuine group messages. Also produces end-of-session recaps and exposes a
// /moderate endpoint used by the web app's optional second moderation layer.
import "dotenv/config";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { loadCometChat } from "./lib/browser.js";
import { askMentor, generateRecap, classifyToxicity, llmConfigured } from "./lib/llm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load bot/.env if present, else fall back to a root .env.
for (const p of [path.join(__dirname, ".env"), path.join(__dirname, "..", ".env")]) {
  if (fs.existsSync(p)) {
    try {
      process.loadEnvFile
        ? process.loadEnvFile(p)
        : (await import("dotenv")).default.config({ path: p });
    } catch {
      /* dotenv/config already loaded the default */
    }
  }
}

const APP_ID = process.env.COMETCHAT_APP_ID;
const AUTH_KEY = process.env.COMETCHAT_AUTH_KEY;
const BOT_UID = process.env.COMETCHAT_BOT_UID || "mentor_bot";
const PORT = Number(process.env.BOT_PORT || 8787);

if (!APP_ID || !AUTH_KEY) {
  console.error(
    "\n[MentorRoom bot] Missing COMETCHAT_APP_ID / COMETCHAT_AUTH_KEY.\n" +
      "Copy .env.example to bot/.env (or root .env) and fill in your credentials.\n"
  );
  process.exit(1);
}

const processed = new Set(); // dedupe by message id
const contextCache = new Map(); // guid -> [{uid,name,text}] rolling window

// Crash resilience: transient network/DNS failures inside SDK internals must
// never take the mentor down (observed: an unhandled WebSocket 'error' event
// with ENOTFOUND killed the whole process, silencing the bot). Log and live.
process.on("uncaughtException", (e) =>
  console.warn("[mentor] uncaught exception (kept alive):", e?.message || e)
);
process.on("unhandledRejection", (e) =>
  console.warn("[mentor] unhandled rejection:", e?.message || e)
);

// The SDK sometimes hands us class instances (getters) and sometimes plain
// objects (properties), depending on transport. Read either safely.
function pick(obj, getter, key) {
  if (!obj) return undefined;
  if (typeof obj[getter] === "function") return obj[getter]();
  return obj[key];
}

function remember(ctx) {
  const { guid, uid, name, text } = ctx;
  const arr = contextCache.get(guid) || [];
  arr.push({ uid, name, text });
  if (arr.length > 25) arr.shift();
  contextCache.set(guid, arr);
}

function getContext(guid) {
  return contextCache.get(guid) || [];
}

function shouldAnswer(text) {
  const t = (text || "").trim();
  if (!t) return false;
  if (t.toLowerCase().startsWith("/")) return false; // commands handled separately
  // The mentor replies to every human message — questions, greetings,
  // statements — so nobody is ever left waiting for an answer.
  return true;
}

async function main() {
  const CometChat = await loadCometChat();
  console.log("[mentor] booting browser-shimmed CometChat SDK…");

  await CometChat.init(APP_ID);
  const user = await CometChat.login(BOT_UID, AUTH_KEY);
  console.log(`[mentor] logged in as ${user.getUid?.() || BOT_UID} — presence is now ONLINE.`);
  console.log(`[mentor] LLM: ${llmConfigured() ? "configured (" + process.env.LLM_PROVIDER + ")" : "fallback mode (no key)"}`);

  CometChat.addMessageListener(
    "mentorroom_bot",
    new CometChat.MessageListener({
      onTextMessageReceived: (message) => handleText(CometChat, message).catch((e) =>
        console.error("[mentor] text handler error:", e.message || e)
      ),
      onCustomMessageReceived: (message) => handleCustom(CometChat, message).catch((e) =>
        console.error("[mentor] custom handler error:", e.message || e)
      ),
    })
  );

  console.log("[mentor] listening. The mentor replies to every message in the room.");
  // Safety net: since the 2026-10-05 platform deploy, WebSocket push does not
  // deliver group messages to non-browser (Node/jsdom) sessions, while REST
  // reads still work. Poll each room for anything the socket missed; the
  // shared `processed` id-set keeps the two paths from ever double-answering.
  startPoller(CometChat);
  startHttpServer(CometChat);
}

// Core per-message logic, shared by the WS listener and the REST poller.
// WS hands us SDK class instances (getters); the poller hands us light
// wrappers with plain fields (`type` not `messageType`, `id` not `messageId`),
// so every read goes through pick() with both key variants.
async function handleText(CometChat, message) {
  const id =
    pick(message, "getMessageId", "messageId") || pick(message, "getId", "id");
  if (id && processed.has(id)) return;
  if (id) {
    processed.add(id);
    if (processed.size > 1000) processed.delete(processed.values().next().value); // keep bounded
  }
  const sender = pick(message, "getSender", "sender");
  const senderUid = pick(sender, "getUid", "uid");
  if (senderUid === BOT_UID) return; // never answer itself
  const receiverType = pick(message, "getReceiverType", "receiverType");
  if (receiverType !== CometChat.RECEIVER_TYPE.GROUP && receiverType !== "group") return;
  const receiver = pick(message, "getReceiver", "receiver");
  const guid = typeof receiver === "string" ? receiver : pick(receiver, "getGuid", "guid");
  const text = pick(message, "getText", "text") || "";

  const name = pick(sender, "getName", "name") || senderUid || "someone";
  remember({ guid, uid: senderUid, name, text });

  if (text.trim().toLowerCase() === "/recap") {
    await postRecap(CometChat, guid);
    return;
  }
  if (shouldAnswer(text)) {
    await answer(CometChat, guid, text);
  }
}

async function handleCustom(CometChat, message) {
  const id =
    pick(message, "getMessageId", "messageId") || pick(message, "getId", "id");
  if (id && processed.has(id)) return; // WS + poller must not double-recap
  if (id) {
    processed.add(id);
    if (processed.size > 1000) processed.delete(processed.values().next().value);
  }
  // WS hands us SDK CustomMessage instances whose getType()/getSubType()
  // return the custom type; REST-polled wrappers carry the custom type in
  // `type` as well (with `category: "custom"`). Check every candidate so
  // recap_request is detected on both transports.
  const candidates = [
    pick(message, "getType", "type"),
    pick(message, "getSubType", "subType"),
    pick(message, "getCustomType", "customType"),
    pick(message, "getTemplateKey", "templateKey"),
  ];
  if (!candidates.includes("recap_request")) return;
  const receiver = pick(message, "getReceiver", "receiver");
  const guid = typeof receiver === "string" ? receiver : pick(receiver, "getGuid", "guid");
  await postRecap(CometChat, guid);
}

// REST fallback: every few seconds, fetch messages newer than the last seen
// sentAt for each group the mentor belongs to and feed them through the same
// handlers as the live listener.
function startPoller(CometChat) {
  const rooms = new Map(); // guid -> last seen sentAt (seconds)
  let tick = 0;
  const refreshRooms = async () => {
    const groups = await new CometChat.GroupsRequestBuilder().setLimit(50).build().fetchNext();
    for (const g of groups) {
      const guid = pick(g, "getGuid", "guid");
      if (guid && !rooms.has(guid)) rooms.set(guid, Math.floor(Date.now() / 1000));
    }
  };
  setInterval(async () => {
    try {
      if (tick++ % 15 === 0) await refreshRooms(); // ~every 90s
      for (const [guid, since] of rooms) {
        const msgs = await new CometChat.MessagesRequestBuilder()
          .setGUID(guid)
          .setLimit(20)
          .setTimestamp(since)
          .build()
          .fetchNext();
        for (const m of msgs || []) {
          const ts = Number(pick(m, "getSentAt", "sentAt")) || 0;
          if (ts > rooms.get(guid)) rooms.set(guid, ts);
          // Polled wrappers expose the custom type as `type` for custom
          // messages ("recap_request"), so route on `category` first.
          const category = pick(m, "getCategory", "category");
          const type =
            pick(m, "getMessageType", "messageType") || pick(m, "getType", "type");
          if (category === "custom" || type === "recap_request")
            await handleCustom(CometChat, m);
          else if (type === "text") await handleText(CometChat, m);
        }
      }
    } catch (e) {
      console.warn("[mentor] poll tick failed (will retry):", e?.message || e);
    }
  }, 6000);
  refreshRooms().catch(() => {});
}

// Type -> think -> send, all as the mentor user.
async function answer(CometChat, guid, question) {
  const indicator = new CometChat.TypingIndicator(guid, CometChat.RECEIVER_TYPE.GROUP);
  CometChat.startTyping(indicator);
  try {
    const context = getContext(guid).slice(-20);
    const reply = await askMentor(context, question);
    const msg = new CometChat.TextMessage(guid, reply, CometChat.RECEIVER_TYPE.GROUP);
    // NOTE: CometChat metadata values must be JSON objects, not booleans.
    try {
      await CometChat.sendMessage(msg);
    } catch (e) {
      // A transient POST failure must not swallow the answer — wait a beat
      // and retry once before giving up (observed live during demos).
      console.warn("[mentor] sendMessage failed, retrying once:", e.message || e);
      await new Promise((r) => setTimeout(r, 1500));
      await CometChat.sendMessage(msg);
    }
    remember({ guid, uid: BOT_UID, name: "Mentor AI", text: reply });
  } catch (e) {
    console.error("[mentor] answer error:", e.message);
  } finally {
    CometChat.endTyping(indicator);
  }
}

// Build a structured recap and post it as a distinct, styled message.
// Sent as a CustomMessage (customType "mentor_recap") because CometChat only
// allows pre-registered categories on text messages; a custom type is the
// idiomatic way to carry a styled recap card.
async function postRecap(CometChat, guid) {
  const indicator = new CometChat.TypingIndicator(guid, CometChat.RECEIVER_TYPE.GROUP);
  CometChat.startTyping(indicator);
  try {
    const context = getContext(guid).slice(-40);
    const recap = await generateRecap(context);
    const body =
      recap.summary +
      (recap.openQuestions?.length
        ? `\n\nOpen questions:\n- ${recap.openQuestions.join("\n- ")}`
        : "");
    const data = {
      text: body,
      summary: recap.summary,
      topics: recap.topics || [],
      openQuestions: recap.openQuestions || [],
    };
    const msg = new CometChat.CustomMessage(
      guid,
      CometChat.RECEIVER_TYPE.GROUP,
      "mentor_recap",
      data
    );
    msg.setCategory("custom");
    msg.setMetadata({
      recap: {
        summary: recap.summary,
        topics: recap.topics || [],
        openQuestions: recap.openQuestions || [],
      },
    });
    try {
      await CometChat.sendMessage(msg);
    } catch (e) {
      console.warn("[mentor] recap send failed, retrying once:", e.message || e);
      await new Promise((r) => setTimeout(r, 1500));
      await CometChat.sendMessage(msg);
    }
    remember({ guid, uid: BOT_UID, name: "Mentor AI", text: body });
  } catch (e) {
    console.error("[mentor] recap error:", e.message || e);
  } finally {
    CometChat.endTyping(indicator);
  }
}

// Minimal HTTP surface: /health + /moderate (optional AI toxicity check).
function startHttpServer(CometChat) {
  import("express").then(({ default: express }) => {
    const app = express();
    app.use(express.json());
    // Allow the web app (different origin) to poll /health + /moderate.
    app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") return res.sendStatus(204);
      next();
    });
    app.get("/health", (_req, res) => res.json({ ok: true, bot: BOT_UID }));
    app.post("/moderate", async (req, res) => {
      const text = req.body?.text || "";
      // Pass 1: fast keyword heuristic (kept in sync with the web list).
      const bad = ["fuck", "shit", "bitch", "asshole", "kill yourself", "kys", "retard", "slut", "whore"];
      if (bad.some((w) => text.toLowerCase().includes(w))) {
        return res.json({ flagged: true, reason: "Detected by server moderation" });
      }
      // Pass 2: small-model toxicity classification (fails open on error).
      res.json(await classifyToxicity(text));
    });
    app.listen(PORT, () => console.log(`[mentor] http api on http://localhost:${PORT}`));
  });
}

main().catch((e) => {
  console.error("[mentor] fatal:", e);
  process.exit(1);
});
