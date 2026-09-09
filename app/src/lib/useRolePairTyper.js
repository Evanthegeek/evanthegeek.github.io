import { useEffect } from "react";

/* Paired role typer — a faithful port of startRoleTypers from ../script.js.
   The hero subheader and the About heading type different roles in lockstep,
   drawn from a shuffled deck with no immediate repeats, with the same
   randomized speeds, holds and backspacing. */
export default function useRolePairTyper(heroTarget, aboutTarget, roles, prefersReducedMotion) {
  useEffect(() => {
    const heroEl = heroTarget && heroTarget.el.current;
    const aboutEl = aboutTarget && aboutTarget.el.current;
    const heroCaret = heroTarget && heroTarget.caret.current;
    const aboutCaret = aboutTarget && aboutTarget.caret.current;
    if (!heroEl || !aboutEl) return undefined;

    const isStatic = roles.length <= 1 || prefersReducedMotion;

    if (isStatic) {
      // Static fallback, same as the original: shell prompt on the hero only.
      heroEl.textContent = "$ " + roles.join(", ");
      aboutEl.textContent = roles.join(", ");
      if (heroCaret) heroCaret.style.display = "none";
      if (aboutCaret) aboutCaret.style.display = "none";
      return undefined;
    }
    if (heroCaret) heroCaret.style.display = "";
    if (aboutCaret) aboutCaret.style.display = "";

    let cancelled = false;
    let deck = [];
    let deckPos = 0;
    const hero = { index: -1, text: "" };
    const about = { index: -1, text: "" };
    let heroLast = -1;
    let aboutLast = -1;

    function shuffledDeck() {
      const d = roles.map((_, i) => i);
      for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = d[i];
        d[i] = d[j];
        d[j] = tmp;
      }
      return d;
    }

    function drawPair() {
      if (deckPos + 2 > deck.length) {
        do {
          deck = shuffledDeck();
        } while (deck[0] === heroLast || deck[1] === aboutLast);
        deckPos = 0;
      }
      hero.index = deck[deckPos];
      about.index = deck[deckPos + 1];
      heroLast = hero.index;
      aboutLast = about.index;
      deckPos += 2;
      hero.text = "";
      about.text = "";
    }

    function rand(min, max) { return min + Math.random() * (max - min); }

    function paint() {
      if (cancelled) return;
      heroEl.textContent = "$ " + hero.text;
      if (heroCaret) heroEl.appendChild(heroCaret);
      aboutEl.textContent = about.text;
      if (aboutCaret) aboutEl.appendChild(aboutCaret);
    }

    function deleteStep() {
      if (cancelled) return;
      if (hero.text) hero.text = hero.text.slice(0, -1);
      if (about.text) about.text = about.text.slice(0, -1);
      paint();
      if (!hero.text && !about.text) {
        drawPair();
        setTimeout(step, rand(280, 550));
      } else {
        setTimeout(deleteStep, rand(22, 50));
      }
    }

    function step() {
      if (cancelled) return;
      const heroRole = roles[hero.index];
      const aboutRole = roles[about.index];
      if (hero.text !== heroRole) hero.text = heroRole.slice(0, hero.text.length + 1);
      if (about.text !== aboutRole) about.text = aboutRole.slice(0, about.text.length + 1);
      paint();
      if (hero.text === heroRole && about.text === aboutRole) {
        setTimeout(deleteStep, rand(1400, 2300));
        return;
      }
      let delay = rand(45, 130);
      if (hero.text.charAt(hero.text.length - 1) === " ") delay = rand(160, 300);
      setTimeout(step, delay);
    }

    drawPair();
    step();
    return () => { cancelled = true; };
  }, [roles, prefersReducedMotion]);
}
