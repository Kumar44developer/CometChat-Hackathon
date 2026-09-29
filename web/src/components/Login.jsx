import { useState } from "react";
import { login } from "../lib/cometchat.js";
import { demoUsers } from "../lib/config.js";
import Spinner from "./Spinner.jsx";

export default function Login({ onLogin }) {
  const [uid, setUid] = useState(demoUsers[0].uid);
  const [busy, setBusy] = useState(false);
  const [busyUid, setBusyUid] = useState(null); // which action is loading
  const [error, setError] = useState("");

  async function doLogin(id) {
    const target = id.trim();
    if (busy || !target) return;
    setBusy(true);
    setBusyUid(target);
    setError("");
    try {
      const user = await login(target);
      onLogin(user);
    } catch (e) {
      setError(
        (e && (e.message || e.errorDescription)) ||
          "Login failed. Is the user provisioned and the auth key correct?"
      );
    } finally {
      setBusy(false);
      setBusyUid(null);
    }
  }

  return (
    <div className="sky grid h-full place-items-center overflow-y-auto p-6">
      <div className="w-full max-w-xl py-10">
        {/* Floating pill brand bar — mirrors the reference's nav chip */}
        <div className="mb-10 flex justify-center">
          <div className="card flex items-center gap-2 rounded-pill px-4 py-2">
            <span className="grid h-7 w-7 place-items-center rounded-pill bg-primary text-sm font-bold text-white" aria-hidden="true">
              ∞
            </span>
            <span className="h4 text-ink">MentorRoom</span>
          </div>
        </div>

        {/* Social-proof chip (inferred from the reference's review pill) */}
        <div className="mb-6 flex justify-center">
          <span className="chip bg-surface">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            Live AI mentor inside every study room
          </span>
        </div>

        {/* Hero headline — H1 type scale, black on soft sky */}
        <h1 className="h1 mx-auto max-w-lg text-center text-ink">
          Study rooms with a real AI mentor
        </h1>
        <p className="mx-auto mt-5 max-w-md text-center text-body text-muted">
          Live presence, genuine typing, moderation and session recaps — every
          room is a real CometChat group.
        </p>

        {/* Login card — white, 16px, flat */}
        <div className="card mt-10 p-4">
          <p className="h4 mb-3 px-1 text-muted">Quick demo logins</p>
          <div className="mb-5 grid grid-cols-2 gap-3 px-1">
            {demoUsers.map((u) => {
              const loading = busy && busyUid === u.uid;
              return (
                <button
                  key={u.uid}
                  disabled={busy}
                  aria-busy={loading || undefined}
                  onClick={() => {
                    setUid(u.uid);
                    doLogin(u.uid);
                  }}
                  className="btn-secondary justify-start"
                >
                  {loading ? (
                    <Spinner />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                  )}
                  <span>{loading ? "Signing in…" : u.name}</span>
                  <span className="sr-only">{loading ? "" : ` — sign in as ${u.name}`}</span>
                </button>
              );
            })}
          </div>

          <label htmlFor="login-uid" className="h4 mb-2 block px-1 text-muted">
            Or enter a UID
          </label>
          <div className="flex gap-2 px-1 pb-1">
            <input
              id="login-uid"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doLogin(uid)}
              placeholder="student1"
              disabled={busy}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "login-error" : undefined}
              className="input flex-1"
            />
            <button
              disabled={busy || !uid.trim()}
              onClick={() => doLogin(uid)}
              aria-busy={(busy && busyUid === uid.trim()) || undefined}
              className="btn-primary"
            >
              {busy ? <Spinner /> : null}
              {busy ? "Signing in" : "Enter"}
            </button>
          </div>

          {error && (
            <p id="login-error" role="alert" className="callout-error mx-1 mt-4">
              {error}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Tip: log in as <b className="text-ink">student1</b> here and{" "}
          <b className="text-ink">student2</b> in an incognito window to see live
          two-way chat.
        </p>
      </div>
    </div>
  );
}
