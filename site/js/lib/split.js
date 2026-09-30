// Masked line reveals (SplitText). The split happens at the first reveal, not at boot, and is reverted
// when the lines land, so the DOM and the accessibility tree go back to the plain text.
// No-ops under reduced motion.
import { gsap, ScrollTrigger, SplitText } from "./gsap.js";
import { reduced } from "./motion.js";

/**
 * revealLines(el, { delay, stagger = .08, trigger = el, start = "top 85%" }) → { kill() } | null
 * Until it reveals, el sits at opacity 0 (still in the accessibility tree).
 */
export function revealLines(el, { delay = 0, stagger = 0.08, trigger = el, start = "top 85%" } = {}) {
  if (reduced() || !el) return null;
  let split = null, tween = null;
  gsap.set(el, { opacity: 0 });
  const play = () => {
    if (tween) return;
    // aria "auto" labels the element and hides the pieces: valid on headings only (aria-label is
    // prohibited on <p>/<div>, which would leave screen readers with nothing).
    split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "sl", aria: el.matches("h1,h2,h3,h4,h5,h6") ? "auto" : "none" });
    gsap.set(el, { opacity: 1 });
    tween = gsap.from(split.lines, {
      yPercent: 110, duration: 0.9, ease: "edit", stagger, delay,
      onComplete: () => { split.revert(); split = null; },
    });
  };
  const st = ScrollTrigger.create({ trigger, start, once: true, onEnter: play });
  if (st.progress > 0) play();   // already scrolled past (restored position, anchor jump)
  return {
    kill() { st.kill(); tween && tween.kill(); split && split.revert(); gsap.set(el, { clearProps: "opacity" }); },
  };
}
