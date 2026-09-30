// The CTA contract, site-wide (sections only write markup):
//   data-cta="mac"      → the Mac dialog: an email for updates, then /ClaudeMeter.dmg downloads at once
//   data-cta="windows"  → the Windows waitlist dialog (name + email)
//   data-cta="github"   → the repo; a [data-stars] inside shows the live star count
// The dialog is one native <dialog> (modal: the page behind is inert, Esc and the backdrop close it,
// focus returns to the button that opened it) shaped like the island: it grows out of the band's notch.
// Signups POST form-encoded to the Apps Script in <meta name="cm-signup"> (web/signup-sheet.gs).
import { reduced } from "./motion.js";
import { lenis } from "./smooth.js";

export const REPO = "https://github.com/FreemanGT/claude-meter";
const API = "https://api.github.com/repos/FreemanGT/claude-meter";
const DMG = "/ClaudeMeter.dmg";
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;          // the same test signup-sheet.gs applies
const SPRING_OPEN = "linear(0,.017,.062,.127,.205,.29,.378,.466,.55,.629,.702,.766,.824,.873,.915,.949,.978,1,1.017,1.029,1.038,1.043,1.045,1.046,1.045,1.043,1.039,1.036,1.032,1.028,1.024,1.02,1.016,1.013,1.01,1.008,1.005,1.004,1.002,1.001,1)";
const SETTLE = "cubic-bezier(.2,.8,.2,1)";

const html = document.documentElement;
const isWindows = /Windows/.test(navigator.userAgent);
const get = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const fld = (f, n) => f.elements.namedItem(n);   // not f.name: that is the form's own name attribute
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const GH = '<svg class="su-gh__mark" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
const RING = '<span class="su-go__ring" aria-hidden="true"><svg viewBox="0 0 24 24"><circle class="trk" cx="12" cy="12" r="10"/><circle class="val" cx="12" cy="12" r="10" pathLength="100"/><path class="arrow" d="M12 7.5v8m-3.5-3.5L12 15.5l3.5-3.5"/></svg></span>';
const starNudge = `<div class="su-star"><p><strong>Claude Meter is open source.</strong> A star helps other Claude users find it.</p>
  <a class="su-gh" data-cta="github" href="${REPO}" target="_blank" rel="noopener">${GH}<span>Star</span><span class="su-gh__n" data-stars hidden></span></a></div>`;

/* ------------------------------------------------------------------ views */

const VIEWS = {
  mac: () => `
    <form class="su-form" novalidate>
      <p class="su-kicker">Download · v1.2</p>
      <h2 class="su-title" id="su-title" tabindex="-1">Where should we send <em>updates</em>?</h2>
      <p class="su-lede" id="su-lede">Leave your email and the download starts right away.</p>
      <label class="su-field"><span class="su-field__lbl">Email</span>
        <input name="email" type="email" required autofocus autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" aria-describedby="su-err"></label>
      ${HONEYPOT}
      <p class="su-err" id="su-err" hidden></p>
      <button class="su-go" type="submit">${RING}<span class="su-go__lbl">Download for Mac</span></button>
      <p class="su-fine">Updates and new versions only. No spam.</p>
      <p class="su-req">Free · v1.2 · macOS 14.4+ · Apple Silicon &amp; Intel · Needs Claude Code (Pro or Max)</p>
    </form>`,
  macDone: () => `
    <div class="su-done">
      <p class="su-kicker"><span class="su-dot" aria-hidden="true"></span>Downloading · ClaudeMeter.dmg</p>
      <h2 class="su-title" id="su-title" tabindex="-1">Downloading<em>…</em></h2>
      <p class="su-lede" id="su-lede">Open the DMG and drag Claude Meter to Applications. Then open it: it lives in your notch.</p>
      <p class="su-fine">Didn’t start? <a href="${DMG}" download data-su-again>Download again</a></p>
      ${starNudge}
      <button class="su-go su-go--quiet" type="button" data-su-close>Done</button>
    </div>`,
  windows: () => `
    <form class="su-form" novalidate>
      <p class="su-kicker">Windows · waitlist</p>
      <h2 class="su-title" id="su-title" tabindex="-1">Claude Meter for <em>Windows</em> is coming.</h2>
      <p class="su-lede" id="su-lede">Join the waitlist. One email, the day it ships.</p>
      <label class="su-field"><span class="su-field__lbl">Name</span>
        <input name="name" type="text" required autofocus autocomplete="name" maxlength="100" placeholder="Your name" aria-describedby="su-err"></label>
      <label class="su-field"><span class="su-field__lbl">Email</span>
        <input name="email" type="email" required autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" aria-describedby="su-err"></label>
      ${HONEYPOT}
      <p class="su-err" id="su-err" hidden></p>
      <button class="su-go" type="submit"><span class="su-go__lbl">Join the waitlist</span></button>
      <p class="su-fine">One email when it launches. No spam.</p>
      <p class="su-req">On a Mac too? <a href="${DMG}" data-cta="mac">Download for Mac</a></p>
    </form>`,
  windowsDone: ({ name, email }) => `
    <div class="su-done">
      <p class="su-kicker"><span class="su-dot" aria-hidden="true"></span>Windows · waitlist</p>
      <h2 class="su-title" id="su-title" tabindex="-1">You’re on the list, <em>${esc(name)}</em>.</h2>
      <p class="su-lede" id="su-lede">We’ll email ${esc(email)} the day Claude Meter for Windows ships.</p>
      ${starNudge}
      <button class="su-go su-go--quiet" type="button" data-su-close>Done</button>
    </div>`,
};
// Humans never see or reach it; bots fill it (the sheet then stores nothing).
const HONEYPOT = '<div class="su-hp" aria-hidden="true"><label>Company <input name="company" type="text" tabindex="-1" autocomplete="off"></label></div>';

/* ------------------------------------------------------------------ dialog */

let dlg, panel, body, opener = null, type = "mac", busy = false, closing = null;

function build() {
  dlg = document.createElement("dialog");
  dlg.className = "su";
  dlg.setAttribute("aria-labelledby", "su-title");
  dlg.setAttribute("aria-describedby", "su-lede");
  dlg.innerHTML = `<div class="su__panel">
      <div class="su__hd"><span class="su__app"><img src="/assets/favicon.png" alt="" width="14" height="14">Claude Meter</span><span class="su__gap"></span>
        <span class="su__hd-r"><button class="su__x" type="button" aria-label="Close" data-su-close><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7m0-7l-7 7"/></svg></button></span></div>
      <div class="su__body"></div>
    </div>`;
  document.body.append(dlg);
  panel = dlg.firstElementChild;
  body = panel.lastElementChild;

  dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });   // Esc: animate out
  dlg.addEventListener("close", cleanup);                                      // any close path (incl. a forced Esc)
  let downOnBackdrop = false;
  dlg.addEventListener("pointerdown", (e) => { downOnBackdrop = e.target === dlg; });
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg && downOnBackdrop) return close();
    if (e.target.closest("[data-su-close]")) close();
  });
  dlg.addEventListener("submit", onSubmit);
  dlg.addEventListener("input", (e) => { if (e.target.getAttribute("aria-invalid")) setError(null); });
}

function render(view, data = {}, { animate = false } = {}) {
  body.innerHTML = VIEWS[view](data);
  const saved = get("cm-signup") || {};
  const f = body.querySelector("form");
  if (f) {
    if (saved.email && fld(f, "email")) fld(f, "email").value = saved.email;
    if (saved.name && fld(f, "name")) fld(f, "name").value = saved.name;
  }
  paintStars(body);
  if (animate && !reduced() && body.animate) {
    body.animate([{ opacity: 0, transform: "scaleX(.6)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "none" }],
      { duration: 300, delay: 60, easing: SETTLE, fill: "backwards" });
  }
}

/** The housing the panel grows out of: the band notch (185pt at the nav island's scale). */
const notchScale = () => parseFloat(getComputedStyle(document.querySelector(".band") || html).getPropertyValue("--nav-scale")) || 1;
function housingClip() {
  const s = notchScale(), hw = Math.min((185 * s) / 2, panel.offsetWidth / 2);
  const bh = document.querySelector(".band")?.offsetHeight || 40;
  return `inset(0px calc(50% - ${hw}px) calc(100% - ${bh}px) calc(50% - ${hw}px) round 0px 0px ${10 * s}px ${10 * s}px)`;
}
const OPEN_CLIP = "inset(0px 0px 0px 0px round 0px 0px 30px 30px)";   // the panel's own corners
const SHADOW = ["0 34px 70px -24px rgb(0 0 0 / 0), 0 16px 36px rgb(0 0 0 / 0)", "0 34px 70px -24px rgb(0 0 0 / .6), 0 16px 36px rgb(0 0 0 / .3)"];

export function openSignup(kind = "mac", from = document.activeElement) {
  if (!dlg) build();
  if (closing) { closing = null; dlg.getAnimations({ subtree: true }).forEach((a) => a.cancel()); }
  type = kind === "windows" ? "windows" : "mac";
  busy = false;
  if (!dlg.open) opener = from;
  dlg.dataset.type = type;
  panel.style.setProperty("--gap", `${Math.round(185 * notchScale() + 12)}px`);   // the header keeps clear of the camera
  render(type);
  if (!dlg.open) {
    dlg.showModal();
    html.classList.add("su-open");
    lenis?.stop();
    if (!reduced() && panel.animate) {
      panel.animate([{ clipPath: housingClip() }, { clipPath: OPEN_CLIP }], { duration: 590, easing: SPRING_OPEN });
      dlg.animate([{ boxShadow: SHADOW[0] }, { boxShadow: SHADOW[1] }], { duration: 360, delay: 200, easing: SETTLE, fill: "backwards" });   // the shadow lands once the panel is out
      body.animate([{ opacity: 0, transform: "scaleX(.6)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "none" }],
        { duration: 300, delay: 60, easing: SETTLE, fill: "backwards" });
      dlg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: SETTLE, pseudoElement: "::backdrop" });
    } else if (panel.animate) panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
  }
  const af = body.querySelector("[autofocus]");
  af && af.focus({ preventScroll: true });
}

export function close() {
  if (!dlg?.open || closing) return;
  if (reduced() || !panel.animate) return dlg.close();
  body.animate([{ opacity: 1, transform: "none", filter: "none" }, { opacity: 0, transform: "scaleX(.3)", filter: "blur(4px)" }],
    { duration: 180, easing: SETTLE, fill: "forwards" });
  dlg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: SETTLE, fill: "forwards", pseudoElement: "::backdrop" });
  dlg.animate([{ boxShadow: SHADOW[1] }, { boxShadow: SHADOW[0] }], { duration: 160, easing: SETTLE, fill: "forwards" });
  closing = panel.animate([{ clipPath: OPEN_CLIP }, { clipPath: housingClip() }], { duration: 400, delay: 60, easing: "cubic-bezier(.3,0,.1,1)", fill: "forwards" });
  closing.onfinish = () => { closing = null; dlg.close(); };
}

function cleanup() {
  closing = null;
  dlg.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  html.classList.remove("su-open");
  lenis?.start();
  const back = opener;
  opener = null;
  if (back && back.isConnected && back.focus) back.focus({ preventScroll: true });
}

/* ------------------------------------------------------------------ submit */

function setError(msg, field) {
  const err = body.querySelector(".su-err");
  body.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));
  if (!err) return;
  err.hidden = !msg;
  err.textContent = msg || "";
  err.setAttribute("role", msg ? "alert" : "none");
  if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
}

function pending(on) {
  busy = on;
  const b = body.querySelector(".su-go");
  if (!b) return;
  b.disabled = on;
  b.classList.toggle("is-busy", on);
  b.setAttribute("aria-busy", String(on));
  const lbl = b.querySelector(".su-go__lbl");
  if (lbl) lbl.textContent = on ? "Joining…" : "Join the waitlist";
}

const endpoint = () => (document.querySelector('meta[name="cm-signup"]')?.content || "").trim();

function download() {
  const a = document.createElement("a");
  a.href = DMG;
  a.download = "";
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
}

async function onSubmit(e) {
  e.preventDefault();
  if (busy) return;
  const f = e.target, nameEl = fld(f, "name"), emailEl = fld(f, "email");
  const email = emailEl.value.trim();
  const name = nameEl ? nameEl.value.trim() : "";
  if (nameEl && !name) return setError("Tell us your name.", nameEl);
  if (!EMAIL.test(email)) return setError(email ? "That email doesn’t look right." : "Enter your email.", emailEl);
  setError(null);
  put("cm-signup", { email, name: name || get("cm-signup")?.name || "" });   // prefill next time (this browser only)

  const fields = { type, email, platform: navigator.userAgentData?.platform || navigator.platform || "", ref: document.referrer, company: fld(f, "company")?.value || "" };
  if (type === "windows") fields.name = name;
  const url = endpoint();
  const post = () => fetch(url, { method: "POST", mode: "no-cors", body: new URLSearchParams(fields) });

  if (type === "mac") {
    // The download never waits on the sheet, and never fails because of it.
    if (url) post().catch(() => {});
    else console.warn('[signup] <meta name="cm-signup"> is empty: Mac download continues, email not stored.');
    download();
    render("macDone", {}, { animate: true });
    body.querySelector(".su-title")?.focus({ preventScroll: true });
    return;
  }

  if (!url) {
    console.warn('[signup] <meta name="cm-signup"> is empty: the Windows waitlist cannot store signups yet.');
    return setError("Waitlist opens shortly — try again in a minute.");
  }
  pending(true);
  try {
    await post();                    // no-cors: an opaque response, so success = the request went out
    render("windowsDone", { name, email }, { animate: true });
    body.querySelector(".su-title")?.focus({ preventScroll: true });
  } catch {
    pending(false);
    setError("Couldn’t reach the waitlist. Check your connection and try again.");
  }
}

/* ------------------------------------------------------------------ GitHub stars */

let stars = null;   // number once known; stays null (numbers hidden) on failure, 404 or 0
const fmtStars = (n) => (n < 1000 ? String(n) : (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "") + "k");

function paintStars(scope = document) {
  scope.querySelectorAll('[data-cta="github"]').forEach((a) => {
    if (a.tagName === "A") {
      if (!a.getAttribute("href") || a.getAttribute("href") === "#") a.href = REPO;
      a.target = "_blank";
      a.rel = "noopener";
    }
    const n = a.querySelector("[data-stars]");
    if (!n) return;
    const show = stars > 0;
    n.hidden = !show;
    if (show) n.textContent = fmtStars(stars);
    const base = a.dataset.label ?? (a.dataset.label = a.getAttribute("aria-label") || "");
    if (base) a.setAttribute("aria-label", show ? `${base}, ${stars} ${stars === 1 ? "star" : "stars"}` : base);
  });
}

async function loadStars() {
  const c = get("cm-stars");
  if (c && Date.now() - c.t < (c.n > 0 ? 6 * 3600e3 : 10 * 60e3)) { stars = c.n; return paintStars(); }  // misses retry after 10 min
  try {
    const r = await fetch(API, { headers: { Accept: "application/vnd.github+json" } });
    const n = r.ok ? (await r.json()).stargazers_count : 0;
    stars = typeof n === "number" ? n : 0;
  } catch { stars = 0; }
  put("cm-stars", { n: stars, t: Date.now() });
  paintStars();
}

/* ------------------------------------------------------------------ init */

/** Binds the contract once per page (event delegation, so sections can re-render freely). */
export function initSignup() {
  if (isWindows) html.dataset.os = "windows";   // the head script sets it before paint; this is the fallback
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const t = e.target.closest?.('[data-cta="mac"], [data-cta="windows"]');
    if (!t) return;
    e.preventDefault();
    openSignup(t.dataset.cta, dlg?.open ? opener : t);
  });
  paintStars();
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  idle(() => loadStars(), { timeout: 3000 });
}
