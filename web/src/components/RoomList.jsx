import { getGuid, getCohort, getTopic } from "../lib/rooms.js";

const TOPIC_ICONS = {
  "Data Structures": "🧮",
  "System Design": "🏛️",
  "Frontend Help": "🎨",
  "Algorithms": "⚡",
  "Databases": "🗄️",
};

export default function RoomList({ groups, selectedGuid, onSelect }) {
  if (!groups.length) {
    // Empty state — explicit, with the recovery action spelled out.
    return (
      <div className="card m-1 p-4 text-center" role="status">
        <p className="text-sm font-medium text-ink">No rooms in this cohort yet</p>
        <p className="mt-1 text-xs text-muted">
          Create them once: <code className="rounded-btn bg-elevated px-1.5 py-0.5">npm run provision</code>
        </p>
      </div>
    );
  }

  // Keyboard: ArrowUp/Down/Home/End move between rooms (roving list behavior).
  function onKeyDown(e) {
    const btns = [...e.currentTarget.querySelectorAll("button[data-room]")];
    const i = btns.indexOf(document.activeElement);
    if (i === -1) return;
    let next = null;
    if (e.key === "ArrowDown") next = btns[(i + 1) % btns.length];
    else if (e.key === "ArrowUp") next = btns[(i - 1 + btns.length) % btns.length];
    else if (e.key === "Home") next = btns[0];
    else if (e.key === "End") next = btns[btns.length - 1];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }

  return (
    <div aria-label="Study rooms" className="flex flex-col gap-2" onKeyDown={onKeyDown}>
      {groups.map((g) => {
        const guid = getGuid(g);
        const topic = getTopic(g);
        const cohort = getCohort(g);
        const icon = TOPIC_ICONS[topic] || "💬";
        const active = guid === selectedGuid;
        return (
          <button
            key={guid}
            data-room
            aria-current={active ? "true" : undefined}
            onClick={() => onSelect(g)}
            className={`card-interactive flex min-h-[48px] items-center gap-3 p-3 ${
              active ? "border-primary bg-primary-soft" : ""
            }`}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-elevated text-lg" aria-hidden="true">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">{topic}</div>
              <div className="truncate text-xs text-muted">{cohort}</div>
            </div>
            {active && <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />}
            <span className="sr-only">{active ? "(current room)" : ""}</span>
          </button>
        );
      })}
    </div>
  );
}
