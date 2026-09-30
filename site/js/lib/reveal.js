// Declarative reveals: [data-reveal="up|fade|lines|draw|mark"] + optional data-reveal-delay (s).
// Content is never hidden by CSS; hidden states are set here, only in motion mode.
import { gsap, ScrollTrigger } from "./gsap.js";
import { reduced } from "./motion.js";
import { revealLines } from "./split.js";

export function initReveals(scope = document) {
  const els = [...scope.querySelectorAll("[data-reveal]:not([data-reveal-bound])")];
  els.forEach((el) => el.setAttribute("data-reveal-bound", ""));
  if (reduced()) { els.forEach((el) => el.style.setProperty("--mark", 1)); return () => {}; }

  const by = (k) => els.filter((el) => el.dataset.reveal === k);
  const delay = (el) => parseFloat(el.dataset.revealDelay || 0);
  const made = [];

  by("lines").forEach((el) => made.push(revealLines(el, { delay: delay(el) })));

  const batch = (list, from, to) => {
    if (!list.length) return;
    gsap.set(list, from);
    made.push(...ScrollTrigger.batch(list, {
      start: "top 85%", once: true,
      // clearProps: no identity translate left behind to keep a composited layer alive
      onEnter: (b) => gsap.to(b, { ...to, stagger: 0.06, delay: delay(b[0]), overwrite: true, clearProps: to.y != null ? "transform" : "" }),
    }));
  };
  // opacity, not autoAlpha: visibility:hidden would drop links/buttons inside from the tab order until scrolled to.
  batch(by("up"), { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "edit" });
  batch(by("fade"), { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "edit" });
  // Keyboard focus lands inside a block that hasn't revealed yet (focus scrolls faster than triggers): show it now.
  const onFocus = (e) => {
    const el = e.target.closest && e.target.closest('[data-reveal="up"],[data-reveal="fade"]');
    if (el && els.includes(el) && +gsap.getProperty(el, "opacity") < 1) gsap.to(el, { opacity: 1, y: 0, duration: 0.3, ease: "edit", overwrite: true, clearProps: "transform" });
  };
  document.addEventListener("focusin", onFocus);
  made.push({ kill: () => document.removeEventListener("focusin", onFocus) });
  batch(by("mark"), { "--mark": 0 }, { "--mark": 1, duration: 0.6, ease: "edit" });

  by("draw").forEach((el) => {
    const paths = el.matches("path,line,polyline,circle,rect,ellipse") ? [el] : el.querySelectorAll("path,line,polyline,circle,rect,ellipse");
    gsap.set(paths, { drawSVG: "0%" });
    made.push(gsap.to(paths, { drawSVG: "100%", duration: 0.9, ease: "edit", stagger: 0.1, delay: delay(el), scrollTrigger: { trigger: el, start: "top 85%", once: true } }));
  });

  return () => made.forEach((m) => m && m.kill());
}
