import { useState } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { logout } from "../lib/cometchat.js";
import { currentTheme, setTheme } from "../lib/theme.js";
import Avatar from "./Avatar.jsx";
import { Button } from "@/components/ui/button.jsx"; // shadcn/ui

export default function TopBar({ user, onLogout, mentorOnline, navOpen, onToggleNav }) {
  const name = user.getName ? user.getName() : user.name;
  const uid = user.getUid ? user.getUid() : user.uid;
  const [dark, setDark] = useState(() => currentTheme() === "dark");

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    setTheme(next);
    setDark(next === "dark");
  }

  async function handleLogout() {
    await logout();
    onLogout();
  }

  return (
    <header className="z-nav m-3 flex items-center justify-between rounded-pill border border-hairline bg-surface px-4 py-2 md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        {/* Room-list toggle — small screens only (drawer trigger) */}
        <button
          onClick={onToggleNav}
          aria-expanded={!!navOpen}
          aria-controls="rooms"
          aria-label={navOpen ? "Close room list" : "Open room list"}
          className="btn-ghost -ml-2 h-9 w-9 shrink-0 rounded-pill px-0 md:hidden"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-primary text-base font-bold text-white" aria-hidden="true">
          ∞
        </div>
        <div className="min-w-0">
          <div className="h4 truncate leading-tight text-ink">MentorRoom</div>
          <div className="truncate text-xs text-muted">topic rooms · AI mentor</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Presence — announced as a live status region */}
        <span className="chip hidden sm:inline-flex" role="status">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${mentorOnline ? "bg-primary" : "bg-muted"}`}
          />
          <span className="text-ink">Mentor AI {mentorOnline ? "online" : "offline"}</span>
        </span>
        <div className="hidden items-center gap-2 sm:flex">
          <Avatar user={user} size={30} />
          <div className="leading-tight">
            <div className="truncate text-xs font-semibold text-ink">{name}</div>
            <div className="truncate text-xs text-muted">{uid}</div>
          </div>
        </div>
        {/* Theme toggle — light · vibrant system is the default */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          aria-pressed={dark}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
        {/* shadcn/ui Button — themed to the MentorRoom outline pill */}
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
