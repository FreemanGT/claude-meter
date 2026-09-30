// The CTA: a NotchShape that hangs from a hairline and opens like a peek (SPEC §5.4).
import { gsap } from "./gsap.js";
import { reduced, finePointer, SPR } from "./motion.js";
import { notchPath } from "./notch-path.js";
import { magnetic } from "./magnetic.js";

// m: the hero tab · l · xl: the finale's island, which stays open (.cta--open) with the meta inside
const SIZES = { m: { w: 272, h: 56, rt: 10, rb: 22 }, l: { w: 320, h: 68, rt: 12, rb: 26 }, xl: { w: 440, h: 80, rt: 12, rb: 30 } };
const OPEN = 30; // extra height when open (56 → 86)
let uid = 0;

export function initCtas(scope = document) {
  const kills = [...scope.querySelectorAll(".cta:not([data-cta-bound])")].map(bind);
  return () => kills.forEach((k) => k());
}

// Installing is a .dmg, a drag and an open, never "one click" (and the Mac CTA now asks for an email).
const CURSOR = { "free · one click": "free · .dmg · v1.2", "v1.2 · one click": "macOS 14.4+ · free" };

function bind(a) {
  a.setAttribute("data-cta-bound", "");
  if (CURSOR[a.dataset.cursor]) a.dataset.cursor = CURSOR[a.dataset.cursor];
  const size = SIZES[a.classList.contains("cta--xl") ? "xl" : a.classList.contains("cta--l") ? "l" : "m"];
  const always = a.classList.contains("cta--open");
  const svg = a.querySelector(".cta__shape");
  const [fill, hot] = svg.querySelectorAll("path");
  const val = a.querySelector(".cta__ring .val");
  const label = a.querySelector(".cta__label");
  const meta = a.querySelector(".cta__meta");
  const row = a.querySelector(".cta__row");
  const baseLabel = label.textContent;
  const id = `cta-kl-${++uid}`;
  const pad = 2; // room for the flare + stroke
  // Width: the size's width, shrunk to the column; the full column on phones with .cta-hang--full.
  let W = size.w;
  const fit = () => {
    const avail = a.parentElement.clientWidth || size.w;
    W = a.closest(".cta-hang--full") && innerWidth < 768 ? avail : Math.min(size.w, avail);
    svg.setAttribute("width", W + pad * 2);
    svg.setAttribute("height", size.h + OPEN + pad);
    svg.setAttribute("viewBox", `${-pad} 0 ${W + pad * 2} ${size.h + OPEN + pad}`);
    a.style.setProperty("--cta-w", `${W}px`);
  };
  fit();
  svg.querySelector("defs")?.remove(); // re-bind after a breakpoint flip
  svg.insertAdjacentHTML("afterbegin", `<defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" r="140" cx="-999" cy="-999"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`);
  hot.setAttribute("stroke", `url(#${id})`);
  const grad = svg.querySelector("radialGradient");

  const geo = { h: size.h, ring: 46 };
  const draw = () => {
    const d = notchPath(W, geo.h, size.rt, size.rb);
    fill.setAttribute("d", d); hot.setAttribute("d", d);
    a.style.setProperty("--cta-h", `${geo.h}px`);
  };
  const ring = () => {
    val.style.strokeDashoffset = String(100 - geo.ring);
    a.classList.toggle("is-hot", geo.ring > 85);
  };
  a.style.setProperty("--cta-h0", `${size.h}px`);
  a.style.setProperty("--cta-h1", `${size.h + OPEN}px`);

  const ro = new ResizeObserver(() => { const w = W; fit(); if (W !== w) draw(); });
  ro.observe(a.parentElement);

  if (reduced()) {
    geo.h = size.h + OPEN; draw(); ring();
    a.classList.add("is-open", "is-static");
    return () => { ro.disconnect(); a.removeAttribute("data-cta-bound"); };
  }
  if (always) { geo.h = size.h + OPEN; a.classList.add("is-open"); }
  else gsap.set(meta, { opacity: 0, filter: "blur(4px)", scaleX: 0.6 });
  draw(); ring();

  let openTl = null;
  const open = () => {
    if (!always) {
      a.classList.add("is-open");
      gsap.to(geo, { h: size.h + OPEN, ...SPR.open, onUpdate: draw, overwrite: "auto" });
      gsap.to(meta, { opacity: 1, filter: "blur(0px)", scaleX: 1, duration: 0.3, delay: 0.06, ease: "settle", overwrite: "auto" });
    }
    gsap.to(geo, { ring: 100, duration: 0.5, ease: "power2.inOut", onUpdate: ring, overwrite: "auto" });
    openTl && openTl.kill();
    openTl = gsap.timeline().to(a.querySelector(".cta__ring .arrow"), { y: 2, duration: 0.14, yoyo: true, repeat: 3, ease: "power1.inOut" });
  };
  const close = () => {
    if (a.matches(":hover") || a.matches(":focus-visible")) return;
    if (!always) {
      a.classList.remove("is-open");
      gsap.to(geo, { h: size.h, ...SPR.close, onUpdate: draw, overwrite: "auto" });
      gsap.to(meta, { opacity: 0, filter: "blur(4px)", scaleX: 0.3, duration: 0.18, overwrite: "auto" });
    }
    gsap.to(geo, { ring: 46, duration: 0.5, ease: "power2.inOut", onUpdate: ring, overwrite: "auto" });
  };
  const press = () => gsap.to(row, { scale: 0.97, duration: 0.12, ease: "settle" });
  const release = () => gsap.to(row, { scale: 1, ...SPR.play });
  const click = () => {
    gsap.fromTo(a, { x: 0 }, { keyframes: { x: [0, -4, 4, -2, 0] }, duration: 0.12, ease: "none" });
    gsap.fromTo(geo, { ring: geo.ring }, { ring: 0, ...SPR.open, onUpdate: ring, overwrite: "auto" });
    if (a.dataset.cta) return;   // the signup dialog takes it from here (lib/signup.js)
    label.textContent = "Downloading…";
    setTimeout(() => { label.textContent = baseLabel; }, 2400);
  };

  a.addEventListener("pointerenter", open);
  a.addEventListener("focus", open);
  a.addEventListener("pointerleave", close);
  a.addEventListener("blur", close);
  a.addEventListener("pointerdown", press);
  a.addEventListener("pointerup", release);
  a.addEventListener("pointercancel", release);
  a.addEventListener("click", click);

  // Key light: a second rim lit from the pointer, fading in within 220px.
  let raf = 0, px = 0, py = 0;
  const kl = () => {
    raf = 0;
    const r = svg.getBoundingClientRect();
    const x = px - r.left - pad, y = py - r.top;
    grad.setAttribute("cx", x); grad.setAttribute("cy", y);
    const dx = Math.max(r.left - px, 0, px - r.right), dy = Math.max(r.top - py, 0, py - r.bottom);
    hot.style.opacity = String(Math.max(0, 1 - Math.hypot(dx, dy) / 220) * 0.55);
  };
  const onMove = (e) => { px = e.clientX; py = e.clientY; raf ||= requestAnimationFrame(kl); };
  const fine = finePointer();
  if (fine) window.addEventListener("pointermove", onMove, { passive: true });
  const unmag = magnetic(a, { strength: 0.3, inner: row });

  return () => {
    ro.disconnect();
    unmag();
    if (fine) window.removeEventListener("pointermove", onMove);
    ["pointerenter", "focus"].forEach((t) => a.removeEventListener(t, open));
    ["pointerleave", "blur"].forEach((t) => a.removeEventListener(t, close));
    a.removeEventListener("pointerdown", press); a.removeEventListener("pointerup", release); a.removeEventListener("click", click);
    a.removeAttribute("data-cta-bound");
  };
}
