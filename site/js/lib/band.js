// The band (the Mac's menu bar): status-item slot, local clock, night tone.
import { visibleInterval } from "./loop.js";
import { fmtClock } from "./format.js";

const blocks = (pct) => "▮".repeat(Math.max(1, Math.min(5, Math.ceil(pct / 20))));

/** Renders the app's real menu-bar item text into any slot element: "46%  38%" (session · weekly). */
export function renderStatus(slot, data, { display = "percent" } = {}) {
  if (!slot || !data) return;
  const part = (w, base) => {
    const s = document.createElement("span");
    s.className = `st st--${w.pct > 85 ? "red" : base}`;
    s.textContent = display === "ticks" ? blocks(w.pct) : `${Math.round(w.pct)}%`;
    return s;
  };
  slot.replaceChildren(part(data.session, "teal"), document.createTextNode("  "), part(data.weekly, "lav"));
  slot.setAttribute("aria-label", `Session ${Math.round(data.session.pct)}%, weekly ${Math.round(data.weekly.pct)}%`);
}

/** statusItem(on, data, { display }) — shows/hides the band's status item (the stage menu's "Menu bar item"). */
export function statusItem(on, data, opts) {
  const slot = document.querySelector(".band__status");
  if (!slot) return;
  slot.hidden = !on;
  if (on) renderStatus(slot, data, opts);
}

export function setBandNight(on) {
  document.querySelector(".band")?.classList.toggle("is-night", !!on);
}

/** Live local clock in macOS format; updates each minute while visible. */
export function initBand() {
  const clock = document.querySelector(".band__clock");
  if (!clock) return () => {};
  const tick = () => { clock.textContent = fmtClock(new Date()); clock.dateTime = new Date().toISOString(); };
  tick();
  return visibleInterval(clock, tick, 15000, { ambient: false });   // a clock, not motion: pausing the page doesn't stop time
}
