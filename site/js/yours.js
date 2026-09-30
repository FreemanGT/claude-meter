// §04 yours — the playground: a Mac desktop with the real island and the app's right-click menu, open.
// One store (S) drives the island, both menus (the popup shares the object), the desk and the simulations.

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

const MATS = ["solid", "frosted", "glass"];
const MAT_LABEL = { solid: "SOLID", frosted: "FROSTED", glass: "LIQUID GLASS" };
// what each Appearance actually does (IslandView.swift); Glass lenses only on macOS 26, below it falls back to Frosted
const MAT_CAP = {
  solid: "pure black, fused to the notch",
  frosted: "heavy blur under a dark scrim",
  glass: 'a thin lens, rim lit by your pointer<span class="yr-cap__os"> · macOS 26</span>',
};
const ROLE = { check: "menuitemcheckbox", radio: "menuitemradio" };
const ARROW = '<svg class="yr-mi__ar" viewBox="0 0 6 10" aria-hidden="true"><path d="M1.2 1.2 4.8 5 1.2 8.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const KEY = "cm-yours";

export default function init(root, ctx) {
  const { gsap, ScrollTrigger, reduced, mobile, lib, Island } = ctx;
  const { SPR, whileVisible, showBanner, attachMenu, defaultItems, closeMenu, renderStatus, fmtReset, fmtForecast, CLEARS, demo, revealLines, scramble, untracked } = lib;
  const $ = (s) => root.querySelector(s), $$ = (s) => [...root.querySelectorAll(s)];
  const desk = $(".yr-desk"), bezel = $(".yr-bezel"), knob = $(".yr-lever__knob"), lever = $(".yr-lever"), wall = $(".yr-wall");
  const range = $(".yr-range input"), rangeWrap = $(".yr-range"), rangeOut = $(".yr-range__out");
  const full = $(".yr-full"), winA = $(".yr-win--a"), notchEl = $(".yr-notch"), ptr = $(".yr-ptr");
  const status = $(".yr-status"), clock = $(".yr-clock"), datum = $(".yr-datum"), cap = $(".yr-cap__t");
  const termEl = $(".yr-term__lines"), termCur = $(".yr-term__cur");
  const menu = $(".yr-menu"), menuHome = menu.parentNode, menuNext = menu.nextSibling;
  const termHTML = termEl?.innerHTML, menuHTML = menu.innerHTML; // restored on cleanup, so a re-init starts over
  const onDesk = !mobile; // from 768px the menu hangs off the island, on the screen
  const offs = [], timers = new Set();
  const on = (el, ev, fn, o) => { if (!el) return; el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); };
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const h = (tag, cls, attrs = {}) => { const n = document.createElement(tag); n.className = cls; for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };

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
  const P = { v: 0, timer: 0, autoPeek: false, busy: null, full: false, quit: false, launched: reduced, user: false, tour: null };
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
      if (type === "quit" || type === "relaunch") {
        P.quit = type === "quit";
        desk.classList.toggle("is-quit", P.quit);
        if (P.quit && menu.contains(document.activeElement)) later(() => isl.el.querySelector(".island__relaunch")?.focus({ preventScroll: true }), 950);
        if (!P.quit && document.activeElement === document.body && rows.length) later(() => focusRow(rows[rows.length - 1]), 60);
      }
      if (type === "state") P.autoPeek = false; // the user took over
    });
  }
  const setIsland = (patch, opts) => isl && isl.update(patch, opts);

  // Liquid Glass lens: tracks the island's body, inset so its square corners stay inside the shape's rounded
  // ones. island.js sizes .island__sh to the largest state once and scales it to the body every frame (transform
  // only), so the lens follows its style writes rather than a ResizeObserver (which never sees a transform).
  const lens = h("div", "yr-lens", { "aria-hidden": "true" });
  const hit = isl?.el.querySelector(".island__hit"), sh = isl?.el.querySelector(".island__sh");
  let moLens = null;
  if (sh) {
    $(".yr-isl").prepend(lens);
    const fit = () => {
      const m = /scale\(([-\d.e]+),\s*([-\d.e]+)\)/.exec(sh.style.transform), i = 6 * k;
      if (!m) return;
      lens.style.width = `${Math.max(0, parseFloat(sh.style.width) * m[1] - 2 * i)}px`;
      lens.style.height = `${Math.max(0, parseFloat(sh.style.height) * m[2] - i)}px`;
    };
    moLens = new MutationObserver(fit);
    moLens.observe(sh, { attributes: true, attributeFilter: ["style"] });
    fit();
  }
  const projected = () => {
    const f = forecastFor(P.v);
    if (f.clears) return Math.min(99, D.session + 25);
    return D.session + ((100 - D.session) * secsLeft()) / (f.min * 60);
  };

  // ------------------------------------------------------------------ setters (both menus + simulations)
  /** The look only (the tour previews through here without touching the store). */
  function showMat(m) {
    isl?.setOption("material", m);
    desk.dataset.mat = m;
    if (datum.textContent !== MAT_LABEL[m]) {
      scramble(datum, MAT_LABEL[m], { chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ " });
      cap.innerHTML = MAT_CAP[m];   // a label: it cross-fades in behind the scrambling name
      if (!reduced) cap.animate?.([{ opacity: 0, transform: "translateY(.35em)", filter: "blur(3px)" }, { opacity: 1, transform: "none", filter: "none" }], { duration: 420, delay: 60, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
    }
    rows.filter((r) => r._it.type === "radio").forEach((r, i) => paintCheck(r, MATS[i] === m));
  }
  const apply = {
    material: (v) => { showMat(v); showOff(); },
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
  // A material only shows over something: the island blooms over the windows and the menu's first rows (the
  // Appearance submenu stays clear, see placeMenu), then folds back unless the user took over. While it blooms
  // it ignores the pointer, so a click on the rows under it still lands.
  function showOff() {
    if (!isl || !P.launched || P.quit || P.full || P.tour) return;
    if (!(isl.state === "collapsed" || (P.autoPeek && isl.state === "peek"))) return;
    if (isl.state === "collapsed") isl.setState("peek");
    P.autoPeek = true;
    desk.classList.add("is-show");
    clearTimeout(P.showT); timers.delete(P.showT);
    P.showT = later(fold, 2200);
  }
  // still in the Appearance submenu: the viewer is comparing, keep the island open. Otherwise fold, and hand
  // the pointer back to the island only once it is collapsed (a stationary pointer would re-peek it mid-fold).
  function fold() {
    const sub = menu.querySelector(".yr-menu__sub");
    if (sub && (sub.matches(":hover") || sub.querySelector(":focus-visible"))) { P.showT = later(fold, 600); return; }
    const done = () => desk.classList.remove("is-show");
    if (P.autoPeek && P.v <= 15 && !P.busy && isl.state === "peek") isl.setState("collapsed").then(done, done);
    else done();
    P.autoPeek = false;
  }
  function set(key, val) {
    S[key] = val;
    apply[key](val);
    syncMenu();
    placeMenu();
    paintLid();
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

  // ------------------------------------------------------------------ the menu, open (built from menu.js: same items, same order)
  let rows = [];
  const flat = (items) => items.flatMap((it) => (it.type === "sep" ? [] : it.type === "submenu" ? (onDesk ? [it, ...it.items] : it.items) : [it]));
  const paintCheck = (r, v) => { r.setAttribute("aria-checked", String(v)); r.firstElementChild.textContent = v ? "✓" : ""; };
  const paintRow = (r, it) => {
    r._it = it;
    const lb = r.children[1];
    if (lb.textContent !== it.label) lb.textContent = it.label;
    if (ROLE[it.type]) paintCheck(r, !!it.checked);
  };
  const row = (it) => {
    const r = h(it.type === "link" ? "a" : "div", "yr-mi", { role: ROLE[it.type] || "menuitem", tabindex: "-1" });
    if (it.type === "link") Object.assign(r, { href: it.href, target: "_blank", rel: "noopener" });
    if (it.type === "info") r.setAttribute("aria-disabled", "true");
    r.innerHTML = '<span class="yr-mi__ck" aria-hidden="true"></span><span class="yr-mi__lb"></span>';
    paintRow(r, it);
    rows.push(r);
    return r;
  };
  function renderMenu() {
    const main = h("div", "yr-menu__main", { role: "menu", "aria-label": "Claude Meter’s right‑click menu" });
    let sub = null;
    rows = [];
    for (const it of defaultItems(isl, hooks)) {
      if (it.type === "sep") { main.append(h("div", "yr-mi-sep", { role: "separator" })); continue; }
      if (it.type !== "submenu") { main.append(row(it)); continue; }
      if (onDesk) { // a real submenu beside its row, held open
        const r = row(it);
        r.setAttribute("aria-haspopup", "menu"); r.setAttribute("aria-expanded", "true"); r.setAttribute("aria-controls", "yr-sub");
        r.insertAdjacentHTML("beforeend", ARROW);
        main.append(r);
        sub = h("div", "yr-menu__sub", { role: "menu", "aria-label": it.label, id: "yr-sub" });
        it.items.forEach((s) => sub.append(row(s)));
      } else { // touch: the submenu opens in place, under its label
        const head = h("div", "yr-mi yr-mi--head", { role: "none", id: "yr-app-h" });
        head.textContent = it.label;
        const g = h("div", "yr-mi-group", { role: "group", "aria-labelledby": "yr-app-h" });
        it.items.forEach((s) => g.append(row(s)));
        main.append(head, g);
      }
    }
    menu.replaceChildren(main, ...(sub ? [sub] : []));
    const app = rows.find((r) => r._it.type === "submenu");
    // the submenu's first row sits level with Appearance (in em, so it holds as the desk rescales)
    if (sub && app) sub.style.setProperty("--sub-top", `${(app.offsetTop - main.clientTop - parseFloat(getComputedStyle(main).paddingTop)) / parseFloat(getComputedStyle(menu).fontSize)}em`);
    (app || rows.find((r) => r._it.checked && r._it.type === "radio") || rows.find((r) => r._it.type !== "info")).tabIndex = 0;
  }
  function syncMenu() {
    if (!rows.length) return;
    const f = flat(defaultItems(isl, hooks));
    rows.forEach((r, i) => f[i] && paintRow(r, f[i]));
  }
  // The desk's menu opens on the peek (where a right-click lands) and sits just low enough that the peek never
  // covers the Appearance submenu: its top clears the tallest peek seen by 14pt, and the whole menu stays on the
  // screen. Heights are kept in pt (--u is the island's applied scale; a rescale is deferred while it is open).
  function placeMenu() {
    const main = onDesk && isl && menu.querySelector(".yr-menu__main"), sub = main && menu.querySelector(".yr-menu__sub");
    if (!sub) return;
    const u = parseFloat(isl.el.style.getPropertyValue("--u")) || k;
    P.peekPt = Math.max(P.peekPt || 0, isl.size("peek").h / u);
    const low = desk.clientHeight - main.offsetHeight - 12;
    menu.style.setProperty("--menu-top", `${Math.round(Math.min(low, Math.max(32 * k + 2, (P.peekPt + 14) * k - sub.offsetTop)))}px`);
    // under the left wing, but never over the lever (its labels set its width, so measure it)
    const right = (lever?.offsetParent ? lever.offsetLeft : desk.clientWidth) - 12 - (sub.offsetLeft + sub.offsetWidth);
    menu.style.setProperty("--menu-left", `${Math.round(Math.max(12, Math.min(desk.clientWidth / 2 - 112 * k, right)))}px`);
  }
  // the tour opens the menu over the peek; it drops back under the island once the island has folded
  function unCtx() {
    if (!isl || !desk.classList.contains("is-ctx")) return;
    if (isl.state !== "collapsed") { later(unCtx, 300); return; }
    isl.setState("collapsed").then(() => isl.state === "collapsed" && desk.classList.remove("is-ctx"));
  }
  const menuOf = (r) => r.closest(".yr-menu__sub, .yr-menu__main");
  const live = (r) => r._it.type !== "info";
  function focusRow(r) { rows.forEach((x) => (x.tabIndex = -1)); r.tabIndex = 0; r.focus({ preventScroll: true }); }
  const blink = (r) => { if (reduced) return; r.classList.remove("is-blink"); void r.offsetWidth; r.classList.add("is-blink"); };
  function activate(r) {
    const it = r._it;
    if (!live(r) || it.type === "link") return; // links navigate natively
    if (it.type === "submenu") return focusRow(rows.find((x) => x._it.type === "radio" && x._it.checked) || r);
    blink(r);
    it.type === "check" ? it.onSelect(!it.checked) : it.onSelect?.();
    syncMenu();
  }
  if (isl) {
    if (onDesk) desk.append(menu);
    renderMenu();
    placeMenu();
    on(menu, "click", (e) => {
      const r = e.target.closest(".yr-mi");
      if (!r || !rows.includes(r)) return;
      P.user = true;
      if (r.tagName !== "A") e.preventDefault();
      if (live(r)) { rows.forEach((x) => (x.tabIndex = -1)); r.tabIndex = 0; }
      activate(r);
    });
    on(menu, "keydown", (e) => {
      const r = e.target.closest(".yr-mi");
      if (!r || !rows.includes(r)) return;
      const list = rows.filter((x) => live(x) && menuOf(x) === menuOf(r)), i = list.indexOf(r);
      const go = (n) => { e.preventDefault(); focusRow(list[(n + list.length) % list.length]); };
      const inSub = menuOf(r).classList.contains("yr-menu__sub");
      switch (e.key) {
        case "ArrowDown": return go(i + 1);
        case "ArrowUp": return go(i - 1);
        case "Home": return go(0);
        case "End": return go(list.length - 1);
        case "ArrowRight": if (r._it.type === "submenu") { e.preventDefault(); activate(r); } return;
        case "ArrowLeft": case "Escape": if (inSub) { e.preventDefault(); e.stopPropagation(); focusRow(rows.find((x) => x._it.type === "submenu")); } return;
        case "Enter": case " ":
          if (r.tagName === "A") { if (e.key === " ") { e.preventDefault(); r.click(); } return; }
          e.preventDefault(); activate(r); return;
      }
    });
  }

  // ------------------------------------------------------------------ no notch (lid closed): the housing folds away
  const lidBtn = $('[data-act="lid"]');
  const paintLid = () => lidBtn?.setAttribute("aria-pressed", String(!S.notch));
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
  on(lidBtn, "click", () => set("notch", !S.notch));

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
    syncMenu();
    ev.forEach(notify);
  }

  // ------------------------------------------------------------------ PACE
  const valueText = (f) => (f.clears ? CLEARS : fmtForecast(f.min * 60));
  const tip = $(".yr-lever__tip");
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
    // Draggable + InertiaPlugin (43 KB) load the first time a pointer comes near the lever or it takes focus;
    // a press that beats the download is handed over once it lands. The keyboard path needs neither.
    let alive = true, dragP = null, down = null;
    offs.push(() => { alive = false; });
    const ensureDrag = () => dragP || (dragP = lib.loadDrag().then(({ Draggable }) => {
      if (!alive) return;
      drag = Draggable.create(knob, {
        type: "y", bounds: { minY: -travel(), maxY: 0 }, inertia: true, edgeResistance: 0.9, zIndexBoost: false,
        onPress() { gsap.killTweensOf(knob); P.backing = false; lever.classList.add("is-drag"); },
        onDrag: () => fromKnob(true),
        onThrowUpdate: () => fromKnob(true),
        onRelease() { const self = this; later(() => { if (!(self.tween && self.tween.isActive())) back(); }, 40); },
        onThrowComplete: back,
      })[0];
      if (down) drag.startDrag(down);
    }, (e) => console.error("[yours] lever drag unavailable", e)));
    on(lever, "pointerenter", ensureDrag);
    on(knob, "focus", ensureDrag);
    on(knob, "pointerdown", (e) => { if (!drag) { down = e; ensureDrag(); } });
    on(window, "pointerup", () => { down = null; });
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
    const roLever = new ResizeObserver(() => {
      drag && drag.applyBounds({ minY: -travel(), maxY: 0 });
      if (!drag && P.v) gsap.set(knob, { y: (-P.v / 100) * travel() });
    });
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

  // ------------------------------------------------------------------ simulations
  const busyBtn = $('[data-act="busy"]'), fullBtn = $('[data-act="full"]'), fullLbl = fullBtn.querySelector(".yr-lnk__t");
  const FULL_OFF = fullLbl.textContent;
  on(busyBtn, "click", () => {
    if (P.busy) return;
    busyBtn.setAttribute("aria-disabled", "true");
    if (!S.notifications && !reduced) { // nudge: the banners need "Usage notifications" ticked
      const r = rows.find((x) => x._it.label === "Usage notifications");
      r?.animate([{ background: "rgb(176 168 237 / .55)" }, { background: "rgb(176 168 237 / 0)" }], { duration: 1100, easing: "cubic-bezier(.2,.8,.2,1)" });
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
    fullLbl.textContent = v ? "Leave full screen" : FULL_OFF;
    fullBtn.classList.toggle("is-on", v);
    desk.classList.toggle("is-full", v);
    const d = desk.getBoundingClientRect(), w = winA.getBoundingClientRect();
    const mb = 32 * k;
    const rect = `inset(${Math.max(0, w.top - d.top - mb)}px ${d.right - w.right}px ${d.bottom - w.bottom}px ${w.left - d.left}px round 12px)`;
    const cap = full.querySelector(".yr-full__cap");
    if (v) {
      full.hidden = false;
      if (!reduced) {
        gsap.fromTo(full, { clipPath: rect }, { clipPath: "inset(0px 0px 0px 0px round 0px)", duration: 0.4, ease: "edit" });
        gsap.fromTo([fullDoc, cap], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "edit", delay: 0.22, stagger: 0.06 });
      }
      if (isl && !P.quit) isl.setState("hidden"); // scale into the housing (close spring)
    } else {
      const end = () => { full.hidden = true; };
      if (reduced) end();
      else {
        gsap.to([fullDoc, cap], { opacity: 0, duration: 0.15 });
        gsap.to(full, { clipPath: rect, duration: 0.4, ease: "edit", onComplete: end });
      }
      if (isl && !P.quit) isl.setState("collapsed"); // back with the open spring
    }
  }
  on(fullBtn, "click", () => setFull(!P.full));
  on(document, "keydown", (e) => { if (e.key === "Escape" && P.full && !document.querySelector(".cm-menu, .cm-about")) setFull(false); });

  // ------------------------------------------------------------------ Liquid Glass shimmer egg (the lens's own filter)
  const disp = root.querySelector("#yr-lens feDisplacementMap");
  const base = disp ? +disp.getAttribute("scale") : 0;
  const shim = { s: base };
  const paintShim = () => disp.setAttribute("scale", shim.s.toFixed(3));
  let last = null;
  if (isl && disp && !reduced) on(isl.el, "pointermove", (e) => {
    const t = e.timeStamp;
    if (last && S.material === "glass") {
      const dt = t - last.t;
      const speed = dt > 0 && dt < 120 ? (Math.hypot(e.clientX - last.x, e.clientY - last.y) / dt) * 1000 : 0;
      if (speed > 1200 && !gsap.isTweening(shim)) {
        gsap.timeline().to(shim, { s: base * 1.9, duration: 0.12, ease: "power2.out", onUpdate: paintShim }).to(shim, { s: base, ...SPR.close, onUpdate: paintShim });
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
  const clockId = setInterval(() => { if (!document.hidden) { tickClock(); syncMenu(); } }, 15000);
  const ro = new ResizeObserver(() => {
    const nk = k0();
    if (nk !== k) {
      k = nk;
      desk.style.setProperty("--k", k);
      isl?.setOption("scale", k); // applies while collapsed (deferred otherwise)
    }
    placeMenu(); // past the 1.4 cap the desk still widens: re-centre under the wing
  });
  ro.observe(desk);

  // ------------------------------------------------------------------ the tour: the pointer right-clicks the island once
  // Positions are layout offsets inside the desk (the bezel may still be scaling in).
  const at = (el, fx, fy) => {
    let x = 0, y = 0, n = el;
    while (n && n !== desk) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x: x + el.offsetWidth * fx, y: y + el.offsetHeight * fy };
  };
  const menuParts = () => [...menu.children];
  const hot = (r) => rows.forEach((x) => x.classList.toggle("is-hot", x === r));
  // the Glass rim follows the demo pointer exactly as it follows yours (island.js lights from pointermove)
  const light = () => { const r = ptr.getBoundingClientRect(); desk.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: r.left + 1, clientY: r.top + 1, pointerType: "mouse" })); };
  const openNow = () => { if (onDesk) gsap.to(menuParts(), { autoAlpha: 1, scale: 1, duration: reduced ? 0 : 0.14, ease: "settle", stagger: 0.05, overwrite: true }); };
  function playTour() {
    const radios = rows.filter((r) => r._it.type === "radio"), app = rows.find((r) => r._it.type === "submenu");
    if (!isl || !onDesk || reduced || !lib.finePointer() || P.user || P.quit || P.full || !app || radios.length !== 3) return openNow();
    const [main, sub] = menuParts();
    const W = desk.clientWidth, H = desk.clientHeight;
    const A = at(main, 0, 0), ap = at(app, 0.3, 0.55);
    const order = [...MATS.filter((m) => m !== S.material), S.material]; // end on the viewer's own look
    const pk = isl.size("peek"), wing = { x: W / 2 - isl.size("collapsed").w * 0.4, y: 16 * k };
    const tl = gsap.timeline({ onComplete: () => endTour(false) });
    gsap.set(ptr, { x: W * 0.72, y: H * 0.84, scale: 1, opacity: 0 });
    tl.to(ptr, { opacity: 1, duration: 0.3 })
      .to(ptr, { x: wing.x, y: wing.y, duration: 1.05, ease: "power3.inOut" }, "<")      // onto the left wing…
      .add(() => isl.setState("peek"), "+=.2")                                              // …the hover peeks it
      .to(ptr, { x: A.x + 1, y: A.y - 3, duration: 0.5, ease: "power2.inOut" }, "+=.3")  // right-click on the peek
      .to(ptr, { scale: 0.84, duration: 0.08, ease: "power2.in" })
      .add(() => desk.classList.add("is-ctx"))
      .to(main, { autoAlpha: 1, scale: 1, duration: 0.14, ease: "settle" })   // menu.js's own open, over everything
      .to(ptr, { scale: 1, duration: 0.3, ease: "back.out(3)" }, "<")
      .add(() => { isl.setState("collapsed"); unCtx(); }, "+=.3")             // the pointer leaves for the menu: it folds
      .to(ptr, { x: ap.x, y: ap.y, duration: 0.55, ease: "power2.inOut" }, "<")
      .to(sub, { autoAlpha: 1, scale: 1, duration: 0.14, ease: "settle" }, "+=.06");
    // back to back, like a viewer comparing: the first pick blooms the island over the menu's top rows, the
    // next ones swap the material in place while it stays open
    order.forEach((m, i) => {
      const r = radios[MATS.indexOf(m)], p = at(r, 0.36, 0.55);
      tl.to(ptr, { x: p.x, y: p.y, duration: i && order[i - 1] === "glass" ? 0.6 : 0.42, ease: "power2.inOut", onStart: () => hot(null) }, "+=.2")
        .add(() => hot(r))
        .to(ptr, { scale: 0.84, duration: 0.08, ease: "power2.in" }, "+=.16")
        .add(() => { blink(r); showMat(m); })
        .to(ptr, { scale: 1, duration: 0.3, ease: "back.out(3)" });
      if (!i) tl.add(() => { desk.classList.remove("is-ctx"); isl.setState("peek"); }, "+=.1");
      if (m === "glass") { // sweep the pointer along the lower rim: the light travels with it
        const y = pk.h - 10 * k;
        tl.to(ptr, { x: W / 2 - pk.w * 0.28, y, duration: 0.5, ease: "power2.inOut", onUpdate: light }, "+=.25")
          .to(ptr, { x: W / 2 + pk.w * 0.3, duration: 1.2, ease: "sine.inOut", onUpdate: light });
      } else tl.to({}, { duration: 0.9 }); // let the look read
    });
    tl.add(() => isl.setState("collapsed"), "+=.4");
    P.tour = tl;
  }
  function endTour(abort) {
    const tl = P.tour;
    if (!tl) return;
    P.tour = null;
    tl.kill();
    openNow();
    if (abort) {
      hot(null);
      showMat(S.material);
      if (isl?.state === "peek" && !hit?.matches(":hover")) isl.setState("collapsed");
      unCtx();
      gsap.to(ptr, { opacity: 0, duration: 0.2, overwrite: true });
    }
  }
  // the viewer takes over: the demo stops (or the resting pointer steps aside)
  const takeOver = (e) => {
    if (!e.isTrusted || !root.contains(e.target)) return;
    P.user = true;
    if (P.tour) endTour(true);
    else if (+gsap.getProperty(ptr, "opacity") > 0) { hot(null); gsap.to(ptr, { opacity: 0, duration: 0.25, overwrite: true }); }
  };
  on($(".yr-play"), "pointermove", takeOver);
  on(document, "pointerdown", takeOver);
  on(document, "keydown", takeOver);

  // ------------------------------------------------------------------ ambient (only while visible): the windows drift (CSS)
  const stopLoops = whileVisible(desk, () => desk.classList.add("is-live"), () => { desk.classList.remove("is-live"); endTour(true); });

  // ------------------------------------------------------------------ scroll: entrance, parallax, wake
  const wake = $(".yr-wake");
  const launch = () => {
    if (P.launched || !isl) return;
    P.launched = true;
    // the display wakes from dim, the wallpaper settles, the island springs out of the housing
    untracked(() => {
      gsap.to(wake, { opacity: 0, duration: 1.2, ease: "edit" });
      gsap.fromTo(wall, { scale: 1.06 }, { scale: 1, duration: 1.6, ease: "edit" });
      if (leverOn) gsap.to(lever, { autoAlpha: 1, x: 0, duration: 0.8, ease: "edit", delay: 0.6, clearProps: "transform,opacity,visibility" });
    });
    isl.setState("collapsed");
    later(() => { setIsland({ session: { pct: D.session }, weekly: { pct: D.weekly }, models: demo().models }, { duration: 0.6 }); syncMenu(); }, 160);
    later(() => untracked(playTour), P.user ? 0 : 800);
  };
  if (!reduced) {
    if (isl) {
      gsap.set(wake, { opacity: 0.62 });
      if (leverOn) gsap.set(lever, { autoAlpha: 0, x: 14 });
      if (onDesk) gsap.set(menuParts(), { autoAlpha: 0, scale: 0.96 });
    }
    revealLines(root.querySelector("h2"));
    const lede = $(".yr-lede"), facts = $(".yr-facts");
    gsap.from([lede, ...$$(".yr-facts li")], { y: 26, autoAlpha: 0, duration: 0.9, ease: "edit", stagger: 0.07, scrollTrigger: { trigger: lede, start: "top 88%", once: true } });
    gsap.from($$(".yr-tick b"), { scaleX: 0, duration: 0.7, ease: "edit", stagger: 0.09, delay: 0.35, scrollTrigger: { trigger: facts, start: "top 88%", once: true } });
    gsap.fromTo(bezel, { yPercent: 9, scale: 0.9 }, { yPercent: 0, scale: 1, ease: "none", scrollTrigger: { trigger: $(".yr-play"), start: "top bottom", end: "top 30%", scrub: 0.8 } });
    gsap.fromTo(wall, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: desk, start: "top bottom", end: "bottom top", scrub: true } });
    ScrollTrigger.create({ trigger: desk, start: "top 72%", once: true, onEnter: launch });
    on(root, "focusin", () => { P.user = true; launch(); }); // keyboard: wake as soon as focus enters, so the island and menu join the tab order
    // …and one stop earlier: when focus reaches the last tabbable before the desk, so forward Tab lands on the island
    const TAB = 'a[href],button,input,select,textarea,[tabindex]';
    const tabbable = (n) => n.tabIndex >= 0 && !n.disabled && !n.closest("[inert],[hidden],[aria-hidden='true']") && n.getClientRects().length > 0;
    on(document, "focusin", (e) => {
      if (P.launched || !(e.target.compareDocumentPosition(root) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
      const all = [...document.querySelectorAll(TAB)];
      const next = all.slice(all.indexOf(e.target) + 1).find(tabbable);
      if (!next || root.contains(next) || root.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING) { P.user = true; launch(); }
    });
    // hovering a fact refills its tick
    for (const li of $$(".yr-facts li")) on(li, "pointerenter", () => gsap.fromTo(li.querySelector(".yr-tick b"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "edit", overwrite: true }));
  }

  // ------------------------------------------------------------------ first paint from the store
  datum.textContent = MAT_LABEL[S.material];
  cap.innerHTML = MAT_CAP[S.material];
  desk.dataset.mat = S.material;
  desk.dataset.notch = S.notch;
  status.hidden = !S.menuBar;
  paintStatus();
  paintLid();
  if (!S.notch) gsap.set(notchEl, { scaleX: 0 });
  setPace(0, { user: false });

  return () => {
    offs.forEach((f) => f());
    timers.forEach(clearTimeout);
    clearInterval(clockId);
    ro.disconnect();
    moLens?.disconnect();
    lens.remove();
    stopLoops();
    P.tour?.kill();
    detachMenu();
    closeMenu();
    drag && drag.kill();
    if (P.busy && P.busy.kill) P.busy.kill();
    gsap.killTweensOf([knob, notchEl, full, status, shim, wake, wall, ptr, lever, ...menuParts(), ...$$(".yr-full > *"), ...$$(".yr-tick b")]);
    if (disp) disp.setAttribute("scale", String(base));
    if (termEl) termEl.innerHTML = termHTML;
    menuHome.insertBefore(menu, menuNext);
    menu.innerHTML = menuHTML;
    gsap.set([knob, notchEl, full, status, wake, lever, ptr], { clearProps: "all" });
    full.hidden = true;
    desk.classList.remove("is-full", "is-live", "is-show", "is-quit", "is-ctx");
    menu.style.removeProperty("--menu-top"); menu.style.removeProperty("--menu-left");
    desk.querySelector(".cm-banners")?.remove();
    fullLbl.textContent = FULL_OFF;
    fullBtn.classList.remove("is-on");
    busyBtn.removeAttribute("aria-disabled");
    isl?.destroy();
  };
}
