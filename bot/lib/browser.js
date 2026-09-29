// The CometChat JavaScript SDK is built for browsers (it needs window,
// document, WebSocket, localStorage). To run a bot that emits REAL typing
// indicators and presence, we provide those globals in Node with jsdom + ws,
// then load the SDK exactly as a browser app would.
import { JSDOM } from "jsdom";
import WebSocket from "ws";

// The SDK does not attach an 'error' listener to its socket for transport-level
// failures (e.g. a transient DNS ENOTFOUND). Node's EventEmitter throws when an
// 'error' event has no listener — which kills the whole bot process. Subclass
// WebSocket so every instance has a default listener that logs and survives;
// the SDK's own reconnect-on-close logic then restores the connection.
class RobustWebSocket extends WebSocket {
  constructor(...args) {
    super(...args);
    this.setMaxListeners(0); // silence MaxListenersExceededWarning on shared socket
    this.on("error", (err) => {
      console.warn("[ws] transport error (bot stays alive):", err?.message || err);
    });
  }
}

// The CometChat JS SDK defaults to the "eu" region host; force the app's real
// region on every outbound request (fetch or XHR).
const REGION = process.env.COMETCHAT_REGION || "us";
function fixRegion(url) {
  try {
    const u = new URL(url);
    // Hosts look like {appId}.api-{region}.cometchat.io or {appId}.apiclient-{region}.cometchat.io
    const m = u.hostname.match(/^(.*?\.(?:api|apiclient)-)[a-z0-9]+(\.cometchat\.io)$/);
    if (m) {
      const before = u.hostname;
      u.hostname = `${m[1]}${REGION}${m[2]}`;
      if (process.env.MR_DEBUG) console.log("[fixRegion]", before, "->", u.hostname);
      return u.toString();
    }
  } catch {
    /* not a URL */
  }
  return url;
}

// jsdom's XMLHttpRequest cannot perform cross-origin requests, which makes the
// SDK's init/API calls fail with FAILED_TO_FETCH. This fetch-backed XHR routes
// the SDK's HTTP through Node's working network stack.
class FetchXHR {
  constructor() {
    this.readyState = 0;
    this.status = 0;
    this.responseText = "";
    this.response = "";
    this._headers = {};
  }
  open(method, url) {
    if (process.env.MR_DEBUG) console.log("[XHR.open]", method, url);
    this._method = method;
    this._url = fixRegion(url);
  }
  setRequestHeader(k, v) {
    this._headers[k] = v;
  }
  getAllResponseHeaders() {
    return "";
  }
  getResponseHeader() {
    return null;
  }
  overrideMimeType() {}
  abort() {}
  send(body) {
    const noBody = this._method === "GET" || this._method === "HEAD";
    const ctrl = new AbortController();
    if (this.timeout) setTimeout(() => ctrl.abort(), this.timeout);
    fetch(this._url, {
      method: this._method,
      headers: this._headers,
      body: noBody ? undefined : body,
      signal: ctrl.signal,
    })
      .then(async (res) => {
        this.status = res.status;
        this.statusText = res.statusText;
        const t = await res.text();
        this.responseText = t;
        this.response = t;
        this.readyState = 4;
        this.onreadystatechange && this.onreadystatechange();
        this.onload && this.onload();
        if (!res.ok) this.onerror && this.onerror(new Error("http " + res.status));
      })
      .catch((err) => {
        this.status = 0;
        this.readyState = 4;
        this.onerror && this.onerror(err);
      });
  }
}
FetchXHR.DONE = 4;

export async function loadCometChat() {
  if (!globalThis.window) {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url: "http://localhost/",
      pretendToBeVisual: true,
    });
    const { window } = dom;

    // Node 18+ exposes a read-only global `navigator`, so plain assignment
    // throws. Define each global defensively.
    const define = (key, value) => {
      try {
        Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
      } catch {
        try {
          globalThis[key] = value;
        } catch {
          /* some globals (e.g. navigator) may be un-overridable; the SDK uses window.* anyway */
        }
      }
    };

    define("window", window);
    define("document", window.document);
    define("navigator", window.navigator);
    define("location", window.location);
    define("localStorage", window.localStorage);
    define("sessionStorage", window.sessionStorage);
    define("WebSocket", RobustWebSocket);
    define("XMLHttpRequest", FetchXHR);
    window.XMLHttpRequest = FetchXHR;
    // jsdom provides no fetch; the SDK calls window.fetch. Install a
    // sanitizing wrapper over Node's fetch that forces the correct region host
    // and drops the invalid `referrer: "no-referrer"` option undici rejects.
    const nativeFetch = globalThis.fetch.bind(globalThis);
    const safeFetch = (input, init = {}) => {
      let url = typeof input === "string" ? input : input?.url || String(input);
      if (process.env.MR_DEBUG) console.log("[safeFetch]", url);
      url = fixRegion(url);
      const opts = { ...init };
      if (opts.referrer && !/^https?:\/\//i.test(opts.referrer)) delete opts.referrer;
      if (opts.mode === "cors") delete opts.mode;
      return nativeFetch(url, opts);
    };
    globalThis.fetch = safeFetch;
    window.fetch = safeFetch;
    define("btoa", (str) => Buffer.from(str, "binary").toString("base64"));
    define("atob", (b64) => Buffer.from(b64, "base64").toString("binary"));
    if (!window.matchMedia)
      window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    if (!window.scrollTo) window.scrollTo = () => {};
  }

  const mod = await import("@cometchat/chat-sdk-javascript");
  // UMD bundle: the CometChat object may land on .CometChat, .default, or
  // .default.CometChat depending on how Node resolves the module.
  const CC = mod?.CometChat || mod?.default?.CometChat || mod?.default || mod;
  if (!CC || typeof CC.init !== "function") {
    throw new Error(
      "Could not resolve the CometChat object from the SDK module. Keys: " +
        Object.keys(mod).join(",") +
        (mod?.default ? " | default keys: " + Object.keys(mod.default).slice(0, 8).join(",") : "")
    );
  }
  return CC;
}
