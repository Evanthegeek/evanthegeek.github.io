import { useEffect, useRef, useState } from "react";

/* Loading screen — identical animation/behavior to the original #loading:
   letters rise, glow gold, float, then the whole word expands and the
   screen dissolves away. Typography (Iceberg) is unchanged. */
export default function Loader({ username, prefersReducedMotion }) {
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timers = useRef([]);

  const letters = String(username || "YourUsername")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16)
    .split("");
  if (!letters.length) letters.push(..."PORTFOLIO".split(""));

  useEffect(() => {
    if (prefersReducedMotion) {
      setDone(true);
      return;
    }
    const stagger = 0.12;
    const lastGlowEnd = Math.max(0, (letters.length - 1) * stagger + 1.45);
    const flourish = 1.15;
    const delay = Math.min(
      Math.max(lastGlowEnd + 0.2 + flourish, 1.4 + letters.length * stagger + 0.6),
      4.8
    );
    timers.current.push(setTimeout(() => setExpanded(true), Math.max(0, delay - flourish) * 1000));
    timers.current.push(setTimeout(() => setDone(true), delay * 1000));
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  return (
    <div id="loading" className={done ? "done" : ""}>
      <div
        className={"loading-text" + (letters.length > 10 ? " is-long" : "") + (expanded ? " expand" : "")}
        id="name-loader"
        aria-hidden="true"
      >
        {letters.map((letter, i) => (
          <span
            key={i}
            data-text={letter}
            style={{
              "--tilt": ((Math.sin(i * 12.9898) * 43758.5453) % 1 * 6 - 3).toFixed(2) + "deg",
              "--d": (i * 0.12).toFixed(2) + "s"
            }}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}
