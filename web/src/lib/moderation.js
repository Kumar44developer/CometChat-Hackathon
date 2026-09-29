// Client-side pre-send moderation. This is the FIRST layer of MentorRoom's
// double-layer moderation (the second is the CometChat moderation extension on
// the server). A message that fails here never reaches the room; the composer
// shows an inline warning instead.

// Compact, deliberately-safe profanity/toxicity list. Extend freely.
const BLOCKLIST = [
  "idiot", "moron", "stupid", "dumbass", "shut up", "hate you",
  "kill yourself", "kys", "loser", "trash", "garbage", "worthless",
  "dumbass", "jerk", "bastard", "damn you", "screw you",
  "you suck", "suck", "hate", "ugly", "nazi", "retard",
  "slut", "whore", "bitch", "asshole", "fuck", "shit",
];

// Words that look bad but are common in study contexts -> whitelisted so we
// don't false-positive on legitimate questions.
const WHITELIST = ["class", "crash", "ass", "kill the process", "nazi-free"];

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z\s']/g, " ").replace(/\s+/g, " ").trim();
}

export function scanLocal(text) {
  if (!text || !text.trim()) return { flagged: false };
  const norm = ` ${normalize(text)} `;
  for (const term of BLOCKLIST) {
    const pattern = new RegExp(`(^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
    if (pattern.test(norm)) {
      // Skip if the match is part of a whitelisted phrase.
      const whitelisted = WHITELIST.some((w) => norm.includes(` ${w} `));
      if (!whitelisted) {
        return { flagged: true, reason: "Profanity or hostility detected", term };
      }
    }
  }
  return { flagged: false };
}

// Optional second local pass: a small-model toxicity call routed through the
// bot service (keeps API keys off the client). Fails open if the service is
// unreachable so the demo never hard-blocks on network hiccups.
export async function scanRemote(text, botUrl = "http://localhost:8787") {
  try {
    const res = await fetch(`${botUrl}/moderate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return { flagged: false };
    const data = await res.json();
    return { flagged: Boolean(data.flagged), reason: data.reason, score: data.score };
  } catch (e) {
    return { flagged: false };
  }
}

export async function moderate(text, { useAI = false } = {}) {
  const local = scanLocal(text);
  if (local.flagged) return local;
  if (useAI) return scanRemote(text);
  return { flagged: false };
}
