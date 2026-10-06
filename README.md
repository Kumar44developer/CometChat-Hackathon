# 🎓 MentorRoom

**Topic-based study rooms where the AI mentor is a *real* CometChat user.**

Every member of a MentorRoom room — humans *and* the AI mentor — is a genuine
CometChat participant. The mentor has **real presence** (online/offline), shows
a **real typing indicator** while it thinks, posts answers as **real group
messages**, and wraps each session with an automatic **recap card**. A
**double-layer moderation** pipeline stops toxic messages before they land, and
rooms are **multi-tenant** — each cohort (study group / class / community)
gets its own filtered set of rooms.

Built for the CometChat **#ZeroToChat** challenge.

---

### 0. Prerequisites
- **Node.js ≥ 18** (`node -v` to check; verified on Node 24).
- A free **CometChat app** at [app.cometchat.com](https://app.cometchat.com)
  (no card required). From its **Dashboard → Your App → Credentials** you need:
  `Application ID`, `Region` (e.g. `in` or `us`), and `Auth Key`.
- A **fullAccess REST API key** from **Dashboard → API Keys** (the Auth Key can
  create users but *not* groups on newer CometChat apps — provisioning needs it).
- Optional but recommended: a free **Groq API key** (`gsk_...`) at
  [console.groq.com](https://console.groq.com) — this is the mentor's brain.
  Without it the mentor still replies via a built-in fallback, so the demo works
  end to end.

### 1. Clone + install
```powershell
git clone <your-repo-url> mentorroom
cd mentorroom
npm install          # installs both workspaces (web + bot) in one shot
```

### 2. Environment files (two files, exact contents)

**a) Root `.env`** — used by the bot and the provision script:
```powershell
copy .env.example .env
```
Fill in:
```ini
COMETCHAT_APP_ID=<your app id>
COMETCHAT_REGION=<in|us|...>          # must match your app's region
COMETCHAT_AUTH_KEY=<your auth key>
COMETCHAT_REST_API_KEY=<fullAccess key>   # required by npm run provision

# mentor identity (defaults are correct if you ran provision unchanged)
COMETCHAT_BOT_UID=mentor_bot

# LLM — recommended config (fast + free tier):
LLM_PROVIDER=groq
LLM_API_KEY=gsk_...
# models default to openai/gpt-oss-20b (answers) and
# openai/gpt-oss-safeguard-20b (AI moderation) — no need to set LLM_MODEL

# bot HTTP API port (web app polls it for the "Mentor AI online" badge)
# BOT_PORT=8787                        # default, uncomment to change
```

**b) `web/.env`** — Vite only reads `VITE_*` vars:
```powershell
copy web\.env.example web\.env
```
Fill in the **same** CometChat values with the `VITE_` prefix:
```ini
VITE_COMETCHAT_APP_ID=<your app id>
VITE_COMETCHAT_REGION=<in|us|...>
VITE_COMETCHAT_AUTH_KEY=<your auth key>
VITE_MENTOR_UID=mentor_bot
VITE_BOT_URL=http://localhost:8787    # default; only change if BOT_PORT differs
```

> The bot also accepts a `bot/.env` (same keys as the root file); it loads
> `bot/.env` first and falls back to the root `.env`, so one root file is enough.

### 3. One-time CometChat dashboard toggles
- **App Settings → Presence → ON** (powers online/offline + typing indicators).
- **Extensions → Moderation** → install + configure (server-side third layer;
  optional for a local demo).

### 4. Provision demo users + rooms (no dashboard clicking)
```powershell
npm run provision
```
Creates CometChat users `mentor_bot`, `student1`, `student2` and **5 rooms**
across **2 cohorts** (`batch-2026`, `web-devs`) with topic/cohort metadata.
Idempotent — safe to re-run.

### 5. Start the two services (two terminals)
```powershell
npm run dev:bot      # terminal 1 — the AI mentor (HTTP API on :8787)
npm run dev:web      # terminal 2 — the app      (Vite on   :5173)
```
Expected log lines:
```
[mentor] logged in as mentor_bot — presence is now ONLINE.
[mentor] LLM: configured (groq)
[mentor] listening. The mentor replies to every message in the room.
...
VITE v5.x  ready in ...  ➜  Local: http://localhost:5173/
```

### 6. Verify the startup is healthy (30 seconds)
1. Open **http://localhost:8787/health** → must return
   `{"ok":true,"bot":"mentor_bot"}`.
2. Open **http://localhost:5173** → click **Student 1** on the login screen.
3. In the **Algorithms** room, send: `@mentor what is a binary tree?`
4. Within ~1–6 s you see **“Mentor AI is thinking…”**, then an answer bubble
   with the **✦ AI mentor** badge. ✅ Startup complete.

### 7. Run the two-browser demo (real-time between humans)
Open an **incognito window** at http://localhost:5173 and log in as
**Student 2**. Messages flow both ways live; the cohort dropdown filters rooms
per tenant.

---

## ⚠️gotchas (learned the hard way)

| Gotcha | Why / fix |
| --- | --- |
| **One live session per UID** | Logging in as `student1` in a second tab/window *kicks* the first one's realtime session. Use one identity per window; a kicked window recovers with a page reload (and the message poller). |
| **Never run `scripts/*` while recording/demoing** | Any script that logs in as `mentor_bot`/`student*` steals that session. Health-check via `http://localhost:8787/health` instead. |
| **`AUTH_ERR_INVALID_APPID` on start** | Region mismatch: `COMETCHAT_REGION` must exactly match your app's region (check the dashboard URL). |
| **Provision creates users but fails on groups** | Missing `COMETCHAT_REST_API_KEY` (fullAccess) in root `.env`. |
| **Bot answers take up to ~6 s to appear** | Expected: since the 2026-10-05 CometChat platform deploy, WebSocket push is unreliable, so both the bot and the web app use a REST **polling fallback** (dedup-safe). It self-heals; never restart services mid-demo. |
| **Header says “Mentor AI offline”** | The badge mirrors the bot's `/health`. If down: `npm run dev:bot`. |

---

## 🏗️ Architecture

```
┌─────────────────────────────┐
│  React Web App (Vite)       │  room list · group chat · typing + presence
│  CometChat JS SDK v4        │  moderation warning UI · recap cards · AI badge
│  + REST poll fallback       │  (http://localhost:5173)
└─────────────┬───────────────┘
              │ CometChat realtime (WebSocket) + REST polling
┌─────────────▼───────────────┐
│  CometChat Cloud            │  groups (rooms) · users (humans + mentor)
│                             │  moderation extension · presence
└─────────────▲───────────────┘
              │ JS SDK login as "mentor_bot" (browser-shimmed in Node)
              │ + REST poll fallback          + small HTTP API (:8787)
┌─────────────┴───────────────┐
│  Node.js Bot Service        │  replies to every message via Groq LLM
│                             │  startTyping → sendMessage → endTyping
│                             │  /recap · /health · /moderate (AI toxicity)
└─────────────────────────────┘
```

The bot runs the **browser-oriented** CometChat JS SDK inside Node by providing
`window`/`document`/`WebSocket`/`localStorage` via `jsdom` + `ws`
(`bot/lib/browser.js`). This is what lets the bot emit **real typing indicators
and presence** — something a pure REST/webhook bot cannot do.

---

## ✨ Features

| Feature | How it works (CometChat) |
| --- | --- |
| **AI mentor with real presence** | `mentor_bot` is a CometChat user that stays logged in → shows online; the header badge is cross-checked against the bot's `/health`. |
| **Real typing indicator** | On a question the bot calls `CometChat.startTyping(group)` → thinks → `sendMessage()` → `endTyping()`. |
| **Genuine group messages** | Answers are `TextMessage`s to the room — not fake UI. |
| **Three-layer moderation** | ① client keyword list → ② client AI check via the bot's `/moderate` (Groq safeguard model) → ③ CometChat Moderation extension server-side. Blocked messages show an inline red warning and never leave the composer. |
| **Session recaps** | “End session” (or `/recap`) → bot summarizes recent messages and posts a styled `mentor_recap` CustomMessage card. |
| **Multi-tenant cohorts** | Rooms carry `metadata.cohort`; the room list filters by the selected cohort. |
| **Light + dark themes** | One CSS-token layer flips themes; persisted, no flash on load. |
| **Resilient delivery** | REST polling fallback on both sides of the socket, with id + content dedupe so nothing double-renders. |

---

## 📦 Repo layout

```
mentorroom/
├─ web/            React + Vite + Tailwind chat client (raw CometChat JS SDK)
│  └─ src/
│     ├─ lib/      cometchat.js · rooms.js · messages.js · moderation.js · config.js
│     └─ components/  Login · Workspace · RoomList · ChatRoom · Composer · RecapCard …
├─ bot/            Node mentor service (index.js · lib/browser.js · lib/llm.js)
├─ scripts/        provision.mjs  (creates users + cohort rooms via REST API)
├─ .env.example    root template (bot + provision)
└─ web/.env.example  web template (VITE_*)
```

---

---

## Commands

| Command | Does |
| --- | --- |
| `npm install` | Install both workspaces (web + bot). |
| `npm run provision` | Create demo users + cohort rooms via REST (idempotent). |
| `npm run dev:bot` | Start the mentor bot (HTTP API on `:8787`). |
| `npm run dev:web` | Start the React app (`http://localhost:5173`). |
| `npm run build` | Production build of the web app. |
| `npm run preview` | Serve the production build locally. |

---

## 🔧 Environment reference

| Var | File | Default | Purpose |
| --- | --- | --- | --- |
| `COMETCHAT_APP_ID` / `VITE_COMETCHAT_APP_ID` | root / web `.env` | — | CometChat application ID. |
| `COMETCHAT_REGION` / `VITE_COMETCHAT_REGION` | root / web `.env` | `us` | App region — **must match the dashboard**. |
| `COMETCHAT_AUTH_KEY` / `VITE_COMETCHAT_AUTH_KEY` | root / web `.env` | — | Auth key (SDK logins). |
| `COMETCHAT_REST_API_KEY` | root `.env` | — | fullAccess REST key (provisioning groups). |
| `COMETCHAT_BOT_UID` | root `.env` | `mentor_bot` | The mentor's CometChat UID. |
| `BOT_PORT` | root `.env` | `8787` | Bot HTTP API port (`/health`, `/moderate`). |
| `LLM_PROVIDER` | root `.env` | `none` | `groq` (recommended) \| `openai` \| `anthropic` \| `gemini` \| `ollama` \| `none`. |
| `LLM_API_KEY` | root `.env` | — | Provider key; without it the mentor uses a safe fallback. |
| `LLM_MODEL` | root `.env` | `openai/gpt-oss-20b` | Answer model override. |
| `VITE_MENTOR_UID` | web `.env` | `mentor_bot` | Which sender renders the ✦ AI badge. |
| `VITE_BOT_URL` | web `.env` | `http://localhost:8787` | Where the web app checks mentor health + AI moderation. |
