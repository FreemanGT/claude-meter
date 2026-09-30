// Motion preferences + SwiftUI-accurate springs as GSAP eases.
const mqReduced = matchMedia("(prefers-reduced-motion: reduce)");
const mqMobile = matchMedia("(max-width: 767px)");
const mqFine = matchMedia("(hover: hover) and (pointer: fine)");

export const reduced = () => mqReduced.matches;
export const mobile = () => mqMobile.matches;
export const finePointer = () => mqFine.matches;

/**
 * The stage island's px/pt at rest (main.js hands it to the intro; stage.js builds the hero at it).
 * Desktop: up to 2, but never over a band menu item (macOS hides whole items behind the notch).
 * Mobile: fits between the band's brand icon and download button.
 */
export function heroScale() {
  const w = innerWidth;
  if (mobile()) return Math.min(1.1, (w - 96) / 277);
  let l = 0;
  document.querySelectorAll(".band__left > *").forEach((c) => { const r = c.getBoundingClientRect(); if (r.width) l = Math.max(l, r.right); });
  return Math.min(2, Math.max(1.25, (w - 2 * (l + 16)) / 277));
}

/** Calls fn({reduced, mobile}) whenever either preference flips. Returns an unsubscribe. */
export function onChange(fn) {
  const h = () => fn({ reduced: reduced(), mobile: mobile() });
  mqReduced.addEventListener("change", h);
  mqMobile.addEventListener("change", h);
  return () => { mqReduced.removeEventListener("change", h); mqMobile.removeEventListener("change", h); };
}

/**
 * SwiftUI spring(duration:bounce:) → { ease, duration }.
 * duration = SwiftUI "perceptual duration" (period of the undamped spring); the returned
 * duration is the settle time (|1-x| < .002), which is what the GSAP tween should run for.
 * Same maths as the --spring-* CSS linear() tokens.
 */
export function spring({ duration = 0.4, bounce = 0 } = {}) {
  const w0 = (2 * Math.PI) / duration;
  const z = 1 - Math.min(Math.max(bounce, 0), 0.95);
  const x = z < 1
    ? (t) => { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t)); }
    : (t) => 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  let settle = 0;
  for (let t = 0; t < 5; t += 0.002) if (Math.abs(1 - x(t)) > 0.002) settle = t;
  settle = Math.round((settle + 0.002) * 1000) / 1000;
  return { ease: (p) => (p >= 1 ? 1 : x(p * settle)), duration: settle };
}

/** Named springs. Spread into a tween: gsap.to(el, { x: 0, ...SPR.open }). */
export const SPR = {
  open: spring({ duration: 0.4, bounce: 0.3 }),   // SwiftUI .bouncy(0.4)  ≈ 590ms
  close: spring({ duration: 0.4, bounce: 0 }),    // SwiftUI .smooth(0.4)  ≈ 540ms
  value: { ease: spring({ duration: 0.36, bounce: 0 }).ease, duration: 0.5 }, // .smooth(0.5) feel, 0.5s
  play: spring({ duration: 0.6, bounce: 0.5 }),   // tactile accents ≈ 1.17s
};
