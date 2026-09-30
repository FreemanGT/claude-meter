// Scrubbed pinned scenes. Reduced motion → no pin; the section renders its static composition.
import { gsap } from "./gsap.js";
import { reduced, mobile, finePointer } from "./motion.js";
import { lenis } from "./smooth.js";

/**
 * pinScene(section, { length = "300%", mobileLength = "200%", scrub = .8, build(tl, { mobile }) })
 * → { tl, st } | null (reduced: adds .is-static to the section and returns null).
 * Pins section.querySelector(".pin"). No snap, ever. Lengths are % of the viewport height.
 */
export function pinScene(section, { length = "300%", mobileLength = "200%", scrub = 0.8, build, ...stOpts } = {}) {
  if (reduced()) { section.classList.add("is-static"); return null; }
  section.classList.remove("is-static");
  const pin = section.querySelector(".pin") || section;
  const len = mobile() ? mobileLength : length;
  // Our own pin-spacer (ScrollTrigger's pinSpacer): a refresh restyles it in place. With a generated spacer,
  // every refresh moves .pin out and back in, and a DOM move restarts every CSS animation inside it (the hero's
  // entrance replayed on each late refresh) and re-reports its text as a new LCP candidate. Reused across
  // rebuilds; a section may ship it in its markup (<div class="pin-own">) so not even the first wrap moves it.
  let spacer = pin !== section && pin.parentElement;
  if (spacer && !spacer.classList.contains("pin-own")) {
    spacer = document.createElement("div");
    spacer.className = "pin-own";
    pin.before(spacer);
    spacer.append(pin);
  }
  // Lenis drives the wheel and runs ScrollTrigger.update in the same frame, so under it:
  //  - pins are transforms (a fixed↔relative switch is a 0.96 layout shift on every scroll-back),
  //  - the timeline follows the (already smoothed) scroll exactly: a second scrub lag would leave closing
  //    beats playing after the pin has released. Native touch scroll keeps fixed pins and the .8 scrub.
  const smoothed = !!lenis && finePointer();
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: pin, pin: true, start: "top top", end: `+=${len}`, scrub: smoothed ? true : scrub,
      pinType: smoothed ? "transform" : "fixed",
      // No scroll-thread lead to anticipate under Lenis: anticipatePin would pin early and jump.
      pinSpacing: true, pinSpacer: spacer || undefined, anticipatePin: finePointer() ? 0 : 1, invalidateOnRefresh: true, ...stOpts,
    },
  });
  if (build) build(tl, { mobile: mobile() });
  // Stretch to exactly 1s of timeline so labels/positions read as progress 0..1.
  if (tl.duration() < 1) tl.to({}, { duration: 1 - tl.duration() }, tl.duration());
  return { tl, st: tl.scrollTrigger };
}
