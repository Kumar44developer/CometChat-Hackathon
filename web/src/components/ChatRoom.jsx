import { useEffect, useRef, useState } from "react";
import {
  fetchMessages,
  addMessageListener,
  sendRecapRequest,
} from "../lib/cometchat.js";
import { normalizeMessage } from "../lib/messages.js";
import { getGuid, getTopic, getCohort } from "../lib/rooms.js";
import { config } from "../lib/config.js";
import MessageBubble from "./MessageBubble.jsx";
import TypingIndicator from "./TypingIndicator.jsx";
import Composer from "./Composer.jsx";
import Spinner from "./Spinner.jsx";

export default function ChatRoom({ group, cohort, currentUser, mentorOnline }) {
  const guid = getGuid(group);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mentorTyping, setMentorTyping] = useState(false);
  const [ending, setEnding] = useState(false);
  const bottomRef = useRef(null);
  const myUid = currentUser.getUid ? currentUser.getUid() : currentUser.uid;

  // Load history.
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const list = await fetchMessages(guid, 40);
        if (!active) return;
        const norm = (list || [])
          .map(normalizeMessage)
          // Skip empty/system messages (no text and not a recap card) — they
          // would render as blank bubbles.
          .filter((m) => m.isRecap || (m.text || "").trim())
          .sort((a, b) => a.sentAt - b.sentAt);
        setMessages(norm);
      } catch (e) {
        console.error("history", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [guid]);

  // Append with de-duplication by message id. Used by the live listener AND
  // for the sender's own messages (CometChat does not echo your own group
  // messages back through the listener — they must be appended optimistically,
  // or the sender sees nothing after pressing Send).
  function appendMessage(msg) {
    const norm = normalizeMessage(msg);
    if (!norm.isRecap && !(norm.text || "").trim()) return; // ignore empty/system
    setMessages((m) => (m.some((x) => x.id === norm.id) ? m : [...m, norm]));
  }

  // Live messages + typing for this room.
  useEffect(() => {
    const listenerId = `room_${guid}_${Date.now()}`;
    const remove = addMessageListener(listenerId, {
      onTextMessageReceived: (msg) => handleIncoming(msg),
      onCustomMessageReceived: (msg) => {
        // Render recap cards (custom type from mentor); ignore recap requests.
        // Filter by receiver guid so a recap posted in one room never leaks here.
        const type = typeof msg.getType === "function" ? msg.getType() : msg.type;
        if (type !== "mentor_recap") return;
        const receiver = msg.getReceiver ? msg.getReceiver() : msg.receiver;
        const rid = typeof receiver === "string" ? receiver : receiver?.guid;
        if (rid !== guid) return;
        appendMessage(msg);
      },
      onTypingStarted: (indicator) => {
        const rid = indicator.getReceiverId ? indicator.getReceiverId() : indicator.receiverId;
        const sender = indicator.getSender ? indicator.getSender() : indicator.sender;
        const suid = sender ? (sender.getUid ? sender.getUid() : sender.uid) : null;
        if (rid === guid && suid === config.mentorUid) setMentorTyping(true);
      },
      onTypingEnded: (indicator) => {
        const rid = indicator.getReceiverId ? indicator.getReceiverId() : indicator.receiverId;
        const sender = indicator.getSender ? indicator.getSender() : indicator.sender;
        const suid = sender ? (sender.getUid ? sender.getUid() : sender.uid) : null;
        if (rid === guid && suid === config.mentorUid) setMentorTyping(false);
      },
    });

    function handleIncoming(msg) {
      const receiver = msg.getReceiver ? msg.getReceiver() : msg.receiver;
      const rid = typeof receiver === "string" ? receiver : receiver?.guid;
      if (rid !== guid) return;
      appendMessage(msg);
      const sender = msg.getSender ? msg.getSender() : msg.sender;
      const suid = sender ? (sender.getUid ? sender.getUid() : sender.uid) : null;
      if (suid === config.mentorUid) setMentorTyping(false);
    }

    return () => remove && remove();
  }, [guid]);

  // Auto-scroll — respects prefers-reduced-motion.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }, [messages, mentorTyping]);

  async function handleEndSession() {
    setEnding(true);
    try {
      await sendRecapRequest(guid);
    } catch (e) {
      console.error("recap request", e);
    } finally {
      setTimeout(() => setEnding(false), 1500);
    }
  }

  return (
    <>
      {/* Room header */}
      <div className="flex items-center justify-between border-b border-hairline bg-surface px-6 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="h4 truncate font-semibold text-ink">{getTopic(group)}</h2>
            <span className="chip">{getCohort(group) || cohort}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted" role="status">
            <span className={`h-1.5 w-1.5 rounded-full ${mentorOnline ? "bg-primary" : "bg-muted"}`} aria-hidden="true" />
            Mentor AI {mentorOnline ? "online" : "offline"} · replies to every message — just ask
          </div>
        </div>
        <button
          onClick={handleEndSession}
          disabled={ending}
          aria-busy={ending || undefined}
          className="btn-secondary px-4 py-1.5 text-xs"
          title="Ask the mentor to post a session recap"
        >
          {ending && <Spinner />}
          {ending ? "Posting recap…" : "⏹ End session"}
        </button>
      </div>

      {/* Messages — a polite live region so screen readers announce new turns */}
      <div
        className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-elevated px-4 py-4 md:px-6"
        role="log"
        aria-live="polite"
        aria-label={`${getTopic(group)} conversation`}
      >
        {loading && (
          <div className="flex flex-col items-center gap-2 py-8 text-muted" role="status">
            <Spinner size={20} />
            <p className="text-sm">Loading messages…</p>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-sm text-center text-sm text-muted">
            No messages yet. Say hi or ask the mentor a question — try
            <span className="mx-1 rounded-btn bg-surface px-2 py-0.5 text-ink">@mentor how do I reverse a linked list?</span>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id || i}
            message={m}
            isMine={m.senderUid === myUid}
            prev={messages[i - 1]}
          />
        ))}
        {mentorTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <Composer guid={guid} onSelfMessage={appendMessage} />
    </>
  );
}
