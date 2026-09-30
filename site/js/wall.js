// §02 wall — two afternoons, same refactor (SPEC §9.2). One scrubbed timeline carries the continuous
// motion (typing, WALL squeeze, rewind, island drop, ink). Discrete beats (clocks, copy, island data and
// state, cursor) come from a keyframe table read on every update, so any scrub direction or jump lands
// on the right frame. The limit itself is time-based, because a scrub can't slam: it plays on the way
// in and runs backwards on the way out, which is also the first half of the rewind. Act Two ends on its
// mirror (HALT): the same red wall comes up again and stops short, under the line you stopped at.
// Nothing born in the scrub callback builds a GSAP tween or reads layout: copy, clocks and label run on
// WAAPI, the island camera on CSS transitions.

const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const clock = (m) => { m = Math.round(m); const h = Math.floor(m / 60); return [`${h % 12 || 12}:${String(m % 60).padStart(2, "0")}`, h < 12 ? "AM" : "PM"]; };
const numeral = (m) => { const [hm, ap] = clock(m); return `${hm}<span class="act__ap"> ${ap}</span>`; };
const T = (m) => `<span class="act__t">${numeral(m)}</span> `;

// The 5-hour window opens at 10:04 AM and resets at 3:04 PM. Unmetered, it runs out at 1:12 PM:
// locked out for 1h 52m. Metered, the forecast calls 1:12 at noon, 1h 12m ahead.
const START = toMin("10:04"), RESET = toMin("15:04"), HIT_MIN = toMin("13:12");
const COPY = [
  ["ACT ONE · NO METER", `${T(START)}Fresh window. <em>Big refactor.</em>`, "Nothing on screen says how much of it is left."],
  ["ACT ONE · NO METER", `${T(HIT_MIN)}Limit reached. <em>Mid‑file.</em>`, "Tests half‑migrated. Flow gone. Locked out till 3:04\u00a0PM."],
  ["ACT TWO · SAME DAY, WITH A METER", `${T(START)}Same <em>refactor.</em>`, "This time the notch is keeping count."],
  ["ACT TWO · SAME DAY, WITH A METER", `${T(toMin("12:00"))}It sees the wall <em>coming.</em>`, "At this pace you’re out at 1:12\u00a0PM. That’s 1h 12m to commit and write it down."],
  ["ACT TWO · SAME DAY, WITH A METER", `${T(toMin("12:50"))}Committed. <em>Notes written.</em>`, "Tests green. Part 1 in git. Next steps in HANDOFF.md."],
];

// Copy is pre-cut into masked words once (each word rises in its own clip), so a beat swap is an
// innerHTML write plus compositor transforms: no SplitText, no forced layout inside the scrub.
const EDIT = "cubic-bezier(.625,.05,0,1)", EXPO = "cubic-bezier(.16,1,.3,1)", IN = "cubic-bezier(.5,0,.75,0)";
const cut = (html) => {
  const src = document.createElement("template"), out = document.createElement("div");
  src.innerHTML = html;
  const mask = (node, block) => {
    const m = document.createElement("span"), i = document.createElement("span");
    m.className = block ? "wm wm--b" : "wm"; i.className = "wm__i";
    i.append(node); m.append(i); out.append(m);
  };
  [...src.content.childNodes].forEach((n) => {
    if (n.nodeType !== 3) return mask(n, n.classList?.contains("act__t"));
    n.data.split(/( +)/).forEach((w) => (w.trim() ? mask(document.createTextNode(w)) : w && out.append(w)));   // regular spaces only: "3:04 PM" keeps its nbsp
  });
  return out.innerHTML;
};
const CUT = COPY.map(([, h, s]) => [cut(h), cut(s)]);

// Session clocks: digits roll on beats (WAAPI) and are written flat while the rewind scrubs them back.
// The meridiem has its own fixed slot, so 12:38 → 1:01 never clips "PM" mid-roll.
const makeClock = (el) => {
  el.innerHTML = '<span class="wclk"></span> <span class="wclk__ap"></span>';
  const [hmEl, apEl] = el.children;
  let prev = "";
  return (min, { instant = false, dir = 1 } = {}) => {
    const [hm, ap] = clock(min);
    if (apEl.textContent !== ap) apEl.textContent = ap;
    if (hm === prev) return;
    const old = prev;
    prev = hm;
    if (instant || !old || !hmEl.animate) { hmEl.textContent = hm; return; }
    hmEl.textContent = "";
    const off = old.length - hm.length, y = 62 * dir;   // right-aligned: 12:38 → 1:01 compares 2:38 with 1:01
    [...hm].forEach((ch, i) => {
      const slot = document.createElement("span"), neu = document.createElement("span");
      neu.textContent = ch; slot.append(neu); hmEl.append(slot);
      const was = old[i + off];
      if (was === ch) return;
      neu.animate([{ transform: `translateY(${y}%) scale(.8)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 380, delay: i * 20, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
      if (was == null) return;
      const gone = document.createElement("span");
      gone.textContent = was; slot.append(gone);
      gone.animate([{ transform: "none", opacity: 1 }, { transform: `translateY(${-y}%) scale(.8)`, opacity: 0 }], { duration: 260, delay: i * 20, easing: IN, fill: "forwards" }).onfinish = () => gone.remove();
    });
  };
};

// Timeline map (progress 0..1).
const A_CLOCK = ["10:04", "10:21", "10:43", "11:05", "11:31", "11:52", "12:16", "12:38", "13:01"];
const A_AT = A_CLOCK.map((_, i) => 0.05 + i * (0.28 / 9));
const A_DUR = (0.28 / 9) * 0.8;
const HIT = 0.332;                       // the red line types, and sits there one beat
const IMPACT = 0.356;                    // the wall slams (time-based from here)
const RW0 = 0.44;                        // the impact runs backwards: letters sink, debris flies home, night drains
const RWU0 = 0.452, RWU1 = 0.52;         // then every line un-types, bottom to top, while the clocks race back
const ACT2 = 0.53;
const B_AT = [0.575, 0.588, 0.601, 0.614, 0.627, 0.64];
const B_PCT = [4, 12, 22, 33, 45, 55];
const C_AT = [0.8, 0.822, 0.844];        // Act B lines: commit, handoff, paused
const C_CLOCK = ["12:31", "12:41", "12:50"];
const C_PCT = [74, 79, 84];              // 84: still teal, one under the line
const PINNED = 0.862;
const HALT = 0.885;                      // the wall comes up again, and stops short (time-based, like the impact)
const REW = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];                 // un-type order (line index)
const SLOT = (RWU1 - RWU0) / REW.length;

const EVENTS = [
  { at: 0, min: START, beat: 0, pct: 4, burn: false, state: "collapsed" },
  ...A_AT.map((at, i) => ({ at, min: toMin(A_CLOCK[i]) })),
  { at: HIT, min: HIT_MIN },
  { at: IMPACT, beat: 1 },
  { at: RWU1, min: START },
  { at: ACT2, beat: 2 },
  ...B_AT.map((at, i) => ({ at, min: toMin(A_CLOCK[i]), pct: B_PCT[i] })),
  { at: 0.66, min: toMin("12:00"), pct: 60, burn: true, beat: 3, state: "peek" },   // 72m to 1:12 → amber
  { at: 0.74, min: toMin("12:13"), pct: 66 },                                       // 59m → red
  ...C_AT.map((at, i) => ({ at, min: toMin(C_CLOCK[i]), pct: C_PCT[i] })),
  { at: PINNED, beat: 4, state: "pinned" },                                         // 22m · resets in 2h 14m
];
const frameAt = (p) => EVENTS.reduce((s, e) => (e.at <= p ? Object.assign(s, e) : s), {});
// Which line carries the cursor: the last one started in this act, or the one being un-typed.
const ACT_A = [...A_AT.map((at, i) => [at, i]), [HIT, 9]];
const ACT_B = [...B_AT.map((at, i) => [at, i]), ...C_AT.map((at, i) => [at, 10 + i])];
const lastStarted = (list, p) => list.reduce((r, [at, i]) => (at <= p ? i : r), -1);
const cursorLine = (p) => (p < RWU0 ? lastStarted(ACT_A, p)
  : p < RWU1 ? REW[Math.min(REW.length - 1, Math.floor((p - RWU0) / SLOT))]
  : lastStarted(ACT_B, p));

export default function init(root, ctx) {
  const { gsap, ScrollTrigger, reduced, mobile, lib, Island } = ctx;
  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];
  const pin = q(".pin"), bezel = q(".bezel"), cam = q(".bezel__cam");
  // The island is laid out at scale S; the camera (.bezel__cam) only ever scales it DOWN to fit the
  // screen it hangs from, so its text never drops below 1x layout on phones.
  const total = (isl, s, S) => isl.size(s).w + (s === "collapsed" ? 12 : 38) * S;   // body + both top flares
  const baseData = (pct, min, burn) => ({
    plan: "Max 20x", updated: "just now",
    session: {
      pct, resetIn: (RESET - min) * 60,
      projected: burn ? 100 : null,
      forecast: burn ? { exhaustsIn: (HIT_MIN - min) * 60 } : null,   // 12:00 → 1h 12m amber · 12:13 → 59m red · 12:50 → 22m
      spark: lib.spark("wall-s", pct),
    },
    weekly: { pct: 38, reset: "Sat 1:05 PM", spark: lib.spark("wall-w", 38) },
    models: [{ name: "Opus", pct: 22, reset: "Sat 1:05 PM", spark: lib.spark("wall-o", 22) }],
  });

  // ---------------------------------------------------------------- reduced: static two panels
  if (reduced) {
    lib.pinScene(root, {});                              // → .is-static, no pin
    if (!Island) return;
    const S = mobile ? 1 : 1.25;
    const isl = new Island(cam, { scale: S, state: "pinned", bezel: true, interactive: false, live: false, data: baseData(84, toMin("12:50"), true) });
    const reserve = () => {
      const k = Math.min(1, bezel.clientWidth / total(isl, "pinned", S));
      cam.style.transform = k < 1 ? `scale(${k})` : "";
      bezel.style.height = `${Math.ceil(isl.size("pinned").h * k + 22)}px`;
    };
    const ro = new ResizeObserver(() => requestAnimationFrame(reserve));
    ro.observe(bezel);
    reserve();
    return () => { ro.disconnect(); isl.destroy(); bezel.style.height = ""; cam.style.transform = ""; };
  }

  // ---------------------------------------------------------------- live scene
  // Screen readers get a static copy of both acts; the animated layer (copy rewritten per beat,
  // lines masked mid-type) is hidden from them.
  const grid = q(".wall__grid"), title = q("#wall-title");
  const srCopy = grid.cloneNode(true);   // appended at the end of init, so no query below picks up its nodes
  srCopy.className = "sr-only";
  title.removeAttribute("id");
  grid.setAttribute("aria-hidden", "true");
  root.classList.add("is-live");

  const term = q(".term--a"), word = q(".wall__word"), ink = q(".wall__ink"), night = q(".wall__night"), bgBox = q(".wall__bg");
  const act = q(".wall__a .act"), sub = q(".wall__a .act__sub"), label = q(".wall__a .act__label");
  const note = q(".note"), chip = q(".term__chip"), scan = q(".term__scan"), close = q(".wall__b .wall__close");
  const flash = q(".wall__flash"), slab = q(".wall__slab"), slam = qa(".wall__slab i"), wrap = q(".wall__wrap"), slamBox = q(".wall__slam"), sign = q(".wall__sign"), ok = q(".wall__sign--ok");
  const arrowLine = qa(".wall__arrow-line"), arrowHead = qa(".wall__arrow-head");   // [halo, ink] pairs
  const lineEls = qa(".term--a .l"), linesBox = q(".term--a .term__lines"), body = q(".term--a .term__body");
  const tEls = lineEls.map((l) => l.querySelector(".l__t"));
  const nums = lineEls.map((l) => l.querySelector(".l__n"));
  const nChars = tEls.map((t) => t.textContent.length);
  tEls.forEach((t, i) => t.style.setProperty("--n", nChars[i]));
  const saved = { title: title.innerHTML, sub: sub.innerHTML, label: label.textContent, lines: lineEls.map((l) => l.innerHTML) };

  // Only the three lines that fall at the limit are split into characters (debris needs pieces).
  const splitChars = (el) => {
    const out = [];
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 1) return walk(n);
      if (n.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      for (const ch of n.data) { const s = document.createElement("span"); s.className = "c"; s.textContent = ch; frag.append(s); out.push(s); }
      n.replaceWith(frag);
    });
    walk(el);
    return out;
  };
  const debris = [6, 7, 8].flatMap((i) => splitChars(lineEls[i]));
  const hitLine = lineEls[9];

  const clocks = [makeClock(q(".term--a .term__clock")), makeClock(q(".wall__rhclock"))];
  clocks.forEach((set) => set(START));

  // Island: SPEC scale 1.5 on desktop, capped so the pinned panel spans the terminal it hangs from;
  // phones lay out at 1 and the camera scales down per state.
  const S = mobile ? 1 : Math.min(1.5, term.clientWidth / 560);
  let isl = null;
  if (Island) {
    isl = new Island(cam, { scale: S, bezel: true, interactive: false, live: false, data: baseData(4, START, false) });
    isl.lock(true);
    // Expanded, the panel covers the title bar: its dots and clock duck under it (the running head keeps the clock).
    isl.on("state", (s) => term.classList.toggle("is-under", s !== "collapsed"));
  }

  // Layout-derived numbers, measured once per refresh (never inside a tween or a scrub callback).
  let ROWS = mobile ? 10 : 14, lineH = 24, fits = {}, dropY = 80;
  const rowY = (rows) => (ROWS - Math.max(1, rows)) * lineH;
  const rel = (el) => { let x = 0, y = 0; for (let n = el; n && n !== pin; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
  const layout = () => {
    const lb = getComputedStyle(linesBox);
    lineH = parseFloat(lb.fontSize) * 1.6;
    ROWS = Math.round(parseFloat(lb.height) / lineH) || ROWS;           // CSS owns the row count (14 · 10 · 8 on short phones)
    const t = rel(term), h = rel(hitLine), hitY = h.y + rowY(10) + h.h / 2;
    const stacked = getComputedStyle(note).display === "none";          // ≤1023: headline over terminal, no margin note
    night.style.setProperty("--nx", `${h.x + 60}px`);
    night.style.setProperty("--ny", `${hitY}px`);
    // The sign bolts onto the wall exactly where the limit line printed.
    sign.style.left = `${t.x + t.w / 2}px`;
    sign.style.top = `${hitY}px`;
    // The slam word: as wide as the terminal's column (the full width, inside the edges, when stacked), standing on the floor.
    slab.style.fontSize = "100px";
    const em = slab.offsetWidth / 100;
    const fs = (stacked ? pin.clientWidth * 0.96 : t.x + t.w + 40) / em;
    slab.style.fontSize = `${fs}px`;
    // …and tall enough to bury everything below the screen's third row (cap height .675em, Anybody 900):
    // on a phone that means stretching the letters, which suits a wall.
    const top = t.y + 57 + 2.5 * lineH, ky = Math.min(2.4, Math.max(1, (pin.clientHeight - top) / (fs * 0.675)));
    slab.style.transform = `scaleY(${ky.toFixed(3)})`;
    // Act Two: the same wall rises from where it hides (yPercent 112) and stops short, under the close
    // line, always showing enough of itself to read. --rise is in the letters' own (unscaled) pixels.
    const sr = slab.getBoundingClientRect(), pr = pin.getBoundingClientRect(), c = rel(close);
    const stop = Math.round(Math.min(c.y + c.h + (stacked ? 14 : 30), pin.clientHeight - (stacked ? 58 : 84)));
    slab.style.setProperty("--rise", `${((sr.top - pr.top + 1.12 * sr.height - stop) / ky).toFixed(1)}px`);
    ok.style.left = `${t.x + t.w / 2}px`;
    ok.style.top = `${Math.round((stop + pin.clientHeight) / 2)}px`;
    if (!isl) return;
    ["collapsed", "peek", "pinned"].forEach((s) => { fits[s] = Math.min(1, term.clientWidth / total(isl, s, S)); });
    dropY = isl.size("collapsed").h + 30;
    if (stacked) return;
    const n = rel(note), k = fits.peek, pk = isl.size("peek");
    const sx = t.x + t.w / 2 + (pk.w * k) / 2 + 16, sy = t.y + (pk.h - 34 * S) * k;
    const ex = n.x - 14, ey = n.y + n.h * 0.55, dx = ex - sx;
    const c2x = ex - dx * 0.42, c2y = ey + 34;
    arrowLine.forEach((p) => p.setAttribute("d", `M${sx} ${sy} C${sx + dx * 0.4} ${sy - 44} ${c2x} ${c2y} ${ex} ${ey}`));
    const a = Math.atan2(ey - c2y, ex - c2x), L = 15;
    const tip = (da) => `${ex - L * Math.cos(a + da)} ${ey - L * Math.sin(a + da)}`;
    arrowHead.forEach((p) => p.setAttribute("d", `M${tip(0.5)} L${ex} ${ey} L${tip(-0.5)}`));
  };
  layout();
  ScrollTrigger.addEventListener("refreshInit", layout);

  // Rows scrolled up under an expanded island fade out (--wall-cut = its bottom edge, from the screen's top).
  // The camera's scale and the cut ride CSS transitions on the app's springs (open bouncy, close smooth).
  const goState = (s) => {
    if (!isl) return;
    const k = fits[s] ?? 1;
    root.classList.toggle("is-shut", s === "collapsed");
    cam.style.scale = k < 1 ? k.toFixed(4) : "";
    body.style.setProperty("--wall-cut", `${s === "collapsed" ? 0 : Math.round(isl.size(s).h * k - 37 + 6)}px`);
    isl.setState(s);
  };

  // Copy swaps: masked words out, new words in (direction-aware), time-based. The limit beat is a hard
  // cut: a fast exit and a punchy entry. Each element keeps a token so an interrupted swap never lands.
  const swaps = new Map();
  const busy = (el) => swaps.get(el)?.busy;
  const rise = (els, from, to, { dur, ease, spread, fill }) => els.map((w, k) => w.animate([{ transform: from }, { transform: to }],
    { duration: dur, easing: ease, delay: els.length > 1 ? (k * spread) / (els.length - 1) : 0, fill }));
  const swapText = (el, html, dir, { hard = false, before } = {}) => {
    const r = swaps.get(el) || { tok: 0 };
    swaps.set(el, r);
    const tok = ++r.tok;
    el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    el.classList.add("is-swap");
    r.busy = true;
    const enter = () => {
      if (tok !== r.tok) return;
      before?.();
      el.innerHTML = html;
      const a = rise([...el.querySelectorAll(".wm__i")], `translateY(${118 * dir}%)`, "none",
        { dur: hard ? 450 : 700, ease: hard ? EXPO : EDIT, spread: hard ? 110 : 240, fill: "backwards" });
      const last = a[a.length - 1];
      const done = () => { if (tok === r.tok) { el.classList.remove("is-swap"); r.busy = false; } };
      if (last) last.onfinish = done; else done();
    };
    const out = rise([...el.querySelectorAll(".wm__i")], "none", `translateY(${-118 * dir}%)`,
      { dur: hard ? 100 : 220, ease: IN, spread: hard ? 40 : 90, fill: "forwards" });
    if (out.length) out[out.length - 1].onfinish = enter; else enter();
  };
  // The act label cross-fades (only two mono labels on the page scramble; this isn't one).
  const setLabel = (l) => {
    label.getAnimations().forEach((a) => a.cancel());
    const fade = label.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: IN, fill: "forwards" });
    fade.onfinish = () => {
      label.textContent = l;
      fade.cancel();
      label.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" });
    };
  };
  const setCopy = (i, dir) => {
    const [l] = COPY[i], [h, s] = CUT[i];
    if (label.textContent !== l) setLabel(l);
    swapText(title, h, dir, { hard: i === 1, before: () => act.classList.toggle("is-hit", i === 1) });
    swapText(sub, s, dir, { hard: i === 1 });
  };
  // During the limit beat the headline's numeral follows the clock (it races back in the rewind).
  const writeNumeral = (min) => {
    const t = title.querySelector(".act__t");
    if (t && !busy(title)) t.innerHTML = numeral(min);
  };

  // ---------------------------------------------------------------- the impact (time-based)
  const seeded = (i) => { const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); };
  gsap.set(slam, { yPercent: 112 });
  gsap.set(sign, { autoAlpha: 0, scale: 1.6, rotation: -8 });   // a set, not fromTo+immediateRender:false (that reverts to the CSS state on rewind)
  gsap.set(night, { "--nr": 0 });
  const impact = gsap.timeline({ paused: true })
    .to(night, { "--nr": 150, duration: 0.5, ease: "power3.out" }, 0)                  // night floods out of the red line
    .to(bgBox, { yPercent: 30, autoAlpha: 0, duration: 0.24, ease: "power2.in" }, 0)   // the squeezed gauge-word drops away
    .to(linesBox, { opacity: 0.3, duration: 0.3 }, 0.2)                                // the work recedes behind the wall
    .to(debris, { y: 70, rotation: (i) => seeded(i) * 40 - 20, autoAlpha: 0, duration: 0.36, ease: "power2.in", stagger: { amount: 0.14 } }, 0)
    .to(slam, { yPercent: 0, duration: 0.3, ease: "power4.in", stagger: 0.05 }, 0.06)   // W-A-L-L, four thuds
    .to(sign, { autoAlpha: 1, scale: 1, rotation: -2, duration: 0.18, ease: "power4.in" }, 0.52);   // then the notice is stamped on
  // Forward crossing only: the frame jolts, the letters land, the screen flushes red for 300ms.
  const fx = () => lib.untracked(() => {
    gsap.fromTo(term, { x: 0 }, { keyframes: { x: [0, -6, 5, -3, 0] }, duration: 0.12, ease: "none" });
    gsap.timeline({ delay: 0.36 })
      .set(flash, { opacity: 0.92 })
      .to(flash, { opacity: 0, duration: 0.3, ease: "power2.in" })
      .fromTo([wrap, slamBox], { y: 0 }, { keyframes: { y: [0, 8, -5, 3, -1, 0] }, duration: 0.26, ease: "none", clearProps: "transform" }, 0)
      .fromTo(slamBox, { y: 0 }, { keyframes: { y: [0, 4, -2, 0] }, duration: 0.14, ease: "none", clearProps: "transform" }, 0.34);   // the stamp lands
  });

  // ---------------------------------------------------------------- the halt (time-based, Act Two's mirror)
  // Same four letters, same floor. This time they lunge up, strain past the mark and settle short of the
  // work: no shake, no flash, no night. Then the plate goes on, teal.
  const LUNGE = lib.spring({ duration: 0.55, bounce: 0.3 });
  gsap.set(slam, { "--up": 0 });
  gsap.set(ok, { autoAlpha: 0, scale: 1.25, rotation: -7 });
  const halt = gsap.timeline({ paused: true })
    .to(word, { yPercent: 40, autoAlpha: 0, duration: 0.3, ease: "power2.in" }, 0)      // the gauge-word gives way, as in Act One
    .to(slam, { "--up": 1, duration: LUNGE.duration, ease: LUNGE.ease, stagger: 0.045 }, 0.1)
    .to(ok, { autoAlpha: 1, scale: 1, rotation: -2, ...lib.SPR.open }, 0.5);

  // ---------------------------------------------------------------- discrete beats
  let cur = {};
  const apply = (p) => {
    const f = frameAt(p);
    const rewinding = p >= RWU0 && p < RWU1;
    const min = rewinding ? HIT_MIN - Math.round((HIT_MIN - START) * ((p - RWU0) / (RWU1 - RWU0))) : f.min;
    if (min !== cur.min) {
      clocks.forEach((r) => r.set(min, { instant: rewinding }));   // a scrubbed run-back writes digits; beats roll them
      if (f.beat === 1 && cur.beat === 1) writeNumeral(min);
    }
    if (cur.beat == null) {
      [label.textContent, title.innerHTML, sub.innerHTML] = COPY[f.beat];
      act.classList.toggle("is-hit", f.beat === 1);
    } else if (f.beat !== cur.beat) setCopy(f.beat, f.beat > cur.beat ? 1 : -1);

    const on = p >= IMPACT && p < RW0;
    if (on !== cur.on) {
      if (cur.on === undefined) impact.progress(on ? 1 : 0);
      else if (on) { impact.timeScale(1).play(); if (cur.p < IMPACT) fx(); }
      else impact.timeScale(1.7).reverse();
      lib.setNight("wall", on);
      root.classList.toggle("is-night", on);
    }
    const rw = p >= RW0 && p < RWU1 + 0.01;
    if (rw !== cur.rw) chip.classList.toggle("is-rw", rw);   // the chip only spins while it shows

    const ik = p >= ACT2 ? `${f.pct}|${f.min}|${f.burn}` : cur.ik;
    if (isl && ik !== cur.ik) isl.update(baseData(f.pct, f.min, f.burn));
    if (f.state !== cur.state) goState(f.state);
    const notch = p >= ACT2;
    if (notch !== cur.notch) term.classList.toggle("has-notch", notch);

    const cl = cursorLine(p);
    if (cl !== cur.cl) {
      lineEls[cur.cl]?.classList.remove("is-cur");
      lineEls[cl]?.classList.add("is-cur");
      term.classList.toggle("is-idle", cl < 0);
    }
    cur = { p, min, beat: f.beat, on, rw, ik, state: f.state, notch, cl };
  };

  // ---------------------------------------------------------------- scrubbed timeline
  const css = getComputedStyle(root);
  const tok = (n) => css.getPropertyValue(n).trim();
  gsap.set(tEls, { "--k": 0 });
  gsap.set(nums.filter(Boolean), { autoAlpha: 0 });
  gsap.set(linesBox, { y: rowY(1) });
  gsap.set(cam, { y: -dropY });
  gsap.set([note, close, chip, scan], { autoAlpha: 0 });
  gsap.set(term, { "--hot": 0 });
  gsap.set(body, { "--cut": "0px" });
  gsap.set(lineEls.slice(10), { visibility: "hidden" });                        // Act B's lines wait for their act
  const drawable = [...arrowLine, ...arrowHead, ...qa(".note__check path, .wall__zig path")];
  gsap.set(drawable, { drawSVG: "0%" });

  // Type line i: the cover steps back one cell at a time; the block scrolls so the newest row sits last.
  const type = (tl, i, at, dur, row) => {
    tl.to(linesBox, { y: () => rowY(row), duration: 0.005, ease: "power2.out" }, at);
    tl.to(tEls[i], { "--k": 1, duration: dur, ease: `steps(${nChars[i]})` }, at);
    if (nums[i]) tl.to(nums[i], { autoAlpha: 1, duration: 0.0001 }, at + dur);
  };

  const scene = lib.pinScene(root, {
    length: "300%", mobileLength: "210%", scrub: 0.8,
    build(tl) {
      tl.eventCallback("onUpdate", () => lib.untracked(() => apply(tl.progress())));   // roller/island tweens born here are transient
      // FILL — Act A types in; the WALL squeezes and greys; the terminal edge warms.
      A_AT.forEach((at, i) => type(tl, i, at, A_DUR, i + 1));
      tl.to(word, { "--sq": 1, duration: IMPACT - 0.05 }, 0.05);
      tl.to(ink, { xPercent: -8, color: tok("--paper-3"), duration: IMPACT - 0.05 }, 0.05);
      tl.to(term, { "--hot": 0.35, duration: HIT - 0.05 }, 0.05);

      // HIT — the red line prints; the impact (time-based) takes it from IMPACT.
      type(tl, 9, HIT, 0.006, 10);
      tl.to(term, { "--hot": 1, duration: 0.004 }, HIT + 0.004);

      // REWIND — the impact has run backwards (debris home, letters down, night gone); now every line
      // un-types from the bottom, fast, with a tracking band running up the screen.
      tl.to(term, { "--hot": 0, duration: 0.02 }, RW0);
      tl.fromTo(chip, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.008, ease: "back.out(2)", immediateRender: false }, RW0 + 0.004);
      REW.forEach((i, k) => {
        const at = RWU0 + k * SLOT;
        if (nums[i]) tl.to(nums[i], { autoAlpha: 0, duration: 0.0001 }, at);
        tl.to(tEls[i], { "--k": 0, duration: SLOT * 0.9, ease: `steps(${nChars[i]})` }, at);
        tl.to(linesBox, { y: () => rowY(9 - k), duration: 0.004, ease: "power2.inOut" }, at + SLOT * 0.9);   // rows left
      });
      tl.fromTo(scan, { yPercent: 100, autoAlpha: 1 }, { yPercent: -12, duration: (RWU1 - RWU0) / 3, repeat: 2, ease: "none", immediateRender: false }, RWU0);
      tl.set(scan, { autoAlpha: 0 }, RWU1);
      tl.set(lineEls.slice(6, 10), { visibility: "hidden" }, RWU1 + 0.002);        // Act B reuses rows 7–9
      tl.set(lineEls.slice(10), { visibility: "visible" }, RWU1 + 0.002);
      tl.to(word, { "--sq": 0.1, duration: 0.07, ease: "island" }, 0.46);         // springs back past wdth 140: the overshoot shows
      tl.to(ink, { xPercent: 0, duration: 0.07, ease: "island" }, 0.46);
      tl.to(ink, { color: tok("--paper-2"), duration: 0.03 }, 0.46);
      tl.to(chip, { autoAlpha: 0, scale: 0.9, duration: 0.008 }, RWU1 + 0.002);

      // ACT TWO — the island drops out of the terminal's top edge; the same lines type again, metered.
      tl.fromTo(cam, { y: () => -dropY }, { y: 0, duration: 0.035, ease: "island", immediateRender: false }, ACT2);
      B_AT.forEach((at, i) => type(tl, i, at, 0.0105, i + 1));

      // FORECAST — arrow from the island's forecast to the margin note.
      tl.to(arrowLine, { drawSVG: "100%", duration: 0.028, ease: "power1.inOut" }, 0.664);
      tl.to(arrowHead, { drawSVG: "100%", duration: 0.008 }, 0.692);
      tl.to(note, { autoAlpha: 1, y: 0, duration: 0.02, startAt: { y: 14 } }, 0.672);

      // CLEAN STOP — commit, handoff, pause. Pinned; the arrow lifts and the note gets its tick.
      C_AT.forEach((at, i) => type(tl, 10 + i, at, 0.016, 7 + i));
      tl.to([...arrowLine, ...arrowHead], { drawSVG: "0%", duration: 0.014 }, PINNED - 0.01);
      tl.to(qa(".note__check path"), { drawSVG: "100%", duration: 0.014 }, PINNED + 0.006);

      // CLOSE — the line under the terminal, a teal zigzag through the WALL.
      tl.to(close, { autoAlpha: 1, y: 0, duration: 0.03, ease: "power2.out", startAt: { y: 24 } }, 0.92);
      tl.to(qa(".wall__zig path"), { drawSVG: "100%", duration: 0.05, ease: "power1.inOut" }, 0.94);
    },
  });
  apply(scene ? scene.tl.progress() : 0);
  wrap.append(srCopy);

  return () => {
    ScrollTrigger.removeEventListener("refreshInit", layout);
    swaps.forEach((r) => { r.tw?.kill(); r.split?.revert(); });
    gsap.killTweensOf([label, term, cam, body, flash, wrap, slamBox]);   // the untracked ones; the context reverts the rest
    chip.classList.remove("is-rw");
    gsap.set([cam, wrap, slamBox], { clearProps: "transform" });
    lib.setNight("wall", false);
    isl?.destroy();
    root.classList.remove("is-live", "is-night");
    srCopy.remove();
    grid.removeAttribute("aria-hidden");
    title.id = "wall-title";
    act.classList.remove("is-hit");
    lineEls.forEach((l, i) => { l.innerHTML = saved.lines[i]; l.classList.remove("is-cur"); });
    title.innerHTML = saved.title; sub.innerHTML = saved.sub; label.textContent = saved.label;
    slab.style.fontSize = ""; slab.style.transform = "";
    clocks.forEach((r) => { r.el.classList.remove("roller"); });
    q(".term--a .term__clock").textContent = "1:12 PM";
    q(".wall__rhclock").textContent = "10:04 AM";
    term.classList.remove("is-idle", "is-under", "has-notch");
  };
}
