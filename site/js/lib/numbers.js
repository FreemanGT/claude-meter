// Live numbers: Roller (Alcove-style rolling digits), countTo, scramble.
import { gsap, untracked, loadPlugin } from "./gsap.js";
import { reduced, spring } from "./motion.js";

const ROLL = spring({ duration: 0.32, bounce: 0.12 });

/**
 * new Roller(el, { value, format }) · .set(n) · .value
 * Each char sits in its own slot; changed chars roll in from ±60% (scale .8, blur 3px) and the
 * old char rolls out the other way. Direction follows the sign of the change. Screen readers
 * get the plain text via an sr-only twin.
 */
export class Roller {
  constructor(el, { value = 0, format = (n) => String(Math.round(n)) } = {}) {
    this.el = el;
    this.format = format;
    this.value = value;
    el.classList.add("roller");
    el.textContent = "";
    this.sr = Object.assign(document.createElement("span"), { className: "sr-only" });
    this.vis = Object.assign(document.createElement("span"), { className: "roller__vis" });
    this.vis.setAttribute("aria-hidden", "true");
    el.append(this.sr, this.vis);
    this.slots = [];
    this.#write(this.#text(value), 0, true);
  }
  #text(v) { return typeof v === "string" ? v : this.format(v); }
  set(v, { instant = false } = {}) {
    const prev = this.value;
    this.value = v;
    const dir = typeof v === "number" && typeof prev === "number" ? Math.sign(v - prev) || 1 : 1;
    this.#write(this.#text(v), dir, instant || reduced());
    return this;
  }
  /** Same-value roll (e.g. after "Refresh now"). */
  bump() { this.#write(this.#text(this.value), 1, reduced(), true); return this; }
  #write(text, dir, instant, force = false) {
    this.sr.textContent = text;
    const chars = [...text];
    while (this.slots.length < chars.length) {
      const s = document.createElement("span");
      s.className = "roller__slot";
      this.vis.append(s);
      this.slots.push({ el: s, ch: null });
    }
    while (this.slots.length > chars.length) this.slots.pop().el.remove();
    chars.forEach((ch, i) => {
      const slot = this.slots[i];
      if (slot.ch === ch && !force) return;
      const old = slot.el.lastElementChild;
      const neu = document.createElement("span");
      neu.className = "roller__ch";
      neu.textContent = ch === " " ? " " : ch;
      slot.el.append(neu);
      slot.ch = ch;
      if (instant || !old) { if (old) old.remove(); gsap.set(neu, { clearProps: "all" }); return; }
      old.classList.add("is-out");
      gsap.killTweensOf(old);
      // Rollers are set from scrub callbacks: keep these self-finishing tweens out of the section's context.
      untracked(() => {
        gsap.to(old, { yPercent: -60 * dir, scale: 0.8, opacity: 0, filter: "blur(3px)", duration: 0.3, ease: "power2.in", onComplete: () => old.remove() });
        gsap.fromTo(neu, { yPercent: 60 * dir, scale: 0.8, opacity: 0, filter: "blur(3px)" },
          { yPercent: 0, scale: 1, opacity: 1, filter: "blur(0px)", ...ROLL, delay: i * 0.02, clearProps: "filter,transform" });
      });
    });
  }
}

/** Plain count-up for one-off numbers. Returns the tween (or null when reduced). */
export function countTo(el, to, { from = 0, duration = 0.8, suffix = "%", ease = "power2.out" } = {}) {
  if (reduced()) { el.textContent = `${Math.round(to)}${suffix}`; return null; }
  const o = { v: from };
  return gsap.to(o, { v: to, duration, ease, onUpdate: () => { el.textContent = `${Math.round(o.v)}${suffix}`; } });
}

/**
 * ScrambleText to `text`, time-based, 400ms. Mono labels only — never product UI (the app never
 * scrambles) and never scrubbed. The plugin loads on the first call (two labels on the page use it).
 * Returns a Promise of the tween (null when reduced; the text still lands if the plugin can't load).
 */
export function scramble(el, text, { chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", delay = 0 } = {}) {
  if (reduced()) { el.textContent = text; return null; }
  gsap.killTweensOf(el);
  el._scr = text;
  return loadPlugin("ScrambleTextPlugin").then(
    () => el._scr === text && untracked(() => gsap.to(el, { duration: 0.4, delay, ease: "none", scrambleText: { text, chars, speed: 1, revealDelay: 0.1 } })),
    () => { el.textContent = text; });
}
