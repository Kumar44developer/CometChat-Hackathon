// Normalize CometChat message objects (which use getter methods) into plain
// objects that are easy to render. Works for both history and live messages.
import { RECAP_CATEGORY } from "./config.js";

function call(obj, getter, fallback) {
  if (!obj) return fallback;
  if (typeof obj[getter] === "function") {
    const v = obj[getter]();
    return v === undefined || v === null ? fallback : v;
  }
  const key = getter.replace(/^get/, "").toLowerCase();
  return obj[key] !== undefined ? obj[key] : fallback;
}

export function normalizeMessage(msg) {
  const sender = call(msg, "getSender", null);
  const senderUser = typeof sender?.getUid === "function" || sender?.uid ? sender : null;
  return {
    id: call(msg, "getMessageId", Math.random().toString(36)),
    raw: msg,
    type: call(msg, "getType", "message"),
    category: call(msg, "getCategory", "message"),
    text: call(msg, "getText", ""),
    receiverId: call(msg, "getReceiver", ""),
    receiverType: call(msg, "getReceiverType", ""),
    sentAt: Number(call(msg, "getSentAt", Math.floor(Date.now() / 1000))),
    senderUid: senderUser ? call(senderUser, "getUid", "") : "",
    senderName: senderUser ? call(senderUser, "getName", "Unknown") : "Unknown",
    senderAvatar: senderUser ? call(senderUser, "getAvatar", "") : "",
    metadata: call(msg, "getMetadata", {}) || {},
    isRecap:
      call(msg, "getCategory", "") === RECAP_CATEGORY ||
      call(msg, "getType", "") === RECAP_CATEGORY ||
      Boolean((call(msg, "getMetadata", {}) || {}).recap),
  };
}

export function formatTime(tsSeconds) {
  try {
    return new Date(tsSeconds * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
