// §01 stage — hero + dolly-in tour (SPEC §9.1, review round 1). The spine of the page.
// Hero: warm paper, ink type and one black object — the menu bar with the live island hanging from it
// (attract loop until touched) — over a liquid WALL that fills to the island's session %.
// Scroll: one pinned shot. The camera dollies into the notch (the hero flies out past the lens, the
// menu bar thickens) and stages each app state its own way: wing close-up with ink notes → peek with a
// ghost cursor → pinned as an annotated spec sheet → the session bar magnified across the screen →
// a red flush past 85% → real-size banners as it pulls back. Everything in the tour is a pure function
// of scroll progress (frame(p)), so scrubbing either way, resizing and jumping all land exactly.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;

const BEATS = [0.10, 0.24, 0.40, 0.54, 0.70, 0.84];   // beat 01…06 starts (b0 = 0, the dolly-in)
const RS = 4.5;                                        // island render scale (px/pt); the camera only scales down
const SITE = "https://claudemeter.vercel.app/";
// Pinned-pane geometry in pt from the island's top centre (island.css: 39pt insets, 84/44/flex/38/96 columns,
// 12pt gaps, 32pt header, 14pt rows 8pt apart, 16pt note gap, 16pt bottom). Pure numbers: no DOM reads.
const PIN_H = 147, PEEK_H = 166, BAR = { x: -89, w: 172 };
const MARKS = [
  { kind: "rect", x: -149, y: 40, w: 52, h: 66, lx: -123 },   // the sparkline column
  { kind: "circle", x: 0, y: 51, r: 9, lx: 0 },               // the projected tick (x set from `projected`)
  { kind: "rect", x: 139, y: 40, w: 106, h: 44, lx: 192 },    // the reset column
];

export default function init(root, ctx) {
  const { gsap, ScrollTrigger, reduced, mobile, Island, lib, intro } = ctx;
  const $ = (s) => root.querySelector(s), $$ = (s) => [...root.querySelectorAll(s)];
  const display = $(".display"), rig = $(".stage-rig"), cam = $(".stage-cam"), host = $(".island-host"), bezel = $(".bezel");
  const hero = $(".hero"), wall = $(".wall"), liq = $(".wall__liq"), noteIn = $(".note__in"), cue = $(".cue"), flush = $(".flush");
  const fc = $(".fc"), fcBar = $(".fc__bar"), fcRs = $(".fc__rs"), fcTxt = $(".fc__txt");
  const annos = $$(".anno"), specG = $(".spec__g"), specLabels = $$(".spec-labels p");
  const ghost = $(".ghost"), arrow = $(".ghost__arrow"), ring = $(".ghost__ring"), ripple = $(".ghost__ripple");
  const send = $(".send"), cap5 = $$(".cap__t")[4];
  const disposers = [], statics = [], banners = [null, null];
  let dead = false, locked = false, touched = false, menuBar = false, attract = null, s0 = null, lastKey = "";
  let W = innerWidth, H = innerHeight, heroS = 2, bandH = 40, barW = 1000, marks = [];
  let onRefreshInit = null, onRefresh = null, scene = null;
  let heroVisible = false, heroInFrame = true, breathe = null;   // the hero's ambient loops run only while both hold
  const E = gsap.parseEase("edit"), IO = gsap.parseEase("power2.inOut"), OUT = gsap.parseEase("power2.out"), IN2 = gsap.parseEase("power2.in"), IN3 = gsap.parseEase("power3.in"), LIN = (t) => t;
  /** eased 0..1 progress of p through the window [a, b] */
  const k = (p, a, b, e = E) => e(clamp((p - a) / (b - a), 0, 1));
  const S = { col: 3, peek: 1.4, pin: 1.3 };
  const hcam = { s: 2 };   // hero camera: pulls back while the island is open, so peek never swallows the headline

  /** write a style only when it changed (frame() runs on every scrub tick) */
  const put = (el, prop, v) => {
    const c = el.__stc || (el.__stc = {});
    if (c[prop] === v) return;
    c[prop] = v;
    prop.startsWith("--") ? el.style.setProperty(prop, v) : (el.style[prop] = v);
  };

  function measure() {
    W = display.clientWidth || innerWidth;
    H = innerHeight;
    bandH = mobile ? 44 : 40;
    heroS = lib.heroScale();                                  // shared with main.js → the intro builds the notch at this size
    root.style.setProperty("--hs", heroS);
    // Dolly-in: the panel is the art. Desktop never shows it below 1:1; phones fit it edge to edge
    // (only the flared corners and a little of the black padding leave the frame).
    if (mobile) {
      S.col = Math.min(RS, (W - 24) / 277);
      S.peek = Math.min(1, W / 462);
      S.pin = Math.min(1, W / 522);
    } else {
      S.col = Math.min(RS, (0.86 * W) / 277);
      S.peek = Math.min(RS, (0.86 * W) / 500, (0.5 * H) / PEEK_H);
      S.pin = Math.min(RS, (0.86 * W) / 560, (0.45 * H) / PIN_H);
    }
    barW = fcBar.offsetWidth || W - 48;
  }
  const heroTarget = (state) => state === "peek" ? (mobile ? (W - 24) / 500 : Math.min(heroS, 1.2, (0.5 * W) / 500))
    : state === "pinned" ? (mobile ? (W - 24) / 560 : Math.min(heroS, 1.15, (0.5 * W) / 560)) : heroS;
  measure();
  hcam.s = heroS;

  // ---------------------------------------------------------------- the island + chips
  const live = !reduced;
  const counting = live && !intro.skipped;       // the intro counts the wings up from 00
  let isl = null;
  if (Island) {
    const data = lib.demo();
    if (counting) { data.session.pct = 0; data.weekly.pct = 0; data.models[0].pct = 0.4; }
    host.replaceChildren();                       // the first-paint placeholder
    isl = new Island(host, { scale: RS, bezel: true, live: false, data });
    cam.style.transform = `scale(${heroS / RS})`;
  }
  const rollers = Object.fromEntries($$(".chip__n").map((el) => {
    const v = { session: 46, weekly: 38, opus: 62 }[el.dataset.k];
    return [el.dataset.k, { r: new lib.Roller(el, { value: counting ? 0 : v, format: lib.fmtPct }), v }];
  }));
  const sBase = () => s0 ?? Math.round(isl ? isl.data.session.pct : 46);
  const status = () => menuBar && isl && lib.statusItem(true, isl.data, { display: isl.opts.display });

  const detachMenu = isl ? lib.attachMenu(isl, {
    onNotifications: (on) => on && lib.toast("Notifications on: at 50, 80 and 95% of a session, 80 and 95% of weekly and model limits."),
    onMenuBar: (on) => { menuBar = on; lib.statusItem(on, isl.data, { display: isl.opts.display }); },
    onDisplay: (d) => { isl.setOption("display", d); status(); },
  }) : () => {};

  const setWall = (pct, dur = 1.2) => {
    wall.dataset.tone = pct > 85 ? "red" : pct > 70 ? "amber" : "teal";
    if (reduced) wall.style.setProperty("--lvl", pct / 100);
    else gsap.to(wall, { "--lvl": pct / 100, duration: dur, ease: "power2.inOut", overwrite: "auto" });
  };

  // No Mac in hand: hand the link to one (share sheet, or the clipboard). No server, no tracking.
  const onSend = async () => {
    try {
      if (navigator.share) return await navigator.share({ title: "Claude Meter", text: "Claude usage limits in your MacBook notch. Free for macOS.", url: SITE });
    } catch (e) { if (e?.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(SITE); lib.toast("Link copied. Open it on your Mac to download."); }
    catch { lib.toast("Open claudemeter.vercel.app on your Mac to download."); }
  };
  if (!lib.finePointer()) { send.hidden = false; send.addEventListener("click", onSend); }

  // First touch of the island: the attract loop stops and the note leaves, for good.
  const onTouch = () => {
    if (touched) return;
    touched = true;
    stopAttract();
    reduced ? gsap.set(noteIn, { autoAlpha: 0 }) : gsap.to(noteIn, { autoAlpha: 0, y: -8, duration: 0.5, ease: "power2.in", overwrite: true });
  };
  const camRefresh = () => (scene ? frame(scene.tl.progress()) : put(cam, "transform", `scale(${(hcam.s / RS).toFixed(4)})`));
  const camTo = (target, open) => {
    if (reduced) { hcam.s = target; return camRefresh(); }
    lib.untracked(() => gsap.to(hcam, { s: target, ...(open ? lib.SPR.open : lib.SPR.close), overwrite: true, onUpdate: camRefresh }));
  };
  if (isl) {
    // A scrub jump emits several states in one render; settle on the final one afterwards.
    let camQueued = false;
    isl.on("state", () => {
      if (camQueued) return;
      camQueued = true;
      queueMicrotask(() => {
        camQueued = false;
        if (dead) return;
        const open = isl.state === "peek" || isl.state === "pinned";
        root.classList.toggle("is-open", open);
        if (!locked) camTo(heroTarget(isl.state), open);
      });
    });
    ["pointerenter", "focusin", "touchstart"].forEach((t) => isl.el.addEventListener(t, onTouch, { passive: true }));
    isl.on("interact", onTouch);
  }

  onRefreshInit = () => {
    measure();
    if (!locked) hcam.s = heroTarget(isl ? isl.state : "collapsed");
    buildMarks();
    if (!scene) camRefresh();
  };
  ScrollTrigger.addEventListener("refreshInit", onRefreshInit);

  // ---------------------------------------------------------------- reduced motion: the static composition
  scene = lib.pinScene(root, { length: "300%", mobileLength: "240%", scrub: 0.8, build: buildTour });
  if (!scene) {
    staticBeats();
    return cleanup;
  }

  // ---------------------------------------------------------------- live hero
  root.classList.add("is-live");
  measure();
  buildMarks();
  // The headline, WALL (and its fill), lede and CTA rise in with CSS keyframes from the first paint
  // (stage.css "hero reveal"), so the hero never waits for this module; JS only adds what needs it.
  gsap.set([noteIn, cue.firstElementChild], { autoAlpha: 0 });
  wall.style.setProperty("--wb", 1);

  const reveal = gsap.timeline({ paused: true, defaults: { ease: "edit" } })
    .call(() => Object.values(rollers).forEach(({ r, v }, i) => gsap.delayedCall(i * 0.12, () => r.set(v))), null, 0.7)
    .to(cue.firstElementChild, { autoAlpha: 1, duration: 0.6, ease: "power2.out" }, 1.3);
  reveal.eventCallback("onComplete", () => { if (!dead) disposers.push(lib.squash(wall, { split: false, radius: 260 })); });
  intro.reveal.then(() => !dead && reveal.play());

  if (counting && isl) intro.wings.then(() => !dead && ctx.add(() => {
    const c = { t: 0 };
    gsap.to(c, { t: 1, duration: 0.6, ease: "power2.out", onUpdate() {
      if (locked) return;
      const d = isl.data;
      d.session.pct = Math.round(46 * c.t); d.weekly.pct = Math.round(38 * c.t); d.models[0].pct = Math.max(0.4, Math.round(62 * c.t));
      isl.render();
    } });
  }));

  // Ambient loops: all gated by visibility (and never under reduced motion). The WALL surface is a
  // composited transform loop; it also stops once the hero has flown out (frame() → heroLoops).
  const heroLoops = () => {
    const on = heroVisible && heroInFrame;
    wall.classList.toggle("is-wave", on);
    cue.classList.toggle("is-on", on);
    if (breathe) on ? breathe.play() : breathe.pause();
  };
  breathe = mobile ? gsap.to(wall, { "--wb": 0.8, duration: 2.5, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true }) : null;
  disposers.push(lib.whileVisible(display, () => { heroVisible = true; heroLoops(); }, () => { heroVisible = false; heroLoops(); }));

  // The liquid sloshes against a fast pointer (a spring back to level; fine pointers only).
  if (lib.finePointer()) {
    const tilt = gsap.quickTo(liq, "rotation", { duration: 1.2, ease: "elastic.out(1,0.32)" });
    let lx = 0, lt = 0, idle = 0;
    const onWallMove = (e) => {
      const dt = e.timeStamp - lt;
      if (lt && dt > 0 && dt < 120) tilt(clamp(((e.clientX - lx) / dt) * -1.6, -3.5, 3.5));
      lx = e.clientX; lt = e.timeStamp;
      clearTimeout(idle);
      idle = setTimeout(() => tilt(0), 140);
    };
    wall.addEventListener("pointermove", onWallMove, { passive: true });
    disposers.push(() => { clearTimeout(idle); wall.removeEventListener("pointermove", onWallMove); });
  }

  intro.done.then(() => !dead && ctx.add(() => {
    // the note draws itself, then nudges toward the island every 5s until the island is touched
    if (!touched) {
      const ink = lib.scribble(noteIn.querySelector("svg"), { trigger: false, duration: 0.8 });
      gsap.timeline({ delay: 1.6 }).to(noteIn, { autoAlpha: 1, duration: 0.3 }).add(() => ink && ink.play(), 0);
      const nudge = () => !touched && !locked && gsap.timeline()
        .to(noteIn, { x: -3, y: -2, duration: 0.16, ease: "power2.out" })
        .to(noteIn, { x: 0, y: 0, ...lib.SPR.play });
      disposers.push(lib.visibleInterval(display, nudge, 5000));
    }
    startAttract();
  }));

  // Tabbing into the hero mid-tour brings the hero back instead of focusing something invisible.
  const onHeroFocus = () => { if (locked) lib.scrollTo(root, { progress: 0 }); };
  hero.addEventListener("focusin", onHeroFocus);
  disposers.push(() => hero.removeEventListener("focusin", onHeroFocus));

  // ---------------------------------------------------------------- attract loop
  function startAttract() {
    if (!isl || touched || locked || attract) return;
    const peek = () => !locked && !touched && isl.state === "collapsed" && isl.setState("peek");
    const shut = () => !locked && !touched && isl.state === "peek" && isl.setState("collapsed");
    const cycle = gsap.timeline({ repeat: -1 }).call(peek, null, 5).call(shut, null, 8);
    const bumps = gsap.timeline({ repeat: 5 }).call(bump, null, 7);
    attract = gsap.timeline({ paused: true }).call(peek, null, 2).call(shut, null, 4.6).add(cycle, 4.6).add(bumps, 0);
    attract.vis = lib.whileVisible(display, () => attract && attract.resume(), () => attract && attract.pause());
  }
  function stopAttract() {
    if (!attract) return;
    attract.vis();
    attract.kill();
    attract = null;
  }
  function bump() {
    if (locked || !isl) return;
    const v = Math.round(isl.data.session.pct) + 1;
    if (v > 52) return;
    isl.update({ session: { pct: v } });
    rollers.session?.r.set(v);
    setWall(v);
    status();
  }

  // ---------------------------------------------------------------- the rig follows the display off-screen after the pin
  const st = scene.st;
  const follow = (self) => {
    put(rig, "transform", `translate3d(0,${(-self.progress * H).toFixed(1)}px,0)`);
    if (self.progress >= 1) park();
    put(rig, "visibility", self.progress >= 1 ? "hidden" : "");
  };
  ScrollTrigger.create({ trigger: $(".pin"), start: () => st.end, end: () => st.end + H, onUpdate: follow, onRefresh: follow });

  onRefresh = () => frame(scene.tl.progress(), true);
  ScrollTrigger.addEventListener("refresh", onRefresh);
  frame(0, true);
  return cleanup;

  // ================================================================ the tour
  function buildTour(tl) {
    BEATS.forEach((b, i) => tl.addLabel(`b${i + 1}`, b));
    tl.addLabel("b0", 0);

    // Captions: opacity/transform only, so every caption stays in the accessibility tree in DOM order.
    $$(".cap").forEach((cap, i) => {
      const parts = [...cap.querySelectorAll(".cap__idx,.cap__t,.cap__b")];
      const a = BEATS[i], b = BEATS[i + 1];
      gsap.set(parts, { opacity: 0, y: 28 });
      tl.fromTo(parts, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.03, stagger: 0.007, ease: "power3.out", immediateRender: false }, a + 0.008);
      if (b) tl.fromTo(parts, { opacity: 1, y: 0 }, { opacity: 0, y: -22, duration: 0.022, stagger: 0.004, ease: "power2.in", immediateRender: false }, b - 0.028);
    });

    // b1: the ink notes draw themselves toward the wings
    annos.forEach((a, i) => {
      const paths = a.querySelectorAll("path");
      gsap.set(paths, { drawSVG: "0%" });
      tl.fromTo(paths, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.03, stagger: 0.012, ease: "power2.inOut", immediateRender: false }, 0.112 + i * 0.01);
    });

    if (isl) {
      const mode = (a, b, at, dur) => tl.to(isl.modeTimeline(a, b), { progress: 1, duration: dur, ease: "none" }, at);
      mode("collapsed", "peek", 0.29, 0.05);
      mode("peek", "pinned", 0.42, 0.05);
      mode("pinned", "collapsed", 0.85, 0.03);
    }
    tl.eventCallback("onUpdate", () => frame(tl.progress()));
  }

  /** b3 markup: rects / circle around the pinned table's parts, leader lines down to the labels. */
  function buildMarks() {
    specG.replaceChildren();
    marks = [];
    if (mobile) return;
    const ns = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs) => { const el = document.createElementNS(ns, tag); for (const a in attrs) el.setAttribute(a, attrs[a]); el.setAttribute("pathLength", "1"); specG.append(el); return el; };
    MARKS.forEach((m) => {
      const shape = m.kind === "rect" ? mk("rect", { rx: 6 }) : mk("circle", {});
      const line = mk("line", {});
      marks.push({ m, shape, line });
    });
  }
  function placeMarks(s, cx, prj) {
    const top = PIN_H * s + 30;                                 // labels hang 30px under the island
    marks.forEach(({ m, shape, line }, i) => {
      const mx = m.kind === "circle" ? BAR.x + (BAR.w * clamp(prj, 0, 100)) / 100 : m.x;
      if (m.kind === "rect") {
        shape.setAttribute("x", (cx + mx * s).toFixed(1)); shape.setAttribute("y", (m.y * s).toFixed(1));
        shape.setAttribute("width", (m.w * s).toFixed(1)); shape.setAttribute("height", (m.h * s).toFixed(1));
      } else {
        shape.setAttribute("cx", (cx + mx * s).toFixed(1)); shape.setAttribute("cy", (m.y * s).toFixed(1)); shape.setAttribute("r", (m.r * s).toFixed(1));
      }
      const lx = cx + (m.kind === "circle" ? mx : m.lx) * s;
      const y1 = (m.kind === "circle" ? m.y + m.r : m.y + m.h) * s;
      line.setAttribute("x1", lx.toFixed(1)); line.setAttribute("x2", lx.toFixed(1));
      line.setAttribute("y1", y1.toFixed(1)); line.setAttribute("y2", (top - 8).toFixed(1));
      put(specLabels[i], "transform", `translate3d(${lx.toFixed(1)}px,${top.toFixed(1)}px,0)`);
    });
  }

  function park() {
    // the island is about to leave the tab order or the screen: never strand focus on <body>
    const a = document.activeElement;
    if (a && rig.contains(a)) root.focus({ preventScroll: true });
  }

  function setLock(on, p) {
    locked = on;
    root.classList.toggle("is-tour", on);
    if (!isl) return;
    if (on) {
      s0 ??= Math.round(isl.data.session.pct);
      stopAttract();
      lib.closeMenu();
      park();
      if (isl.state === "hidden") isl.relaunch();
      else if (isl.state !== "collapsed" && (p < 0.28 || p > 0.88)) isl.setState("collapsed");
      if (hcam.s !== heroS) camTo(heroS, false);
    } else {
      const want = isl.menuState?.display || "percent";
      if (isl.opts.display !== want) isl.setOption("display", want);
    }
    isl.lock(on);
  }

  function tour(p) {
    const base = sBase();
    const r = k(p, 0.33, 0.38, OUT), filling = p >= 0.302 && p < 0.38;     // rings fill from 0 once the peek pane lands
    let s = filling ? base * r : base, w = filling ? 38 * r : 38, o = filling ? 62 * r : 62, prj = filling ? 71 * r : 71;
    s = mix(s, 71, k(p, 0.55, 0.62, IO)); s = mix(s, 80, k(p, 0.62, 0.68, IO));
    prj = mix(prj, 120, k(p, 0.55, 0.68, IO));                               // walks right, clamps at the end (derive caps at 100)
    const ex = 4320 - 1200 * k(p, 0.55, 0.68, IN3);                          // 72m → 52m; crosses the hour at ≈ .66 → red
    // resets in 2h 13m → ticks down through the peek → 1h 5m by the forecast (the banner's line)
    const rs = 7980 - 180 * k(p, 0.29, 0.40, LIN) - 3900 * k(p, 0.55, 0.68, LIN);
    w = mix(w, 89, k(p, 0.70, 0.765, LIN));                                  // crosses 85 at ≈ .76
    o = mix(o, 100, k(p, 0.72, 0.80, IO));
    const tt = p < 0.302 || p >= 0.38 ? 1 : k(p, 0.34, 0.38, LIN);           // peek text: blank, then fades in
    // Like UsageHistory.projectedPct: the session only "hits the cap" once its projection reaches 100.
    // Until then (beats 01–03) the forecast reads "on track — resets first", matching the tick at 71%.
    const burn = prj >= 100;
    return { s: Math.round(s), w: Math.round(w), o: Math.round(o), prj: Math.round(prj), ex: Math.round(ex / 60) * 60, rs: Math.round(rs / 60) * 60, tt, burn, sr: s, pr: prj };
  }

  function applyData(d) {
    const key = `${d.s}|${d.w}|${d.o}|${d.prj}|${d.ex}|${d.rs}|${d.burn}`;
    if (key === lastKey) return;
    lastKey = key;
    const ses = isl.data.session, wk = isl.data.weekly, m = isl.data.models[0];
    ses.pct = d.s; ses.projected = d.prj; ses.resetIn = d.rs; wk.pct = d.w; m.pct = d.o;
    ses.forecast = d.burn ? { exhaustsIn: d.ex } : { clears: true };
    isl.render();
    status();
  }

  function banner(i, on, title, body) {
    if (on && !banners[i]) banners[i] = lib.showBanner(display, { title, body, timeout: 0 });
    else if (!on && banners[i]) { banners[i].dismiss(); banners[i] = null; }
  }

  function frame(p, force = false) {
    if (dead) return;
    if (force) lastKey = "";
    const lockNow = p > 0.02 && p < 0.98;
    if (lockNow !== locked) setLock(lockNow, p);

    // camera: dolly in → close-up on the wings → pull back for the hover → pin → back to the bezel
    let s = hcam.s;
    s = mix(s, S.col, k(p, 0, 0.10)); s = mix(s, S.peek, k(p, 0.24, 0.285)); s = mix(s, S.pin, k(p, 0.42, 0.47)); s = mix(s, hcam.s, k(p, 0.85, 0.90));
    const env = k(p, 0.70, 0.73, IO) * (1 - k(p, 0.81, 0.84, IO));         // beat 05: scrubbed handheld drift, no shake
    const dx = 6 * Math.sin(p * 97) * env, dy = 4 * Math.sin(p * 61 + 1.3) * env;
    put(cam, "transform", `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) scale(${(s / RS).toFixed(4)})`);
    const cx = W / 2 + dx;

    // the menu bar thickens with the dolly (it covers the band's items while the camera is in close)
    const bk = Math.max(1, (20 * s) / bandH);
    put(bezel, "--bk", bk.toFixed(4));
    put(bezel, "opacity", (k(p, 0, 0.025, LIN) * (1 - k(p, 0.93, 0.97, LIN))).toFixed(3));

    // b0: the hero flies out past the lens (scaled from the notch), the WALL loop stops once it's gone
    const hz = k(p, 0, 0.075, IN2);
    put(hero, "transform", hz ? `scale(${(1 + 0.9 * hz).toFixed(4)})` : "");
    put(hero, "opacity", (1 - k(p, 0.01, 0.07, LIN)).toFixed(3));
    put(hero, "pointerEvents", p > 0.03 ? "none" : "");
    put(wall, "--drain", k(p, 0, 0.055, IN2).toFixed(3));                  // the liquid empties into the notch it came from
    const inFrame = p < 0.08;
    if (inFrame !== heroInFrame) { heroInFrame = inFrame; root.classList.contains("is-live") && heroLoops(); }

    const d = tour(p);
    if (isl) {
      applyData(d);
      if (locked) {
        const want = p >= 0.16 && p < 0.21 ? "ticks" : isl.menuState?.display || "percent";
        if (isl.opts.display !== want) isl.setOption("display", want);
      }
    }
    put(host, "--ptx", d.tt.toFixed(3));                                    // peek captions fade in as the rings fill
    put(host, "--spk", k(p, 0.46, 0.49, LIN).toFixed(3));
    put(host, "--spa", k(p, 0.48, 0.50, LIN).toFixed(3));
    put(host, "--bar", k(p, 0.46, 0.50, OUT).toFixed(3));

    // b1: ink notes under the wings (arrow tips just below the island's bottom edge)
    const ao = (k(p, 0.105, 0.12, LIN) * (1 - k(p, 0.225, 0.24, LIN))).toFixed(3);
    annos.forEach((a, i) => {
      const wx = cx + (i ? 1 : -1) * 112.5 * s * (isl && isl.opts.display === "ticks" ? 109.5 / 112.5 : 1);
      put(a, "transform", `translate3d(${wx.toFixed(1)}px,${(32 * s + (mobile ? 8 : 14)).toFixed(1)}px,0)`);
      put(a, "opacity", ao);
    });

    // b3: the pinned table as a spec sheet
    if (marks.length) {
      const drawn = k(p, 0.472, 0.495, LIN), lead = k(p, 0.485, 0.505, LIN), gone = 1 - k(p, 0.525, 0.54, LIN);
      if (p > 0.46 && p < 0.545) placeMarks(s, cx, d.pr);
      put(specG, "opacity", gone.toFixed(3));
      marks.forEach(({ shape, line }, i) => {
        put(shape, "strokeDashoffset", (1 - drawn).toFixed(3)); put(shape, "strokeDasharray", "1");
        put(line, "strokeDashoffset", (1 - lead).toFixed(3)); put(line, "strokeDasharray", "1");
        put(specLabels[i], "opacity", (k(p, 0.495 + i * 0.004, 0.51 + i * 0.004, LIN) * gone).toFixed(3));
      });
    }

    // b4: the session bar, magnified across the screen: fill, the projected tick sweeping, the red cap
    const fo = k(p, 0.545, 0.56, LIN) * (1 - k(p, 0.695, 0.71, LIN));
    put(fc, "opacity", fo.toFixed(3));
    if (fo > 0) {
      put(fc, "transform", `translate3d(0,${(PIN_H * S.pin + (mobile ? 28 : 44)).toFixed(1)}px,0)`);
      put(fc, "--s", clamp(d.sr / 100, 0, 1).toFixed(4));
      put(fc, "--tx", `${((barW * clamp(d.pr, 0, 100)) / 100).toFixed(1)}px`);
      put(fc, "--cap", clamp((d.pr - 100) / 4, 0, 1).toFixed(3));
      const rs = lib.fmtReset(d.rs), txt = `Session ${d.burn ? lib.fmtForecast(d.ex) : lib.CLEARS}`;
      if (fcRs.textContent !== rs) fcRs.textContent = rs;
      if (fcTxt.textContent !== txt) fcTxt.textContent = txt;
      const tone = d.burn ? (d.ex < 3600 ? "red" : "amber") : "";
      if (fc.dataset.tone !== tone) fc.dataset.tone = tone;
    }

    // b5: past 85% the whole screen flushes red and the caption goes bold (the HIT: no shake here)
    const fl = k(p, 0.7605, 0.775, LIN) * (1 - k(p, 0.84, 0.865, LIN));
    put(flush, "opacity", fl.toFixed(3));
    put(cap5, "--cw", Math.round(780 + 140 * fl));

    // ghost cursor: glides onto the notch, dwells (peek), clicks (pin), leaves. Scaled with the camera.
    const gs = clamp(s / 1.6, 1, 1.7).toFixed(3);
    const ax = cx + 100 * s, ay = 20 * s + dy;
    if (!mobile) {
      const g = k(p, 0.24, 0.27);
      put(ghost, "transform", `translate3d(${mix(W * 0.2, ax, g).toFixed(1)}px,${mix(H + 40, ay, g).toFixed(1)}px,0) scale(${gs})`);
      put(ghost, "opacity", (k(p, 0.235, 0.25, LIN) * (1 - k(p, 0.50, 0.52, LIN))).toFixed(3));
      put(ghost, "--dwell", (100 - 100 * k(p, 0.27, 0.29, LIN)).toFixed(1));
      const ro = (k(p, 0.268, 0.275, LIN) * (1 - k(p, 0.30, 0.315, LIN))).toFixed(3);
      put(ring, "opacity", ro);
      put(ghost, "--dwo", ro);
      put(arrow, "transform", `scale(${(1 - 0.1 * (k(p, 0.41, 0.415, LIN) - k(p, 0.415, 0.43, OUT))).toFixed(3)})`);
    } else {
      put(ghost, "transform", `translate3d(${ax.toFixed(1)}px,${ay.toFixed(1)}px,0)`);
      put(ghost, "opacity", p > 0.27 && p < 0.45 ? "1" : "0");
      put(arrow, "opacity", "0"); put(ring, "opacity", "0");
    }
    const tap = mobile ? Math.max(k(p, 0.28, 0.31, OUT) * (p < 0.31 ? 1 : 0), k(p, 0.41, 0.445, OUT) * (p < 0.445 ? 1 : 0)) : k(p, 0.41, 0.445, OUT);
    put(ripple, "transform", `scale(${(0.3 + 1.3 * tap).toFixed(3)})`);
    put(ripple, "opacity", tap > 0 && tap < 1 ? (1 - tap).toFixed(3) : "0");

    // b6: the nudges, at real macOS size (reversible: scrolling back takes them away)
    banner(0, p >= 0.87, "Session at 80%", "80% used · resets in 1h 5m");
    banner(1, p >= 0.93, "Session reset", "Your 5-hour window is back to full.");
  }

  // ================================================================ reduced motion: six static beats
  function staticBeats() {
    if (!Island) return;
    const hot = (all) => {
      const d = lib.demo();
      Object.assign(d.session, { pct: 80, projected: 100, resetIn: 3900, forecast: { exhaustsIn: 52 * 60 } });
      if (all) { d.weekly.pct = 89; d.models[0].pct = 100; }
      return d;
    };
    const cfg = [["collapsed", lib.demo()], ["peek", lib.demo()], ["pinned", lib.demo()], ["pinned", hot(false)], ["pinned", hot(true)], ["collapsed", hot(true)]];
    $$(".cap__isl").forEach((h, i) => {
      const [state, data] = cfg[i];
      const box = document.createElement("div");
      box.className = "cap__box";
      h.append(box);
      const si = new Island(box, { scale: "fit", maxScale: 1.4, state, data, interactive: false, live: false, bezel: true });
      box.style.height = `${si.size(state).h}px`;
      statics.push(si);
      if (i === 5) {
        const bh = document.createElement("div");
        bh.className = "cap__banners";
        h.append(bh);
        lib.showBanner(bh, { title: "Session at 80%", body: "80% used · resets in 1h 5m", static: true });
        lib.showBanner(bh, { title: "Session reset", body: "Your 5-hour window is back to full.", static: true });
      }
    });
  }

  function cleanup() {
    dead = true;
    stopAttract();
    disposers.forEach((fn) => { try { fn(); } catch {} });
    ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
    if (onRefresh) ScrollTrigger.removeEventListener("refresh", onRefresh);
    send.removeEventListener("click", onSend);
    send.hidden = true;
    detachMenu();
    if (menuBar) lib.statusItem(false);
    display.querySelectorAll(".cm-banners").forEach((b) => b.remove());
    isl && isl.destroy();
    statics.forEach((s) => s.destroy());
    $$(".cap__isl").forEach((h) => h.replaceChildren());
    specG.replaceChildren();
    root.classList.remove("is-live", "is-tour", "is-open");
    wall.classList.remove("is-wave");
    cue.classList.remove("is-on");
    [cam, rig, bezel, hero, host, ghost, arrow, ring, ripple, flush, fc, wall, liq, cap5, ...annos, ...specLabels].forEach((el) => { el.removeAttribute("style"); delete el.__stc; });
    delete specG.__stc;
    specG.removeAttribute("style");
  }
}
