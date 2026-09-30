// Pointer-proximity squash for display letters. Sets per-char --sq (0..1) + font-weight; the
// section decides how --sq maps to font-stretch in its own CSS, e.g.
//   .ch{font-stretch:clamp(50%, calc(var(--wscroll,150%) * (1 - .55*var(--sq,0))), 150%)}
import { gsap, SplitText } from "./gsap.js";
import { reduced, finePointer, SPR } from "./motion.js";

/** squash(el, { radius = 220, wght = [800, 900], split = true }) → destroy() */
export function squash(el, { radius = 220, wght = [800, 900], split = true } = {}) {
  if (reduced() || !finePointer() || !el) return () => {};
  let st = null;
  let chars;
  if (split) {
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", el.textContent.trim());
    st = SplitText.create(el, { type: "chars", charsClass: "ch", aria: "none" });
    chars = st.chars;
  } else chars = [...el.querySelectorAll(".ch")];
  const proxies = chars.map((ch) => {
    const p = { sq: 0 };
    const to = gsap.quickTo(p, "sq", { ...SPR.play, onUpdate: () => {
      ch.style.setProperty("--sq", p.sq.toFixed(3));
      ch.style.fontWeight = Math.round(wght[1] - (wght[1] - wght[0]) * p.sq);
    } });
    return { ch, p, to, cx: 0, cy: 0 };
  });
  const measure = () => proxies.forEach((o) => { const r = o.ch.getBoundingClientRect(); o.cx = r.left + r.width / 2 + scrollX; o.cy = r.top + r.height / 2 + scrollY; });
  let raf = 0, px = -1e4, py = -1e4, dirty = true;
  const frame = () => {
    raf = 0;
    if (dirty) { measure(); dirty = false; }
    proxies.forEach((o) => {
      const d = Math.hypot(px + scrollX - o.cx, py + scrollY - o.cy);
      o.to(d < radius ? 1 - d / radius : 0);
    });
  };
  const move = (e) => { px = e.clientX; py = e.clientY; raf ||= requestAnimationFrame(frame); };
  const leave = () => { px = py = -1e4; raf ||= requestAnimationFrame(frame); };
  const invalidate = () => { dirty = true; };
  el.addEventListener("pointermove", move, { passive: true });
  el.addEventListener("pointerleave", leave);
  window.addEventListener("resize", invalidate);
  window.addEventListener("scroll", invalidate, { passive: true });
  return () => {
    cancelAnimationFrame(raf);
    el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave);
    window.removeEventListener("resize", invalidate); window.removeEventListener("scroll", invalidate);
    st && st.revert();
  };
}
