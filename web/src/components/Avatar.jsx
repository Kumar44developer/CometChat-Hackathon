import { isMentor } from "../lib/config.js";

const COLORS = ["#0100F8", "#0100C6", "#4338CA", "#1E3A8A", "#6366F1", "#0EA5E9"];

function initials(name = "?") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function colorFor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export default function Avatar({ user, size = 36, online, showBadge }) {
  const name = user ? (user.getName ? user.getName() : user.name) : "?";
  const uid = user ? (user.getUid ? user.getUid() : user.uid) : "";
  const url = user ? (user.getAvatar ? user.getAvatar() : user.avatar) : "";
  const mentor = showBadge ?? (user ? isMentor(user) : false);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {url ? (
        <img
          src={url}
          alt={`${name}${mentor ? " (AI mentor)" : ""}`}
          className="h-full w-full rounded-full object-cover"
          style={{ border: "1px solid var(--border-strong)" }}
        />
      ) : (
        <div
          className="grid h-full w-full place-items-center rounded-full font-bold text-white"
          style={{ background: colorFor(uid || name), fontSize: Math.max(size * 0.4, 12) }}
        >
          {initials(name)}
        </div>
      )}

      {typeof online === "boolean" && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${
            online ? "bg-primary" : "bg-muted"
          }`}
          style={{ borderColor: "var(--background)" }}
        />
      )}

      {mentor && (
        <span
          aria-hidden="true"
          className="absolute -right-2 -top-1.5 rounded-pill bg-primary px-1.5 text-xs font-black leading-4 text-white"
        >
          AI
        </span>
      )}
    </div>
  );
}
