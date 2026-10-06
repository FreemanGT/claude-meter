// Claude Meter island: a faithful web port of IslandView.swift / Theme.swift / NotchShape.swift.
// No hard dependencies: its own damped-spring engine (SwiftUI maths), WAAPI for pane squeezes and
// digit rolls. Uses window.gsap only to hand scenes a real timeline from modeTimeline().
// API and usage: web/FOUNDATION-ISLAND.md → "Island API".

const WARN = 85;                    // Theme.warn, strict >
const NOTCH_H = 32;                 // band height beside the housing (pt)
const BOX_W = 600;                  // drawing box width (pt); every state fits inside
const RANK = { hidden: -1, collapsed: 0, peek: 1, pinned: 2 };

import { fmtPct, fmtDur, fmtReset, fmtForecast, CLEARS } from "./format.js";
import { DEMO } from "./demo.js";

export { fmtPct, fmtDur, fmtReset, fmtForecast };

/** NotchShape.path (same as notch-path.js) plus an x offset and a unit scale k for CSS clip paths. */
function shapePath(w, h, rt, rb, x = 0, k = 1) {
  rb = Math.max(0, Math.min(rb, h - rt, (w - 2 * rt) / 2));
  const f = (n) => Math.round(n * k * 100) / 100;
  const L = x, R = x + w, a = L + rt, b = R - rt;
  return `M${f(L)} 0Q${f(a)} 0 ${f(a)} ${f(rt)}L${f(a)} ${f(h - rb)}Q${f(a)} ${f(h)} ${f(a + rb)} ${f(h)}` +
    `L${f(b - rb)} ${f(h)}Q${f(b)} ${f(h)} ${f(b)} ${f(h - rb)}L${f(b)} ${f(rt)}Q${f(b)} 0 ${f(R)} 0Z`;
}

const tintOf = (pct, base, warn = WARN) => (pct == null ? "dim" : pct > warn ? "red" : base);

/**
 * Every app rule in one pure function (IslandView.swift). `elapsed` = seconds since the data's
 * countdowns were anchored. Returns the view model the DOM is painted from.
 */
export function derive(data, { burnRate = true, labels = null, warn = WARN } = {}, elapsed = 0) {
  const L = labels || {};
  const left = (w) => (w.resetIn != null ? w.resetIn - elapsed : w.reset ?? null);
  const metric = (w, key, name, base, label) => {
    const pct = w?.pct ?? null;
    const raw = w ? fmtReset(left(w)) : " ";
    const wv = w?.warn ?? warn;   // a window may carry its own threshold (the nav island's session wing during the finale HIT)
    return {
      key, name, base, pct, label: w?.label ?? label ?? name,
      tone: tintOf(pct, base, wv), hot: pct != null && pct > wv,
      reset: w?.caption ?? raw, rawReset: raw, spark: w?.spark ?? null, href: w?.href ?? null,
    };
  };
  const s = data.session, wk = data.weekly;
  const session = metric(s, "session", "Session", "teal", L.session);
  const weekly = metric(wk, "weekly", "Weekly", "lav", L.weekly);
  const models = (data.models || []).map((m) => metric(m, "m:" + m.name, m.name, "amber"));
  const top = models.reduce((a, m) => (a == null || (m.pct ?? -1) > (a.pct ?? -1) ? m : a), null);
  const right = weekly; // the app's default pair: session + weekly (its menu can add or swap in the model)

  // Session burn-rate forecast (session only).
  let forecast = null;
  const f = burnRate ? s?.forecast : null;
  if (f?.text) forecast = { text: f.text, tone: f.tone || "muted" };
  else if (f?.clears) forecast = { text: CLEARS, tone: "muted" };
  else if (f?.exhaustsIn != null) {
    const sec = f.exhaustsIn - elapsed;
    forecast = { text: fmtForecast(sec), tone: sec < 3600 ? "red" : "amber" };
  }
  const projected = burnRate && s?.projected != null && s.pct != null && Math.min(100, s.projected) > s.pct + 1
    ? Math.min(100, s.projected) : null;

  // Bottom note: problem > limit reached > (pinned only) session forecast.
  const all = [session, weekly, ...models];
  const hit = all.find((m) => m.pct != null && m.pct >= 100);
  let notePeek = null;
  if (data.note?.text) notePeek = { text: data.note.text, tone: data.note.tone || "dim" };
  else if (hit) notePeek = { text: `${hit.name} limit reached` + (hit.rawReset.trim() ? ` · ${hit.rawReset}` : ""), tone: "red" };
  const notePinned = notePeek || (forecast ? { text: `Session ${forecast.text}`, tone: forecast.tone } : null);

  const cols = [session, weekly, top || metric(null, "m:", "Model", "amber", L.model)];
  if (L.model && top) top.label = L.model;
  let rows = data.rows
    ? data.rows.map((r, i) => metric(r, "r:" + i, r.label, r.tone || "teal"))
    : [session, weekly, ...(models.length ? models : [metric(null, "m:", "Model", "amber")])];
  rows = rows.map((r, i) => ({ ...r, showReset: i === 0 || r.reset !== rows[i - 1].reset }));

  const say = (m, name) => `${name} ${Math.round(m.pct)} percent`;
  const parts = [session.pct != null && say(session, "session"), right.pct != null && say(right, right === weekly ? "weekly" : right.name)].filter(Boolean);
  const aria = [L.aria || "Claude usage", ...parts].join(", ");
  const describe = (m) => {
    if (m.pct == null) return `${m.label}, no data`;
    const p = [`${m.label}, ${Math.round(m.pct)} percent`];
    if (m.reset.trim()) p.push(m.reset);
    if (m.key === "session" && forecast) p.push(forecast.text);
    return p.join(", ");
  };

  const byKey = {};
  for (const m of [...all, ...cols, ...rows]) byKey[m.key] ??= m;
  return { session, weekly, models, top, right, cols, rows, byKey, forecast, projected, notePeek, notePinned, aria, describe };
}

// ---------------------------------------------------------------------------------------------
// Springs (SwiftUI: omega = 2π/duration, damping ratio = 1 - bounce)
// ---------------------------------------------------------------------------------------------

const SPRING = {
  open: { dur: 0.4, bounce: 0.3 },   // .bouncy(0.4)
  close: { dur: 0.4, bounce: 0 },    // .smooth(0.4)
  soft: { dur: 0.25, bounce: 0 },    // .smooth(0.25): display toggle
};

function stepSpring(s, dt) {
  const w = (2 * Math.PI) / s.dur, z = 1 - s.bounce, k = w * w, c = 2 * z * w;
  const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
  let busy = false;
  for (const key in s.t) {
    let x = s.x[key], v = s.v[key] || 0;
    const t = s.t[key];
    if (x === t && v === 0) continue;
    for (let i = 0; i < n; i++) { v += (-k * (x - t) - c * v) * h; x += v * h; }
    if (Math.abs(x - t) < s.eps && Math.abs(v) < s.eps * 8) { x = t; v = 0; } else busy = true;
    s.x[key] = x; s.v[key] = v;
  }
  return busy;
}

/** Spring sampled into a CSS/WAAPI linear() easing. */
function springEasing(dur, bounce, steps = 40) {
  const s = { dur, bounce, eps: 1e-4, x: { p: 0 }, v: {}, t: { p: 1 } };
  const pts = [0];
  let t = 0;
  while (stepSpring(s, 1 / 120) && t < 2) { t += 1 / 120; pts.push(s.x.p); }
  pts.push(1);
  const stride = Math.max(1, Math.floor(pts.length / steps));
  const out = pts.filter((_, i) => i % stride === 0).map((p) => +p.toFixed(3));
  out.push(1);
  return { easing: `linear(${out.join(",")})`, ms: Math.round(t * 1000) };
}

const HAS_LINEAR = typeof CSS !== "undefined" && CSS.supports?.("animation-timing-function", "linear(0, 1)");
const ROLL = HAS_LINEAR ? springEasing(0.38, 0.18) : { easing: "cubic-bezier(.2,.8,.2,1)", ms: 450 };
const SETTLE = "cubic-bezier(.2,.8,.2,1)";

/** The "island" ease for scrubbed morphs: M0,0 C.14,.56 .22,1.1 .46,1.07 C.64,1.04 .78,.995 1,1 */
function islandEase(p) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const seg = p < 0.46 ? [0, 0, 0.14, 0.56, 0.22, 1.1, 0.46, 1.07] : [0.46, 1.07, 0.64, 1.04, 0.78, 0.995, 1, 1];
  const bz = (a, b, c, d, t) => ((1 - t) ** 3) * a + 3 * ((1 - t) ** 2) * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
  let lo = 0, hi = 1, t = 0.5;
  for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (bz(seg[0], seg[2], seg[4], seg[6], t) < p) lo = t; else hi = t; }
  return bz(seg[1], seg[3], seg[5], seg[7], t);
}

// ---------------------------------------------------------------------------------------------
// Shared environment: reduced motion, fine pointer, live ticker, visibility
// ---------------------------------------------------------------------------------------------

const mq = (q) => (typeof matchMedia === "function" ? matchMedia(q) : { matches: false });
const MQ_REDUCE = mq("(prefers-reduced-motion: reduce)");
const MQ_FINE = mq("(hover: hover) and (pointer: fine)");
const LIVE = new Set();
let liveTimer = 0;
function liveSync() {
  if (LIVE.size && !liveTimer) liveTimer = setInterval(() => {
    if (document.hidden) return;
    for (const isl of LIVE) if (isl._visible) isl._tick();
  }, 5000);
  if (!LIVE.size && liveTimer) { clearInterval(liveTimer); liveTimer = 0; }
}
let io = null;
const observe = (isl) => {
  io ??= typeof IntersectionObserver === "function"
    ? new IntersectionObserver((es) => es.forEach((e) => { e.target._island && (e.target._island._visible = e.isIntersecting); }), { rootMargin: "10%" })
    : null;
  io?.observe(isl.el);
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let uid = 0;

const PIN_SVG = `<svg class="i-pin" viewBox="0 0 8 10" aria-hidden="true"><path d="M2 .6h4v.9l-.6.4v2.6l1.5 1.4v.9H4.4V10h-.8V6.8H1.1v-.9l1.5-1.4V1.9l-.6-.4z"/></svg>`;

function sparkPaths(vals) {
  if (!vals || vals.length < 2) return null;
  const peak = Math.max(10, ...vals), n = vals.length;
  const pts = vals.map((v, i) => [2 + (i / (n - 1)) * 40, 2 + (1 - clamp(v, 0, peak) / peak) * 10].map((c) => +c.toFixed(2)));
  const line = "M" + pts.map((p) => p.join(" ")).join("L");
  return { line, area: `M${pts[0][0]} 14L${line.slice(1)}L${pts[n - 1][0]} 14Z` };
}

/** Rolling digits (Alcove): changed characters slide in from the direction of change. */
function setNum(el, text, dir, animate) {
  const old = el._t ?? el.textContent;
  if (old === text) return;
  el._t = text;
  if (!animate || !el.animate) { el.textContent = text; return; }
  el.textContent = "";
  const off = old.length - text.length;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], was = old[i + off];
    const slot = document.createElement("span");
    slot.className = "i-rl";
    const inn = document.createElement("span");
    inn.textContent = ch;
    slot.append(inn);
    el.append(slot);
    if (ch === was) continue;
    const y = dir >= 0 ? 62 : -62;
    inn.animate([{ transform: `translateY(${y}%) scale(.8)`, filter: "blur(3px)", opacity: 0 }, { transform: "none", filter: "blur(0)", opacity: 1 }],
      { duration: ROLL.ms, delay: i * 18, easing: ROLL.easing, fill: "backwards" });
    if (was != null) {
      const out = document.createElement("span");
      out.className = "i-rl-o";
      out.textContent = was;
      out.setAttribute("aria-hidden", "true");
      slot.append(out);
      out.animate([{ transform: "none", opacity: 1, filter: "blur(0)" }, { transform: `translateY(${-y}%) scale(.8)`, opacity: 0, filter: "blur(3px)" }],
        { duration: 260, delay: i * 18, easing: SETTLE, fill: "forwards" }).onfinish = () => out.remove();
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------------------------------

const DEFAULTS = {
  scale: 2, maxScale: 2, state: "collapsed", display: "percent", material: "solid", notch: true, notchWidth: 185,
  bezel: false, burnRate: true, interactive: true, hint: false, live: true, labels: null, touchPeek: true, data: DEMO,
};

export class Island {
  constructor(host, options = {}) {
    this.host = host;
    this.opts = { ...DEFAULTS, ...options };
    this.data = structuredClone(this.opts.data);
    delete this.opts.data;
    this.state = this.opts.state;
    this._id = `isl${++uid}`;
    this._fns = {};
    this._t0 = performance.now();
    this._rev = { p: false, x: false };
    this._g = { dur: 0.4, bounce: 0, eps: 0.02, x: {}, v: {}, t: {} };
    this._v = { dur: 0.5, bounce: 0, eps: 0.02, x: {}, v: {}, t: {} };
    this._waiters = [];
    this._frame = this._frame.bind(this);
    this._away = true;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    this._build();
    this._scale(this.opts.scale === "fit" ? this._fitScale() : this.opts.scale);
    if (this.state === "peek" || this.state === "pinned") this._rev[this.state === "peek" ? "p" : "x"] = true;
    this._sync({ roll: false, snap: true });
    this._retarget(true);
    this._stateDom();
    this._panes(true);
    if (this.opts.live) { LIVE.add(this); liveSync(); }
    this._visible = true;
    observe(this);
    if (this.opts.scale === "fit" && typeof ResizeObserver === "function") {
      this._ro = new ResizeObserver(() => this._refit());
      this._ro.observe(host);
    }
  }

  // ---------------------------------------------------------------- public API

  get el() { return this._el; }

  setState(s, { instant = false } = {}) {
    if (!(s in RANK)) throw new Error(`Island: unknown state "${s}"`);
    this._unscrub();
    const prev = this.state;
    if (s === prev && !this._geoBusy) return Promise.resolve();
    this.state = s;
    if (s === "collapsed" && this._pendingScale != null) { this._scale(this._pendingScale); this._pendingScale = null; }
    if (s === "peek" && !this._rev.p) this._reveal("p");
    if (s === "pinned" && !this._rev.x) this._reveal("x");
    Object.assign(this._g, RANK[s] > RANK[prev] ? SPRING.open : SPRING.close);
    const done = this._retarget(instant);
    this._stateDom();
    this._panes(instant);
    if (s !== prev) this._emit("state", s, prev);
    return done;
  }

  /** Paused, linear-time timeline for scrubbing from → to (GSAP timeline when available). */
  modeTimeline(from, to) {
    const apply = (p) => this._scrubTo(from, to, p);
    const g = globalThis.gsap;
    if (g?.timeline) {
      const o = { p: 0 };
      return g.timeline({ paused: true }).to(o, { p: 1, duration: 1, ease: "none", onUpdate: () => apply(o.p) });
    }
    let cur = 0;
    return { progress(p) { if (p === undefined) return cur; cur = clamp(p, 0, 1); apply(cur); return this; }, duration: () => 1, pause() { return this; }, kill() {} };
  }

  /** Deep-merge a data patch; rings/bars spring over `duration`, digits roll. */
  update(patch = {}, { duration = 0.5, roll = true } = {}) {
    this._bake();
    this.data = merge(this.data, patch);
    this._v.dur = Math.max(0.05, duration);
    this._sync({ roll: roll && !this._reduced() });
  }

  /** Scrub path: mutate this.data, then render(). Writes rounded values directly, never rolls. */
  render() { this._sync({ roll: false, snap: true }); }

  setOption(key, value) {
    if (key === "scale") {
      if (this.state === "collapsed") this._scale(value); else this._pendingScale = value;
      return;
    }
    if (key === "data") return this.update(value);
    this.opts[key] = value;
    if (key === "material") { this._el.dataset.material = value; this._litAway(); }
    if (key === "live") { value ? LIVE.add(this) : LIVE.delete(this); liveSync(); }
    this._el.dataset.notch = this.opts.notch;
    this._el.dataset.display = this.opts.display;
    Object.assign(this._g, key === "display" ? SPRING.soft : SPRING.close);
    this._sync({ roll: false });
    this._retarget(false);
    this._draw();
  }

  lock(on = true) {
    this._locked = !!on;
    clearTimeout(this._tIn); clearTimeout(this._tOut);
    if (this._hit) this._hit.tabIndex = on ? -1 : 0;
    this._nudge();
  }

  pulse() {
    if (this._reduced() || !this._zoom.animate) return;
    const u = this._u;
    this._zoom.animate([0, -2, 2, -1, 0].map((x) => ({ translate: `${x * u}px 0` })), { duration: 120, easing: "linear" });
  }

  quit() {
    this._quit = true;
    this.setState("hidden");
    clearTimeout(this._tQuit);
    this._tQuit = setTimeout(() => {
      if (this.state !== "hidden") return;
      this._relaunchBtn.hidden = false;
      this._relaunchBtn.animate?.([{ opacity: 0, transform: "translate(-50%, -6px)" }, { opacity: 1, transform: "translate(-50%, 0)" }], { duration: 320, easing: SETTLE });
    }, this._reduced() ? 0 : 900);
    this._emit("interact", { type: "quit" });
  }

  relaunch() {
    this._quit = false;
    clearTimeout(this._tQuit);
    this._relaunchBtn.hidden = true;
    this._emit("interact", { type: "relaunch" });
    return this.setState("collapsed");
  }

  /** Current size in px for a state (hosts can reserve space). */
  size(state = this.state) {
    const g = this._geom(state);
    return { w: (g.w - 2 * g.rt) * this._u, h: g.h * this._u };
  }

  on(type, fn) {
    (this._fns[type] ||= new Set()).add(fn);
    if (type === "contextmenu") this._ensureMore();
    return this;
  }
  off(type, fn) { this._fns[type]?.delete(fn); return this; }

  destroy() {
    cancelAnimationFrame(this._raf); cancelAnimationFrame(this._litRaf);
    [this._tIn, this._tOut, this._tQuit, this._tLong].forEach(clearTimeout);
    LIVE.delete(this); liveSync();
    io?.unobserve(this._el);
    this._ro?.disconnect();
    document.removeEventListener("keydown", this._onDocKey);
    removeEventListener("pointermove", this._onMove);
    this._el.remove();
    this._fns = {};
  }

  // ---------------------------------------------------------------- DOM

  _build() {
    const o = this.opts, id = this._id;
    const el = (this._el = document.createElement("div"));
    el.className = "island";
    el._island = this;
    el.dataset.material = o.material;
    el.dataset.notch = o.notch;
    el.dataset.display = o.display;
    el.innerHTML = `
      <div class="island__zoom">
        <div class="island__box">
          <div class="island__sh" aria-hidden="true"></div>
          <div class="island__bd" aria-hidden="true"></div>
          <svg class="island__shape" aria-hidden="true" preserveAspectRatio="none">
            <defs>
              <linearGradient id="${id}-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient>
              <radialGradient id="${id}-hot" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="150"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".45" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/></radialGradient>
            </defs>
            <path class="isl-focus"/><path class="isl-focus isl-focus--ink"/><path class="isl-fill"/><path class="isl-rim" stroke="url(#${id}-rim)"/><path class="isl-hot" stroke="url(#${id}-hot)"/>
          </svg>
          <div class="island__clip">
            <div class="i-pane i-pane--c" aria-hidden="true"></div>
            <div class="i-pane i-pane--p" role="group"></div>
            <div class="i-pane i-pane--x" role="table"></div>
          </div>
        </div>
      </div>
      <div class="island__housing" aria-hidden="true">${o.bezel ? '<i class="i-lens"></i>' : ""}</div>
      <button class="island__relaunch" type="button" hidden>Quit. (It’s that easy.) Relaunch <span aria-hidden="true">↺</span></button>
      <p class="island__sr" role="status"></p>`;
    const $ = (s) => el.querySelector(s);
    this._zoom = $(".island__zoom");
    this._box = $(".island__box");
    this._sh = $(".island__sh");
    this._bd = $(".island__bd");
    this._svg = $(".island__shape");
    this._pFill = $(".isl-fill"); this._pRim = $(".isl-rim"); this._pHot = $(".isl-hot"); this._pFocus = $(".isl-focus"); this._pFocusInk = $(".isl-focus--ink");
    this._hotGrad = $(`#${id}-hot`);
    this._clip = $(".island__clip");
    this._pane = { c: $(".i-pane--c"), p: $(".i-pane--p"), x: $(".i-pane--x") };
    this._sr = $(".island__sr");
    this._relaunchBtn = $(".island__relaunch");
    this._relaunchBtn.addEventListener("click", () => this.relaunch());
    this._pane.x.id = `${id}-panel`;

    if (o.interactive) {
      const hit = (this._hit = document.createElement("button"));
      hit.type = "button";
      hit.className = "island__hit";
      hit.setAttribute("aria-expanded", "false");
      hit.setAttribute("aria-controls", `${id}-panel`);
      this._zoom.append(hit);
      this._bindInteraction();
    } else {
      el.setAttribute("role", "img");
    }
    this.host.append(el);
  }

  _bindInteraction() {
    const hit = this._hit, fine = () => MQ_FINE.matches;
    hit.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "touch") return;
      this._hover = true; this._nudge(); this._hoverIn();
    });
    hit.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "touch") return;
      this._hover = false; this._press = false; this._nudge(); this._hoverOut();
    });
    hit.addEventListener("pointerdown", (e) => {
      this._ptype = e.pointerType;
      if (e.button === 0) { this._press = true; this._nudge(); }
      if (e.pointerType === "touch") {
        clearTimeout(this._tLong);
        this._tLong = setTimeout(() => { this._suppress = true; this._context(e.clientX, e.clientY, "longpress"); }, 500);
      }
    });
    const up = () => { this._press = false; this._nudge(); clearTimeout(this._tLong); };
    hit.addEventListener("pointerup", up);
    hit.addEventListener("pointercancel", up);
    hit.addEventListener("click", (e) => this._click(e));
    hit.addEventListener("focus", () => { if (hit.matches(":focus-visible")) this._hoverIn(); });
    hit.addEventListener("blur", () => { if (!this._hover) this._hoverOut(); });
    hit.addEventListener("contextmenu", (e) => {
      if (!this._fns.contextmenu?.size) return;
      e.preventDefault();
      clearTimeout(this._tLong);
      if (e.button === -1 || (e.clientX === 0 && e.clientY === 0)) {  // keyboard: ContextMenu key / Shift+F10
        const r = hit.getBoundingClientRect();
        this._context(r.right - 8, r.top + r.height / 2, "keyboard");
      } else this._context(e.clientX, e.clientY, "pointer");
    });
    this._pane.x.addEventListener("click", (e) => { if (!e.target.closest("a")) this._click(e); });

    // Like the app: a pinned island stays pinned until it is clicked again (no outside-click or Escape
    // collapse). Escape only folds a peek away.
    this._onDocKey = (e) => {
      if (e.key !== "Escape" || this._locked || this.state !== "peek") return;
      if (!this._el.contains(document.activeElement) && !this._hover) return;
      this._user("collapsed");
      if (this._el.contains(document.activeElement)) hit.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", this._onDocKey);

    this._onMove = (e) => {
      this._mvE = e;
      if (!this._mvRaf) this._mvRaf = requestAnimationFrame(() => { this._mvRaf = 0; this._light(this._mvE); });
    };
    if (fine()) addEventListener("pointermove", this._onMove, { passive: true });
  }

  _ensureMore() {
    if (this._more || !this._hit) return;
    const b = (this._more = document.createElement("button"));
    b.type = "button";
    b.className = "island__more";
    b.setAttribute("aria-label", "Island settings");
    b.setAttribute("aria-haspopup", "menu");
    b.innerHTML = "<i></i><i></i><i></i>";
    b.addEventListener("click", () => { const r = b.getBoundingClientRect(); this._context(r.left, r.bottom + 4, "button"); });
    this._el.append(b);
    this._draw();
  }

  _context(x, y, source) {
    if (this._locked) return;
    this._emit("contextmenu", { x, y, source, island: this });
  }

  // Structure changes rebuild pane markup; everything else is patched in place.
  _sync({ roll = false, snap = false } = {}) {
    const vm = (this._vm = derive(this.data, this.opts, this.opts.live ? (performance.now() - this._t0) / 1000 : 0));
    const o = this.opts;
    const key = JSON.stringify([o.notch, o.display, o.burnRate, o.hint, o.notchWidth, vm.right.key,
      vm.cols.map((c) => c.key + c.label), vm.rows.map((r) => r.key + r.label + (r.href || "")),
      !!vm.forecast, !!vm.notePeek, !!vm.notePinned, !!this.data.cta, !!this.data.note?.attention, o.labels?.table]);
    const rebuilt = key !== this._skey;
    if (rebuilt) { this._skey = key; this._markup(vm); }
    this._patch(vm, roll && !rebuilt);
    // value springs
    const t = this._v.t;
    for (const k in vm.byKey) t[k] = vm.byKey[k].pct ?? 0;
    t.prj = vm.projected ?? vm.session.pct ?? 0;
    t["rv:p"] = this._rev.p ? 1 : this._v.t["rv:p"] ?? 0;
    t["rv:x"] = this._rev.x ? 1 : this._v.t["rv:x"] ?? 0;
    for (const k in t) this._v.x[k] ??= snap || !roll ? t[k] : 0;
    if (snap || this._reduced()) { for (const k in t) { this._v.x[k] = t[k]; this._v.v[k] = 0; } this._paintValues(); }
    else this._kick("v");
    if (rebuilt) { this._paintValues(); if (this._g.t.w != null) this._retarget(this._reduced()); }
    if (this._hit) this._hit.setAttribute("aria-label", vm.aria);
    else this._el.setAttribute("aria-label", vm.aria);
  }

  _markup(vm) {
    const o = this.opts, P = this._pane;
    const nn = !o.notch;
    const cw = this._geom("collapsed").w;
    const metricC = (m) => o.display === "percent"
      ? `<span class="i-cnum i-num" data-pct="${esc(m.key)}"></span>`
      : `<span class="i-tick"><i data-tick="${esc(m.key)}"></i></span>`;
    const att = this.data.note?.attention ? '<i class="i-att"></i>' : "";
    P.c.style.setProperty("--pw", cw);
    P.c.innerHTML = nn
      ? `<span class="i-cm" data-m="session">${metricC(vm.session)}${att}</span><i class="i-dv"></i><span class="i-cm" data-m="${esc(vm.right.key)}">${metricC(vm.right)}</span>`
      : `<span class="i-lane i-lane--l" data-m="session">${metricC(vm.session)}${att}</span><span class="i-lane i-lane--r" data-m="${esc(vm.right.key)}">${metricC(vm.right)}</span>`;
    P.c.classList.toggle("i-is-nn", nn);

    const header = (pin) => `<div class="i-hd"><span class="i-hd-l" data-plan></span>${nn ? "" : '<span class="i-hd-gap"></span>'}<span class="i-hd-r"><span data-updated></span>${pin ? PIN_SVG : ""}</span></div>`;
    const note = (n) => (n ? `<div class="i-note" data-note><i></i><span></span></div>` : "");
    const ring = (m) => `
      <div class="i-col" role="group" data-m="${esc(m.key)}" data-col="${esc(m.key)}">
        <span class="i-ring" aria-hidden="true"><svg viewBox="0 0 54 54"><circle class="i-trk" cx="27" cy="27" r="27"/>${m.key === "session" ? '<circle class="i-prj" cx="27" cy="27" r="27" pathLength="100" data-prj/>' : ""}<circle class="i-val" cx="27" cy="27" r="27" pathLength="100" data-ring="${esc(m.key)}"/></svg><span class="i-rv i-num" data-pct="${esc(m.key)}"></span></span>
        <span class="i-lbl" aria-hidden="true">${esc(m.label)}</span>
        <span class="i-cap" aria-hidden="true" data-reset="${esc(m.key)}"></span>
        ${vm.forecast ? `<span class="i-fc" aria-hidden="true" data-fc="${esc(m.key)}"></span>` : ""}
      </div>`;
    P.p.style.setProperty("--pw", this._geom("peek").w);
    P.p.setAttribute("aria-label", o.labels?.aria || "Claude usage");
    P.p.innerHTML = header(false) + `<div class="i-rings">${vm.cols.map(ring).join("")}</div>` + note(vm.notePeek);

    const links = vm.rows.some((r) => r.href) || !!this.data.cta;
    const row = (r, i) => {
      const sp = o.burnRate ? sparkPaths(r.spark) : null;
      const tag = r.href ? "a" : "div";
      return `<${tag} class="i-row" role="row" data-m="${esc(r.key)}"${r.href ? ` href="${esc(r.href)}"` : ""}>
        <span class="i-r-lbl" role="rowheader">${esc(r.label)}</span>
        ${o.burnRate ? `<svg class="i-spk" viewBox="0 0 44 14" aria-hidden="true">${sp ? `<path class="i-spk-a" d="${sp.area}"/><path class="i-spk-l" d="${sp.line}"/>` : ""}</svg>` : ""}
        <span class="i-bar" aria-hidden="true"><i class="i-fill" data-bar="${esc(r.key)}"></i>${r.key === "session" ? '<i class="i-ptk" data-ptk></i>' : ""}</span>
        <span class="i-r-pct i-num" role="cell" data-pct="${esc(r.key)}"></span>
        <span class="i-r-rst" role="cell" data-rr="${i}"></span>
      </${tag}>`;
    };
    const table = o.labels?.table;
    P.x.style.setProperty("--pw", this._geom("pinned").w);
    P.x.setAttribute("role", table && links ? "navigation" : "table");
    P.x.setAttribute("aria-label", table || "Claude usage limits");
    P.x.classList.toggle("i-has-links", links);
    P.x.innerHTML = header(true) + `<div class="i-rows" role="rowgroup">${vm.rows.map(row).join("")}</div>` + note(vm.notePinned) +
      (o.hint ? `<p class="i-hint">Hover to peek · click to pin · right-click for settings &amp; Quit</p>` : "") +
      (this.data.cta ? `<a class="i-cta-row" href="${esc(this.data.cta.href)}"${this.data.cta.cta ? ` data-cta="${esc(this.data.cta.cta)}"` : ""}>${esc(this.data.cta.label)}</a>` : "");

    const q = (s) => [...this._el.querySelectorAll(s)];
    this._q = {
      m: q("[data-m]"), pct: q("[data-pct]"), ring: q("[data-ring]"), prj: q("[data-prj]"), bar: q("[data-bar]"),
      tick: q("[data-tick]"), ptk: q("[data-ptk]"), reset: q("[data-reset]"), rr: q("[data-rr]"), fc: q("[data-fc]"),
      col: q("[data-col]"), plan: q("[data-plan]"), upd: q("[data-updated]"), note: q("[data-note]"), row: q(".i-row"),
    };
  }

  _patch(vm, roll) {
    const Q = this._q, prev = this._prevPct || {};
    for (const el of Q.m) { const m = vm.byKey[el.dataset.m]; if (!m) continue; el.dataset.tone = m.tone; el.dataset.base = m.base; el.classList.toggle("i-is-hot", m.hot); }
    for (const el of Q.pct) {
      const m = vm.byKey[el.dataset.pct];
      const was = prev[el.dataset.pct];
      setNum(el, fmtPct(m?.pct), (m?.pct ?? 0) >= (was ?? 0) ? 1 : -1, roll && was != null && m?.pct != null);
    }
    this._prevPct = Object.fromEntries(Object.entries(vm.byKey).map(([k, m]) => [k, m.pct]));
    for (const el of Q.reset) el.textContent = vm.byKey[el.dataset.reset]?.reset ?? " ";
    for (const el of Q.rr) { const r = vm.rows[+el.dataset.rr]; el.textContent = r?.showReset ? r.reset : " "; }
    for (const el of Q.fc) {
      const on = el.dataset.fc === "session" && vm.forecast;
      el.textContent = on ? vm.forecast.text : " ";
      el.dataset.tone = on ? vm.forecast.tone : "muted";
    }
    for (const el of Q.col) el.setAttribute("aria-label", vm.describe(vm.byKey[el.dataset.col]));
    for (const el of Q.row) el.setAttribute("aria-label", vm.describe(vm.byKey[el.dataset.m]));
    for (const el of Q.plan) el.textContent = this.data.plan ?? "";
    for (const el of Q.upd) el.textContent = this.data.updated ?? "";
    for (const el of Q.note) {
      const n = el.closest(".i-pane--p") ? vm.notePeek : vm.notePinned;
      if (!n) continue;
      el.dataset.tone = n.tone;
      el.lastElementChild.textContent = n.text;
    }
  }

  _paintValues() {
    const Q = this._q, x = this._v.x, vm = this._vm;
    if (!Q || !vm) return;
    const rvp = clamp(x["rv:p"] ?? 1, 0, 1), rvx = clamp(x["rv:x"] ?? 1, 0, 1);
    for (const el of Q.ring) {
      const m = vm.byKey[el.dataset.ring], p = clamp(x[el.dataset.ring] ?? 0, 0, 100) * rvp;
      el.style.strokeDasharray = `${p} 100`;
      el.style.opacity = m?.pct == null || p < 0.05 ? 0 : 1;
    }
    const sp = clamp(x.session ?? 0, 0, 100);
    for (const el of Q.prj) {
      const len = vm.projected == null ? 0 : Math.max(0, clamp(x.prj, 0, 100) - sp) * rvp;
      el.style.strokeDasharray = `${len} 100`;
      el.style.strokeDashoffset = -sp * rvp;
      el.style.opacity = len > 0.05 ? "" : 0;
    }
    for (const el of Q.bar) {
      const m = vm.byKey[el.dataset.bar];
      el.style.setProperty("--f", (clamp(x[el.dataset.bar] ?? 0, 0, 100) / 100) * rvx);
      el.style.opacity = m?.pct == null ? 0 : "";
    }
    for (const el of Q.tick) {
      const m = vm.byKey[el.dataset.tick];
      el.style.setProperty("--f", clamp(x[el.dataset.tick] ?? 0, 0, 100) / 100);
      el.style.opacity = m?.pct == null ? 0 : "";
    }
    for (const el of Q.ptk) {
      el.style.setProperty("--pj", clamp(x.prj ?? 0, 0, 100) / 100);
      el.style.opacity = vm.projected == null ? 0 : rvx;
    }
  }

  // ---------------------------------------------------------------- geometry & motion

  /** Designed size per state, in pt (heights are exact sums of the CSS line boxes). */
  _geom(s) {
    const o = this.opts, N = o.notchWidth, vm = this._vm;
    const pct = o.display === "percent";
    if (s === "collapsed" || s === "hidden") {
      if (s === "hidden") return o.notch ? { w: N, h: NOTCH_H, rt: 6, rb: 14 } : { w: 64, h: 24, rt: 6, rb: 14 };
      return o.notch ? { w: N + 2 * (pct ? 46 : 40), h: NOTCH_H, rt: 6, rb: 14 } : { w: (pct ? 34 : 26) * 2 + 21 + 28, h: 24, rt: 6, rb: 14 };
    }
    const hd = o.notch ? NOTCH_H : 12 + 13;
    if (s === "peek") {
      const body = 12 + 54 + 6 + 2 + 14 + 2 + 13 + (vm?.forecast ? 15 : 0);
      return { w: Math.max(500, N + 240), h: hd + body + (vm?.notePeek ? 29 : 0) + 16, rt: 19, rb: 24 };
    }
    const n = vm?.rows.length ?? 3;
    const h = hd + 12 + n * 14 + (n - 1) * 8 + (vm?.notePinned ? 29 : 0) + (o.hint ? 21 : 0) + (this.data.cta ? 36 : 0) + 16;
    return { w: 560, h, rt: 19, rb: 24 };
  }

  _retarget(instant) {
    const g = this._geom(this.state);
    Object.assign(this._g.t, g);
    const hb = Math.ceil(Math.max(this._geom("pinned").h, this._geom("peek").h) + 40);
    if (hb !== this._hb) {
      this._hb = hb;
      this._el.style.setProperty("--hb", hb);
      this._svg.setAttribute("viewBox", `0 0 ${BOX_W} ${hb}`);
    }
    this._el.style.setProperty("--cw", this._geom("collapsed").w);
    this._el.style.setProperty("--ch", this._geom("collapsed").h);
    this._el.style.setProperty("--nw", this.opts.notchWidth);
    const p = new Promise((r) => this._waiters.push(r));
    if (instant || this._reduced()) {
      Object.assign(this._g.x, g);
      for (const k in g) this._g.v[k] = 0;
      this._draw();
      this._settle();
    } else this._kick("g");
    return p;
  }

  _settle() { this._geoBusy = false; const w = this._waiters; this._waiters = []; w.forEach((r) => r()); }

  _kick(which) {
    if (which === "g") this._geoBusy = true;
    if (which === "v") this._valBusy = true;
    if (!this._raf) { this._last = performance.now(); this._raf = requestAnimationFrame(this._frame); }
  }

  _frame(t) {
    const dt = Math.min(0.05, Math.max(0, (t - this._last) / 1000));
    this._last = t;
    if (this._geoBusy) { const busy = stepSpring(this._g, dt); this._draw(); if (!busy) this._settle(); }
    if (this._valBusy) { this._valBusy = stepSpring(this._v, dt); this._paintValues(); }
    this._raf = this._geoBusy || this._valBusy ? requestAnimationFrame(this._frame) : 0;
  }

  _draw() {
    const { w, h, rt, rb } = this._g.x;
    if (w == null) return;
    const u = this._u, ox = (BOX_W - w) / 2;
    const d = shapePath(w, h, rt, rb, ox);
    this._pFill.setAttribute("d", d);
    const open = d.slice(0, -1);  // rims stroke the sides and bottom only: the top edge is the screen's edge
    this._pRim.setAttribute("d", open);
    this._pHot.setAttribute("d", open);
    // Focus ring, two-tone like the global :focus-visible: teal (1–4px out), then ink (4–6px out), so it
    // clears 3:1 on paper (teal alone is 1.7:1 there) and still reads on night.
    const ring = (px) => { const fo = px / u; return shapePath(w + 2 * fo, h + fo, rt, rb + fo, ox - fo); };
    this._pFocus.setAttribute("d", ring(2.5));
    this._pFocusInk.setAttribute("d", ring(5));
    const cp = `path("${shapePath(w, h, rt, rb, ox, u)}")`;
    this._clip.style.clipPath = cp;
    if (this.opts.material !== "solid") { this._bd.style.clipPath = cp; this._bd.style.setProperty("--hpx", h * u + "px"); }
    // Shadow and hit area keep a fixed base box and scale to the shape: a morph frame writes transforms
    // only (no layout, no layout shift). Base = the largest state, so the scale stays ≤ 1 and crisp.
    const bw = Math.max(0, w - 2 * rt) * u, bh = h * u;
    const bk = u + ":" + this._hb;
    if (bk !== this._baseK) {
      this._baseK = bk;
      const P = this._geom("pinned"), K = this._geom("peek");
      this._baseW = Math.max(P.w - 2 * P.rt, K.w - 2 * K.rt) * u;
      this._baseH = Math.max(P.h, K.h) * u;
      for (const n of [this._sh, this._hit]) if (n) { n.style.width = this._baseW + "px"; n.style.height = this._baseH + "px"; }
    }
    const sx = bw / this._baseW, sy = bh / this._baseH;
    this._sh.style.transform = `translateX(-50%) scale(${sx}, ${sy})`;
    if (this._hit) this._hit.style.transform = `translateX(-50%) scale(${sx}, ${Math.max(bh, MQ_FINE.matches ? 0 : 32) / this._baseH})`;
    if (this._away) this._litTo(ox + rt, 0);
    if (this._more) this._more.style.transform = `translate(${(w / 2 - rt + 8) * u}px, ${(Math.min(h, NOTCH_H) / 2) * u}px)`;
  }

  _reveal(pane) {
    this._rev[pane] = true;
    const k = `rv:${pane}`;
    if (this._reduced()) { this._v.x[k] = this._v.t[k] = 1; return; }
    this._v.x[k] = 0; this._v.v[k] = 0; this._v.t[k] = 1;
    this._kick("v");
  }

  _stateDom() {
    const s = this.state, exp = s === "peek" || s === "pinned";
    this._el.dataset.state = s;
    if (this._hit) { this._hit.setAttribute("aria-expanded", exp); this._hit.hidden = s === "hidden"; }
    if (s !== "hidden" && this._relaunchBtn && !this._relaunchBtn.hidden) this._relaunchBtn.hidden = true;
    this._nudge();
  }

  _panes(instant) {
    const on = { collapsed: "c", peek: "p", pinned: "x" }[this.state];
    for (const k of ["c", "p", "x"]) this._paneTo(this._pane[k], k === on, instant, k === "c");
  }

  _paneTo(el, on, instant, alwaysHidden) {
    if (el._on === on && !instant) return;
    el._on = on;
    el.inert = !on;
    if (alwaysHidden || !on) el.setAttribute("aria-hidden", "true"); else el.removeAttribute("aria-hidden");
    if (el._a) { try { el._a.commitStyles(); } catch {} el._a.cancel(); el._a = null; }
    const R = this._reduced(), u = this._u;
    const end = on ? { opacity: 1, transform: "none", filter: "none" }
      : { opacity: 0, transform: R ? "none" : "scaleX(.3)", filter: R ? "none" : `blur(${4 * u}px)` };
    if (instant || !el.animate) { Object.assign(el.style, end); return; }
    const hiddenNow = el.style.opacity === "0";
    const kf = on && hiddenNow
      ? [{ opacity: 0, transform: R ? "none" : "scaleX(.6)", filter: R ? "none" : `blur(${8 * u}px)` }, end]
      : [end];
    const a = el.animate(kf, R ? { duration: 120, easing: "linear", fill: "forwards" }
      : on ? { duration: 300, delay: 60, easing: SETTLE, fill: "both" } : { duration: 180, easing: SETTLE, fill: "forwards" });
    el._a = a;
    a.onfinish = () => { try { a.commitStyles(); } catch {} a.cancel(); if (el._a === a) el._a = null; };
  }

  _scrubTo(from, to, p) {
    this._scrubbing = true;
    this._el.classList.add("is-scrub");
    cancelAnimationFrame(this._raf); this._raf = 0; this._geoBusy = false; this._valBusy = false;
    for (const k in this._v.t) { this._v.x[k] = this._v.t[k]; this._v.v[k] = 0; }
    const A = this._geom(from), B = this._geom(to), e = islandEase(p);
    for (const k in A) { this._g.x[k] = this._g.t[k] = A[k] + (B[k] - A[k]) * e; this._g.v[k] = 0; }
    this._draw();
    const s = p >= 0.5 ? to : from;
    if (s !== this.state) {
      const prev = this.state;
      this.state = s;
      this._stateDom();
      this._emit("state", s, prev);
    }
    // Panes: leave over [0, .3], enter over [.2, .7], so content lands while the shape settles
    // (the "island" ease is ~fully open by p ≈ .35). Same squeeze recipe as the interactive path.
    const key = { collapsed: "c", peek: "p", pinned: "x" }, u = this._u;
    const out = clamp(p / 0.3, 0, 1), inn = clamp((p - 0.2) / 0.5, 0, 1), ei = 1 - (1 - inn) ** 3;
    for (const k of ["c", "p", "x"]) {
      const el = this._pane[k];
      if (el._a) { el._a.cancel(); el._a = null; }
      let o = 0, sx = 0.3, bl = 4;
      if (key[from] === k && key[to] === k) { o = 1; sx = 1; bl = 0; }
      else if (key[from] === k) { o = 1 - out; sx = 1 - 0.7 * out; bl = 4 * out; }
      else if (key[to] === k) { o = inn; sx = 0.6 + 0.4 * ei; bl = 8 * (1 - inn); }
      el.style.opacity = o;
      el.style.transform = sx === 1 ? "none" : `scaleX(${sx})`;
      el.style.filter = bl < 0.05 ? "none" : `blur(${bl * u}px)`;
      el._on = key[s] === k;
      el.inert = !el._on;
    }
    if (key[to] === "p") this._rev.p = true;
    if (key[to] === "x") this._rev.x = true;
    this._v.x["rv:p"] = this._v.t["rv:p"] = this._rev.p ? 1 : 0;
    this._v.x["rv:x"] = this._v.t["rv:x"] = this._rev.x ? 1 : 0;
    this._paintValues();
  }

  _unscrub() {
    if (!this._scrubbing) return;
    this._scrubbing = false;
    this._el.classList.remove("is-scrub");
    for (const k in this._pane) this._pane[k]._on = undefined;  // re-animate from wherever the scrub left them
  }

  // ---------------------------------------------------------------- interaction

  _hoverIn() {
    if (this._locked || this.state !== "collapsed") return;
    clearTimeout(this._tOut); clearTimeout(this._tIn);
    this._tIn = setTimeout(() => {
      if (this._locked || this.state !== "collapsed") return;
      if (this._hover || this._hit.matches(":focus-visible")) this._user("peek");
    }, 200);
  }

  _hoverOut() {
    clearTimeout(this._tIn);
    if (this.state !== "peek") return;
    clearTimeout(this._tOut);
    this._tOut = setTimeout(() => {
      if (this._locked || this.state !== "peek" || this._hover || this._hit.matches(":focus-visible")) return;
      this._user("collapsed");
    }, 250);
  }

  _click(e) {
    if (this._locked) return;
    if (this._suppress) { this._suppress = false; return; }
    const touch = (e.pointerType || this._ptype) === "touch" && e.detail !== 0;
    clearTimeout(this._tIn);
    if (touch) {
      const next = { collapsed: this.opts.touchPeek ? "peek" : "pinned", peek: "pinned", pinned: "collapsed" }[this.state];
      if (next) this._user(next);
      return;
    }
    if (this.state === "pinned") {
      if (this.opts.hint) this.setOption("hint", false);  // they found the gesture; the hint has done its job
      this._user(this._hover || this._hit.matches(":focus-visible") ? "peek" : "collapsed");
    } else this._user("pinned");
  }

  _user(s) {
    this.setState(s);
    this._emit("interact", { type: "state", state: s });
    this._sr.textContent = s === "collapsed" ? "" : `${s === "pinned" ? "Pinned" : "Peek"}. ${this._vm.cols.map(this._vm.describe).join(". ")}.`;
  }

  _nudge() {
    const can = this.state === "collapsed" && !this._locked && !this._reduced() && MQ_FINE.matches;
    this._zoom.classList.toggle("is-hover", can && !!this._hover && !this._press);
    this._zoom.classList.toggle("is-press", can && !!this._press);
  }

  // Liquid Glass only: a 1.25pt specular rim lit from the pointer (top-left while the pointer is away).
  _light(e) {
    if (this.opts.material !== "glass" || this._reduced() || !this._visible) return;
    const r = this._box.getBoundingClientRect();
    if (!r.width) return;
    const k = r.width / BOX_W;
    const x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k;
    const { w, h, rt } = this._g.x;
    const dx = Math.max(0, Math.abs(x - BOX_W / 2) - (w / 2 - rt)), dy = Math.max(0, y - h);
    if (Math.hypot(dx, dy) * k > 220) return this._litAway();
    this._away = false;
    this._litTo(x, y);
  }

  _litAway() {
    this._away = true;
    const { w, rt } = this._g.x;
    if (w != null) this._litTo((BOX_W - w) / 2 + rt, 0);
  }

  /** Eases the rim light toward (x, y) in box units; snaps when motion is reduced. */
  _litTo(x, y) {
    this._litT = [x, y];
    if (!this._lit || this._reduced()) { this._lit = [x, y]; this._paintLit(); return; }
    if (this._litRaf) return;
    const step = () => {
      const [tx, ty] = this._litT, L = this._lit;
      L[0] += (tx - L[0]) * 0.22; L[1] += (ty - L[1]) * 0.22;
      const done = Math.abs(tx - L[0]) < 0.5 && Math.abs(ty - L[1]) < 0.5;
      if (done) { L[0] = tx; L[1] = ty; }
      this._paintLit();
      this._litRaf = done ? 0 : requestAnimationFrame(step);
    };
    this._litRaf = requestAnimationFrame(step);
  }

  _paintLit() {
    this._hotGrad.setAttribute("cx", this._lit[0].toFixed(1));
    this._hotGrad.setAttribute("cy", this._lit[1].toFixed(1));
  }

  // ---------------------------------------------------------------- misc

  _tick() {
    const before = this._skey;
    this._sync({ roll: false });
    if (this._skey !== before) this._retarget(false);
  }

  /** Fold elapsed time into the countdowns so a new anchor doesn't jump them back. */
  _bake() {
    if (!this.opts.live) return;
    const el = (performance.now() - this._t0) / 1000;
    const d = this.data;
    const dec = (w) => { if (w && w.resetIn != null) w.resetIn -= el; };
    dec(d.session); dec(d.weekly); (d.models || []).forEach(dec);
    if (d.session?.forecast?.exhaustsIn != null) d.session.forecast.exhaustsIn -= el;
    this._t0 = performance.now();
  }

  _scale(s) {
    this._u = +s || 2;
    this._el.style.setProperty("--u", `${this._u}px`);
    this._draw();
  }

  _fitScale() {
    const w = this.host.clientWidth || 600;
    return Math.round(clamp(w / (560 + 24), 0.5, this.opts.maxScale) * 100) / 100;
  }

  _refit() {
    const s = this._fitScale();
    if (s === this._u) return;
    if (this.state === "collapsed") this._scale(s); else this._pendingScale = s;
  }

  _reduced() { return MQ_REDUCE.matches; }

  _emit(type, ...args) { this._fns[type]?.forEach((fn) => fn(...args)); }
}

function merge(a, b) {
  if (b == null || typeof b !== "object" || Array.isArray(b)) return structuredClone(b);
  const out = a && typeof a === "object" && !Array.isArray(a) ? { ...a } : {};
  for (const k in b) out[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) ? merge(out[k], b[k]) : structuredClone(b[k]);
  return out;
}
