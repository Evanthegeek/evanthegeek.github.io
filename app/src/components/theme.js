/* Theme resolution, identical to the inline script in index.html: stored
   preference wins, otherwise the OS preference, otherwise dark. */
const THEME_KEY = "devfolio.theme";

export function getInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
  } catch (err) { /* ignore */ }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}
