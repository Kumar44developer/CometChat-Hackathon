import Avatar from "./Avatar.jsx";
import RecapCard from "./RecapCard.jsx";
import { formatTime } from "../lib/messages.js";
import { isMentor, config } from "../lib/config.js";

export default function MessageBubble({ message, isMine, prev }) {
  // Recap messages render as a distinct card.
  if (message.isRecap || message.type === "mentor_recap") {
    return <RecapCard message={message} />;
  }

  const mentor = message.senderUid === config.mentorUid || isMentor({ uid: message.senderUid });
  const grouped = prev && prev.senderUid === message.senderUid && !prev.isRecap;
  const align = isMine ? "justify-end" : "justify-start";

  return (
    <div className={`flex ${align} gap-2 ${grouped ? "mt-0.5" : "mt-3"}`}>
      {!isMine && (
        <div className="w-8 shrink-0 self-end">
          {!grouped && <Avatar user={{ uid: message.senderUid, name: message.senderName }} size={32} showBadge={mentor} />}
        </div>
      )}
      <div className={`max-w-[72%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
        {!grouped && !isMine && (
          <div className="mb-0.5 flex items-center gap-1 px-1 text-xs text-muted">
            <span className="font-semibold text-ink">{message.senderName}</span>
            {mentor && (
              <span className="chip bg-primary text-white">✦ AI mentor</span>
            )}
          </div>
        )}
        <div
          className={`rounded-card px-4 py-2.5 text-body leading-relaxed ${
            isMine
              ? "rounded-br-md bg-primary text-white"
              : mentor
              ? "rounded-bl-md border border-primary/30 bg-primary-soft text-ink"
              : "rounded-bl-md border border-hairline bg-surface text-ink"
          }`}
        >
          <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.text}</span>
        </div>
        <span className="mt-0.5 px-1 text-xs tabular-nums text-muted">{formatTime(message.sentAt)}</span>
      </div>
    </div>
  );
}
