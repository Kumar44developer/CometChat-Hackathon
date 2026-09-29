# 🎓 MentorRoom

**Topic-based study rooms where the AI mentor is a *real* CometChat user.**

Every member of a MentorRoom room — humans *and* the AI mentor — is a genuine
CometChat participant. That means the mentor has **real presence** (online /
offline), shows a **real typing indicator** while it thinks, posts its answers
as **real group messages**, and wraps each session with an automatic **recap**.
A **double-layer moderation** pipeline stops toxic messages before they land,
and rooms are **multi-tenant** — each cohort (study group / class / community)
gets its own set of rooms.

Built for the CometChat **#ZeroToChat** challenge.

---

## ✨ Features

| Feature | How it works (CometChat) |
| --- | --- |
| **AI mentor with real presence** | `mentor_bot` is a CometChat user that stays logged in → shows online via the presence API. |
| **Real typing indicator** | On a question the bot calls `CometChat.startTyping(group)` → thinks → `sendMessage()` → `endTyping()`. |
| **Genuine group messages** | Answers are `TextMessage`s to the room — not fake UI. |
| **Double-layer message moderation** | Client pre-send check (keyword list **+** a small-model toxicity pass served by the bot's `/moderate`) blocks with an inline warning — plus the CometChat Moderation extension server-side as a third layer. |
| **Session recaps** | "End session" (or `/recap`) → bot summarizes recent messages and posts a styled recap card. |
| **Multi-tenant cohorts** | Rooms carry `metadata.cohort`; the room list filters by the selected cohort. |
| **Light + dark themes** | Vibrant·soft light system by default; a header toggle flips one CSS-token layer to dark (persisted, no flash). |

---

## 🏗️ Architecture

```
┌─────────────────────────────┐
│  React Web App (Vite)       │  room list · group chat · typing + presence
│  CometChat JS SDK v4        │  moderation warning UI · recap cards · AI badge
└─────────────┬───────────────┘
              │ CometChat realtime (WebSocket)
┌─────────────▼───────────────┐
│  CometChat Cloud            │  groups (rooms) · users (humans + mentor)
│                             │  moderation extension · presence
└─────────────▲───────────────┘
              │ JS SDK login as "mentor_bot" (browser-shimmed in Node)
┌─────────────┴───────────────┐
│  Node.js Bot Service        │  listens to group msgs · @mentor / "?" → LLM
│                             │  startTyping → sendMessage · end-of-session recap
└─────────────────────────────┘
```

The bot runs the **browser-oriented** CometChat JS SDK inside Node by providing
`window`/`document`/`WebSocket`/`localStorage` via `jsdom` + `ws`
(`bot/lib/browser.js`). This is what lets the bot emit **real typing indicators
and presence** — something a pure REST/webhook bot cannot do.

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
└─ .env.example    shared credentials template
```

---

## 🚀 Setup (step by step)

### 0. Prereqs
- Node 18+ (you have Node 24).
- A free CometChat app at **app.cometchat.com** (no card; free tier = 100 MAU).

### 1. Install
```bash
npm install          # installs web + bot workspaces
```

### 2. Credentials
Copy the template and fill in the three CometChat values from
**Dashboard → Your App → Credentials**:
```bash
# root .env (used by the provision script + bot)
copy .env.example .env

# web client
copy web\.env.example web\.env
```
Set `COMETCHAT_APP_ID`, `COMETCHAT_REGION`, `COMETCHAT_AUTH_KEY` (and the
matching `VITE_*` values in `web/.env`).

### 3. Provision demo users + rooms (no dashboard clicking)
```bash
npm run provision
```
Creates users `mentor_bot`, `student1`, `student2` and 5 rooms across 2 cohorts
(`batch-2026`, `web-devs`), each with cohort/topic metadata. Re-runnable.

### 4. Turn on presence + moderation (dashboard, one-time)
- **App Settings → Presence → ON** (required for online/offline + typing).
- **Extensions → Moderation** → install & configure rules (server-side layer).

### 5. Run
```bash
npm run dev:bot      # terminal 1 — the AI mentor
npm run dev:web      # terminal 2 — the app (http://localhost:5173)
```

### 6. (Optional) give the mentor a brain
Set `LLM_PROVIDER` + `LLM_API_KEY` in `bot/.env` (`openai` | `groq` |
`anthropic` | `gemini` | `ollama`). **Recommended for the demo: `groq`** — it's
fast and has a generous free tier (`LLM_PROVIDER=groq`, `LLM_API_KEY=gsk_...`;
models default to `openai/gpt-oss-20b` for answers and `openai/gpt-oss-safeguard-20b`
for toxicity classification). With no key, the mentor still replies
using a built-in fallback so the demo works end to end.

---

## 🎬 Demo flow (what to show)

1. Open the app, log in as **student1**; open an incognito window as **student2**.
2. Pick a **cohort** from the dropdown → the room list filters (multi-tenant).
3. In a room, ask: `@mentor how do I reverse a linked list?` →
   watch **Mentor AI is thinking…** (real typing) → real answer with an **AI** badge.
4. Send a toxic message → **blocked inline** ("Message blocked by room moderation"),
   including ones only the AI moderator catches (no keyword).
5. Click **⏹ End session** → the mentor posts a **recap card**.
6. Hit the **🌙 theme toggle** → whole app flips to dark (one token layer).
7. Show the CometChat dashboard (users/groups) + the bot listener code.

---

## 🧠 Design notes / risks handled

- **SDK version drift:** pinned to `@cometchat/chat-sdk-javascript ^4.1.9`
  (the version the current React UI Kit v7 depends on).
- **Bot misses messages:** the listener registers *after* `init()` + `login()`
  resolve, dedupes by message id, and logs every branch.
- **LLM latency:** typing indicator makes latency look intentional; answers are
  capped short; fallback path means the demo never stalls on a missing key.
- **Safety floor:** even without the bot, step 2 (two browsers chatting) is a
  valid, working CometChat app.

---

## Commands

| Command | Does |
| --- | --- |
| `npm run provision` | Create demo users + cohort rooms via REST. |
| `npm run dev:web` | Start the React app. |
| `npm run dev:bot` | Start the mentor bot. |
| `npm run build` | Production build of the web app. |
