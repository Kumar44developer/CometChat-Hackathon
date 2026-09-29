// Central config + shared constants for the MentorRoom web app.

export const config = {
  appId: import.meta.env.VITE_COMETCHAT_APP_ID,
  region: import.meta.env.VITE_COMETCHAT_REGION || "us",
  authKey: import.meta.env.VITE_COMETCHAT_AUTH_KEY,
  mentorUid: import.meta.env.VITE_MENTOR_UID || "mentor_bot",
  // The mentor bot's local HTTP API (GET /health). Used to show a truthful
  // "online" signal — the bot runs under a jsdom shim and does not keep a
  // CometChat presence heartbeat, so the SDK status can read offline even
  // while it is actively answering.
  botUrl: import.meta.env.VITE_BOT_URL || "http://localhost:8787",
};

// Demo human users that the provision script creates. The login screen offers
// these as one-click identities so you can open two browsers and chat live.
export const demoUsers = [
  { uid: "student1", name: "Student 1" },
  { uid: "student2", name: "Student 2" },
];

// Cohorts (tenants). The room list is filtered by the selected cohort using
// CometChat group metadata.cohort. "All" shows every room.
export const COHORT_ALL = "All";

// A room is treated as a mentor room when its group has type "public" and
// metadata.cohort set by the provision script.
export const RECAP_CATEGORY = "mentor_recap";

export function isMentor(user) {
  if (!user) return false;
  const uid = typeof user.getUid === "function" ? user.getUid() : user.uid;
  return uid === config.mentorUid;
}
