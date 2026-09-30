// Hand-drawn ink: draws an SVG's paths in document order. Style via the .ink class in base.css.
import { gsap } from "./gsap.js";
import { reduced } from "./motion.js";

/**
 * scribble(svg, { duration = .9, delay = 0, trigger = true, start = "top 80%" })
 * trigger: true → on scroll into view; false → returns a paused timeline to play yourself.
 */
export function scribble(svg, { duration = 0.9, delay = 0, trigger = true, start = "top 80%" } = {}) {
  if (!svg) return null;
  svg.classList.add("ink");
  if (reduced()) return null;
  const paths = svg.querySelectorAll("path,line,polyline,circle,ellipse");
  gsap.set(paths, { drawSVG: "0%" });
  const tl = gsap.timeline({ paused: !trigger, delay, scrollTrigger: trigger ? { trigger: svg, start, once: true } : undefined });
  const per = duration / Math.max(1, paths.length);
  paths.forEach((p) => tl.to(p, { drawSVG: "100%", duration: per * 1.3, ease: "power2.inOut" }, `>-${per * 0.3}`));
  return tl;
}
