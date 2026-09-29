import { useRef, useState } from "react";
import { buildTextMessage, sendMessage, startTyping, stopTyping } from "../lib/cometchat.js";
import { moderate } from "../lib/moderation.js";
import Spinner from "./Spinner.jsx";

const MAX_LEN = 500; // edge case: cap runaway pastes, warn near the limit

export default function Composer({ guid, onSelfMessage }) {
  const [text, setText] = useState("");
  const [warning, setWarning] = useState("");
  const [sending, setSending] = useState(false);
  const typingTimer = useRef(null);
  const nearLimit = text.length > MAX_LEN - 50;

  function onInput(e) {
    const v = e.target.value.slice(0, MAX_LEN); // overflow guard
    setText(v);
    if (warning) setWarning("");
    // Emit a typing indicator so the other browser sees you type (real SDK typing).
    try {
      startTyping(guid);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => stopTyping(guid), 1500);
    } catch (err) {
      /* ignore */
    }
  }

  async function send() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      // Layer 1: client-side moderation (keyword list + server small-model
      // toxicity pass via the bot's /moderate; fails open if unreachable).
      // Blocked messages never hit the room.
      const result = await moderate(value, { useAI: true });
      if (result.flagged) {
        setWarning(`Message blocked by room moderation — ${result.reason || "inappropriate content"}.`);
        return;
      }
      const message = buildTextMessage(guid, value);
      const sent = await sendMessage(message);
      // CometChat does not push your own group message back through the
      // listener, so render it now (de-duped by id in ChatRoom).
      if (onSelfMessage && sent) onSelfMessage(sent);
      setText("");
      stopTyping(guid);
    } catch (e) {
      setWarning((e && (e.message || e.errorDescription)) || "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-hairline bg-surface px-6 py-3">
      {warning && (
        <div
          id={`composer-warn-${guid}`}
          role="alert"
          className="callout-error mb-2 flex items-center gap-2"
        >
          <span aria-hidden="true">🛡️</span>
          <span>{warning}</span>
          <button
            onClick={() => setWarning("")}
            aria-label="Dismiss moderation warning"
            className="ml-auto rounded-btn px-2 py-1 text-xs text-ink/70 transition-colors duration-300 hover:bg-hoverstrong hover:text-ink"
          >
            dismiss
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <label htmlFor={`composer-${guid}`} className="sr-only">
          Message this room
        </label>
        <input
          id={`composer-${guid}`}
          value={text}
          onChange={onInput}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Message the room… Mentor AI replies to every message"
          maxLength={MAX_LEN}
          disabled={sending}
          aria-invalid={warning ? "true" : undefined}
          aria-describedby={warning ? `composer-warn-${guid}` : undefined}
          className="input flex-1"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          aria-busy={sending || undefined}
          className="btn-primary"
        >
          {sending && <Spinner />}
          {sending ? "Sending" : "Send"}
        </button>
      </div>
      <p className="mt-1.5 flex items-center justify-between gap-4 text-xs text-muted">
        <span>
          Protected by MentorRoom moderation (client check + CometChat moderation extension).
        </span>
        {nearLimit && (
          <span className="shrink-0 tabular-nums" aria-live="polite">
            {text.length}/{MAX_LEN}
          </span>
        )}
      </p>
    </div>
  );
}
