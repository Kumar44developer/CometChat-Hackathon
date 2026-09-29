import { formatTime } from "../lib/messages.js";

// A recap is a real group message from the mentor (a CustomMessage typed
// "mentor_recap"). The bot attaches structured metadata (summary, topics,
// openQuestions) and a readable text body. This renders the metadata if
// present, otherwise the text. Flat, 24px card — no shadows.
export default function RecapCard({ message }) {
  const meta = message.metadata || {};
  const recap = meta.recap || {};
  const summary = recap.summary || message.text;
  const topics = recap.topics || [];
  const openQuestions = recap.openQuestions || [];

  return (
    <div className="my-3" role="group" aria-label="Session recap from Mentor AI">
      <div className="overflow-hidden rounded-card border border-primary/25 bg-surface">
        <div className="flex items-center gap-2 border-b border-hairline bg-primary-tint px-5 py-2.5">
          <span className="text-base" aria-hidden="true">📝</span>
          <span className="h4 text-ink">Session recap</span>
          <span className="chip bg-primary text-white">by Mentor AI ✦</span>
          <span className="ml-auto text-xs tabular-nums text-muted">{formatTime(message.sentAt)}</span>
        </div>
        <div className="space-y-3 px-5 py-4 text-body">
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed text-ink">{summary}</p>

          {topics.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                Covered
              </div>
              <div className="flex flex-wrap gap-1.5">
                {topics.map((t, i) => (
                  <span key={i} className="chip bg-elevated text-ink">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {openQuestions.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                Open questions
              </div>
              <ul className="list-disc space-y-0.5 pl-5 text-muted">
                {openQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
