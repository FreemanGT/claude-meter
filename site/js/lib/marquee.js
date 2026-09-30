// Infinite marquee with scroll-velocity reaction. Pauses offscreen / hidden tab.
import { gsap, ScrollTrigger } from "./gsap.js";
import { reduced } from "./motion.js";
import { whileVisible } from "./loop.js";

/**
 * marquee(track, { speed = 60 px/s, dir = 1 (1 = left, -1 = right), velocity = true, hoverSlow = .2 })
 * → { pause, play, kill, tween }. Track children are cloned (aria-hidden, inert) to ≥2× viewport.
 */
export function marquee(track, { speed = 60, dir = 1, velocity = true, hoverSlow = 0.2 } = {}) {
  const noop = { pause() {}, play() {}, kill() {}, tween: null };
  if (reduced() || !track) return noop;
  const originals = [...track.children];
  const clones = [];
  const setWidth = () => originals.reduce((w, el) => w + el.getBoundingClientRect().width, 0) + gapOf(track) * originals.length;
  let setW = setWidth();
  if (!setW) return noop;
  // Enough copies so at least 2× the viewport is always covered.
  const copies = Math.max(1, Math.ceil((innerWidth * 2) / setW));
  for (let c = 0; c < copies; c++) originals.forEach((el) => {
    const k = el.cloneNode(true);
    k.setAttribute("aria-hidden", "true");
    k.inert = true;
    k.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    k.querySelectorAll("[tabindex]").forEach((n) => n.setAttribute("tabindex", "-1"));
    track.append(k); clones.push(k);
  });
  const x = { v: 0 };
  const wrap = gsap.utils.wrap(-setW, 0);
  const tween = gsap.to(x, {
    v: dir > 0 ? -setW : setW, duration: setW / speed, ease: "none", repeat: -1, paused: true,
    onUpdate: () => gsap.set(track, { x: wrap(x.v) }),
  });
  let base = 1, boost = 1, hoverF = 1;
  const apply = () => tween.timeScale(base * boost * hoverF);
  const skew = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3" });
  const cool = gsap.delayedCall(0.12, () => { boost = 1; apply(); skew(0); }).pause();
  const st = velocity ? ScrollTrigger.create({
    trigger: track, start: "top bottom", end: "bottom top",
    onUpdate: (self) => {
      const v = self.getVelocity();
      boost = 1 + Math.min(Math.abs(v) / 1200, 3); apply();
      skew(gsap.utils.clamp(-3, 3, (v / 1200) * -3 * dir));
      cool.restart(true);
    },
  }) : null;
  const enter = () => gsap.to({ f: hoverF }, { f: hoverSlow, duration: 0.4, onUpdate() { hoverF = this.targets()[0].f; apply(); } });
  const leave = () => gsap.to({ f: hoverF }, { f: 1, duration: 0.4, onUpdate() { hoverF = this.targets()[0].f; apply(); } });
  if (hoverSlow < 1) { track.addEventListener("pointerenter", enter); track.addEventListener("pointerleave", leave); }
  const onResize = () => { setW = setWidth(); };
  window.addEventListener("resize", onResize);
  const stopVis = whileVisible(track, () => tween.play(), () => tween.pause());
  return {
    tween,
    pause: () => { base = 0; apply(); },
    play: () => { base = 1; apply(); },
    setSpeedFactor: (f) => { base = f; apply(); },
    kill: () => {
      stopVis(); tween.kill(); cool.kill(); st && st.kill();
      track.removeEventListener("pointerenter", enter); track.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", onResize);
      clones.forEach((k) => k.remove()); gsap.set(track, { clearProps: "transform" });
    },
  };
}
const gapOf = (el) => parseFloat(getComputedStyle(el).columnGap) || 0;
