// The signup dialogs behind the CTA contract (lib/cta.js loads this on the first intent):
//   mac      an email for updates, then /ClaudeMeter.dmg downloads at once (never waits on the sheet)
//   windows  the waitlist (name + email)
// The Mac download asks for an email (the client's gate): a valid one downloads at once, anything else gets an
// inline message. Phones and tablets can't open a .dmg: their Mac dialog hands the link to their Mac (and saves
// the email, if one was given).
// One native <dialog> (modal: the page behind is inert, Esc and the backdrop close it, focus returns to
// the button that opened it), shaped like the island. Whatever island hangs in the notch tucks into its
// camera housing, the panel grows out of that housing, and on close it shrinks back in and the island
// grows out again. Signups POST form-encoded to the Apps Script in <meta name="cm-signup"> (web/signup-sheet.gs).
import { reduced, finePointer, HAS_LINEAR } from "./motion.js";
import { lenis, scrollTo } from "./smooth.js";
import { initCtas, paintStars, noMac, ARROW, REPO, DMG } from "./cta.js";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;          // the same test signup-sheet.gs applies
const SPRING_OPEN = "linear(0,.017,.062,.127,.205,.29,.378,.466,.55,.629,.702,.766,.824,.873,.915,.949,.978,1,1.017,1.029,1.038,1.043,1.045,1.046,1.045,1.043,1.039,1.036,1.032,1.028,1.024,1.02,1.016,1.013,1.01,1.008,1.005,1.004,1.002,1.001,1)";
const SETTLE = "cubic-bezier(.2,.8,.2,1)";
const OPEN_EASE = HAS_LINEAR ? SPRING_OPEN : SETTLE;
const SITE = document.querySelector('link[rel="canonical"]')?.href || "https://claudemeter.vercel.app/";
const SITE_NAME = SITE.replace(/^https?:\/\/|\/$/g, "");

const UA = navigator.userAgent;
const get = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const fld = (f, n) => f.elements.namedItem(n);   // not f.name: that is the form's own name attribute
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const motion = () => !reduced() && !!document.body.animate;

/* ------------------------------------------------------------------ views */

const OCTO = '<svg class="gh-chip__mark" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
const { down: DOWN, up: UP } = ARROW, CLOCK = "M12 7.5V12l3 2.2";
/** The site's CTA (lib/cta.js), on night: a light notch hanging from a hairline. */
const cta = (label, { type = "submit", meta = "", arrow = DOWN, attrs = "" } = {}) => `
  <div class="cta-hang cta-hang--night cta-hang--full"><button class="cta cta--l cta--night" type="${type}" ${attrs}>
    <svg class="cta__shape" aria-hidden="true"><path/><path class="rim-hot"/></svg>
    <span class="cta__row"><span class="cta__ring" aria-hidden="true"><svg viewBox="0 0 24 24"><circle class="trk" cx="12" cy="12" r="10"/><circle class="val" cx="12" cy="12" r="10" pathLength="100"/><path class="arrow" d="${arrow}"/></svg></span><span class="cta__label">${label}</span></span>
    <span class="cta__meta" aria-hidden="true">${meta}</span>
  </button></div>`;
/** A 22px ring that FILLS, then settles into a teal check. */
const tick = '<span class="su-tick" aria-hidden="true"><svg viewBox="0 0 24 24"><circle class="trk" cx="12" cy="12" r="10"/><circle class="val" cx="12" cy="12" r="10" pathLength="100"/><path class="chk" d="M7.6 12.3l3 3 5.9-6.2" pathLength="100"/></svg></span>';
const email = ({ label = "Email", required = false, auto = false } = {}) => `<label class="su-field"><span class="su-field__lbl">${label}</span>
  <input name="email" type="email"${required ? " required" : ""}${auto ? AUTO() : ""} autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com"></label>`;
/** Autofocus only with a mouse or trackpad: on a phone the keyboard would open over the panel on tap. */
const AUTO = () => (finePointer() ? " autofocus" : "");
// Bots fill it (the sheet then stores nothing). Not named "company": address autofill would fill that for real people.
const HONEYPOT = '<div class="su-hp" aria-hidden="true" inert><label>Leave this empty <input name="cm_hp" type="text" tabindex="-1" autocomplete="off"></label></div>';
const ERR = '<p class="su-err" id="su-err" aria-live="assertive"></p>';   // always present and live: announced once, when filled
const starNudge = `<div class="su-star"><p><strong>Claude Meter is open source.</strong> A star helps other Claude users find it.</p>
  <a class="gh-chip gh-chip--night" data-cta="github" href="${REPO}" target="_blank" rel="noopener" aria-label="Star: Claude Meter on GitHub (opens in a new tab)">${OCTO}<span class="gh-chip__t">Star</span><span class="gh-chip__n" data-stars hidden></span></a></div>`;
const doneBtn = '<button class="su-done-btn" type="button" data-su-close>Done</button>';

const VIEWS = {
  mac: () => `
    <form class="su-form" novalidate>
      <p class="su-kicker">Download · v1.2</p>
      <h2 class="su-title" id="su-title" tabindex="-1">Where should we send <em>updates</em>?</h2>
      <p class="su-lede" id="su-lede">Leave your email and the download starts right away.</p>
      ${email({ required: true, auto: true })}${HONEYPOT}${ERR}
      ${cta("Download for Mac", { meta: "ClaudeMeter.dmg · v1.2" })}
      <p class="su-fine">Used only for Claude Meter updates. <a href="#privacy">Kept in the maker’s Google Sheet, never shared or sold.</a></p>
      <p class="su-req"><span>Free · macOS 14.4+ ·</span> <span>Apple Silicon &amp; Intel ·</span> <span>Needs Claude Code (Pro or Max)</span></p>
    </form>`,
  // Phones and tablets: no .dmg; one tap sends the link to their Mac (and saves the email, if given).
  macAway: () => `
    <form class="su-form" novalidate>
      <p class="su-kicker">Mac app · v1.2</p>
      <h2 class="su-title" id="su-title" tabindex="-1">Get it on your <em>Mac</em>.</h2>
      <p class="su-lede" id="su-lede">It’s a Mac app, so it installs on your Mac, not this ${/iPad/.test(UA) || navigator.maxTouchPoints > 1 && /Macintosh/.test(UA) ? "tablet" : "phone"}. Send yourself the link and open it there.</p>
      ${email({ label: "Email · optional, for updates" })}${HONEYPOT}${ERR}
      ${cta("Send the link to my Mac", { meta: SITE_NAME, arrow: UP })}
      <p class="su-fine">Used only for Claude Meter updates. <a href="#privacy">Kept in the maker’s Google Sheet, never shared or sold.</a></p>
      <p class="su-req"><span>Free · macOS 14.4+ ·</span> <span>Apple Silicon &amp; Intel ·</span> <span>Needs Claude Code (Pro or Max)</span></p>
    </form>`,
  macDone: () => `
    <div class="su-done">
      <p class="su-kicker">${tick}ClaudeMeter.dmg · v1.2</p>
      <h2 class="su-title" id="su-title" tabindex="-1">On its <em>way.</em></h2>
      <p class="su-lede" id="su-lede">Drag Claude Meter to Applications and open it. It reads Claude Code’s sign-in, so run <code>claude</code>, then <code>/login</code>, first if you haven’t. It opens pinned; click to tuck it into the notch.</p>
      <p class="su-fine">Didn’t start? <a href="${DMG}" download>Download again</a></p>
      ${starNudge}${doneBtn}
    </div>`,
  macAwayDone: ({ saved, how }) => `
    <div class="su-done">
      <p class="su-kicker">${tick}${how === "copied" ? "Link copied" : saved ? "Email saved" : "Mac app · v1.2"}</p>
      <h2 class="su-title" id="su-title" tabindex="-1">Open it on your <em>Mac</em>.</h2>
      <p class="su-lede" id="su-lede">${how === "copied" ? "Paste the link into a message or a note to yourself. Or, o" : "O"}n your Mac, go to <strong>${SITE_NAME}</strong> and download it there.</p>
      ${cta(how === "none" ? "Send the link to my Mac" : "Send it again", { type: "button", meta: SITE_NAME, arrow: UP, attrs: "data-su-share" })}
      ${starNudge}${doneBtn}
    </div>`,
  windows: () => `
    <form class="su-form" novalidate>
      <p class="su-kicker">Windows · waitlist</p>
      <h2 class="su-title" id="su-title" tabindex="-1">Windows isn’t here <em>yet</em>.</h2>
      <p class="su-lede" id="su-lede">Join the waitlist and get one email when it ships.</p>
      <label class="su-field"><span class="su-field__lbl">Name</span>
        <input name="name" type="text" required${AUTO()} autocomplete="name" enterkeyhint="next" maxlength="100" placeholder="Your name"></label>
      ${email({ required: true })}${HONEYPOT}${ERR}
      ${cta("Join the waitlist", { meta: "one email when it ships", arrow: CLOCK })}
      <p class="su-fine">Nothing else, ever. <a href="#privacy">Kept in the maker’s Google Sheet, never shared or sold.</a></p>
      <p class="su-req">On a Mac too? <a href="${DMG}" data-cta="mac">${noMac() ? "Get it on your Mac" : "Download for Mac"}</a></p>
    </form>`,
  windowsDone: ({ name, email: to }) => `
    <div class="su-done">
      <p class="su-kicker">${tick}Windows · waitlist</p>
      <h2 class="su-title" id="su-title" tabindex="-1">You’re on the list, <em>${esc(name.split(/\s+/)[0])}</em>.</h2>
      <p class="su-lede" id="su-lede">We’ll email ${esc(to)} when Claude Meter for Windows ships.</p>
      ${starNudge}${doneBtn}
    </div>`,
};

/* ------------------------------------------------------------------ dialog */

let dlg, panel, head, body, opener = null, type = "mac", busy = false, closing = null, unbind = null;
let viaPointer = false, tucked = [], goHash = null;

function build() {
  dlg = document.createElement("dialog");
  dlg.className = "su";
  dlg.setAttribute("aria-labelledby", "su-title");
  dlg.setAttribute("aria-describedby", "su-lede");
  dlg.setAttribute("data-lenis-prevent", "");   // Lenis is stopped while it's open and would eat the panel's wheel
  dlg.innerHTML = `<div class="su__panel">
      <div class="su__hd"><span class="su__app"><img src="/assets/favicon.png" alt="" width="14" height="14"><span>Claude Meter</span></span><span class="su__gap" aria-hidden="true"><i class="su__lens"></i></span>
        <span class="su__hd-r"><button class="su__x" type="button" aria-label="Close" data-su-close><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7m0-7l-7 7"/></svg></button></span></div>
      <div class="su__body"></div>
    </div>`;
  document.body.append(dlg);
  panel = dlg.firstElementChild;
  head = panel.firstElementChild;
  body = panel.lastElementChild;

  dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });   // Esc: animate out
  dlg.addEventListener("close", cleanup);                                      // any close path (incl. a forced Esc)
  let downOnBackdrop = false;
  dlg.addEventListener("pointerdown", (e) => { downOnBackdrop = e.target === dlg; });
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg && downOnBackdrop) return close();
    const hash = e.target.closest('a[href^="#"]');
    if (hash) { e.preventDefault(); e.stopPropagation(); goHash = hash.getAttribute("href"); return close(); }   // scroll there once closed
    if (e.target.closest("[data-su-close]")) return close();
    const sh = e.target.closest("[data-su-share]");
    if (sh) return share(sh);
  });
  dlg.addEventListener("keydown", (e) => {   // a native modal lets Tab leave for the browser UI: wrap it instead
    if (e.key !== "Tab") return;
    const f = [...dlg.querySelectorAll('a[href],button:not([disabled]),input:not([tabindex="-1"])')].filter((n) => n.getClientRects().length);
    const a = document.activeElement, first = f[0], last = f[f.length - 1];
    if (e.shiftKey ? a === first || !dlg.contains(a) || a === dlg : a === last) { e.preventDefault(); (e.shiftKey ? last : first)?.focus(); }
  });
  dlg.addEventListener("submit", onSubmit);
  dlg.addEventListener("input", (e) => { if (e.target.getAttribute("aria-invalid")) setError(null); });
  dlg.addEventListener("keydown", (e) => {   // Return in Name goes on to Email (it doesn't submit a half-filled waitlist)
    if (e.key !== "Enter" || e.target.name !== "name" || e.isComposing) return;
    e.preventDefault();
    e.target.form && fld(e.target.form, "email")?.focus();
  });
}

const squeezeIn = (el) => el.animate([{ opacity: 0, transform: "scaleX(.6)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "none" }],
  { duration: 300, delay: 60, easing: SETTLE, fill: "backwards" });

function render(view, data = {}, { animate = false } = {}) {
  const h0 = animate && motion() ? panel.offsetHeight : 0;
  unbind?.();
  body.innerHTML = VIEWS[view](data);
  const saved = get("cm-signup") || {};
  const f = body.querySelector("form");
  if (f) {
    if (saved.email && fld(f, "email")) fld(f, "email").value = saved.email;
    if (saved.name && fld(f, "name")) fld(f, "name").value = saved.name;
  }
  paintStars(body);
  unbind = initCtas(body);
  if (h0) {
    squeezeIn(body);
    const h1 = panel.offsetHeight;   // the app animates height changes with .smooth(.4)
    if (Math.abs(h1 - h0) > 1) panel.animate([{ height: `${h0}px` }, { height: `${h1}px` }], { duration: 400, easing: SETTLE });
  }
  const t = body.querySelector(".su-tick");
  if (t && motion()) fillTick(t, view === "macDone" ? 1900 : 900);
}

/** The done kicker: the ring FILLS 0 → 100, then eases back as the check draws in. */
function fillTick(t, ms) {
  const val = t.querySelector(".val"), chk = t.querySelector(".chk");
  val.animate([{ strokeDashoffset: 100, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: 0.82 }, { strokeDashoffset: 0, opacity: 0.35 }],
    { duration: ms + 420, delay: 120, easing: "cubic-bezier(.45,0,.55,1)", fill: "backwards" });
  chk.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: 320, delay: 120 + ms, easing: SETTLE, fill: "backwards" });
  t.animate([{ transform: "scale(1)" }, { transform: "scale(1.14)" }, { transform: "scale(1)" }], { duration: 480, delay: 120 + ms, easing: OPEN_EASE });
}

/* The island in the notch: tucked into its camera housing while the dialog is out (the app shrinks into
   the housing on launch, full screen and quit, and grows back). */
const bandScale = () => parseFloat(getComputedStyle(document.querySelector(".band") || document.documentElement).getPropertyValue("--nav-scale")) || 1;
function notchIslands() {
  const cx = innerWidth / 2;
  return [...document.querySelectorAll(".island")].filter((el) => {
    const h = el.querySelector(".island__housing"), z = el.querySelector(".island__zoom");
    if (!h || !z || el.closest(".su")) return false;
    const r = h.getBoundingClientRect();
    return r.width > 0 && r.top > -4 && r.top < 8 && Math.abs(r.left + r.width / 2 - cx) < 12 &&
      el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) !== false;
  });
}
/** The housing the panel grows out of (and folds back into): the notch island's, else the band's notch. */
function housing(isls = notchIslands()) {
  const h = isls[0]?.querySelector(".island__housing");
  if (h) {
    const r = h.getBoundingClientRect(), k = r.width / (h.offsetWidth || r.width);
    return { w: r.width, h: r.bottom, r: (parseFloat(getComputedStyle(h).borderBottomLeftRadius) || 10) * k };
  }
  const s = bandScale();
  return { w: 185 * s, h: document.querySelector(".band")?.offsetHeight || 40, r: 10 * s };
}
const clipOf = ({ w, h, r }) => {
  const hw = Math.min(w, panel.offsetWidth) / 2;
  return `inset(0px calc(50% - ${hw}px) calc(100% - ${h}px) calc(50% - ${hw}px) round 0px 0px ${r}px ${r}px)`;
};
const OPEN_CLIP = "inset(0px 0px 0px 0px round 0px 0px 30px 30px)";   // the panel's own corners
// A drop-shadow on the dialog, not a box-shadow: it follows the panel's clip as it grows, so no pale outline of
// the finished card ever frames the smaller panel.
const SHADOW = ["drop-shadow(0 26px 40px rgb(0 0 0 / 0)) drop-shadow(0 12px 22px rgb(0 0 0 / 0))", "drop-shadow(0 26px 40px rgb(0 0 0 / .5)) drop-shadow(0 12px 22px rgb(0 0 0 / .3))"];

function tuck(isls) {
  tucked = isls.map((el) => {
    const z = el.querySelector(".island__zoom"), hs = el.querySelector(".island__housing"), isl = el._island;
    const size = isl?.size?.() || { w: z.offsetWidth, h: z.offsetHeight };
    const to = `scale(${Math.min(1, hs.offsetWidth / size.w).toFixed(3)}, ${Math.min(1, hs.offsetHeight / size.h).toFixed(3)})`;
    const anim = motion()
      ? z.animate([{ transform: "none", opacity: 1, filter: "blur(0px)" }, { transform: to, opacity: 0, filter: "blur(4px)" }], { duration: 180, easing: SETTLE, fill: "forwards" })
      : z.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced() ? 120 : 0, fill: "forwards" });
    return { z, to, anim };
  });
}
function untuck() {
  tucked.forEach(({ z, to, anim }) => {
    if (motion()) z.animate([{ transform: to, opacity: 0, filter: "blur(8px)" }, { transform: "none", opacity: 1, filter: "blur(0px)" }], { duration: 400, easing: OPEN_EASE });
    else if (reduced()) z.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
    anim.cancel();
  });
  tucked = [];
}

export function openSignup(kind = "mac", from = document.activeElement, { viaPointer: vp = false } = {}) {
  if (!dlg) build();
  if (closing) {   // reopened mid-close: stop the fold and keep the island tucked
    closing = null;
    dlg.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  }
  const wasOpen = dlg.open;
  type = kind === "windows" ? "windows" : "mac";
  busy = false;
  goHash = null;
  if (!wasOpen) { opener = from; viaPointer = vp; }
  dlg.dataset.type = type;
  const s = bandScale();
  panel.style.setProperty("--ns", s);
  panel.style.setProperty("--gap", `${Math.round(185 * s + 12)}px`);   // the header keeps clear of the camera
  render(type === "mac" && noMac() ? "macAway" : type, {}, { animate: wasOpen });
  if (!wasOpen) {
    const isls = notchIslands(), from0 = housing(isls);
    if (!tucked.length) tuck(isls);
    dlg.showModal();
    document.documentElement.classList.add("su-open");
    lenis?.stop();
    if (motion()) {
      // The panel covers the housing from the first frame, holds while the island tucks in, then grows (.bouncy .4).
      panel.animate([{ clipPath: clipOf(from0) }, { clipPath: OPEN_CLIP }], { duration: 590, delay: 110, easing: OPEN_EASE, fill: "backwards" });
      head.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 220, easing: SETTLE, fill: "backwards" });
      dlg.animate([{ filter: SHADOW[0] }, { filter: SHADOW[1] }], { duration: 420, delay: 240, easing: SETTLE, fill: "backwards" });
      body.animate([{ opacity: 0, transform: "scaleX(.6)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "none" }],
        { duration: 300, delay: 170, easing: SETTLE, fill: "backwards" });
      dlg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: SETTLE, pseudoElement: "::backdrop" });
    } else if (panel.animate) panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
  }
  const af = body.querySelector("[autofocus]") || body.querySelector(".su-title");
  af?.focus({ preventScroll: true });
}

export function close() {
  if (!dlg?.open || closing) return;
  if (!motion()) return dlg.close();
  const out = [{ opacity: 1, transform: "none", filter: "none" }, { opacity: 0, transform: "scaleX(.3)", filter: "blur(4px)" }];
  body.animate(out, { duration: 180, easing: SETTLE, fill: "forwards" });
  head.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: SETTLE, fill: "forwards" });
  dlg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 340, delay: 100, easing: SETTLE, fill: "forwards", pseudoElement: "::backdrop" });
  dlg.animate([{ filter: SHADOW[1] }, { filter: SHADOW[0] }], { duration: 160, easing: SETTLE, fill: "forwards" });
  // Back into the housing the island will grow out of (smooth, like the app's unpin).
  closing = panel.animate([{ clipPath: OPEN_CLIP }, { clipPath: clipOf(housing(tucked.map((t) => t.z.closest(".island")))) }],
    { duration: 420, delay: 80, easing: "cubic-bezier(.3,0,.1,1)", fill: "forwards" });
  closing.onfinish = () => { closing = null; dlg.close(); };
}

function cleanup() {
  closing = null;
  dlg.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  document.documentElement.classList.remove("su-open");
  untuck();
  lenis?.start();
  const back = opener, hash = goHash;
  opener = null; goHash = null;
  // A pointer user gets focus back without a ring (and without the CTA's keyboard peek).
  if (back && back.isConnected && back.focus) back.focus({ preventScroll: true, focusVisible: !viaPointer });
  if (hash) { const el = hash === "#" ? 0 : document.querySelector(hash); if (el != null) scrollTo(el); }
}

/* ------------------------------------------------------------------ actions */

function setError(msg, field) {
  const err = body.querySelector(".su-err");
  body.querySelectorAll("[aria-invalid]").forEach((n) => { n.removeAttribute("aria-invalid"); n.removeAttribute("aria-describedby"); });
  if (!err) return;
  err.textContent = msg || "";   // the live region announces it; only the invalid field points at it
  if (field) { field.setAttribute("aria-invalid", "true"); field.setAttribute("aria-describedby", "su-err"); field.focus(); }
}

const button = () => body.querySelector("button.cta");
function pending(on) {
  busy = on;
  const b = button();
  if (!b) return;
  b.disabled = on;
  b.setAttribute("aria-busy", String(on));
  if (!on) b.ctaReset?.();
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

/** Plays the CTA's click (shake, ring back to 0, label roll), then swaps the view once it has read. */
function fire(text, next) {
  const b = button();
  b?.ctaFire?.(text, { hold: 0 });
  setTimeout(next, b && motion() ? 620 : 0);
}
const toView = (view, data) => () => {
  if (!dlg.open || closing) return;
  render(view, data, { animate: true });
  body.querySelector(".su-title")?.focus({ preventScroll: true });
};

/** Hands the site's link to the visitor's Mac: the share sheet (AirDrop, Messages, Mail), else the clipboard.
 *  Call it inside the tap's own gesture (no await before it). → "sheet" | "copied" | "none" */
async function share(el) {
  const say = (t) => { const l = el?.querySelector(".cta__label"); if (l && el.ctaFire) el.ctaFire(t); else if (el) el.textContent = t; };
  try {
    if (navigator.share) { await navigator.share({ title: "Claude Meter", text: "Claude usage limits in your MacBook notch. Free and open source, for macOS.", url: SITE }); return "sheet"; }
  } catch (e) { if (e?.name === "AbortError") return "none"; }
  try { await navigator.clipboard.writeText(SITE); say("Link copied"); return "copied"; }
  catch { say(`Open ${SITE_NAME} on your Mac`); return "none"; }
}

async function onSubmit(e) {
  e.preventDefault();
  if (busy) return;
  const f = e.target, nameEl = fld(f, "name"), emailEl = fld(f, "email");
  const mail = emailEl.value.trim();
  const name = nameEl ? nameEl.value.trim() : "";
  if (nameEl && !name) return setError("Tell us your name.", nameEl);
  // The download and the waitlist both need an address (the phone's send-the-link sheet doesn't: nothing downloads there).
  const away = type === "mac" && noMac();
  if ((mail || !away) && !EMAIL.test(mail)) return setError(mail ? "That email doesn’t look right. Check it and try again." : (type === "windows" ? "Enter your email." : "Enter your email to download."), emailEl);
  setError(null);
  if (mail) put("cm-signup", { email: mail, name: name || get("cm-signup")?.name || "" });   // prefill next time (this browser only)

  const fields = { type, email: mail, platform: navigator.userAgentData?.platform || navigator.platform || "", ref: document.referrer, company: fld(f, "cm_hp")?.value || "" };
  if (type === "windows") fields.name = name;
  const url = endpoint();
  const post = () => fetch(url, { method: "POST", mode: "no-cors", body: new URLSearchParams(fields) });

  if (type === "mac") {
    // The download never waits on the sheet, and never fails because of it.
    if (mail && url) post().catch(() => {});
    else if (mail) console.warn('[signup] <meta name="cm-signup"> is empty: Mac download continues, email not stored.');
    busy = true;
    if (noMac()) {
      const how = await share(button());   // still inside the tap's gesture: nothing above awaited
      return setTimeout(toView("macAwayDone", { saved: !!mail, how }), how === "copied" && motion() ? 900 : 0);
    }
    download();
    return fire("Downloading…", toView("macDone"));
  }

  if (!url) {
    console.warn('[signup] <meta name="cm-signup"> is empty: the Windows waitlist cannot store signups yet.');
    return setError("Waitlist opens shortly — try again in a minute.");
  }
  pending(true);
  button()?.ctaFire?.("Joining…", { hold: 0 });
  const t0 = performance.now();
  try {
    await post();                    // no-cors: an opaque response, so success = the request went out
    setTimeout(toView("windowsDone", { name, email: mail }), Math.max(0, 620 - (performance.now() - t0)));
  } catch {
    pending(false);
    setError("Couldn’t reach the waitlist. Check your connection and try again.");
  }
}
