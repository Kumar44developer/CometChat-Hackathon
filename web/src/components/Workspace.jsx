import { useEffect, useMemo, useState } from "react";
import TopBar from "./TopBar.jsx";
import RoomList from "./RoomList.jsx";
import CohortPicker from "./CohortPicker.jsx";
import ChatRoom from "./ChatRoom.jsx";
import { fetchRooms, joinGroup, getOnlineUsers, addPresenceListener } from "../lib/cometchat.js";
import { listCohorts, filterByCohort, getGuid, getCohort } from "../lib/rooms.js";
import { COHORT_ALL, config } from "../lib/config.js";

export default function Workspace({ user, onLogout }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cohort, setCohort] = useState(COHORT_ALL);
  const [selected, setSelected] = useState(null); // group object
  const [mentorOnline, setMentorOnline] = useState(false);
  const [presenceOnline, setPresenceOnline] = useState(false);
  const [botHealthy, setBotHealthy] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // mobile room-drawer

  // Mentor is "available" if either presence reports online OR the bot's
  // health endpoint responds. Re-derive here so both signals feed the UI.
  useEffect(() => {
    setMentorOnline(presenceOnline || botHealthy);
  }, [presenceOnline, botHealthy]);

  // Load rooms once.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await fetchRooms();
        if (!active) return;
        setGroups(list || []);
        if (list && list.length) setSelected(list[0]);
      } catch (e) {
        console.error("Failed to load rooms", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Mentor availability. Two independent signals, OR-ed together:
  //  1) CometChat presence (best effort — may be unavailable on the plan).
  //  2) The bot's own /health endpoint (truthful: the bot is answering).
  useEffect(() => {
    let active = true;
    let timer = null;

    const pingHealth = async () => {
      try {
        const res = await fetch(`${config.botUrl}/health`, { cache: "no-store" });
        const data = await res.json();
        if (active) setBotHealthy(Boolean(data && data.ok));
      } catch {
        if (active) setBotHealthy(false);
      }
    };

    (async () => {
      try {
        const online = await getOnlineUsers([config.mentorUid]);
        if (active) setPresenceOnline(Array.isArray(online) && online.length > 0);
      } catch (e) {
        /* presence may be disabled on the plan; ignore */
      }
    })();
    pingHealth();
    timer = setInterval(pingHealth, 15000);

    const remove = addPresenceListener("mentorroom_presence", {
      onUserOnline: (u) => {
        if (u && (u.getUid ? u.getUid() : u.uid) === config.mentorUid) setPresenceOnline(true);
      },
      onUserOffline: (u) => {
        if (u && (u.getUid ? u.getUid() : u.uid) === config.mentorUid) setPresenceOnline(false);
      },
    });
    return () => {
      active = false;
      clearInterval(timer);
      remove && remove();
    };
  }, []);

  // Escape closes the mobile drawer (keyboard-first requirement).
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const cohorts = useMemo(() => listCohorts(groups), [groups]);
  const visibleRooms = useMemo(() => filterByCohort(groups, cohort), [groups, cohort]);

  async function selectRoom(group) {
    setSelected(group);
    setNavOpen(false); // return to the conversation on mobile
    try {
      await joinGroup(getGuid(group));
    } catch (e) {
      console.error("join", e);
    }
  }

  return (
    <div className="sky flex h-full flex-col">
      {/* Keyboard users can jump straight to the conversation (WCAG 2.4.1) */}
      <a href="#mentorroom-main" className="skip-link">
        Skip to conversation
      </a>
      <TopBar
        user={user}
        onLogout={onLogout}
        mentorOnline={mentorOnline}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((o) => !o)}
      />
      <div className="relative flex min-h-0 flex-1">
        {/* Scrim — mobile drawer only, dismisses with Escape/click */}
        {navOpen && (
          <>
            <div
              className="absolute inset-0 z-element bg-black/30 md:hidden"
              aria-hidden="true"
              onClick={() => setNavOpen(false)}
            />
            <button className="sr-only" onClick={() => setNavOpen(false)}>
              Close room list
            </button>
          </>
        )}

        {/* Sidebar — fixed column on desktop, drawer on small screens.
            "invisible" when closed keeps it out of the mobile tab order. */}
        <aside
          id="rooms"
          aria-label="Rooms and cohorts"
          className={`z-nav absolute inset-y-0 left-0 flex w-[320px] shrink-0 flex-col border-r border-hairline bg-surface transition-transform duration-300 md:static md:visible md:translate-x-0 ${
            navOpen ? "visible translate-x-0" : "invisible -translate-x-full"
          }`}
        >
          <div className="p-4 pb-2">
            <CohortPicker cohorts={cohorts} value={cohort} onChange={setCohort} />
          </div>
          <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Rooms {cohort !== COHORT_ALL && `· ${cohort}`}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {loading ? (
              <div className="flex flex-col gap-2 p-1" role="status" aria-label="Loading rooms">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card h-[64px] animate-pulse opacity-60" />
                ))}
                <p className="sr-only">Loading rooms…</p>
              </div>
            ) : (
              <RoomList
                groups={visibleRooms}
                selectedGuid={selected ? getGuid(selected) : null}
                onSelect={selectRoom}
              />
            )}
          </div>
        </aside>

        {/* Chat */}
        <main id="mentorroom-main" className="flex min-h-0 min-w-0 flex-1 flex-col">
          {selected ? (
            <ChatRoom
              key={getGuid(selected)}
              group={selected}
              cohort={getCohort(selected)}
              currentUser={user}
              mentorOnline={mentorOnline}
            />
          ) : (
            <div className="grid flex-1 place-items-center text-muted">
              {loading ? "Loading…" : "Select a room to start studying."}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
