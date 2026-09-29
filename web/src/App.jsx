import { useEffect, useState } from "react";
import Login from "./components/Login.jsx";
import Workspace from "./components/Workspace.jsx";
import { isConfigured, initCometChat, getLoggedInUser } from "./lib/cometchat.js";
import SetupGuide from "./components/SetupGuide.jsx";
import Spinner from "./components/Spinner.jsx";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = logged out
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isConfigured()) {
        if (active) {
          setUser(null);
          setBooting(false);
        }
        return;
      }
      try {
        await initCometChat();
        const logged = await getLoggedInUser();
        if (active) setUser(logged || null);
      } catch (e) {
        if (active) setUser(null);
      } finally {
        if (active) setBooting(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!isConfigured()) return <SetupGuide />;
  if (booting) {
    // Boot/loading state — announced to assistive tech.
    return (
      <div className="sky grid h-full place-items-center" role="status" aria-label="Connecting">
        <div className="flex items-center gap-3 text-muted">
          <Spinner size={20} />
          <span className="text-sm">Connecting to CometChat…</span>
        </div>
      </div>
    );
  }

  if (!user) return <Login onLogin={setUser} />;
  return <Workspace user={user} onLogout={() => setUser(null)} />;
}
