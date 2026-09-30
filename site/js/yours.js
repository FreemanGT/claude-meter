// §04 yours — the playground: a Mac desktop with the real island, the real menu and every setting.
// One store (S) drives the island, the menu (it shares the object), the controls and the desk.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

/** PACE lever → forecast (SPEC §9.4). Minutes are whole; +30s keeps the live countdown on the label. */
export function forecastFor(v) {
  if (v <= 15) return { clears: true, min: null };
  const min = v <= 70 ? Math.round(lerp(125, 60, (v - 15) / 55)) : Math.round(lerp(59, 38, (v - 70) / 30));
  return { clears: false, min, tone: min < 60 ? "red" : "amber" };
}

/** Port of ThresholdTracker (UsageHistory.swift): first reading arms, each level fires once, reset only after 80. */
export function makeTracker(levels = [50, 80, 95]) {
  let armed = new Set(), seeded = false;
  return (pct, didReset = false) => {
    const ev = [];
    if (didReset) { if (seeded && armed.has(80)) ev.push("reset"); armed.clear(); }
    if (!seeded) { levels.forEach((l) => pct >= l && armed.add(l)); seeded = true; return ev; }
    for (const l of levels) if (pct >= l && !armed.has(l)) { armed.add(l); ev.push(l); }
    armed = new Set([...armed].filter((l) => pct >= l));
    return ev;
  };
}

/** The §02 session keeps going: the n-th line Claude Code prints next. Returns [markClass, text, [+adds, −dels]?]. */
const FILES = ["webhooks", "credits", "ledger", "receipts", "dunning", "payouts"];
export function termLine(n) {
  const r = Math.floor(n / 4), f = FILES[r % FILES.length];
  switch (n % 4) {
    case 0: return ["g", `migrating fixtures (${(r % 9) + 1} of 9)`];
    case 1: return ["ok", `tests: ${215 + n * 3} passed`];
    case 2: return ["g", `reading src/api/${f}/*.ts`];
    default: return ["g", `editing src/billing/${f}.ts`, [24 + ((n * 37) % 140), 6 + ((n * 23) % 70)]];
  }
}

const MAT_LABEL = { solid: "SOLID", frosted: "FROSTED", glass: "LIQUID GLASS" };
const KEY = "cm-yours";

export default function init(root, ctx) {
  const { gsap, ScrollTrigger, reduced, mobile, lib, Island } = ctx;
  const { SPR, whileVisible, showBanner, attachMenu, openMenu, defaultItems, closeMenu, renderStatus, fmtReset, fmtForecast, CLEARS, demo, scribble, revealLines, scramble } = lib;
  const $ = (s) => root.querySelector(s), $$ = (s) => [...root.querySelectorAll(s)];
  const desk = $(".yr-desk"), bezel = $(".yr-bezel"), knob = $(".yr-lever__knob"), lever = $(".yr-lever");
  const range = $(".yr-range input"), rangeWrap = $(".yr-range"), rangeOut = $(".yr-range__out");
  const full = $(".yr-full"), winA = $(".yr-win--a"), winB = $(".yr-win--b"), notchEl = $(".yr-notch"), note = $(".yr-note");
  const status = $(".yr-status"), clock = $(".yr-clock"), datum = $(".yr-datum");
  const termEl = $(".yr-term__lines"), termCur = $(".yr-term__cur");
  const termHTML = termEl?.innerHTML; // restored on cleanup, so a re-init starts the session over
  const offs = [], timers = new Set();
  const on = (el, ev, fn, o) => { if (!el) return; el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); };
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };

  // ------------------------------------------------------------------ store
  const DEF = { material: "solid", display: "percent", burnRate: true, notifications: false, menuBar: false, login: false, notch: true };
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  const S = { ...DEF };
  for (const k in DEF) if (typeof saved[k] === typeof DEF[k]) S[k] = saved[k];
  if (!MAT_LABEL[S.material]) S.material = "solid";
  if (S.display !== "ticks") S.display = "percent";
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

  // live usage (the desk's copy of the account): session climbs with PACE, weekly holds
  const D = { session: 46, weekly: 38, resetAt: Date.now() + 7980e3 };
  const secsLeft = () => Math.max(0, (D.resetAt - Date.now()) / 1000);
  const P = { v: 0, timer: 0, autoPeek: false, busy: null, full: false, quit: false, launched: reduced };
  const track = makeTracker();
  track(D.session);

  // ------------------------------------------------------------------ island
  const k0 = () => Math.round(clamp((desk.clientWidth - 24) / 560, 0.4, mobile ? 1 : 1.4) * 100) / 100;
  let k = k0();
  desk.style.setProperty("--k", k);
  let isl = null;
  if (Island) {
    const d = demo();
    d.session.forecast = { clears: true };
    if (!reduced) { d.session.pct = 0; d.weekly.pct = 0; d.models[0].pct = 1; } // wings roll up on launch
    isl = new Island($(".yr-isl"), {
      scale: k, bezel: true, data: d, state: reduced ? "collapsed" : "hidden",
      material: S.material, display: S.display, burnRate: S.burnRate, notch: S.notch,
    });
    isl.menuState = S; // menu.js reads and writes this same object: one store
    desk.dataset.isl = isl.state;
    isl.on("state", (s) => { desk.dataset.isl = s; });
    isl.on("interact", ({ type }) => {
      if (type === "quit") P.quit = true;
      if (type === "relaunch") P.quit = false;
      if (type === "state") P.autoPeek = false; // the user took over
    });
  }
  const setIsland = (patch, opts) => isl && isl.update(patch, opts);

  // Liquid Glass lens: tracks the island's body (the hit area is resized to it every frame), inset so its
  // square corners stay inside the shape's rounded ones.
  const lens = document.createElement("div");
  lens.className = "yr-lens";
  lens.setAttribute("aria-hidden", "true");
  const hit = isl?.el.querySelector(".island__hit");
  let roLens = null;
  if (hit) {
    $(".yr-isl").prepend(lens);
    roLens = new ResizeObserver(([e]) => {
      const { inlineSize: w, blockSize: h } = e.borderBoxSize[0], i = 8 * k;
      lens.style.width = `${Math.max(0, w - 2 * i)}px`;
      lens.style.height = `${Math.max(0, h - i)}px`;
    });
    roLens.observe(hit, { box: "border-box" });
  }
  const projected = () => {
    const f = forecastFor(P.v);
    if (f.clears) return Math.min(99, D.session + 25);
    return D.session + ((100 - D.session) * secsLeft()) / (f.min * 60);
  };

  // ------------------------------------------------------------------ setters (menu hooks + controls)
  const apply = {
    material: (v) => { isl?.setOption("material", v); desk.dataset.mat = v; if (datum.textContent !== MAT_LABEL[v]) scramble(datum, MAT_LABEL[v], { chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ " }); showOff(); },
    display: (v) => { isl?.setOption("display", v); paintStatus(); },
    burnRate: (v) => isl?.setOption("burnRate", v),
    notifications: () => {},
    menuBar: (v) => {
      status.hidden = !v; paintStatus();
      if (v && !reduced) gsap.fromTo(status, { clipPath: "inset(0 0 0 100%)", opacity: 0 }, { clipPath: "inset(0 0 0 0%)", opacity: 1, duration: 0.45, ease: "settle" });
    },
    login: () => {},
    notch: (v) => setNotch(v),
  };
  // a material only shows over something: peek across the windows for a beat, then fold back (unless the user took over)
  function showOff() {
    if (!isl || !P.launched || P.quit || P.full || isl.state !== "collapsed") return;
    isl.setState("peek"); P.autoPeek = true;
    clearTimeout(P.showT); timers.delete(P.showT);
    P.showT = later(() => { if (P.autoPeek && P.v <= 15 && !P.busy && isl.state === "peek") isl.setState("collapsed"); P.autoPeek = false; }, 2400);
  }
  function set(key, val) {
    S[key] = val;
    apply[key](val);
    paintControls();
    save();
  }
  const hooks = {
    onMaterial: (v) => set("material", v),
    onDisplay: (v) => set("display", v),
    onBurnRate: (v) => set("burnRate", v),
    onNotifications: (v) => set("notifications", v),
    onMenuBar: (v) => set("menuBar", v),
    onLaunchAtLogin: (v) => set("login", v),
  };
  const detachMenu = isl ? attachMenu(isl, hooks) : () => {};

  function paintStatus() {
    if (!status.hidden) renderStatus(status, { session: { pct: D.session }, weekly: { pct: D.weekly } }, { display: S.display });
  }

  const segs = $$(".yr-seg"), sws = $$(".yr-sw");
  function paintControls() {
    for (const seg of segs) {
      const val = seg.dataset.seg === "material" ? S.material : S.notch ? "notch" : "external";
      const btns = [...seg.querySelectorAll("button")];
      btns.forEach((b, i) => {
        const on = b.dataset.val === val;
        b.setAttribute("aria-checked", on);
        b.tabIndex = on ? 0 : -1;
        if (on) seg.style.setProperty("--i", i);
      });
    }
    for (const b of sws) {
      const key = b.dataset.sw;
      const val = key === "display" ? S.display === "percent" : !!S[key];
      if (b.getAttribute("aria-checked") === String(val)) continue;
      b.setAttribute("aria-checked", val);
      const thumb = b.querySelector(".yr-sw__thumb i");
      if (!reduced && thumb.animate) thumb.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(1.25)", offset: 0.3 }, { transform: "scaleX(1)" }], { duration: 460, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
  }

  // controls
  for (const seg of segs) {
    const pick = (b) => {
      if (b.getAttribute("aria-checked") === "true") return;
      if (seg.dataset.seg === "material") set("material", b.dataset.val);
      else set("notch", b.dataset.val === "notch");
    };
    on(seg, "click", (e) => { const b = e.target.closest("button"); if (b) pick(b); });
    on(seg, "keydown", (e) => {
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const btns = [...seg.querySelectorAll("button")];
      const i = btns.findIndex((b) => b.getAttribute("aria-checked") === "true");
      const next = btns[(i + dir + btns.length) % btns.length];
      pick(next); next.focus();
    });
  }
  for (const b of sws) on(b, "click", () => {
    const key = b.dataset.sw;
    if (key === "display") set("display", S.display === "percent" ? "ticks" : "percent");
    else set(key, !S[key]);
  });

  // ------------------------------------------------------------------ external display: the housing folds away
  function setNotch(v) {
    desk.dataset.notch = v;
    if (!isl) return;
    gsap.killTweensOf(notchEl);
    if (reduced) { gsap.set(notchEl, { scaleX: v ? 1 : 0 }); isl.setOption("notch", v); return; }
    if (!v) {
      isl.setOption("notch", false);                     // the island becomes the compact pill
      gsap.to(notchEl, { scaleX: 0, ...SPR.close });     // the housing width tweens to 0; the bar joins up
    } else {
      gsap.to(notchEl, { scaleX: 1, ...SPR.open });
      later(() => S.notch && isl.setOption("notch", true), 180); // island wings return as the housing lands
    }
  }

  // ------------------------------------------------------------------ usage + notifications
  function notify(ev) {
    if (!S.notifications) return;
    const b = ev === "reset"
      ? { title: "Session reset", body: "Your 5-hour window is back to full." }
      : { title: `Session at ${ev}%`, body: `${Math.round(D.session)}% used · ${fmtReset(secsLeft())}` };
    showBanner(desk, { ...b, flick: true, announce: true });   // user-caused: a live status
  }
  // the terminal prints while the session climbs (pace, busy hour): a line per point, at most one per 60ms
  let tn = 0, tLast = 0;
  function stream() {
    const now = performance.now();
    if (!termEl || now - tLast < 60) return;
    tLast = now;
    const [mark, text, diff] = termLine(tn++);
    const line = document.createElement("p");
    line.className = "sub";
    line.innerHTML = `<span class="${mark}">${mark === "ok" ? "✓" : "›"} </span>${text}${diff ? `<span class="n"><b>+${diff[0]}</b> −${diff[1]}</span>` : ""}`;
    termEl.insertBefore(line, termCur);
    while (termEl.children.length > 24) termEl.firstElementChild.remove();
    termEl.scrollTop = termEl.scrollHeight;
    if (!reduced) line.animate?.([{ opacity: 0, transform: "translateY(.7em)" }, { opacity: 1, transform: "none" }], { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" });
  }
  function setSession(pct, { reset = false, duration = 0.3 } = {}) {
    const was = D.session;
    D.session = clamp(Math.round(pct), 0, 100);
    if (D.session > was && !reset) stream();
    if (reset) D.resetAt = Date.now() + 5 * 3600e3;
    const ev = track(D.session, reset);
    setIsland({ session: { pct: D.session, resetIn: secsLeft(), projected: projected() } }, { duration });
    paintStatus();
    ev.forEach(notify);
  }

  // ------------------------------------------------------------------ PACE
  const valueText = (f) => (f.clears ? CLEARS : fmtForecast(f.min * 60));
  function setPace(v, { user = true } = {}) {
    P.v = clamp(v, 0, 100);
    const f = forecastFor(P.v), tone = f.clears ? "clear" : f.tone, text = valueText(f);
    setIsland({ session: { forecast: f.clears ? { clears: true, exhaustsIn: null } : { clears: false, exhaustsIn: f.min * 60 + 30 }, projected: projected() } }, { duration: 0.3 });
    const now = Math.round(P.v);
    if (lever && knob) {
      if (lever.dataset.tone !== tone) lever.dataset.tone = tone;
      knob.setAttribute("aria-valuenow", now);
      knob.setAttribute("aria-valuetext", text);
      tip.textContent = text;
    }
    if (range) {
      rangeWrap.dataset.tone = tone;
      range.style.setProperty("--p", `${P.v}%`);
      range.setAttribute("aria-valuetext", text);
      rangeOut.textContent = text;
    }
    if (P.v > 15 && !P.timer) paceLoop();
    if (user && isl && isl.state === "collapsed" && P.v > 15 && !P.quit && !P.full) { isl.setState("peek"); P.autoPeek = true; }
  }
  function paceLoop() {
    clearTimeout(P.timer); timers.delete(P.timer);
    if (P.v <= 15 || D.session >= 100) { P.timer = 0; return; }
    P.timer = later(() => { P.timer = 0; setSession(D.session + 1, { duration: 0.2 }); paceLoop(); }, 600 - ((P.v - 15) / 85) * 450);
  }
  // after the lever cools: fold the auto-peek back up (unless the user took over)
  const settle = () => later(() => {
    if (P.v > 15 || P.busy) return; // still playing
    if (P.autoPeek && isl?.state === "peek") isl.setState("collapsed");
    P.autoPeek = false;
  }, 900);
  // spring back to "easy": bounces off the bottom stop instead of passing it
  const bounce = (p) => { const x = SPR.play.ease(p); return x > 1 ? 2 - x : x; };

  const tip = $(".yr-lever__tip");
  const leverOn = !!(lever && getComputedStyle(lever).display !== "none");
  let drag = null;
  if (leverOn) {
    const trackEl = $(".yr-lever__track");
    const travel = () => trackEl.clientHeight - knob.offsetHeight;
    const paint = (y) => {
      const v = clamp((-y / travel()) * 100, 0, 100);
      lever.style.setProperty("--fs", v / 100); // the rail spans exactly the knob's travel
      return v;
    };
    const fromKnob = (user = true) => setPace(paint(gsap.getProperty(knob, "y")), { user });
    const back = () => {
      if (P.backing) return;
      P.backing = true;
      lever.classList.remove("is-drag");
      gsap.to(knob, { y: 0, duration: SPR.play.duration, ease: bounce, onUpdate: () => fromKnob(false), onComplete: () => { P.backing = false; setPace(0, { user: false }); settle(); } });
    };
    // Draggable + InertiaPlugin load on demand (lib.loadDrag); the keyboard path below works without them.
    let alive = true;
    offs.push(() => { alive = false; });
    lib.loadDrag().then(({ Draggable }) => { if (alive) drag = Draggable.create(knob, {
      type: "y", bounds: { minY: -travel(), maxY: 0 }, inertia: true, edgeResistance: 0.9, zIndexBoost: false,
      onPress() { gsap.killTweensOf(knob); P.backing = false; lever.classList.add("is-drag"); },
      onDrag: () => fromKnob(true),
      onThrowUpdate: () => fromKnob(true),
      onRelease() { const self = this; later(() => { if (!(self.tween && self.tween.isActive())) back(); }, 40); },
      onThrowComplete: back,
    })[0]; }, (e) => console.error("[yours] lever drag unavailable", e));
    // keyboard: ±10 per arrow, value holds (a slider must not move on its own for a keyboard user)
    on(knob, "keydown", (e) => {
      const step = { ArrowUp: 10, ArrowRight: 10, PageUp: 10, ArrowDown: -10, ArrowLeft: -10, PageDown: -10 }[e.key];
      const to = e.key === "Home" ? 0 : e.key === "End" ? 100 : step != null ? clamp(Math.round(P.v / 10) * 10 + step, 0, 100) : null;
      if (to == null) return;
      e.preventDefault();
      gsap.killTweensOf(knob);
      gsap.to(knob, { y: (-to / 100) * travel(), ...SPR.value, onUpdate: () => fromKnob(true) });
      if (to <= 15) settle();
    });
    const roLever = new ResizeObserver(() => drag && drag.applyBounds({ minY: -travel(), maxY: 0 }));
    roLever.observe(trackEl);
    offs.push(() => roLever.disconnect());
  }
  if (range) {
    const fromRange = () => { gsap.killTweensOf(proxy); setPace(+range.value); if (P.v <= 15) settle(); };
    const proxy = { v: 0 };
    on(range, "input", fromRange);
    if (!reduced) {
      const release = () => {
        if (P.v <= 0 || gsap.isTweening(proxy)) return;
        proxy.v = P.v;
        gsap.to(proxy, { v: 0, duration: SPR.play.duration, ease: bounce, onUpdate: () => { range.value = proxy.v; setPace(proxy.v, { user: false }); }, onComplete: settle });
      };
      on(range, "pointerup", release);
      on(range, "touchend", release);
      on(range, "pointerdown", () => gsap.killTweensOf(proxy));
    }
    offs.push(() => gsap.killTweensOf(proxy));
  }

  // ------------------------------------------------------------------ links
  const busyBtn = $('[data-act="busy"]'), fullBtn = $('[data-act="full"]'), fullLbl = fullBtn.querySelector(".yr-lnk__t");
  on(busyBtn, "click", () => {
    if (P.busy) return;
    busyBtn.setAttribute("aria-disabled", "true");
    if (!S.notifications && !reduced) { // nudge: the banners need the switch
      const sw = root.querySelector('[data-sw="notifications"] .yr-sw__track');
      sw.animate?.([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
    if (isl && isl.state === "collapsed" && !P.quit && !P.full) { isl.setState("peek"); P.autoPeek = true; }
    const f = forecastFor(88);
    setIsland({ session: { forecast: { clears: false, exhaustsIn: f.min * 60 + 30 } } });
    if (D.session !== 46) setSession(46, { duration: 0.3 });
    const o = { v: 46 };
    const done = () => { P.busy = null; busyBtn.removeAttribute("aria-disabled"); settle(); };
    const reset = () => {
      P.v = 0;
      setIsland({ session: { forecast: { clears: true, exhaustsIn: null } } });
      setSession(3, { reset: true, duration: SPR.close.duration });
    };
    if (reduced) { setSession(97); P.busy = later(() => { reset(); done(); }, 1200); return; }
    P.busy = gsap.timeline({ onComplete: done })
      .to(o, { v: 97, duration: 4, ease: "sine.inOut", onUpdate: () => { if (Math.round(o.v) !== D.session) setSession(o.v, { duration: 0.12 }); } })
      .add(reset, "+=1.2");
  });

  const fullDoc = full.querySelector(".yr-full__doc");
  if (!fullDoc.firstChild) fullDoc.append(winA.querySelector(".yr-ed__tabs").cloneNode(true), winA.querySelector(".yr-code").cloneNode(true));
  function setFull(v) {
    if (P.full === v) return;
    P.full = v;
    fullLbl.textContent = v ? "Leave full screen" : "Open a full‑screen app";
    fullBtn.classList.toggle("is-on", v);
    desk.classList.toggle("is-full", v);
    const d = desk.getBoundingClientRect(), w = winA.getBoundingClientRect();
    const mb = 32 * k;
    const rect = `inset(${Math.max(0, w.top - d.top - mb)}px ${d.right - w.right}px ${d.bottom - w.bottom}px ${w.left - d.left}px round 12px)`;
    const cap = full.querySelector(".yr-full__cap"), doc = full.querySelector(".yr-full__doc");
    if (v) {
      drift.forEach((t) => t.pause());
      full.hidden = false;
      if (!reduced) {
        gsap.fromTo(full, { clipPath: rect }, { clipPath: "inset(0px 0px 0px 0px round 0px)", duration: 0.4, ease: "edit" });
        gsap.fromTo([doc, cap], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "edit", delay: 0.22, stagger: 0.06 });
      }
      if (isl && !P.quit) isl.setState("hidden"); // scale into the housing (close spring)
    } else {
      const end = () => { full.hidden = true; if (!P.full) drift.forEach((t) => live && t.play()); };
      if (reduced) end();
      else {
        gsap.to([doc, cap], { opacity: 0, duration: 0.15 });
        gsap.to(full, { clipPath: rect, duration: 0.4, ease: "edit", onComplete: end });
      }
      if (isl && !P.quit) isl.setState("collapsed"); // back with the open spring
    }
  }
  on(fullBtn, "click", () => setFull(!P.full));
  on(document, "keydown", (e) => { if (e.key === "Escape" && P.full && !document.querySelector(".cm-menu, .cm-about")) setFull(false); });

  // mobile / touch: a visible menu button
  const menuBtn = $(".yr-openmenu");
  on(menuBtn, "click", () => {
    if (!isl) return;
    const r = menuBtn.getBoundingClientRect();
    const m = openMenu(isl, { x: r.left, y: r.top, items: defaultItems(isl, hooks), trigger: menuBtn });
    m.style.top = `${Math.max(8, r.top - m.offsetHeight - 8)}px`; // open upward, above the button
    m.style.transformOrigin = "left bottom";
  });

  // ------------------------------------------------------------------ Liquid Glass shimmer egg
  const disp = document.querySelector("#cm-liquid feDisplacementMap");
  const shim = { s: 18 };
  const paintShim = () => disp.setAttribute("scale", shim.s.toFixed(1));
  let last = null;
  if (isl && disp && !reduced) on(isl.el, "pointermove", (e) => {
    const t = e.timeStamp;
    if (last && S.material === "glass") {
      const dt = t - last.t;
      const speed = dt > 0 && dt < 120 ? (Math.hypot(e.clientX - last.x, e.clientY - last.y) / dt) * 1000 : 0;
      if (speed > 1200 && !gsap.isTweening(shim)) {
        gsap.timeline().to(shim, { s: 34, duration: 0.12, ease: "power2.out", onUpdate: paintShim }).to(shim, { s: 18, ...SPR.close, onUpdate: paintShim });
      }
    }
    last = { x: e.clientX, y: e.clientY, t };
  });

  // ------------------------------------------------------------------ desk chrome: clock, status, scale
  const tickClock = () => {
    const d = new Date();
    clock.textContent = mobile ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : lib.fmtClock(d);
    clock.dateTime = d.toISOString();
  };
  tickClock();
  const clockId = setInterval(() => document.hidden || tickClock(), 15000);
  const ro = new ResizeObserver(() => {
    const nk = k0();
    if (nk === k) return;
    k = nk;
    desk.style.setProperty("--k", k);
    isl?.setOption("scale", k); // applies while collapsed (deferred otherwise)
  });
  ro.observe(desk);

  // ------------------------------------------------------------------ ambient loops (only while visible)
  let live = false;
  const drift = reduced ? [] : [
    gsap.fromTo(winA, { xPercent: -4 }, { xPercent: mobile ? 8 : 48, duration: 7, ease: "sine.inOut", repeat: -1, yoyo: true, paused: true }),
    gsap.fromTo(winB, { xPercent: 0 }, { xPercent: mobile ? -10 : -82, duration: 9.5, ease: "sine.inOut", repeat: -1, yoyo: true, paused: true }),
  ];
  const stopLoops = whileVisible(desk, () => {
    live = true; desk.classList.add("is-live");
    if (!P.full) drift.forEach((t) => t.play());
  }, () => {
    live = false; desk.classList.remove("is-live");
    drift.forEach((t) => t.pause());
  });

  // ------------------------------------------------------------------ scroll: entrance, parallax, launch
  const noteSvg = note?.querySelector("svg");
  const noteTl = note ? scribble(noteSvg, { duration: 0.8, trigger: false }) : null;
  if (noteTl) gsap.set(noteSvg, { autoAlpha: 0 }); // round caps leave a dot at 0%
  const noteTxt = note?.querySelector("span");
  const wake = $(".yr-wake");
  const launch = () => {
    if (P.launched || !isl) return;
    P.launched = true;
    // the display wakes: black lifts, the wallpaper blooms back to size, then the island is born from the housing
    gsap.to(wake, { opacity: 0, duration: 1.1, ease: "edit" });
    gsap.fromTo($(".yr-wall"), { scale: 1.08 }, { scale: 1, duration: 1.6, ease: "edit" });
    if (leverOn) gsap.to(lever, { xPercent: 0, duration: 0.9, ease: "edit", delay: 0.7, clearProps: "transform" });
    isl.setState("collapsed");
    later(() => setIsland({ session: { pct: D.session }, weekly: { pct: D.weekly }, models: demo().models }, { duration: 0.6 }), 160);
    if (noteTl) { later(() => { gsap.set(noteSvg, { autoAlpha: 1 }); noteTl.play(); }, 900); gsap.fromTo(noteTxt, { opacity: 0, x: 8 }, { opacity: 1, x: 0, duration: 0.6, ease: "edit", delay: 1.4 }); }
  };
  if (!reduced) {
    if (isl) { gsap.set(wake, { opacity: 1 }); if (leverOn) gsap.set(lever, { xPercent: 170 }); }
    if (noteTxt) gsap.set(noteTxt, { opacity: 0 });
    revealLines(root.querySelector("h2"));
    const lede = $(".yr-lede"), facts = $(".yr-facts"), panel = $(".yr-panel");
    gsap.from([lede, ...$$(".yr-facts li")], { y: 26, autoAlpha: 0, duration: 0.9, ease: "edit", stagger: 0.07, scrollTrigger: { trigger: lede, start: "top 88%", once: true } });
    gsap.from($$(".yr-tick b"), { scaleX: 0, duration: 0.7, ease: "edit", stagger: 0.09, delay: 0.35, scrollTrigger: { trigger: facts, start: "top 88%", once: true } });
    gsap.fromTo(bezel, { yPercent: 9, scale: 0.9 }, { yPercent: 0, scale: 1, ease: "none", scrollTrigger: { trigger: $(".yr-play"), start: "top bottom", end: "top 30%", scrub: 0.8 } });
    gsap.fromTo($(".yr-wall"), { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: desk, start: "top bottom", end: "bottom top", scrub: true } });
    gsap.fromTo(panel, { y: 64 }, { y: 0, ease: "none", scrollTrigger: { trigger: panel, start: "top bottom", end: "top 72%", scrub: 0.8 } });
    ScrollTrigger.create({ trigger: desk, start: "top 62%", once: true, onEnter: launch });
    on(root, "focusin", launch); // keyboard: wake the desk as soon as focus enters, so the island joins the tab order
    // …and one stop earlier: when focus reaches the last tabbable before the desk, so forward Tab lands on the island
    const TAB = 'a[href],button,input,select,textarea,[tabindex]';
    const tabbable = (n) => n.tabIndex >= 0 && !n.disabled && !n.closest("[inert],[hidden],[aria-hidden='true']") && n.getClientRects().length > 0;
    on(document, "focusin", (e) => {
      if (P.launched || !(e.target.compareDocumentPosition(root) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
      const all = [...document.querySelectorAll(TAB)];
      const next = all.slice(all.indexOf(e.target) + 1).find(tabbable);
      if (!next || root.contains(next) || root.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING) launch();
    });
    // hovering a fact refills its tick
    for (const li of $$(".yr-facts li")) on(li, "pointerenter", () => gsap.fromTo(li.querySelector(".yr-tick b"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "edit", overwrite: true }));
  }
  if (isl) isl.on("contextmenu", () => note && gsap.to(note, { opacity: 0, duration: 0.3 })); // the note has done its job

  // ------------------------------------------------------------------ first paint from the store
  datum.textContent = MAT_LABEL[S.material];
  desk.dataset.mat = S.material;
  desk.dataset.notch = S.notch;
  status.hidden = !S.menuBar;
  paintStatus();
  paintControls();
  if (!S.notch) gsap.set(notchEl, { scaleX: 0 });
  setPace(0, { user: false });

  return () => {
    offs.forEach((f) => f());
    timers.forEach(clearTimeout);
    clearInterval(clockId);
    ro.disconnect();
    roLens?.disconnect();
    lens.remove();
    stopLoops();
    detachMenu();
    closeMenu();
    drag && drag.kill();
    if (P.busy && P.busy.kill) P.busy.kill();
    drift.forEach((t) => t.kill());
    gsap.killTweensOf([knob, notchEl, full, status, shim, note, noteTxt, wake, $(".yr-wall"), ...$$(".yr-full > *"), ...$$(".yr-tick b")]);
    if (disp) disp.setAttribute("scale", "18");
    gsap.killTweensOf(lever);
    clearTimeout(P.showT);
    if (termEl) termEl.innerHTML = termHTML;
    gsap.set([knob, notchEl, full, status, note, winA, winB, wake, lever], { clearProps: "all" });
    full.hidden = true;
    desk.classList.remove("is-full", "is-live");
    desk.querySelector(".cm-banners")?.remove();
    fullLbl.textContent = "Open a full‑screen app";
    fullBtn.classList.remove("is-on");
    busyBtn.removeAttribute("aria-disabled");
    isl?.destroy();
  };
}
