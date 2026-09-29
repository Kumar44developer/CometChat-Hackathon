import Avatar from "./Avatar.jsx";
import { config } from "../lib/config.js";

export default function TypingIndicator() {
  // Lives inside the message log (a live region), so its appearance is
  // announced automatically — no nested role="status" needed.
  return (
    <div className="mt-3 flex items-end gap-2">
      <div className="w-8 shrink-0">
        <Avatar user={{ uid: config.mentorUid, name: "Mentor AI" }} size={32} showBadge />
      </div>
      <div className="flex items-center gap-2 rounded-card rounded-bl-md border border-primary/30 bg-primary-soft px-4 py-2.5 text-primary">
        <span className="text-xs font-medium">Mentor AI is thinking</span>
        <span className="flex items-center gap-1">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </span>
      </div>
    </div>
  );
}
