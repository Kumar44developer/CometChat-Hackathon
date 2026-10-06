// Thin, promise-friendly wrapper around the CometChat JavaScript SDK (v4).
// Every feature in the app (rooms, messages, typing, presence, moderation)
// flows through here so the SDK surface lives in one place.
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { config } from "./config.js";

let initialized = false;

export function isConfigured() {
  return Boolean(config.appId && config.authKey);
}

export async function initCometChat() {
  if (initialized) return true;
  // The JS SDK defaults to the eu region; pin it to the configured region and
  // subscribe presence for all users so the mentor's online/offline is visible.
  const appSettings = new CometChat.AppSettingsBuilder()
    .subscribePresenceForAllUsers()
    .setRegion(config.region)
    .build();
  // Idempotent guard: the SDK throws if init is called twice in a session.
  await CometChat.init(config.appId, appSettings);
  initialized = true;
  return true;
}

export async function login(uid) {
  await initCometChat();
  const user = await CometChat.login(uid, config.authKey);
  return user;
}

export async function logout() {
  try {
    await CometChat.logout();
  } catch (e) {
    // ignore
  }
}

export function getLoggedInUser() {
  return CometChat.getLoggedInUser();
}

// ---- Rooms (groups) --------------------------------------------------------

export async function fetchRooms(limit = 100) {
  // This SDK version runs requests via request.fetchNext() (no CometChat.getGroups).
  const request = new CometChat.GroupsRequestBuilder().setLimit(limit).build();
  return request.fetchNext();
}

export async function joinGroup(guid) {
  // Public rooms: joining is idempotent; already-a-member resolves fine.
  try {
    return await CometChat.joinGroup(
      guid,
      CometChat.GROUP_TYPE.PUBLIC,
      ""
    );
  } catch (e) {
    // ERRO_GROUP_USER_ALREADY_MEMBER etc. -> safe to ignore.
    return null;
  }
}

export async function getGroupDetails(guid) {
  return CometChat.getGroupDetails(guid);
}

// ---- Messages --------------------------------------------------------------

export async function fetchMessages(guid, limit = 30) {
  // This SDK uses MessagesRequestBuilder().setGUID(guid); fetchPrevious() returns
  // the most recent messages without needing a timestamp cursor.
  const request = new CometChat.MessagesRequestBuilder()
    .setGUID(guid)
    .setLimit(limit)
    .build();
  return request.fetchPrevious();
}

// Messages newer than `since` (unix seconds) for a room, via REST. Used as a
// live-delivery fallback: since the 2026-10-05 platform deploy, WebSocket
// push of group messages to clients is unreliable, so the UI polls this.
export async function fetchMessagesSince(guid, since, limit = 30) {
  const request = new CometChat.MessagesRequestBuilder()
    .setGUID(guid)
    .setLimit(limit)
    .setTimestamp(since)
    .build();
  return request.fetchNext();
}

export function buildTextMessage(guid, text, { category, metadata } = {}) {
  const message = new CometChat.TextMessage(
    guid,
    text,
    CometChat.RECEIVER_TYPE.GROUP
  );
  if (category) message.setCategory(category);
  if (metadata) {
    Object.keys(metadata).forEach((k) => message.setMetadata(k, metadata[k]));
  }
  return message;
}

export function sendMessage(message) {
  return CometChat.sendMessage(message);
}

// Ask the mentor to produce an end-of-session recap (heard by the bot).
export function sendRecapRequest(guid) {
  const custom = new CometChat.CustomMessage(
    guid,
    CometChat.RECEIVER_TYPE.GROUP,
    "recap_request",
    { title: "End session" }
  );
  custom.setCategory("custom");
  return CometChat.sendMessage(custom);
}

// ---- Typing ----------------------------------------------------------------

export function startTyping(guid) {
  const indicator = new CometChat.TypingIndicator(
    guid,
    CometChat.RECEIVER_TYPE.GROUP
  );
  CometChat.startTyping(indicator);
}

export function stopTyping(guid) {
  const indicator = new CometChat.TypingIndicator(
    guid,
    CometChat.RECEIVER_TYPE.GROUP
  );
  CometChat.endTyping(indicator);
}

// ---- Listeners -------------------------------------------------------------

export function addMessageListener(id, handlers) {
  const listener = new CometChat.MessageListener(handlers);
  CometChat.addMessageListener(id, listener);
  return () => CometChat.removeMessageListener(id);
}

export function addPresenceListener(id, { onUserOnline, onUserOffline } = {}) {
  // This SDK exposes presence through UserListener / addUserListener (there is
  // no addUserPresenceListener). Keep it fully defensive so an unavailable
  // presence plan can never crash the component that mounts it.
  try {
    const listener = new CometChat.UserListener({ onUserOnline, onUserOffline });
    CometChat.addUserListener(id, listener);
    return () => {
      try {
        CometChat.removeUserListener(id);
      } catch {
        /* ignore */
      }
    };
  } catch (e) {
    return () => {};
  }
}

// Seed online status for the given uids via getUser().getStatus().
export async function getOnlineUsers(uids = []) {
  const results = await Promise.all(
    uids.map((uid) =>
      CometChat.getUser(uid)
        .then((u) => ((u.getStatus ? u.getStatus() : u.status) === "online" ? u : null))
        .catch(() => null)
    )
  );
  return results.filter(Boolean);
}

export { CometChat };
