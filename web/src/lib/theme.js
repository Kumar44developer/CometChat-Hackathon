// Tiny theme store — light is the design-system default; dark mirrors the
// same CSS custom properties (see index.css html.dark). Persisted per browser.
const KEY = "mr-theme";

export function currentTheme() {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(mode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", mode === "dark" ? "#0b0b11" : "#0100F8");
}

export function setTheme(mode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* private mode — session-only theme */
  }
  applyTheme(mode);
}
