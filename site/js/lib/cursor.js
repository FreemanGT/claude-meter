// Cursor tag: a small black capsule that trails the (always visible) native cursor and shows the
// [data-cursor] text of whatever is under it. Decorative (aria-hidden).
import { gsap } from "./gsap.js";
import { reduced, finePointer, SPR } from "./motion.js";

export function initCursorTag() {
  if (reduced() || !finePointer()) return () => {};
  const tag = document.createElement("div");
  tag.className = "cursor-tag";
  tag.setAttribute("aria-hidden", "true");
  tag.innerHTML = '<span class="cursor-tag__txt"></span>';
  document.body.append(tag);
  const txt = tag.firstElementChild;
  const qx = gsap.quickTo(tag, "x", { duration: 0.35, ease: "power3" });
  const qy = gsap.quickTo(tag, "y", { duration: 0.35, ease: "power3" });
  let current = null, shown = false;

  const show = (text) => {
    if (text !== txt.textContent) {
      if (shown) gsap.fromTo(txt, { yPercent: 100 }, { yPercent: 0, duration: 0.3, ease: "settle" });
      txt.textContent = text;
    }
    if (shown) return;
    shown = true;
    gsap.killTweensOf(tag, "clipPath,opacity");
    gsap.fromTo(tag, { clipPath: "inset(0 50% 0 50% round 11px)", opacity: 1 }, { clipPath: "inset(0 0% 0 0% round 11px)", ...SPR.play });
  };
  const hide = () => {
    if (!shown) return;
    shown = false;
    gsap.to(tag, { clipPath: "inset(0 50% 0 50% round 11px)", opacity: 0, duration: 0.2, ease: "power2.in" });
  };
  const move = (e) => {
    qx(e.clientX + 14); qy(e.clientY + 18);
    const t = e.target.closest && e.target.closest("[data-cursor]");
    if (t !== current) { current = t; t && t.dataset.cursor ? show(t.dataset.cursor) : hide(); }
  };
  const leave = () => { current = null; hide(); };
  window.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);
  const scroll = () => current && hide();
  window.addEventListener("scroll", scroll, { passive: true });
  return () => {
    window.removeEventListener("pointermove", move); window.removeEventListener("scroll", scroll);
    document.documentElement.removeEventListener("pointerleave", leave); tag.remove();
  };
}
