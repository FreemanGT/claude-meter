// macOS notification banner replica (SPEC §4.8) + a small toast. Real Notifier.swift copy only.
import { gsap, loadDrag, untracked } from "./gsap.js";
import { reduced, SPR } from "./motion.js";

const stacks = new WeakMap();
function stackFor(host) {
  let s = stacks.get(host);
  if (s && s.isConnected) return s;
  s = document.createElement("div");
  s.className = "cm-banners";
  if (host === document.body) s.classList.add("is-fixed");
  host.append(s);
  stacks.set(host, s);
  return s;
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * showBanner(host, { title, body, icon = true, flick = false, timeout = 6000, static: false, announce = false }) → el
 * Stacks newest on top, 3 max, inside host (host should be position:relative; document.body → fixed).
 * announce: a live role=status, only for banners the user caused. Scroll-driven demo banners repeat
 * their captions, so they stay out of the accessibility tree.
 * el.dismiss() removes it with the exit motion.
 */
export function showBanner(host = document.body, { title, body, icon = true, flick = false, timeout = 6000, static: isStatic = false, announce = false } = {}) {
  const stack = stackFor(host);
  const el = document.createElement("div");
  el.className = "cm-banner";
  el.setAttribute(announce ? "role" : "aria-hidden", announce ? "status" : "true");
  el.innerHTML = `
    ${icon ? '<img class="cm-banner__icon" src="/assets/icon-256.png" alt="" width="32" height="32">' : ""}
    <div class="cm-banner__text">
      <div class="cm-banner__meta"><span>CLAUDE METER</span><span>now</span></div>
      <p class="cm-banner__title">${esc(title)}</p>
      <p class="cm-banner__body">${esc(body)}</p>
    </div>
    <button class="cm-banner__close" type="button" aria-label="Dismiss notification"${announce ? "" : ' tabindex="-1"'}>×</button>`;
  if (flick) el.dataset.cursor = "flick →";
  stack.prepend(el);
  while (stack.children.length > 3) stack.lastElementChild.remove();

  let timer = 0, drag = null, gone = false;
  const remove = () => { drag && drag.kill(); el.remove(); };
  el.dismiss = (vx = 0) => {
    if (gone) return; gone = true;
    clearTimeout(timer);
    if (reduced() || isStatic) return remove();
    untracked(() => gsap.to(el, { x: vx ? Math.sign(vx) * innerWidth * 0.6 : "110%", rotation: vx ? gsap.utils.clamp(-18, 18, vx / 120) : 0, opacity: 0, duration: 0.35, ease: "power2.in", onComplete: remove }));
  };
  el.querySelector(".cm-banner__close").addEventListener("click", () => el.dismiss());
  if (!isStatic && timeout) timer = setTimeout(() => el.dismiss(), timeout);

  if (!reduced() && !isStatic) {
    untracked(() => gsap.fromTo(el, { xPercent: 110, opacity: 0 }, { xPercent: 0, opacity: 1, ...SPR.open }));
    if (flick) loadDrag().then(({ Draggable, InertiaPlugin }) => {
      if (gone) return;
      InertiaPlugin.track(el, "x");
      const d = Draggable.create(el, {
        type: "x", zIndexBoost: false,
        onPress() { clearTimeout(timer); },
        onRelease() {
          const vx = InertiaPlugin.getVelocity(el, "x") || 0;
          if (Math.abs(vx) > 600 || Math.abs(this.x) > 120) el.dismiss(vx || this.x * 8);
          else { gsap.to(el, { x: 0, ...SPR.play }); if (timeout) timer = setTimeout(() => el.dismiss(), timeout); }
        },
      })[0];
      drag = { kill: () => { d.kill(); InertiaPlugin.untrack(el); } };
    }, (e) => console.error("[banner] flick unavailable", e));
  }
  return el;
}

/** toast(text, { host = document.body, duration = 2400 }) — a small ink pill under the band. */
export function toast(text, { host = document.body, duration = 2400 } = {}) {
  const t = document.createElement("div");
  t.className = "cm-toast" + (host === document.body ? " is-fixed" : "");
  t.setAttribute("role", "status");
  t.textContent = text;
  host.append(t);
  if (reduced()) { setTimeout(() => t.remove(), duration); return t; }
  untracked(() => {
    gsap.fromTo(t, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "settle" });
    gsap.to(t, { y: -8, opacity: 0, duration: 0.25, delay: duration / 1000, ease: "power2.in", onComplete: () => t.remove() });
  });
  return t;
}
