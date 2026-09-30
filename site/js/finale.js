// §07 finale — HIT → iris → reset, plus the footer (SPEC §9.7). Owned by the finale builder.
// The wordmark is the page's own session meter: scrubbed 0→100% over pin progress 0–.70, a timed HIT at .72 of the
// real scroll (shake, the page stops → a camera iris closes on the live page into the band lens → in the black the
// session drains 100 → 0 under a beam from the lens → the iris opens out of the lens while the wordmark refills: a
// fresh window, back to full). Then the pay-off: the app's notch sits on a hairline and opens pinned like first
// launch, the download drops out of its panel, and the Windows waitlist hangs from the download as its dashed ghost.
// From the reset on the wordmark shows the window LEFT (solid teal, "back to full"); scrolling spends it, and the
// footer's last pixel row continues the same bar. The band island keeps the used % until you scroll back above REARM.

const CHIP = 48; // px, .fin-head__chip width (fixed so the digits never jitter it)
const FULL_AT = 0.7, HIT_AT = 0.72, REARM = 0.5, FRESH_MAX = 12, BREATH = 6, HALF = 6; // +6% and back every 12s
// The breath b(t) = 6·(1−cos πt/6)/2 in whole percents: [seconds, value] at each step, two breaths (24s).
const STEPS = (() => {
  const up = [...Array(BREATH)].map((_, i) => [(HALF / Math.PI) * Math.acos(1 - (2 * i + 1) / BREATH), i + 1]);
  const one = [...up, ...up.map(([t, v]) => [2 * HALF - t, v - 1]).reverse()];
  return [...one, ...one.map(([t, v]) => [t + 2 * HALF, v])];
})();
const RESET_BANNER = { title: "Session reset", body: "Your 5-hour window is back to full." };
const PANEL_W = 560; // pt: the pinned panel with its flares
const AP = 256, HOLE = 0.6 * AP; // .iris__ap half-size (px) and its hole radius at scale 1 (the gradient's 60% stop)
const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "ArrowUp", "ArrowDown", "Home", "End"]);
let everShown = false; // .after is never re-hidden once shown, even across a breakpoint re-init

const fmtS = (s) => { s = Math.max(1, Math.round(s)); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; };
const zone = (x) => (x > 85 ? "red" : x > 75 ? "amber" : x > 60 ? "lav" : "teal");
const drainZone = (x) => (x > 85 ? "red" : x > 50 ? "amber" : "teal"); // the RESET crossing: red → amber → teal
const CLICKS = [85, 64, 42, 21, 0]; // the drain's rolls after 100

/**
 * @param {HTMLElement} root  the <section id="finale">
 * @param {object} ctx { gsap, ScrollTrigger, SplitText, reduced, mobile, lenis, meter, navIsland, Island, lib, add }
 */
export default function init(root, ctx) {
  const { gsap, ScrollTrigger, SplitText, reduced, mobile, lenis, meter, navIsland, Island, lib } = ctx;
  const $ = (s) => root.querySelector(s);
  const kills = [];

  // Footer (a sibling of <main>): its very last pixel row is the page meter, and after the reset it continues the
  // wordmark's own bar (the window left).
  const rule = document.querySelector(".fin-foot__meter i");
  let ruleX = -1, display = 0, fresh = false, val = -1;
  const paintRule = () => {
    if (!rule) return;
    const x = Math.round((fresh ? val : display) * 10) / 1000;
    if (x !== ruleX) { ruleX = x; rule.style.transform = `scaleX(${x})`; }
  };
  kills.push(meter.subscribe((m) => { display = m.display; paintRule(); }));

  if (reduced) {
    // Static composition: full teal wordmark + caption (CSS default), .after in place, a static banner card.
    root.classList.add("is-static");
    const host = $(".fin-bn");
    lib.showBanner(host, { ...RESET_BANNER, static: true });
    return () => { kills.forEach((k) => k()); host.replaceChildren(); };
  }

  root.classList.add("is-live");
  const meterEl = $(".fin-meter"), mark = $(".fin-mark--o"), markbox = $(".fin-markbox");
  const head = $(".fin-head"), chip = $(".fin-head__chip"), fc = $(".fin-fc"), vals = [...root.querySelectorAll(".fin-v")];
  const clips = [$(".fin-clip"), $(".fin-bar__fill")], fills = [$(".fin-mark--f"), $(".fin-bar__fill > i")];
  const after = $(".after"), h2 = after.querySelector("h2"), dock = $(".fin-dock");
  const cta = $("#finale-cta"), win = $(".fin-win-hang"), ink = $(".fin-oss__ink");
  const fades = [after.querySelector(".fin-oss"), after.querySelector(".req"), after.querySelector(".fin-howto")];
  const bandH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--band-h")) || 40;

  // Layers only while the section is near the screen (the fill is scrubbed there; elsewhere nothing moves).
  kills.push(lib.whileVisible(root, () => root.classList.add("is-near"), () => root.classList.remove("is-near"), "60%"));

  // ---------------------------------------------------------------- the dock: the app, first launch (island.js)
  // Laid out at L px/pt and only ever scaled DOWN by the camera, so its text never lays out below 1x.
  const L = mobile ? 1 : 1.3;
  let isl = null, cam = null, dockInt = -1;
  if (Island && dock) {
    try {
      const data = lib.demo();
      const spark = lib.spark("finale", 100);   // six hours climbing to the cap, then the reset drop
      data.session = { pct: 0, resetIn: 5 * 3600 - 60, projected: null, forecast: { clears: true }, spark };
      cam = document.createElement("div");
      cam.className = "fin-cam";
      dock.append(cam);
      isl = new Island(cam, { scale: L, maxScale: L, state: everShown ? "pinned" : "collapsed", bezel: true, hint: true, interactive: false, live: false, data });
      root.classList.add("is-docked");
    } catch (e) {
      console.error("[finale] island unavailable, the download hangs from its hairline", e);
      isl = null; cam && cam.remove(); cam = null;
    }
  }
  const setDock = (n) => {
    if (!isl || n === dockInt) return;
    dockInt = n;
    const s = isl.data.session;
    s.pct = n; s.spark[s.spark.length - 1] = n;
    isl.render();
  };
  const fitDock = () => {
    if (!isl) return;
    const k = Math.min(1, dock.clientWidth / (PANEL_W * L)), h = isl.size("pinned").h;
    cam.style.height = `${h}px`;
    cam.style.transform = k < 1 ? `scale(${k.toFixed(4)})` : "";
    dock.style.height = `${(h * k).toFixed(1)}px`;
    root.style.setProperty("--fin-s", (L * k).toFixed(4));
  };

  // ---------------------------------------------------------------- the iris (global, fixed, aria-hidden)
  // A composited camera iris: .iris__ap is a 512px square painted once (a clear hole, a soft vignette, a rim of light,
  // then black) and only ever scaled; four black sheets slide in to cover the screen outside it. Every frame writes
  // five transforms: no layout, no paint.
  document.getElementById("iris")?.remove();
  const iris = document.createElement("div");
  iris.id = "iris";
  iris.setAttribute("aria-hidden", "true");
  iris.dataset.zone = "red";
  iris.innerHTML = '<i class="iris__b"></i><i class="iris__b"></i><i class="iris__b"></i><i class="iris__b"></i><i class="iris__ap"></i>'
    + '<i class="iris__beam"></i><svg class="iris__ring" viewBox="0 0 46 46"><circle class="trk" cx="23" cy="23" r="21"/><circle class="val" cx="23" cy="23" r="21" pathLength="100"/></svg>'
    + '<div class="iris__lens"><i class="iris__glint"></i></div>'
    + '<div class="iris__mid"><p class="iris__num"><span class="iris__nb"><span class="iris__n">100</span><span class="iris__pc">%</span></span></p><p class="iris__txt">resetting…</p></div>';
  document.body.append(iris);
  const [bl, br, bt, bb, ap] = iris.children;
  const beam = iris.querySelector(".iris__beam"), ringSvg = iris.querySelector(".iris__ring"), ring = ringSvg.querySelector(".val");
  const lens = iris.querySelector(".iris__lens"), glint = iris.querySelector(".iris__glint"), txt = iris.querySelector(".iris__txt");
  const num = iris.querySelector(".iris__num"), roller = new lib.Roller(iris.querySelector(".iris__n"), { value: 100 });
  const geo = { r: 0, w: 0, h: 0, cx: 0, cy: 20, R: 0, r0: 0, rl: 4 };
  const irisGeo = () => {
    geo.w = innerWidth; geo.h = innerHeight; geo.cx = geo.w / 2; geo.cy = bandH() / 2;
    geo.R = Math.hypot(Math.max(geo.cx, geo.w - geo.cx), geo.h - geo.cy) + 4;
    geo.r0 = geo.R / 0.6;   // wide open: even the vignette (from 60% of the hole) is off screen
    const ns = parseFloat(document.querySelector(".band")?.style.getPropertyValue("--nav-scale")) || 1.25;
    geo.rl = (7 * ns) / 2;  // the 7pt lens at nav scale: the iris lands exactly on it
    iris.style.setProperty("--ly", `${geo.cy}px`);
    iris.style.setProperty("--ls", `${(2 * geo.rl).toFixed(2)}px`);
  };
  const drawIris = () => {
    const { w, h, cx, cy } = geo, s = Math.max(geo.r, 0.5) / HOLE, half = AP * s, ov = half * 0.18, f = (n) => n.toFixed(2);
    ap.style.transform = `translate3d(${f(cx)}px,${f(cy)}px,0) scale(${s.toFixed(5)})`;
    bl.style.transform = `translate3d(${f(cx - half + ov - w)}px,0,0)`;
    br.style.transform = `translate3d(${f(cx + half - ov)}px,0,0)`;
    bt.style.transform = `translate3d(0,${f(cy - half + ov - h)}px,0)`;
    bb.style.transform = `translate3d(0,${f(cy + half - ov)}px,0)`;
  };
  // In the black the session drains 100 → 0: the ring round the lens sweeps down like a clock, the digits roll in
  // whole clicks (each one reads, like the app's numericText between refreshes), and the colour crosses
  // red → amber → teal with the number shown (past 85, past 50).
  const drain = { v: 100 };
  let drainI = 0;
  const drainTick = () => {
    ring.style.strokeDashoffset = (100 - drain.v).toFixed(2);
    if (drainI >= CLICKS.length || drain.v > CLICKS[drainI]) return;
    while (drainI < CLICKS.length - 1 && drain.v <= CLICKS[drainI + 1]) drainI++;
    const n = CLICKS[drainI++];
    roller.set(n);
    iris.dataset.zone = drainZone(n);
  };

  // While the iris is shut the page is stopped: wheel, touch and scroll keys do nothing (no root overflow toggle).
  let held = false;
  const block = (e) => {
    if (e.type === "keydown" && (!SCROLL_KEYS.has(e.key) || e.target.closest?.("input,textarea,select,[contenteditable]"))) return;
    e.preventDefault(); e.stopPropagation();
  };
  const hold = (on) => {
    if (on === held) return;
    held = on;
    ["wheel", "touchmove", "keydown"].forEach((t) => window[on ? "addEventListener" : "removeEventListener"](t, block, { capture: true, passive: false }));
  };

  // ---------------------------------------------------------------- state
  let phase = "fill";       // "fill" (scrubbed 0→100) | "hit" (timed sequence) | "reset" (the fresh window)
  let armed = true, shown = everShown, active = false, booted = false;
  let lastP = 0, stP = 0, shownInt = -1, curZone = "", hot = false, markW = mark.offsetWidth, sentInt = -1;
  let seq = null, stepT = 0, stopBreath = () => {}, liftY = 0, fireY = 0;
  const S = { bi: 0, m: 1, from: 0, w: 1 }; // breath (whole percents), re-arm blend, reset wash

  // x = the fill (the usage before the reset, the window left after it); used = what the band and datum show.
  const owns = () => active || phase === "reset";
  const release = () => { if (sentInt !== -2) { sentInt = -2; meter.override(null); } };
  const render = (x, used = x) => {
    x = Math.min(100, Math.max(0, x));
    val = x;
    const off = (100 - x).toFixed(3);
    clips.forEach((el) => { el.style.transform = `translate(-${off}%,0)`; });
    fills.forEach((el) => { el.style.transform = `translate(${off}%,0)`; });
    const px = (markW * x) / 100;
    head.style.transform = `translate(${px.toFixed(1)}px,0)`;
    // the chip rides the playhead but never leaves the scale
    chip.style.transform = `translate(${Math.min(Math.max(-CHIP / 2, -px), markW - px - CHIP).toFixed(1)}px,calc(100% + 5px))`;
    const n = Math.round(Math.min(100, Math.max(0, used)));
    if (n !== shownInt) { shownInt = n; vals.forEach((el) => { el.textContent = n; }); if (staged) setDock(n); }
    const z = fresh ? "teal" : zone(x);
    if (z !== curZone) { curZone = z; meterEl.dataset.zone = z; }
    const h = !fresh && x > 85;
    if (h !== hot) { hot = h; markbox.classList.toggle("is-hot", hot); }
    if (owns() && n !== sentInt) { sentInt = n; meter.override(n); }
    if (fresh) paintRule();
  };
  const usedFresh = (p) => Math.min(FRESH_MAX, Math.max(0, ((p - HIT_AT) / (1 - HIT_AT)) * FRESH_MAX)) + S.bi;
  const update = () => {
    if (phase === "hit") return;
    if (fresh) { const u = usedFresh(lastP); render((100 - u) * S.w, u); return; }
    const t = (Math.min(lastP, FULL_AT) / FULL_AT) * 100;
    render(S.m < 1 ? S.from + (t - S.from) * S.m : t);
  };
  const setFresh = (on) => {
    if (on === fresh) return;
    fresh = on;
    root.classList.toggle("is-fresh", on);
    paintRule();
  };

  // Forecast, in the app's own words, from this page's scroll speed.
  let fcKey = "";
  const forecast = (st) => {
    let text = "on track — resets first", tone = "";
    if (phase === "fill" && lastP < FULL_AT && st) {
      const v = meter.velocity, px = (FULL_AT - lastP) * (st.end - st.start);
      if (v > 40) { const s = px / v; text = `hits the cap in ${fmtS(s)}`; tone = s < 5 ? "red" : "amber"; }
    } else if (phase !== "reset") return;
    if (text + tone === fcKey) return;
    fcKey = text + tone;
    fc.textContent = text;
    fc.className = `fin-fc${tone ? ` is-${tone}` : ""}`;
  };

  // ---------------------------------------------------------------- .after: hidden before the HIT, never re-hidden
  let h2tw = null;
  SplitText.create(h2, {
    type: "lines", mask: "lines", autoSplit: true, linesClass: "fin-l",
    onSplit(self) {
      if (shown) return undefined;
      h2tw = gsap.from(self.lines, { yPercent: 110, duration: 0.9, ease: "edit", stagger: 0.08, paused: true });
      return h2tw;
    },
  });
  const inkTl = !shown && ink ? lib.scribble(ink, { trigger: false, duration: 0.7 }) : null;
  // Staged (under the black): the hairline is drawn and the collapsed notch sits on it, ready to open.
  let staged = shown;
  if (!shown) {
    gsap.set(after, { "--hang": 0 });
    if (isl) gsap.set(dock, { autoAlpha: 0 });
    gsap.set([cta, win], { clipPath: "inset(0% 0% 100% 0%)" }); // invisible, still focusable (the skip link lands here)
    gsap.set(fades, { autoAlpha: 0, y: 14 });
  }
  const stage = () => {
    if (staged) return;
    staged = true;
    gsap.set(after, { "--hang": 1 });
    if (isl) { setDock(shownInt); gsap.set(dock, { autoAlpha: 1 }); }
  };
  const playH2 = () => { if (h2tw && !h2tw.isActive() && h2tw.progress() === 0) h2tw.play(0); };
  const revealAfter = (quick = false) => {
    if (shown) return;
    stage();
    shown = everShown = true;
    const t = gsap.timeline();
    if (liftY) t.to(meterEl, { y: 0, duration: 0.9, ease: "edit" }, 0);
    if (h2tw && !h2tw.isActive() && h2tw.progress() === 0) t.add(h2tw.play(0), 0);
    const drop = (el, at) => t.fromTo(el, { yPercent: -100, clipPath: "none" }, { yPercent: 0, ...lib.SPR.open, clearProps: "transform,clipPath", immediateRender: false }, at);
    const open = (el, at) => t.to(el, { clipPath: "inset(0% -14% -45% -14%)", ...lib.SPR.open, clearProps: "clipPath" }, at);
    if (isl) {
      // the notch opens into the pinned panel (the app's own spring), the download drops out from under it, then
      // the Windows ghost drops out from under the download
      t.call(() => { isl.setState("pinned", { instant: quick }); }, null, 0.22);
      drop(cta, 0.62); drop(win, 0.92);
    } else { open(cta, 0.34); open(win, 0.56); }
    t.to(fades, { autoAlpha: 1, y: 0, duration: 0.8, ease: "edit", stagger: 0.08, clearProps: "transform" }, isl ? 0.8 : 0.5);
    if (inkTl) t.add(inkTl.play(0), isl ? 1.15 : 0.85);
    liftY = 0;
    if (quick) t.progress(1);
  };
  // Keyboard (e.g. the "Skip to download" link): focusing anything in .after reveals it at once.
  const onFocus = (e) => { if (!shown && after.contains(e.target)) revealAfter(true); };
  root.addEventListener("focusin", onFocus);

  // Before the first reset the meter sits at the optical centre of the frame; the reset cuts it up, unseen.
  const measure = () => {
    markW = mark.offsetWidth;
    fitDock();
    if (shown) { liftY = 0; gsap.set(meterEl, { y: 0 }); return; }
    const centre = (innerHeight + bandH()) / 2;
    liftY = Math.max(0, Math.round(centre - (meterEl.offsetTop + meterEl.offsetHeight / 2)));
    gsap.set(meterEl, { y: liftY });
  };

  // ---------------------------------------------------------------- idle: the fresh window breathes 6% and back
  // Two 12s breaths each time the section comes into view, then it rests: a parked page runs nothing. It steps in
  // whole percents like the app's meter, on timers (no rAF loop); between steps .is-breath lets the compositor glide
  // the fill and bar there (CSS transitions on transform).
  const step = (i, t0) => {
    if (i >= STEPS.length) return;
    stepT = setTimeout(() => { S.bi = STEPS[i][1]; update(); step(i + 1, t0); }, Math.max(0, t0 + STEPS[i][0] * 1000 - performance.now()));
  };
  const startBreath = () => {
    stopBreath();
    stopBreath = lib.whileVisible(root, () => { root.classList.add("is-breath"); step(0, performance.now()); },
      () => { clearTimeout(stepT); S.bi = 0; root.classList.remove("is-breath"); });
  };

  // ---------------------------------------------------------------- HIT → IRIS → RESET (timed, not scrubbed)
  // wash: the wordmark refills from 0 with a spring (the iris opening); quiet resets land full at once.
  const WASH = lib.spring({ duration: 0.9, bounce: 0.18 });
  const toReset = (wash = false) => {
    phase = "reset"; armed = false; S.m = 1;
    setFresh(true);
    gsap.killTweensOf(S, "w");
    if (wash) lib.untracked(() => gsap.fromTo(S, { w: 0 }, { w: 1, ...WASH, onUpdate: update }));
    else S.w = 1;
    startBreath(); update(); forecast();
  };
  const stay = () => { if (Math.abs(scrollY - fireY) > 2) lib.scrollTo(fireY, { immediate: true }); };
  const fire = () => {
    phase = "hit"; armed = false;
    seq && seq.kill();
    irisGeo();
    lib.untracked(() => {   // born in a scroll callback: not recorded in the section context (cleanup kills it)
      seq = gsap.timeline({ onComplete: () => { iris.classList.remove("is-on"); seq = null; } })
        // 0–.12s HIT: red and bold at 100, the page stops dead, shake ±4px ×3, the nav island flinches with it
        .call(() => {
          render(100); navIsland.pulse(); hold(true);
          if (lenis) lenis.scrollTo(lenis.animatedScroll, { immediate: true, force: true });
          fireY = scrollY;
        }, null, 0)
        .fromTo(markbox, { x: 0 }, { keyframes: { x: [0, -4, 4, -4, 4, -4, 4, 0] }, duration: 0.12, ease: "none" }, 0)
        // .12–.66s IRIS CLOSE on the live page, into the band lens (vignette + rim ride the aperture)
        .call(() => { geo.r = geo.r0; drawIris(); iris.classList.add("is-on"); }, null, 0.12)
        .fromTo(geo, { r: () => geo.r0 }, { r: () => geo.rl, duration: 0.54, ease: "edit", onUpdate: drawIris, immediateRender: false }, 0.12)
        .fromTo(lens, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.2, ease: "settle", immediateRender: false }, 0.54)
        // the circle lands on the lens, and the lens glints
        .fromTo(glint, { xPercent: -120 }, { xPercent: 120, duration: 0.45, ease: "power2.inOut", immediateRender: false }, 0.68)
        // .66s unseen behind the black: the page is put back where it stopped, the meter empties and the pay-off is
        // staged; the lift cut waits a beat so no text write lands in the same frame as a move
        .call(() => {
          stay(); render(0); stage();
          drain.v = 100; drainI = 0; roller.set(100, { instant: true }); iris.dataset.zone = "red"; drainTick();
        }, null, 0.66)
        .call(() => { gsap.set(meterEl, { y: 0 }); liftY = 0; }, null, 0.72)
        // .72–1.98s HOLD BLACK: a beam falls from the lens, the ring sweeps down, the digits roll 100 → 0 red → amber → teal
        .fromTo([ringSvg, num], { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "settle", immediateRender: false }, 0.72)
        .fromTo(beam, { autoAlpha: 0, scaleY: 0.7 }, { autoAlpha: 1, scaleY: 1, duration: 0.5, ease: "settle", immediateRender: false }, 0.72)
        .fromTo(txt, { autoAlpha: 0, y: 4 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: "settle", immediateRender: false }, 0.8)
        .to(drain, { v: 0, duration: 0.84, ease: "none", onUpdate: drainTick }, 0.78)
        .call(playH2, null, 1.6)   // "Fresh window." is already rising when the iris opens onto it
        .to([txt, ringSvg, num, beam], { autoAlpha: 0, duration: 0.2 }, 1.86)
        // 1.98–2.76s IRIS OPEN out of the lens; the wordmark refills from 0 as it does
        .call(() => { hold(false); stay(); toReset(true); }, null, 1.98)
        .to(lens, { autoAlpha: 0, duration: 0.15 }, 1.98)
        .fromTo(geo, { r: () => geo.rl }, { r: () => geo.r0, duration: 0.78, ease: "edit", onUpdate: drawIris, immediateRender: false }, 1.98)
        .call(() => revealAfter(), null, 2.16)
        .call(() => lib.showBanner(document.body, RESET_BANNER), null, 2.36);
    });
  };

  // The HIT reads the real scroll (st.progress), not the scrubbed timeline, so it lands where it was designed.
  const onScroll = (st) => {
    const prev = stP;
    stP = st.progress;
    if (!booted || phase !== "fill" || !armed || !(prev < HIT_AT && stP >= HIT_AT)) return;
    if (st.isActive && st.direction > 0) { fire(); return; }
    toReset(); revealAfter(true); // flung past the pin: land quietly, never iris over the footer
  };
  const onProgress = (p, st) => {
    lastP = p;
    if (phase === "hit") return;
    if (!booted) {
      booted = true;
      stP = st ? st.progress : p;
      if (p >= HIT_AT) { toReset(); revealAfter(true); return; } // arrived mid-scene (reload/deep link): no replay
    }
    if (phase === "reset" && p < REARM) {
      phase = "fill"; armed = true; stopBreath();
      S.from = val;
      setFresh(false);
      if (!active) release();
      lib.untracked(() => gsap.fromTo(S, { m: 0 }, { m: 1, duration: 0.8, ease: "edit", onUpdate: update, overwrite: true }));
    }
    update();
    forecast(st);
  };

  const scene = lib.pinScene(root, {
    length: "120%", mobileLength: "100%",
    build: (tl) => { tl.to({}, { duration: 1 }); },
    onUpdate: (self) => onScroll(self),
    onToggle: (self) => {
      active = self.isActive;
      if (owns()) { sentInt = -1; update(); } else release();
    },
  });
  const st = scene && scene.st;
  if (scene) scene.tl.eventCallback("onUpdate", () => onProgress(scene.tl.progress(), st));

  const onRefresh = () => { measure(); if (st) stP = st.progress; if (seq) { irisGeo(); drawIris(); } update(); };
  ScrollTrigger.addEventListener("refresh", onRefresh);
  const ro = new ResizeObserver(() => { const w = mark.offsetWidth; if (w !== markW) { markW = w; update(); } fitDock(); });
  ro.observe(mark);
  if (isl) ro.observe(dock);
  measure();
  render(0);
  forecast(st);

  kills.push(lib.visibleInterval(root, () => forecast(st), 250));
  kills.push(lib.squash(markbox, { split: false, wght: [800, 900] })); // every layer's chars squash identically

  return () => {
    kills.forEach((k) => k());
    ScrollTrigger.removeEventListener("refresh", onRefresh);
    ro.disconnect();
    root.removeEventListener("focusin", onFocus);
    stopBreath();
    seq && seq.kill();
    hold(false);
    gsap.killTweensOf(S);
    meter.override(null);
    iris.remove();
    if (isl) { isl.destroy(); cam.remove(); dock.style.removeProperty("height"); }
    root.style.removeProperty("--fin-s");
    markbox.classList.remove("is-hot");
    markbox.querySelectorAll(".ch").forEach((c) => c.removeAttribute("style"));
    [...clips, ...fills].forEach((el) => el.style.removeProperty("transform"));
    delete meterEl.dataset.zone;
    root.classList.remove("is-live", "is-docked", "is-fresh", "is-near", "is-breath");
  };
}
