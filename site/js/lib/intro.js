// The intro (SPEC §5.2): lens glint → housing grows → wings (stage island shows through a hole)
// → the black retracts up into the band. ≤1.2s, once per session, skippable by any input.
import { gsap } from "./gsap.js";
import { SPR } from "./motion.js";
import { stop as stopScroll, start as startScroll } from "./smooth.js";

const resolved = () => Promise.resolve();
const deferred = () => { let r; const p = new Promise((res) => (r = res)); p.resolve = r; return p; };

/**
 * runIntro({ heroScale }) → { skipped, wings, reveal, done } (promises resolve at .38s / .9s / 1.2s).
 * Also dispatches document events "cm:intro" with detail.phase = "wings" | "reveal" | "done".
 * heroScale = px per pt of the stage island (desktop 2).
 */
export function runIntro({ heroScale = 2 } = {}) {
  const html = document.documentElement;
  const el = document.getElementById("intro");
  window.__cmIntro = true;
  if (!html.classList.contains("is-intro") || !el) {
    el && el.remove();
    return { skipped: true, wings: resolved(), reveal: resolved(), done: resolved() };
  }
  const wings = deferred(), reveal = deferred(), done = deferred();
  const fired = new Set();
  const fire = (phase, p) => { if (fired.has(phase)) return; fired.add(phase); p.resolve(); document.dispatchEvent(new CustomEvent("cm:intro", { detail: { phase } })); };
  stopScroll();

  const S = heroScale;
  const housing = el.querySelector(".intro__housing");
  const lens = el.querySelector(".intro__lens");
  const glint = el.querySelector(".intro__glint");
  gsap.set(lens, { top: 16 * S, width: 7 * S, height: 7 * S, margin: `${-3.5 * S}px 0 0 ${-3.5 * S}px` });
  gsap.set(housing, { width: 7 * S, height: 7 * S, top: 16 * S - 3.5 * S, borderRadius: 3.5 * S });

  // Clip: the overlay minus a hole where the stage island lives, with a bottom edge that retracts.
  const W = innerWidth, H = innerHeight;
  const g = { bottom: H, hole: 0 };
  const hostRect = () => {
    const isl = document.querySelector("#stage .island, #stage .island-host");
    const r = isl && isl.getBoundingClientRect();
    return r && r.width > 20 ? r : { left: W / 2 - (277 * S) / 2, width: 277 * S, height: 32 * S };
  };
  let rect = null;
  const clip = () => {
    const b = g.bottom;
    let d = `M0 0H${W}V${b}H0Z`;
    if (g.hole && rect) {
      const hb = Math.min(rect.height + 1, b);
      d += `M${rect.left - 1} 0H${rect.left + rect.width + 1}V${hb}H${rect.left - 1}Z`;
    }
    el.style.clipPath = `path(evenodd, "${d}")`;
  };

  const tl = gsap.timeline({ onComplete: finish });
  tl.to(glint, { x: "240%", duration: 0.2, ease: "power1.inOut" }, 0)
    .to(housing, { width: 185 * S, height: 32 * S, top: 0, borderRadius: `0 0 ${10 * S}px ${10 * S}px`, ...SPR.open }, 0.12)
    .to(lens, { top: 16 * S, ...SPR.open }, 0.12)
    .call(() => { rect = hostRect(); g.hole = 1; clip(); gsap.set([housing, lens], { autoAlpha: 0 }); fire("wings", wings); }, null, 0.38)
    .to(g, { bottom: 0, duration: 0.35, ease: "edit", onUpdate: clip }, 0.85)
    .call(() => { html.classList.add("is-revealing"); fire("reveal", reveal); }, null, 0.9)   // unpauses the CSS hero reveal
    .to({}, { duration: 0.3 }, 0.9);

  const skip = () => tl.progress(1);
  const opts = { once: true, passive: true };
  ["keydown", "pointerdown", "wheel", "touchstart"].forEach((t) => window.addEventListener(t, skip, opts));

  function finish() {
    ["keydown", "pointerdown", "wheel", "touchstart"].forEach((t) => window.removeEventListener(t, skip));
    fire("wings", wings);
    fire("reveal", reveal);
    el.remove();
    html.classList.remove("is-intro", "is-revealing");
    try { sessionStorage.setItem("cm-intro", "1"); } catch {}
    startScroll();
    fire("done", done);
  }
  return { skipped: false, wings, reveal, done };
}
