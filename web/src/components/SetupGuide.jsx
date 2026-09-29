// Friendly on-screen guide shown when the app has no CometChat credentials yet.
// Doubles as a live "how this is wired" slide for the demo.
export default function SetupGuide() {
  return (
    <div className="sky flex h-full items-center justify-center overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 py-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-pill bg-primary text-2xl font-bold text-white">
          ∞
        </span>
        <h1 className="h1 text-ink">MentorRoom</h1>
        <p className="max-w-md text-body text-muted">
          Multi-tenant study rooms with an AI mentor that is a real CometChat
          user — live presence, real typing indicators, moderation and session
          recaps.
        </p>
        <div className="card w-full p-6 text-left text-body text-muted">
          <p className="h4 mb-3 text-ink">
            Almost there — connect your CometChat app:
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Create a free app at{" "}
              <span className="text-primary">app.cometchat.com</span> (no card).
            </li>
            <li>
              Copy{" "}
              <code className="rounded-btn bg-elevated px-1.5 py-0.5 text-ink">web/.env.example</code>{" "}
              to <code className="rounded-btn bg-elevated px-1.5 py-0.5 text-ink">web/.env</code>.
            </li>
            <li>
              Fill in{" "}
              <code className="rounded-btn bg-elevated px-1.5 py-0.5 text-ink">VITE_COMETCHAT_APP_ID</code>,{" "}
              <code className="rounded-btn bg-elevated px-1.5 py-0.5 text-ink">VITE_COMETCHAT_REGION</code> and{" "}
              <code className="rounded-btn bg-elevated px-1.5 py-0.5 text-ink">VITE_COMETCHAT_AUTH_KEY</code>.
            </li>
            <li>
              Run <code className="rounded-btn bg-elevated px-1.5 py-0.5 text-ink">npm run provision</code> to create
              the demo users + cohort rooms automatically.
            </li>
            <li>
              Restart <code className="rounded-btn bg-elevated px-1.5 py-0.5 text-ink">npm run dev:web</code>.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
