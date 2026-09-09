/* Theme toggle — same behavior as the original: stored in localStorage,
   defaults to OS preference, flips data-theme on <html>. The state itself
   lives in App so the hero waves can restart with theme colors. */
export default function ThemeToggle({ theme, onToggle }) {
  const light = theme === "light";

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-pressed={String(light)}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      title="Toggle light and dark theme"
      onClick={onToggle}
    >
      <svg className="icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <svg className="icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    </button>
  );
}
