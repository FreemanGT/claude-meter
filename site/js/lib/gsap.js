// GSAP + plugins come from the classic <script defer> tags in <head> (they run before modules).
// This module is the single place plugins are registered and eases are defined.
const w = window;
export const gsap = w.gsap;
export const ScrollTrigger = w.ScrollTrigger;
export const SplitText = w.SplitText;
export const ScrambleTextPlugin = w.ScrambleTextPlugin;
export const DrawSVGPlugin = w.DrawSVGPlugin;
export const CustomEase = w.CustomEase;

if (!gsap) throw new Error("GSAP failed to load (vendor/gsap.min.js)");

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin, CustomEase);
gsap.defaults({ ease: "power3.out", duration: 0.6 });
gsap.ticker.lagSmoothing(0);

CustomEase.create("edit", "0.625,0.05,0,1");
CustomEase.create("settle", "0.2,0.8,0.2,1");
CustomEase.create("island", "M0,0 C0.14,0.56 0.22,1.1 0.46,1.07 0.64,1.04 0.78,0.995 1,1");

ScrollTrigger.config({ ignoreMobileResize: true });

/**
 * untracked(fn) → fn's return value, created with no active gsap.context.
 * GSAP makes an animation's context active while its callbacks run, so a tween born in a scrub
 * onUpdate or a ScrollTrigger callback is recorded in that context forever (and walked on every
 * revert). Wrap transient, self-finishing tweens made in callbacks with this.
 */
const free = gsap.context(() => {});   // (with no function, gsap.context() just returns the active one)
export function untracked(fn) {
  let out;
  free.ignore(() => { out = fn(); });
  return out;
}

let drag = null;
/** loadDrag() → Promise<{ Draggable, InertiaPlugin }>. 43 KB that only the #yours lever and flickable banners use. */
export function loadDrag() {
  return (drag ||= Promise.all(["Draggable", "InertiaPlugin"].map((n) => w[n] || new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = `/vendor/${n}.min.js`;
    s.onload = () => ok(w[n]);
    s.onerror = () => fail(new Error(`vendor/${n}.min.js failed to load`));
    document.head.append(s);
  }))).then(([Draggable, InertiaPlugin]) => {
    gsap.registerPlugin(Draggable, InertiaPlugin);
    return { Draggable, InertiaPlugin };
  }));
}
