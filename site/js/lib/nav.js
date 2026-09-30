// The nav island: "the page has a limit too" (SPEC §5.3). Lives in the band's notch.
// Phones: the 560pt pinned table can't fit, so the island is display-only and a tap opens a
// full-width sheet (the same links, 44px rows) that grows out of the notch.
import { gsap, ScrollTrigger, untracked } from "./gsap.js";
import { SPR } from "./motion.js";
import { meter } from "./meter.js";
import { demo } from "./demo.js";

const fmtMS = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return m ? `${m}m ${s % 60}s` : `${s}s`; };
const NOOP = { island: null, pulse() {}, destroy() {}, show() {}, hide() {}, settle() {} };
const NOTE = "This one meters the page. The real one meters Claude.";
// The pinned table's last row follows the CTA contract (lib/signup.js): the waitlist on Windows.
const WIN = () => document.documentElement.dataset.os === "windows";
const CTA = () => (WIN() ? { href: "#waitlist", label: "Join the Windows waitlist", cta: "windows" } : { href: "/ClaudeMeter.dmg", label: "Download for Mac", cta: "mac" });

/**
 * initNav({ Island, reduced, mobile }) → { island, pulse(), show(), hide(), settle(), destroy() }
 * Never throws: if island.js is missing or broken the band simply keeps an empty notch.
 */
export function initNav({ Island, reduced, mobile }) {
  const host = document.getElementById("nav-notch");
  if (!host || typeof Island !== "function") return NOOP;
  const scale = mobile ? Math.min(1, (innerWidth - 112) / 277) : 1.25;
  document.querySelector(".band")?.style.setProperty("--nav-scale", scale);
  const wrap = document.createElement("div");
  wrap.className = "nav-island";
  host.append(wrap);

  // island.js labels mode: ring/row names + aria; per-window `caption` replaces the reset text,
  // session.forecast {text,tone} replaces the forecast, rows[] with href turn the pinned table into
  // the table of contents, cta adds the last row, note is the peek caption.
  const labels = { session: "Page", weekly: "Sections", model: "FAQ", aria: "This page", table: "Sections" };
  const S = meter.sections;
  let forecast = { text: "on track — resets first", tone: "muted" };
  const pageData = () => ({
    plan: "This page", updated: "just now",
    session: { pct: meter.display, caption: "resets at the top", forecast, spark: S.length ? S.map((s) => s.read) : null },
    weekly: { pct: meter.sectionsPct, caption: `${meter.sectionsRead} of ${S.length}` },
    models: [{ name: "FAQ", pct: (meter.faq.opened / meter.faq.total) * 100, caption: `${meter.faq.total} questions` }],
    rows: S.map((s) => ({ label: s.label, pct: s.read, spark: s.history.length > 1 ? s.history : null, caption: `§0${s.index}`, href: `#${s.id}`, tone: "teal" })),
    cta: CTA(),
    note: { text: NOTE, tone: "dim" },
  });

  let island;
  try {
    // warn 101: the page meter never turns red on its own; only the finale's HIT (meter.override) may.
    island = new Island(wrap, { scale, state: "collapsed", bezel: false, live: false, interactive: !mobile, touchPeek: !mobile, labels, warn: 101, data: demo() });
  } catch (e) {
    console.error("[nav] Island failed to construct", e);
    wrap.remove();
    return NOOP;
  }
  const sheet = mobile ? tocSheet(wrap, { reduced }) : null;
  // The island stays pinned until clicked (like the app), so following a TOC link folds it away.
  const onRow = (e) => { if (e.target.closest("a") && island.state === "pinned") island.setState("collapsed"); };
  island.el?.addEventListener("click", onRow);
  if (!sheet) {
    if (island.el) island.el.setAttribute("aria-describedby", "nav-hint");
    host.insertAdjacentHTML("beforeend", '<span id="nav-hint" class="sr-only">Menu: open the island</span>');
  }

  const sync = () => {
    const v = meter.velocity;
    const remaining = ScrollTrigger.maxScroll(window) - scrollY;
    if (v > 40 && remaining > 0) {
      const sec = remaining / v;
      forecast = { text: `hits the bottom in ${fmtMS(sec)}`, tone: sec < 60 ? "red" : "amber" };
    } else forecast = { text: "on track — resets first", tone: "muted" };
  };

  // Scrubbed path: mutate numbers + render(), throttled, only when a rounded value changes.
  let shown = false, last = "", t = 0, trail = 0;
  const onMeter = () => {
    if (!shown) return;
    const now = performance.now();
    clearTimeout(trail);
    if (now - t < 90) { trail = setTimeout(onMeter, 90 - (now - t)); return; } // trailing render: the last value always lands
    t = now;
    sync();
    const d = pageData();
    sheet && sheet.render(d);
    const warn = meter.overridden != null ? 85 : 101;
    if (island.opts.warn !== warn) island.setOption("warn", warn);
    const key = [d.session.pct, d.weekly.pct, d.models[0].pct].map(Math.round).join("|") + island.state + forecast.text;
    if (key === last) return;
    last = key;
    try { Object.assign(island.data, d); island.render(); } catch (e) { console.error("[nav] render", e); }
  };
  const unsub = meter.subscribe(onMeter);

  // Visibility: hidden while any [data-own-island] section owns the notch spot.
  // show/hide run in ScrollTrigger callbacks, so their tweens stay out of any gsap.context.
  const owners = new Set();
  const cap = document.querySelector(".band__caption");
  let first = true, capTl = null, capDone = false;
  const show = () => untracked(() => {
    gsap.to(wrap, { yPercent: 0, autoAlpha: 1, ...SPR.open, overwrite: true });
    // "NOW METERING: THIS PAGE", once — replayed on the next show if a section took the notch mid-caption.
    if (cap && !reduced && !capDone && !capTl) capTl = gsap.timeline({ onComplete: () => { capDone = true; capTl = null; } })
      .to(cap, { opacity: 1, duration: 0.3 }).to(cap, { opacity: 0, duration: 0.4 }, 3.4);
    if (first) {
      first = false;
      sync();
      try { island.update ? island.update(pageData(), { roll: true, duration: 0.6 }) : (Object.assign(island.data, pageData()), island.render()); } catch (e) { console.error(e); }
    }
    shown = true;
  });
  const hide = () => untracked(() => {
    shown = false;
    if (capTl) { capTl.kill(); capTl = null; gsap.to(cap, { opacity: 0, duration: 0.2 }); } // the caption never outlives the island it captions
    try { island.state !== "collapsed" && island.setState("collapsed", { instant: reduced }); } catch {}
    sheet && sheet.close();
    gsap.to(wrap, { yPercent: -130, autoAlpha: 0, ...SPR.close, overwrite: true });
  });
  // Created in settle() — after every section's pins exist, so positions include pin spacing.
  let sts = [];
  const watch = () => {
    sts = [...document.querySelectorAll("[data-own-island]")].map((sec) => ScrollTrigger.create({
      trigger: sec, start: "top 50%", end: "bottom bottom", refreshPriority: -10,
      onToggle: (self) => {
        self.isActive ? owners.add(sec) : owners.delete(sec);
        owners.size ? hide() : show();
      },
    }));
    sts.forEach((st) => st.isActive && owners.add(st.trigger));
  };
  gsap.set(wrap, { yPercent: -130, autoAlpha: 0 });

  return {
    island,
    pulse: () => island.pulse && island.pulse(),
    show, hide,
    /** Call once after all sections are initialised: watches [data-own-island] sections and shows the island unless one owns the notch. */
    settle: () => { if (!sts.length) watch(); if (!owners.size) show(); },
    destroy() {
      unsub(); clearTimeout(trail); capTl && capTl.kill(); cap && gsap.set(cap, { opacity: 0 }); sts.forEach((s) => s.kill());
      sheet && sheet.destroy();
      try { island.destroy && island.destroy(); } catch {}
      host.replaceChildren();
    },
  };
}

/** The phone TOC: a button over the island and a sheet under the band. → { render(d), close(), destroy() } */
function tocSheet(wrap, { reduced }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav-toc-btn";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "nav-toc");
  btn.setAttribute("aria-label", "Sections of this page");
  wrap.append(btn);

  const el = document.createElement("nav");
  el.id = "nav-toc";
  el.className = "nav-toc";
  el.setAttribute("aria-label", "Sections");
  el.hidden = true;
  el.innerHTML = `<div class="nav-toc__hd"><span>This page</span><span class="nav-toc__pct"></span></div>
    <ol class="nav-toc__list" role="list">${meter.sections.map((s) => `<li><a class="nav-toc__row" href="#${s.id}"${s.id === "stage" ? ' data-progress=".16"' : ""}>
      <span class="nav-toc__n">§0${s.index}</span><span class="nav-toc__lbl">${s.label}</span>
      <span class="nav-toc__bar" aria-hidden="true"><i></i></span><span class="nav-toc__v"></span></a></li>`).join("")}</ol>
    <p class="nav-toc__note">${NOTE}</p>
    <a class="nav-toc__dl" href="${CTA().href}" data-cta="${CTA().cta}">${CTA().label}</a>`;
  document.body.append(el);
  const rows = [...el.querySelectorAll(".nav-toc__row")];
  const pct = el.querySelector(".nav-toc__pct");

  const render = (d) => {
    if (el.hidden) return;
    pct.textContent = `${Math.round(d.session.pct)}% read`;
    d.rows.forEach((r, i) => {
      rows[i].style.setProperty("--f", (r.pct / 100).toFixed(3));
      rows[i].lastElementChild.textContent = `${Math.round(r.pct)}%`;
    });
  };
  let tl = null;
  const open = () => {
    el.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    render({ session: { pct: meter.display }, rows: meter.sections.map((s) => ({ pct: s.read })) });
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", key);
    tl && tl.kill();
    if (!reduced) tl = gsap.timeline()
      .fromTo(el, { clipPath: "inset(0% 30% 100% 30% round 0px 0px 18px 18px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px 0px 24px 24px)", ...SPR.open }, 0)
      .fromTo(el.querySelectorAll("li, .nav-toc__note, .nav-toc__dl"), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.025, ease: "settle", clearProps: "transform" }, 0.06);
    rows[0].focus({ preventScroll: true });
  };
  const close = ({ focus = false } = {}) => {
    if (el.hidden) return;
    btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outside, true);
    document.removeEventListener("keydown", key);
    tl && tl.kill();
    const done = () => { el.hidden = true; gsap.set(el, { clearProps: "clipPath" }); };
    if (reduced) done();
    else tl = gsap.to(el, { clipPath: "inset(0% 30% 100% 30% round 0px 0px 18px 18px)", ...SPR.close, duration: 0.3, onComplete: done });
    if (focus) btn.focus({ preventScroll: true });
  };
  const outside = (e) => { if (!el.contains(e.target) && !btn.contains(e.target)) close(); };
  const key = (e) => { if (e.key === "Escape") close({ focus: true }); };
  const toggle = () => (el.hidden ? open() : close({ focus: true }));
  const onLink = (e) => { if (e.target.closest("a")) close(); };   // bindAnchors (document) does the scrolling
  btn.addEventListener("click", toggle);
  el.addEventListener("click", onLink);

  return {
    render, close,
    destroy() { close(); tl && tl.kill(); btn.remove(); el.remove(); },
  };
}
