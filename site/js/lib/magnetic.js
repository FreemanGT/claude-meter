// Magnetic hover. Transforms the inner element so the focus ring on `el` stays put.
import { gsap } from "./gsap.js";
import { reduced, finePointer, SPR } from "./motion.js";

/**
 * magnetic(el, { strength = .3, radius = 40, inner = el.firstElementChild, max = [6, 6] }) → destroy()
 * Engages inside el's box plus `radius` on each axis (a box, not a circle: a wide tab mustn't reach 250px
 * above itself). The pull is soft-clamped so the content never leaves el: at most `max` px, and never more
 * than the room the content has inside el (a label must never slide off its tab).
 */
export function magnetic(el, { strength = 0.3, radius = 40, inner = el.firstElementChild, max = [6, 6] } = {}) {
  if (reduced() || !finePointer() || !inner) return () => {};
  const qx = gsap.quickTo(inner, "x", { duration: 0.4, ease: "power3" });
  const qy = gsap.quickTo(inner, "y", { duration: 0.4, ease: "power3" });
  const soft = (d, m) => (m > 0 ? m * Math.tanh(d / m) : 0);
  let active = false, mx = 0, my = 0;
  /** The room the content has inside el, per axis (measured once per engagement: translation doesn't change it). */
  const room = (r) => {
    let l = Infinity, rt = -Infinity, t = Infinity, b = -Infinity;
    for (const c of inner.children) {
      const q = c.getBoundingClientRect();
      if (!q.width) continue;
      l = Math.min(l, q.left); rt = Math.max(rt, q.right); t = Math.min(t, q.top); b = Math.max(b, q.bottom);
    }
    const cw = rt > l ? rt - l : r.width, ch = b > t ? b - t : r.height;
    mx = Math.max(0, Math.min(max[0], (r.width - cw) / 2));
    my = Math.max(0, Math.min(max[1], (r.height - ch) / 2));
  };
  const move = (e) => {
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.abs(dx) > r.width / 2 + radius || Math.abs(dy) > r.height / 2 + radius) { if (active) release(); return; }
    if (!active) { active = true; room(r); }
    qx(soft(dx * strength, mx)); qy(soft(dy * strength, my));
  };
  const release = () => {
    active = false;
    gsap.to(inner, { x: 0, y: 0, ...SPR.play, overwrite: true });
  };
  const out = (e) => { if (!e.relatedTarget && active) release(); };   // the pointer left the window
  window.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerout", out);
  return () => { window.removeEventListener("pointermove", move); document.removeEventListener("pointerout", out); gsap.set(inner, { clearProps: "transform" }); };
}
