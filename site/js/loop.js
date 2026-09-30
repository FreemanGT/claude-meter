// §03 loop — the app's states on a tilted tape (A), a display marquee (B), the mid-page CTA and the icon.
// See web/SPEC.md §9.3 (and the round-1 review: 1:1 frames, lazy islands, a pause control, roving focus).
const HOLD = 1600;                                   // ms a frame stays in its "next" state before returning
const RANGES = { teal: [30, 70], lav: [20, 60], hot: [76, 98] };
const ICON = [60, 38, 82];                           // the icon's own meters: teal, lavender, amber
const REFRESH = [[34, 74], [18, 56], [52, 84]];      // where a hover refresh may land (never over 85: HIT is reserved)

/**
 * The eight frames: true app states only. `to` is the one change a frame plays (its caption's .lf__to names it):
 * a state morph, or for the tick-bar frame the Display setting, so that frame never shows anything but its own
 * display at rest. 01–04 are one account (the canonical 46 / 38 / 62), 05–06 are other moments of it.
 */
function frames({ demo, spark }) {
  // 05 burns: projected to the cap (100), so "hits the cap in 1h 12m" and the tick agree (the DEMO is on track).
  const burn = { session: { projected: 100, forecast: { exhaustsIn: 72 * 60 } } };
  const limit = { session: { pct: 64, projected: 84, spark: spark("s6", 64, { drop: true }) },
    weekly: { pct: 83, spark: spark("w6", 83) }, models: [{ name: "Opus", pct: 100, reset: "Sat 1:05 PM", spark: spark("o6", 100) }] };
  const merge = (patch) => {
    const d = demo();
    for (const k in patch) d[k] = Array.isArray(patch[k]) ? patch[k] : { ...d[k], ...patch[k] };
    return d;
  };
  return [
    { state: "collapsed", to: { state: "peek" } },                               // 01 · 46% / 62%
    { state: "collapsed", display: "ticks", to: { display: "percent" } },        // 02 · tick bars ⇄ percent
    { state: "peek", to: { state: "pinned" } },                                  // 03 · rings
    { state: "pinned", to: { state: "collapsed" } },                             // 04 · Max 20x
    { state: "peek", to: { state: "pinned" }, data: merge(burn) },               // 05 · hits the cap in 1h 12m
    { state: "pinned", to: { state: "collapsed" }, data: merge(limit) },         // 06 · Opus limit reached
    { state: "collapsed", to: { state: "peek" }, notch: false },                 // 07 · no-notch pill
    { state: "pinned", to: { state: "collapsed" }, hint: true },                 // 08 · first launch
  ];
}

/** Play a frame's change on a live island: a Display switch (the app's .smooth(0.25)) or a state morph. */
function go(isl, { state, display }) {
  if (display && display !== isl.opts.display) {
    isl.setOption("display", display);
    return new Promise((r) => setTimeout(r, 320));
  }
  return state ? isl.setState(state) : Promise.resolve();
}

/** A still of a rendered island: the visible pane only, no ids, no live hooks. Resting frames and clones carry this. */
function freeze(el) {
  const k = el.cloneNode(true);
  k.querySelectorAll("defs,.isl-hot,.isl-focus,.island__hit,.island__relaunch,.island__sr").forEach((n) => n.remove());
  k.querySelectorAll(".i-pane").forEach((p) => { if (p.style.opacity === "0") p.remove(); });
  k.querySelector(".isl-rim")?.setAttribute("stroke", "url(#loop-rim)");
  k.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  return k;
}

/**
 * Local marquee ("tape"), run on the compositor. lib/marquee.js writes a transform every frame from JS; inside
 * these rotated bands Chrome then repaints the whole track and the page layer every frame (~200ms/s of main
 * thread at idle). Here the loop is one Web Animation (translate from −1 to −2 loop lengths, infinite), and every
 * speed change is a playbackRate: scroll velocity (negative runs it backwards), hover/focus (0, WCAG 2.2.2), the
 * section's pause toggle (0). The loop length is measured as the hypot of clone → original, which is exact under
 * rotate and skew. A clone set sits on each side of the originals so any original can be glided to the centre
 * for keyboard focus; while it is held there the tape is an inline transform, then it resumes where it stopped.
 */
const LAPS = 1e4; // start this many loops in, so a negative playbackRate never reaches t=0 (where the animation would finish)
function tape({ gsap, ScrollTrigger, lib }, track, { speed, dir = 1, hoverEl = null, onClone = null }) {
  const originals = [...track.children], n = originals.length, clones = [];
  const cloneSet = () => originals.map((el) => {
    const k = el.cloneNode(true);
    k.setAttribute("aria-hidden", "true");
    k.inert = true;
    ["tabindex", "aria-label", "aria-roledescription"].forEach((a) => k.removeAttribute(a));
    k.querySelectorAll("[id]").forEach((x) => x.removeAttribute("id"));
    onClone?.(k);
    clones.push(k);
    return k;
  });
  track.prepend(...cloneSet());
  track.append(...cloneSet());
  let setW = 1, anim = null, lastRate = NaN, rateAt = 0;
  const st = { boost: 1, hover: 1, user: 1, vis: false, fixed: null };
  const measure = () => {
    anim?.pause();
    const a = track.children[0].getBoundingClientRect(), b = originals[0].getBoundingClientRect();
    setW = Math.hypot(b.left - a.left, b.top - a.top) || 1;
    while ((track.children.length / n) * setW < 2 * setW + innerWidth * 1.7) track.append(...cloneSet());
  };
  // Loop progress p ∈ [0,1) ↔ x ∈ [−2·setW, −setW); x of any (unwrapped) value maps back through the period.
  const xAt = (p) => (dir > 0 ? -setW * (1 + p) : -setW * (2 - p));
  const pAt = (x) => { const u = gsap.utils.wrap(0, 1, -x / setW - 1); return dir > 0 ? u : 1 - u; };
  const dur = () => (setW / speed) * 1000;
  const progress = () => (anim ? gsap.utils.wrap(0, 1, (anim.currentTime ?? 0) / dur()) : 0);
  const rate = () => st.boost * st.hover * st.user;
  // q (scroll velocity, its settle): only a real change, at most every 100ms. Hover / pause eases apply every frame.
  const applyRate = (q = false) => {
    const r = rate(), d = Math.abs(r - lastRate), now = performance.now();
    if (!anim || d < 0.004 || (q === true && (d < 0.1 || now - rateAt < 100))) return;
    lastRate = r; rateAt = now;
    anim.updatePlaybackRate ? anim.updatePlaybackRate(r) : (anim.playbackRate = r);
  };
  const start = (p) => {
    anim?.cancel();
    anim = track.animate([{ transform: `translate3d(${xAt(0)}px,0,0)` }, { transform: `translate3d(${xAt(1)}px,0,0)` }],
      { duration: dur(), iterations: Infinity, easing: "linear" });
    anim.currentTime = (LAPS + p) * dur();
    anim.playbackRate = lastRate = rate();
    if (!st.vis) anim.pause();
  };
  measure();
  start(0);

  // Velocity: speed and a skew on the parent (the track's transform belongs to the animation). The skew
  // eases over .5s, so it is retargeted only on a real change (≥ .25°, ≤ 10×/s).
  const skewTo = gsap.quickTo(track.parentElement, "skewX", { duration: 0.5, ease: "power3" });
  let skewV = 0, skewAt = 0;
  const skew = (v, force = false) => {
    const now = performance.now();
    if (!force && (Math.abs(v - skewV) < 0.25 || now - skewAt < 100)) return;
    skewV = v; skewAt = now; skewTo(v);
  };
  const calm = gsap.delayedCall(0.14, () => {
    lib.untracked(() => gsap.to(st, { boost: 1, duration: 0.6, ease: "power2.out", overwrite: "auto",
      onUpdate: () => applyRate(true), onComplete: applyRate }));
    skew(0, true);
  }).pause();
  const vel = ScrollTrigger.create({
    trigger: track, start: "top bottom", end: "bottom top",
    onUpdate: (self) => {
      const v = self.getVelocity();
      gsap.killTweensOf(st, "boost");
      st.boost = gsap.utils.clamp(-2.5, 4, 1 + v / 700);
      applyRate(true);
      skew(gsap.utils.clamp(-3, 3, (v / 1200) * -3 * dir));
      calm.restart(true);
    },
  });

  // Hover / keyboard focus stop the tape (WCAG 2.2.2); reasons stack so a tap hold and a focus don't fight.
  const why = new Set();
  const ease = (key, to, duration) => lib.untracked(() => gsap.to(st, { [key]: to, duration, ease: "power2.out", overwrite: "auto", onUpdate: applyRate, onComplete: applyRate }));
  const hold = (reason, on) => {
    if (on === why.has(reason)) return;
    on ? why.add(reason) : why.delete(reason);
    ease("hover", why.size ? 0 : 1, 0.4);
  };
  const L = hoverEl ? {
    pointerenter: (e) => e.pointerType !== "touch" && hold("ptr", true),
    pointerleave: (e) => e.pointerType !== "touch" && hold("ptr", false),
    focusin: (e) => e.target.matches(":focus-visible") && hold("focus", true),
    focusout: (e) => !hoverEl.contains(e.relatedTarget) && hold("focus", false),
  } : {};
  for (const t in L) hoverEl.addEventListener(t, L[t]);

  let rsT = 0;
  const onResize = () => {
    clearTimeout(rsT);
    rsT = setTimeout(() => { if (st.fixed != null) return; const p = progress(); measure(); start(p); }, 120);
  };
  addEventListener("resize", onResize);
  const stopVis = lib.whileVisible(track,
    () => { st.vis = true; if (st.fixed == null) anim?.play(); },
    () => { st.vis = false; anim?.pause(); });
  return {
    clones,
    hold,
    /** The section's pause toggle. */
    user(on, instant = false) { ease("user", on ? 1 : 0, instant ? 0 : 0.5); },
    /** Glide so `el` (an original) is centred, and keep it there until release(). */
    center(el) {
      const r = el.getBoundingClientRect();
      const d = r.left + r.width / 2 - innerWidth / 2;
      if (st.fixed == null && Math.abs(d) < innerWidth / 2 - r.width / 2 - 24) return;
      if (st.fixed == null) {
        st.fixed = xAt(progress());
        gsap.set(track, { x: st.fixed, force3D: true });
        anim.cancel();
      }
      lib.untracked(() => gsap.to(st, { fixed: st.fixed - d, duration: 0.7, ease: "power3.inOut", overwrite: "auto",
        onUpdate: () => gsap.set(track, { x: st.fixed, force3D: true }) }));
    },
    /** Resume looping from wherever center() left the tape (same picture: the content repeats every setW). */
    release() {
      if (st.fixed == null) return;
      gsap.killTweensOf(st, "fixed");
      const p = pAt(st.fixed);
      st.fixed = null;
      start(p);
      gsap.set(track, { clearProps: "transform" });
    },
    kill: () => {
      stopVis(); vel.kill(); calm.kill(); gsap.killTweensOf(st); clearTimeout(rsT);
      anim?.cancel();
      for (const t in L) hoverEl.removeEventListener(t, L[t]);
      removeEventListener("resize", onResize);
      clones.forEach((k) => k.remove());
      gsap.set([track, track.parentElement], { clearProps: "transform" });
    },
  };
}

export default function init(root, ctx) {
  const { gsap, ScrollTrigger, reduced, lib, Island } = ctx;
  const bandA = root.querySelector(".lA"), trackA = root.querySelector(".lA__track");
  const bandB = root.querySelector(".lB"), trackB = root.querySelector(".lB__track");
  const originals = [...trackA.children];
  const cleanups = [];
  let alive = true;
  cleanups.push(() => { alive = false; });

  // ------------------------------------------------------------ Strip A: one real render per state, frozen
  // Each state is rendered once by a real Island at the frame's scale (1 on desktop: the size it has on the
  // Mac), then frozen. Frames and clones carry the still; an Island only goes live while its frame plays.
  const CFG = frames(lib);
  const hostOf = (f) => f.querySelector(".lf__host");
  let scale = 1, snaps = [];
  const optsFor = (cfg) => ({
    scale, maxScale: scale, state: cfg.state, display: cfg.display || "percent", notch: cfg.notch ?? true,
    hint: !!cfg.hint, interactive: false, live: false, data: cfg.data || lib.demo(),
  });
  const fill = (f) => { if (snaps.length) hostOf(f).replaceChildren(snaps[+f.dataset.i].cloneNode(true)); };
  const snapshot = () => {
    scale = Math.min(1, Math.floor(((originals[0].offsetWidth - 40) / 560) * 100) / 100);
    root.style.setProperty("--fu", scale);
    if (!Island) return;
    snaps = CFG.map((cfg, i) => {
      const host = hostOf(originals[i]);
      host.replaceChildren();
      const isl = new Island(host, optsFor(cfg));
      const still = freeze(isl.el);
      isl.destroy();
      return still;
    });
    originals.forEach(fill);
  };
  snapshot();

  const lives = new Map(); // frame → { isl, cfg, tok }
  let active = null, tok = 0;
  cleanups.push(() => {
    lives.forEach((e) => e.isl.destroy()); lives.clear();
    originals.forEach((f) => { hostOf(f).replaceChildren(); f.classList.remove("is-on", "is-live", "is-play"); });
    root.style.removeProperty("--fu");
  });

  // Roving focus: one tab stop for the whole strip; arrows move between frames (both modes).
  const onKey = (ev) => {
    const f = ev.target.closest?.(".lf"), i = originals.indexOf(f), n = originals.length;
    if (i < 0) return;
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[ev.key];
    if (to == null) return;
    ev.preventDefault();
    const next = originals[(to + n) % n];
    f.tabIndex = -1; next.tabIndex = 0;
    next.focus({ preventScroll: !reduced });
  };
  trackA.addEventListener("keydown", onKey);
  cleanups.push(() => trackA.removeEventListener("keydown", onKey));

  lib.revealLines(root.querySelector("#loop-title"));

  if (reduced) return () => cleanups.reverse().forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });

  // ------------------------------------------------------------ The pause toggle (WCAG 2.2.2), remembered per viewer
  let paused = lib.isPaused();   // page-wide (lib/loop.js): this toggle pauses every loop on the page
  const onPause = new Set();

  // ------------------------------------------------------------ Strip A: tape + play on hover / focus / centre
  const mA = tape(ctx, trackA, { speed: 45, dir: 1, hoverEl: bandA, onClone: fill });
  cleanups.push(() => mA.kill());
  onPause.add((p, instant) => mA.user(!p, instant));
  const allFrames = () => trackA.children;

  const home = (f) => {
    const e = lives.get(f);
    f.classList.remove("is-live", "is-play");
    if (active === f) active = null;
    if (!e) return;
    const my = (e.tok = ++tok);
    go(e.isl, { state: e.cfg.state, display: e.cfg.display || "percent" }).then(() => {
      if (!alive || e.tok !== my) return;         // replayed meanwhile, or torn down
      e.isl.destroy(); lives.delete(f); fill(f);
    });
  };
  const play = (f) => {
    if (!Island || active === f) return;
    if (active) home(active);
    active = f;
    let e = lives.get(f);
    if (!e) {
      const cfg = CFG[+f.dataset.i];
      hostOf(f).replaceChildren();
      lives.set(f, (e = { isl: new Island(hostOf(f), optsFor(cfg)), cfg, tok: 0 }));
    }
    const my = (e.tok = ++tok);
    f.classList.add("is-play");
    go(e.isl, e.cfg.to)
      .then(() => new Promise((r) => setTimeout(r, HOLD)))
      .then(() => { if (alive && e.tok === my) home(f); });
  };

  let hovered = null, inside = false;
  const setHover = (f) => {
    if (f === hovered) return;
    hovered?.classList.remove("is-on");
    hovered = f;
    if (f) { f.classList.add("is-on"); play(f); }
  };
  // Clones are inert (no hit-testing), so find the frame under the pointer by geometry: one path for all.
  const frameAt = (x, y) => [...allFrames()].find((f) => {
    const r = f.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }) || null;
  let mvRaf = 0, mvX = 0, mvY = 0;
  const onMove = (ev) => {
    if (ev.pointerType === "touch") return;
    inside = true; mvX = ev.clientX; mvY = ev.clientY;
    mvRaf ||= requestAnimationFrame(() => { mvRaf = 0; if (inside) setHover(frameAt(mvX, mvY)); });
  };
  const onLeave = (ev) => { if (ev.pointerType !== "touch") { inside = false; setHover(null); } };
  let tapT = 0, lastType = "mouse";
  const onDown = (ev) => { lastType = ev.pointerType; };
  const onClick = (ev) => {
    if (lastType !== "touch") return;
    const f = frameAt(ev.clientX, ev.clientY);
    if (!f) return;
    mA.hold("tap", true); setHover(f);
    clearTimeout(tapT);
    tapT = setTimeout(() => { setHover(null); mA.hold("tap", false); }, 2600);
  };
  // Keyboard: focus plays the frame and glides it to the centre (the strip is moving, it may be off the edge).
  const onFocusIn = (ev) => {
    const f = ev.target.closest(".lf");
    if (!f || !f.matches(":focus-visible")) return;
    setHover(f); mA.center(f);
  };
  const onFocusOut = (ev) => {
    if (bandA.contains(ev.relatedTarget)) return;
    if (!inside) setHover(null);
    mA.release();
  };
  const LA = { pointermove: onMove, pointerleave: onLeave, pointerdown: onDown, click: onClick, focusin: onFocusIn, focusout: onFocusOut };
  for (const t in LA) bandA.addEventListener(t, LA[t], t === "pointermove" || t === "pointerdown" ? { passive: true } : undefined);
  cleanups.push(() => {
    clearTimeout(tapT); cancelAnimationFrame(mvRaf);
    for (const t in LA) bandA.removeEventListener(t, LA[t]);
  });

  // Idle: whichever frame drifts through the centre comes alive once, so the tape demos itself.
  let last = null;
  cleanups.push(lib.visibleInterval(bandA, () => {
    if (paused || inside || hovered || active || bandA.contains(document.activeElement)) return;
    const mid = innerWidth / 2;
    let best = null, bd = Infinity;
    for (const f of allFrames()) {
      const r = f.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bd) { bd = d; best = f; }
    }
    if (!best || best === last || bd > best.offsetWidth * 0.35) return;
    last = best;
    best.classList.add("is-live");
    play(best);
  }, 700));

  // Re-render the stills when a resize changes the frame scale (the tablet range is sized in vw).
  let rsT = 0;
  const onResize = () => {
    clearTimeout(rsT);
    rsT = setTimeout(() => {
      const before = scale;
      scale = Math.min(1, Math.floor(((originals[0].offsetWidth - 40) / 560) * 100) / 100);
      if (scale === before) return;
      lives.forEach((e) => e.isl.destroy()); lives.clear(); active = null; hovered = null;
      [...allFrames()].forEach((f) => f.classList.remove("is-on", "is-live", "is-play"));
      snapshot(); mA.clones.forEach(fill);
    }, 200);
  };
  addEventListener("resize", onResize);
  cleanups.push(() => { clearTimeout(rsT); removeEventListener("resize", onResize); });

  // ------------------------------------------------------------ Strip B: display marquee + live numbers
  const mB = tape(ctx, trackB, { speed: 70, dir: -1, hoverEl: bandB });
  cleanups.push(() => mB.kill());
  onPause.add((p, instant) => mB.user(!p, instant));

  const rollers = new WeakMap();
  const rollerOf = (el) => {
    let r = rollers.get(el);
    if (!r) rollers.set(el, (r = new lib.Roller(el, { value: +el.dataset.v })));
    return r;
  };
  const rand = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
  cleanups.push(lib.visibleInterval(bandB, () => {
    if (paused || active) return;
    const mid = innerWidth / 2;
    let best = null, bd = Infinity;
    trackB.querySelectorAll("[data-roll]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right < 0 || r.left > innerWidth) return;
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bd) { bd = d; best = el; }
    });
    if (!best) return;
    const kind = best.dataset.roll, rl = rollerOf(best);
    let v = rand(RANGES[kind]);
    for (let i = 0; i < 4 && Math.abs(v - rl.value) < 4; i++) v = rand(RANGES[kind]);
    const tone = v > 85 ? "red" : kind === "hot" ? "teal" : kind;
    best.parentElement.dataset.tone = tone;
    const sep = best.parentElement.nextElementSibling;
    if (sep?.classList.contains("lB__sep")) { sep.dataset.tone = tone; sep.style.setProperty("--fill", `${v}%`); }
    rl.set(v);
  }, 2000));

  // ------------------------------------------------------------ Entry scissor + counter-parallax, scrubbed
  // The strips arrive as an open X, A slicing up across the running head (about 40px over its rule on desktop),
  // and close onto their resting tilt by the time they are read (expo.out: ~85% closed at "top 30%"), then keep
  // drifting shut across the section. Lenis already smooths the scroll, so no second smoothing on top of it.
  const parA = root.querySelector(".lA__par"), parB = root.querySelector(".lB__par");
  const strips = root.querySelector(".loop__strips");
  const scrub = ctx.lenis ? true : 0.4;
  gsap.timeline({ scrollTrigger: { trigger: strips, start: "top bottom", endTrigger: root, end: "bottom top", scrub }, defaults: { ease: "expo.out" } })
    .fromTo(bandA, { rotation: -10.5, xPercent: 4 }, { rotation: -2.4, xPercent: 0 }, 0)
    .fromTo(bandB, { rotation: 9, xPercent: -4 }, { rotation: 1.4, xPercent: 0 }, 0);
  gsap.timeline({ scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub }, defaults: { ease: "none" } })
    .fromTo(parA, { xPercent: 0 }, { xPercent: -6 }, 0)
    .fromTo(parB, { xPercent: 0 }, { xPercent: 6 }, 0);

  // ------------------------------------------------------------ The icon: a glass object — entrance, bob, tilt, sheen, refresh
  const icon = root.querySelector(".loop__icon");
  const stage = icon.querySelector(".li__stage"), tilt = icon.querySelector(".li__tilt");
  const cap = icon.querySelector(".li__cap"), meters = [...icon.querySelectorAll(".li__m")];
  const spec = root.querySelector("#loop-spec");
  const at = (vals) => (i) => `${vals[i]}%`;

  const inView = { trigger: icon, start: "top 82%", once: true };
  gsap.from(stage, { scale: 0.82, rotation: -8, autoAlpha: 0, ...lib.SPR.open, scrollTrigger: inView });
  gsap.fromTo(meters, { "--fill": "0%" }, { "--fill": at(ICON), duration: 1.2, ease: "power3.out", stagger: 0.1, delay: 0.25, scrollTrigger: inView });
  ScrollTrigger.create({ ...inView, onEnter: () => lib.scramble(cap, cap.textContent, { chars: "0123456789·ABCDEFGHIKLMNOQRSTUVW" }) });

  // The bob, its contact shadow and the touch glint are CSS keyframes (compositor only; see loop.css).

  // Hover = the app's "sooner when you hover": the meters drain and spring to fresh readings, then settle back.
  const fillSpring = lib.spring({ duration: 0.7, bounce: 0.34 });
  let back = 0;
  const refresh = () => {
    clearTimeout(back);
    const vals = REFRESH.map(([a, b]) => a + Math.round(Math.random() * (b - a)));
    gsap.timeline({ defaults: { overwrite: "auto" } })
      .to(meters, { "--fill": "0%", duration: 0.26, ease: "power2.in", stagger: 0.05 })
      .to(meters, { "--fill": at(vals), ...fillSpring, stagger: 0.07 });
  };
  const settle = () => gsap.to(meters, { "--fill": at(ICON), ...fillSpring, stagger: 0.05, overwrite: "auto" });
  const onEnter = (ev) => { if (ev.pointerType !== "touch") refresh(); };
  const onExit = (ev) => { if (ev.pointerType !== "touch") settle(); };
  const onTap = (ev) => { if (ev.pointerType === "touch") { refresh(); clearTimeout(back); back = setTimeout(settle, 2400); } };
  stage.addEventListener("pointerenter", onEnter);
  stage.addEventListener("pointerleave", onExit);
  stage.addEventListener("pointerup", onTap);
  cleanups.push(() => {
    clearTimeout(back); gsap.killTweensOf(meters);
    stage.removeEventListener("pointerenter", onEnter); stage.removeEventListener("pointerleave", onExit); stage.removeEventListener("pointerup", onTap);
  });

  // Tilt toward the pointer, with the key light on the body and a specular streak sliding across the glass.
  if (lib.finePointer()) {
    const rx = gsap.quickTo(tilt, "rotationX", { duration: 0.6, ease: "power3" });
    const ry = gsap.quickTo(tilt, "rotationY", { duration: 0.6, ease: "power3" });
    const L = { sx: -0.3, cx: 0.3, cy: 0.18 };
    const paint = () => {
      tilt.style.setProperty("--sx", L.sx.toFixed(3));
      spec.setAttribute("cx", L.cx.toFixed(3)); spec.setAttribute("cy", L.cy.toFixed(3));
    };
    const q = ["sx", "cx", "cy"].map((k) => gsap.quickTo(L, k, { duration: 0.6, ease: "power3", onUpdate: paint }));
    const clamp = gsap.utils.clamp(-1, 1);
    const onPtr = (ev) => {
      const r = stage.getBoundingClientRect();
      const nx = clamp((ev.clientX - (r.left + r.width / 2)) / 400);
      const ny = clamp((ev.clientY - (r.top + r.height / 2)) / 400);
      ry(nx * 8); rx(-ny * 8);
      q[0](0.5 + nx * 0.75); q[1](0.5 + nx * 0.32); q[2](0.3 + ny * 0.26);
    };
    cleanups.push(lib.whileVisible(icon,
      () => addEventListener("pointermove", onPtr, { passive: true }),
      () => removeEventListener("pointermove", onPtr), "25%"));
    cleanups.push(() => tilt.style.removeProperty("--sx"));
  }

  // ------------------------------------------------------------ Pause wiring (the button is a [data-pause-toggle]:
  // lib/loop.js flips html[data-paused] and fires cm:pause, here and from the footer's twin)
  const applyPause = (instant = false) => {
    root.classList.toggle("is-paused", paused);
    onPause.forEach((fn) => fn(paused, instant));
  };
  const onPause_ = (e) => { paused = e.detail; applyPause(); };
  document.addEventListener("cm:pause", onPause_);
  applyPause(true);
  cleanups.push(() => { document.removeEventListener("cm:pause", onPause_); root.classList.remove("is-paused"); });

  return () => cleanups.reverse().forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
}
