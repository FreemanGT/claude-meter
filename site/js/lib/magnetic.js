// Magnetic hover. Transforms the inner element so the focus ring on `el` stays put.
import { gsap } from "./gsap.js";
import { reduced, finePointer, SPR } from "./motion.js";

/** magnetic(el, { strength = .3, radius = 120, inner = el.firstElementChild }) → destroy() */
export function magnetic(el, { strength = 0.3, radius = 120, inner = el.firstElementChild } = {}) {
  if (reduced() || !finePointer() || !inner) return () => {};
  const label = inner.querySelector("[data-magnetic-label]");
  const qx = gsap.quickTo(inner, "x", { duration: 0.4, ease: "power3" });
  const qy = gsap.quickTo(inner, "y", { duration: 0.4, ease: "power3" });
  const lx = label && gsap.quickTo(label, "x", { duration: 0.4, ease: "power3" });
  const ly = label && gsap.quickTo(label, "y", { duration: 0.4, ease: "power3" });
  let active = false;
  const move = (e) => {
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const inside = Math.hypot(dx, dy) < radius + Math.max(r.width, r.height) / 2;
    if (!inside) { if (active) release(); return; }
    active = true;
    qx(dx * strength); qy(dy * strength);
    if (lx) { lx(dx * strength * 0.5); ly(dy * strength * 0.5); } // label travels 1.5× in total
  };
  const release = () => {
    active = false;
    gsap.to(inner, { x: 0, y: 0, ...SPR.play, overwrite: true });
    if (label) gsap.to(label, { x: 0, y: 0, ...SPR.play, overwrite: true });
  };
  window.addEventListener("pointermove", move, { passive: true });
  el.addEventListener("pointerleave", release);
  return () => { window.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", release); gsap.set([inner, label].filter(Boolean), { clearProps: "transform" }); };
}
