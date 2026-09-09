import { useEffect, useState } from "react";

/* Fixed page furniture ported verbatim from the original layout: skip link,
   right-edge scroll progress bar, left-edge vertical email, back-to-top. */
export default function FixedWidgets({ email }) {
  const [showTop, setShowTop] = useState(false);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let ticking = false;
    function update() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setPercent(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
      setShowTop(scrollTop > 300);
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <a className="skip-link" href="#about">Skip to content</a>

      <div
        id="scroll-bar"
        className="scroll-bar"
        aria-hidden="true"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const p = (e.clientY - rect.top) / rect.height;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({ top: p * docHeight, behavior: "smooth" });
        }}
      >
        <div id="scroll-indicator" style={{ height: percent + "%" }}></div>
      </div>

      <a className="fixed-email" href={"mailto:" + email} title="Mail me">{email}</a>

      <div className="wrapper">
        <button
          className={"back2top-button" + (showTop ? " show" : "")}
          id="backToTop"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <svg className="svgIcon" viewBox="0 0 384 512" aria-hidden="true">
            <path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z" />
          </svg>
          <span className="button-label">Back to Top</span>
        </button>
      </div>
    </>
  );
}
