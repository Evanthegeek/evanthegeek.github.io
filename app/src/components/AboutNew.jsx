import { useEffect, useRef } from "react";
import { MetalFx } from "metal-fx";

/* ==========================================================================
   ABOUT — REDESIGNED (dry run for the visual overhaul)
   - Background: Dark Graphite ramp (#1A1A1A → #242424) instead of pitch
     black, with a chrome hairline seam where it meets the hero.
   - Photo frame: NEW liquid-metal border via <MetalFx> (metal-fx), the
     "Liquid Metal" component retrieved from the 21st.dev catalog through
     the Magic MCP API (search → get_component, id 21562). A live WebGL
     molten chrome ring wraps the photo; the .liquid-frame-inner CSS keeps a
     static chrome edge + bevel as fallback when WebGL is unavailable.
   - ALL copy is preserved verbatim from the original section, including the
     "I'm ... , a ... focused on building scalable, modern, and user-centric
     applications." heading with its typed role span.
   - Typography unchanged: Space Grotesk body, Special Gothic Expanded One
     placeholder initials, JetBrains Mono typed role.
   - The typed role is driven by the shared useRolePairTyper engine (refs
     from App), so hero + About still type in lockstep like the original.
   ========================================================================== */

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

const SOCIAL_SVGS = {
  instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.2c3.2 0 3.6 0 4.9.07 3.2.15 4.7 1.66 4.85 4.85.06 1.27.07 1.65.07 4.88s-.01 3.6-.07 4.88c-.15 3.18-1.65 4.7-4.85 4.85-1.27.06-1.64.07-4.88.07s-3.61-.01-4.88-.07c-3.2-.15-4.7-1.67-4.85-4.85C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.88C2.42 3.93 3.92 2.42 7.12 2.27 8.4 2.2 8.8 2.2 12 2.2zm0 3.6a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-10.5a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z" />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.35.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.12v3.14c0 .3.2.67.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  )
};

export default function AboutNew({ name, bio, email, socials, photo, initials, theme, prefersReducedMotion, roleElRef, caretRef }) {
  const photoReveal = useReveal();
  const textReveal = useReveal();

  const socialLinks = [
    { key: "instagram", label: "Instagram", href: socials.instagram, external: true },
    { key: "linkedin", label: "LinkedIn", href: socials.linkedin, external: true },
    { key: "email", label: "Email", href: "mailto:" + email, external: false },
    { key: "github", label: "GitHub", href: socials.github, external: true }
  ];

  return (
    <section
      id="about"
      className="section-about-new relative py-[5.5rem] px-6 max-[700px]:py-16 max-[700px]:px-5"
    >
      <div className="mx-auto flex flex-wrap items-center justify-center gap-14 max-w-[1000px]">
        <div
          ref={photoReveal}
          className="about-photo reveal reveal-left shrink-0 text-center"
        >
          {/* Liquid-metal photo frame: live molten chrome ring (metal-fx).
              Theme follows the site toggle; paused under reduced motion. */}
          <MetalFx
            preset="silver"
            variant="button"
            theme={theme === "light" ? "light" : "dark"}
            strength={1}
            paused={prefersReducedMotion}
          >
            <div
              className="liquid-frame-inner grayscale hover:grayscale-0 transition duration-500"
              style={{ width: "clamp(200px, 30vw, 264px)", height: "clamp(200px, 30vw, 264px)" }}
            >
              {photo ? (
                <img className="w-full h-full object-cover block" src={photo} alt="Your profile picture" />
              ) : (
                <span className="accent font-gothic text-[4.2rem]" aria-hidden="true">{initials}</span>
              )}
            </div>
          </MetalFx>
        </div>

        <div
          ref={textReveal}
          className="about-text reveal reveal-right flex-[1_1_420px] text-center min-[900px]:text-left"
        >
          {/* Copy preserved verbatim from the original section. */}
          <h2 className="text-[clamp(1.35rem,3vw,1.95rem)] font-bold leading-[1.3] mb-[1.2rem]">
            I'm <span className="accent">{name}</span>, a{" "}
            <span className="accent about-role" ref={roleElRef}></span>{" "}
            focused on building scalable, modern, and user-centric applications.
          </h2>

          <p className="text-ink-soft leading-[1.75] max-w-[60ch] mx-auto min-[900px]:mx-0">
            {bio}
          </p>

          <ul className="social-icons list-none flex justify-center gap-[0.6rem] mt-[1.8rem] p-0 min-[900px]:justify-start" aria-label="Social links">
            {socialLinks.map((social) => (
              <li className="icon-content relative" key={social.key}>
                <a
                  href={social.href}
                  aria-label={social.label}
                  data-social={social.key}
                  target={social.external ? "_blank" : undefined}
                  rel={social.external ? "noopener" : undefined}
                >
                  <span className="filled"></span>
                  {SOCIAL_SVGS[social.key]}
                </a>
                <span className="tooltip">{social.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
