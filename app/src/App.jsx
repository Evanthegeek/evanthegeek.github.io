import { useEffect, useRef, useState } from "react";
import Loader from "./components/Loader.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import FixedWidgets from "./components/FixedWidgets.jsx";
import Hero from "./components/Hero.jsx";
import AboutNew from "./components/AboutNew.jsx";
import useRolePairTyper from "./lib/useRolePairTyper.js";
import { useProfile } from "./lib/useProfile.js";
import { getInitialTheme } from "./components/theme.js";

/* ==========================================================================
   DRY RUN — React + Tailwind shell
   - Hero: untouched port (header copy + WebGL waves preserved).
   - About: the redesigned section (Dark Graphite + liquid-metal frame).
   - Later sections (tech stack, GitHub, projects, contact) stay in the
     original static site until their migration passes.
   ========================================================================== */
export default function App() {
  const { profile, roles, initials } = useProfile();

  const [theme, setTheme] = useState(getInitialTheme);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e) => setPrefersReducedMotion(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  /* Theme application (data-theme attribute, meta, localStorage). */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute("content", theme);
    try { localStorage.setItem("devfolio.theme", theme); } catch (err) { /* ignore */ }
  }, [theme]);

  /* Shared role typer: hero + About type in lockstep, like the original. */
  const heroTyped = useRef(null);
  const heroCaret = useRef(null);
  const aboutRole = useRef(null);
  const aboutCaret = useRef(null);

  useRolePairTyper(
    { el: heroTyped, caret: heroCaret },
    { el: aboutRole, caret: aboutCaret },
    roles,
    prefersReducedMotion
  );

  /* Title + footer identity, same as renderProfile in script.js. */
  useEffect(() => {
    document.title = (profile.name || "Your Name") + " — Developer Portfolio";
    const footerName = document.getElementById("footer-name");
    if (footerName) footerName.textContent = profile.name || "Your Name";
  }, [profile.name]);

  useEffect(() => {
    const footerYear = document.getElementById("footer-year");
    if (footerYear) footerYear.textContent = String(new Date().getFullYear());
  }, []);

  return (
    <>
      <Loader username={profile.username} prefersReducedMotion={prefersReducedMotion} />
      <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
      <FixedWidgets email={profile.email} />

      <main id="top">
        <Hero
          name={profile.name}
          elRef={heroTyped}
          caretRef={heroCaret}
          theme={theme}
          prefersReducedMotion={prefersReducedMotion}
        />
        <AboutNew
          name={profile.name}
          bio={profile.bio}
          email={profile.email}
          socials={profile.socials}
          photo={profile.photo}
          initials={initials}
          theme={theme}
          prefersReducedMotion={prefersReducedMotion}
          roleElRef={aboutRole}
          caretRef={aboutCaret}
        />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <p>{"\u2122"} <span id="footer-year">2026</span> <span id="footer-name">Your Name</span>. Inspired by <a href="https://abhijeetbhale.github.io/Portfolio/" target="_blank" rel="noopener">Abhijeet Bhale</a>.</p>
        </div>
      </footer>
    </>
  );
}
