// §05 privacy — "Reads. Never writes." Owned by the privacy builder. See web/FOUNDATION.md.

// One clock per wire (ms). Phases are fractions of the cycle: the packet leaves, dissolves into the
// host's ping, and the reply comes back. Every usage check starts with a read of the sign-in.
const CLOCK = {
  usage: { dur: 4200, delay: 0, out: [0.14, 0.36], back: [0.44, 0.66] },
  token: { dur: 9000, delay: 1500, out: [0, 0.12], back: [0.15, 0.27] },
  version: { dur: 13000, delay: 3100, out: [0, 0.085], back: [0.105, 0.19] },
};
const READ = [0, 0.12]; // keychain → Mac, on the usage clock
const BLUR_MS = 22; // "shutter": a packet's tail is as long as the distance it covers in this long
const MAX_STRETCH = 5;

const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Eased samples along a path, in its own (viewBox) units: position, tangent angle (unwrapped), and
 *  distance per sample, which becomes the streak length. */
function track(path, n = 28) {
  const len = path.getTotalLength();
  const at = (l) => path.getPointAtLength(Math.min(len, Math.max(0, l)));
  let prev = 0;
  return Array.from({ length: n + 1 }, (_, i) => {
    const l = len * inOut(i / n);
    const p = at(l), a0 = at(l - 1), a1 = at(l + 1);
    let a = (Math.atan2(a1.y - a0.y, a1.x - a0.x) * 180) / Math.PI;
    if (i) a = prev + ((((a - prev + 180) % 360) + 360) % 360) - 180;
    prev = a;
    const d = (len * (inOut(Math.min(1, (i + 1) / n)) - inOut(Math.max(0, (i - 1) / n)))) / 2;
    return { x: p.x, y: p.y, a, d };
  });
}
const flip = (pts) => [...pts].reverse().map((p) => ({ ...p, a: p.a + 180 }));

/** Keyframes for legs [[from, to, samples]] over a cycle of `dur` ms. Each leg fades in at its start
 *  and out at its end; mid-flight the dot stretches behind its head in proportion to its speed. */
function legs(list, dur) {
  const kf = [];
  const tf = (p, s) => `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${p.a.toFixed(1)}deg) scaleX(${s.toFixed(2)})`;
  for (const [a, b, pts] of list) {
    const n = pts.length - 1, step = ((b - a) * dur) / n; // ms per sample
    pts.forEach((p, i) => {
      const s = 1 + Math.min(MAX_STRETCH, ((p.d / step) * BLUR_MS) / 12);
      kf.push({ offset: a + (b - a) * (i / n), transform: tf(p, s), opacity: i === 0 || i === n ? 0 : 1 });
    });
  }
  return [{ ...kf[0], offset: 0 }, ...kf, { ...kf[kf.length - 1], offset: 1 }];
}

/** A pulse at `at` (fraction of the cycle) lasting `ms`. */
const blip = (at, dur, ms, from, peak, to) => {
  const end = Math.min(at + ms / dur, 1);
  return [
    { offset: 0, ...from }, { offset: at, ...from },
    { offset: Math.min(at + 0.002, end), ...peak },
    { offset: end, ...to }, { offset: 1, ...to },
  ];
};

/**
 * @param {HTMLElement} root  the <section id="privacy">
 * @param {object} ctx { gsap, ScrollTrigger, SplitText, reduced, mobile, lenis, meter, navIsland, Island, intro, lib, add }
 */
export default function init(root, ctx) {
  const { gsap, ScrollTrigger, reduced, mobile, lib } = ctx;
  const q = (s, el = root) => el.querySelector(s);
  const qa = (s, el = root) => [...el.querySelectorAll(s)];

  lib.nightZone(root);
  if (reduced) return; // static composition: wires drawn, ✕ and ✓ stamped, zeros shown, no packets

  const disposers = [];

  // ---- "Reads." — wdth 60→130% over the section's first 40%, rippling left to right. The chars are laid
  // out once at 130 and each scrub frame only rescales them (scaleX from their measured wdth-60 widths,
  // re-packed edge to edge): compositor work, no relayout, no layout shift.
  const word = q(".pv-reads__w");
  const text = word.textContent;
  word.textContent = "";
  const chars = [...text].map((c) => word.appendChild(Object.assign(document.createElement("span"), { className: "pv-ch", textContent: c })));
  disposers.push(() => { word.textContent = text; word.style.removeProperty("--w"); });
  const STAG = 0.1, DUR = 1 - STAG * (chars.length - 1);
  const ease = gsap.parseEase("power2.inOut");
  const clamp = gsap.utils.clamp(0, 1);
  const wd = { p: 0 };
  let w0 = [], w1 = [], x0 = [];
  const paint = () => {
    if (wd.p >= 1) { chars.forEach((c) => (c.style.transform = "")); return; }
    let x = x0[0];
    chars.forEach((c, i) => {
      const w = w0[i] + (w1[i] - w0[i]) * ease(clamp((wd.p - i * STAG) / DUR));
      c.style.transform = `translateX(${(x - x0[i]).toFixed(2)}px) scaleX(${(w / w1[i]).toFixed(4)})`;
      x += w;
    });
  };
  const measure = () => {
    chars.forEach((c) => (c.style.transform = ""));
    word.style.setProperty("--w", 60);
    w0 = chars.map((c) => c.getBoundingClientRect().width);
    word.style.setProperty("--w", 130);
    const r = chars.map((c) => c.getBoundingClientRect());
    w1 = r.map((b) => b.width);
    x0 = r.map((b) => b.left);
    paint();
  };
  measure();
  gsap.to(wd, {
    p: 1, ease: "none", onUpdate: paint,
    scrollTrigger: {
      trigger: root, start: "top 80%", end: () => `+=${root.offsetHeight * 0.4}`, scrub: 0.8,
      onRefresh: measure,
      onToggle: (self) => chars.forEach((c) => (c.style.willChange = self.isActive ? "transform" : "")),
    },
  });

  // ---- "Never writes." — rises in, "Never" lands like a red stamp, then the teal swipe
  const line = q(".pv-never__in");
  const never = q(".pv-never__em");
  const mark = q(".pv-mark");
  gsap.set(line, { yPercent: 108 });
  gsap.set(mark, { "--mark": 0 });
  gsap.timeline({ scrollTrigger: { trigger: q(".pv-never"), start: "top 88%", once: true } })
    .to(line, { yPercent: 0, duration: 0.9, ease: "edit" })
    .set(never, { display: "inline-block", transformOrigin: "50% 60%" }, 0)
    .fromTo(never, { scale: 1.35, rotation: -6, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, ...lib.SPR.play, clearProps: "all" }, 0.4)
    .to(mark, { "--mark": 1, duration: 0.6, ease: "edit" }, 0.85);
  disposers.push(() => { never.removeAttribute("style"); });

  // ---- network diagram (only the visible variant animates)
  const stage = q(mobile ? ".pv-stage--v" : ".pv-stage--h");
  const vw = mobile ? 400 : 1200, vh = mobile ? 730 : 400;
  const read = q(".pv-read", stage);
  const tip = q(".pv-read__tip", stage);
  const routes = qa(".pv-route", stage);
  const reveal = q(".pv-else-reveal", stage);
  const ghost = q(".pv-ghost", stage);
  const xMark = q(".pv-x", stage);
  const src = q(".pv-src", stage);
  const node = q(".pv-node", stage);
  const rw = q(".pv-rw", stage);
  const wt = q(".pv-rw__wt", stage);
  const strike = q(".pv-rw__w svg path", stage);
  const lbls = qa(".pv-lbl", stage);
  const hosts = qa(".pv-host", stage);
  const cap = q(".pv-net__cap");

  // packets: a viewBox-sized layer scaled to the stage, so path points are the SVG's own
  const layer = Object.assign(document.createElement("div"), { className: "pv-pk" });
  layer.setAttribute("aria-hidden", "true");
  stage.append(layer);
  const ro = new ResizeObserver(([e]) => layer.style.setProperty("--k", e.contentRect.width / vw));
  ro.observe(stage);

  const anims = [];
  const run = (el, kf, dur, delay = 0) => {
    const a = el.animate(kf, { duration: dur, delay, iterations: Infinity, easing: "linear" });
    a.cancel(); // idle until the entrance has drawn the wires
    anims.push(a);
  };
  const packet = (kind, list, dur, delay) => {
    const p = layer.appendChild(Object.assign(document.createElement("i"), { className: `pv-pkt pv-pkt--${kind}` }));
    run(p, legs(list, dur), dur, delay);
  };
  const ping = (dot, at, dur, delay) => {
    const r = dot.appendChild(Object.assign(document.createElement("i"), { className: "pv-ping" }));
    run(r, blip(at, dur, 900, { opacity: 0, transform: "scale(1)" }, { opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(3.4)" }), dur, delay);
  };

  const U = CLOCK.usage;
  packet("read", [[READ[0], READ[1], track(read, 16)]], U.dur, U.delay);
  ping(q(".pv-dot", src), READ[0], U.dur, U.delay);
  run(q(".pv-node__icon", node), blip(READ[1], U.dur, 420, { transform: "scale(1)" }, { transform: "scale(1.07)" }, { transform: "scale(1)" }), U.dur, U.delay);
  routes.forEach((r) => {
    const k = r.dataset.route, c = CLOCK[k], pts = track(r);
    packet(k, [[c.out[0], c.out[1], pts], [c.back[0], c.back[1], flip(pts)]], c.dur, c.delay);
    ping(q(`.pv-host--${k} .pv-dot`, stage), c.out[1], c.dur, c.delay);
  });
  run(q(".pv-node__ring", node), [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], 60000);

  disposers.push(() => {
    anims.forEach((a) => a.cancel());
    ro.disconnect();
    layer.remove();
    qa(".pv-ping", stage).forEach((el) => el.remove());
  });

  let armed = false, visible = false, live = false;
  const sync = () => {
    const want = armed && visible;
    if (want === live) return;
    live = want;
    anims.forEach((a) => (live ? a.play() : a.cancel()));
  };

  // entrance, scrubbed: the wires grow while the reader is looking at them, and each host lands the moment
  // its wire reaches it. The refusal strike draws before the word it refuses.
  gsap.set([read, ...routes, reveal, strike], { drawSVG: "0%" });
  gsap.set([tip, ghost], { opacity: 0 });
  gsap.set(xMark, { scale: 1.4, opacity: 0, transformOrigin: "50% 50%" });
  gsap.set(node, { scale: 0.7, opacity: 0 });
  gsap.set([...lbls, src, rw, ...hosts], { autoAlpha: 0, x: -14 });
  gsap.set([wt, cap], { autoAlpha: 0 });

  const tl = gsap.timeline({
    scrollTrigger: mobile
      ? { trigger: stage, start: "top 80%", end: "bottom 80%", scrub: 0.5 }
      : { trigger: stage, start: "top 80%", end: "bottom 70%", scrub: 0.5 },
    onUpdate: () => { const a = tl.time() >= wired - 1e-3; if (a !== armed) { armed = a; sync(); } },
  });
  let wired = 0; // timeline time at which all three wires are drawn: packets may fly
  const pin = { autoAlpha: 1, x: 0, ease: "edit" };
  if (mobile) {
    // Vertical: timeline time = stage y / height, so every piece arrives as it crosses the 80% line.
    const Y = (y) => y / vh;
    const hy = hosts.map((h) => parseFloat(h.style.getPropertyValue("--y")));
    const fork = 262; // where the wires leave the Mac
    tl.to(lbls[0], { ...pin, duration: 0.05 }, 0)
      .to(src, { ...pin, duration: 0.06 }, Y(30))
      .to(read, { drawSVG: "100%", duration: Y(178) - Y(78), ease: "none" }, Y(78))
      .to(rw, { ...pin, duration: 0.05 }, Y(104))
      .to(strike, { drawSVG: "100%", duration: 0.04, ease: "power2.inOut" }, Y(118))
      .to(wt, { autoAlpha: 1, duration: 0.03, ease: "none" }, Y(118) + 0.045)
      .to(tip, { opacity: 1, duration: 0.02, ease: "none" }, Y(174))
      .to(node, { scale: 1, opacity: 1, ...lib.SPR.open, duration: 0.1 }, Y(166))
      .to(lbls[1], { ...pin, duration: 0.05 }, Y(250));
    routes.forEach((r, i) => tl.to(r, { drawSVG: "100%", duration: Y(hy[i]) - Y(fork), ease: "none" }, Y(fork)));
    wired = Y(Math.max(...hy.slice(0, 3)));
    hosts.slice(0, 3).forEach((h, i) => tl.to(h, { ...pin, duration: 0.05 }, Y(hy[i]) - 0.03));
    tl.to(reveal, { drawSVG: "100%", duration: Y(500) - Y(fork), ease: "none" }, Y(fork))
      .to(ghost, { opacity: 1, duration: 0.05, ease: "none" }, Y(500))
      .to(xMark, { scale: 1, opacity: 1, ...lib.SPR.play, duration: 0.12 }, Y(494))
      .to(reveal, { drawSVG: "0%", duration: 0.08, ease: "power2.in" }, Y(530))
      .to(hosts[3], { ...pin, duration: 0.05 }, Y(hy[3]) - 0.03)
      .to(cap, { autoAlpha: 1, duration: 0.04, ease: "none" }, 0.96);
    tl.set({}, {}, 1); // pad: progress == stage y / height
  } else {
    tl.to(lbls, { ...pin, duration: 0.6, stagger: 0.15 }, 0)
      .to(src, { ...pin, duration: 0.7 }, 0.05)
      .to(node, { scale: 1, opacity: 1, ...lib.SPR.open }, 0.1)
      .to(read, { drawSVG: "100%", duration: 0.5, ease: "edit" }, 0.3)
      .to(tip, { opacity: 1, duration: 0.2, ease: "none" }, 0.7)
      .to(rw, { ...pin, duration: 0.5 }, 0.55)
      .to(strike, { drawSVG: "100%", duration: 0.45, ease: "power2.inOut" }, 0.8)
      .to(wt, { autoAlpha: 1, duration: 0.3, ease: "none" }, 1.25)
      .to(routes, { drawSVG: "100%", duration: 1.1, ease: "edit", stagger: 0.2 }, 0.45);
    wired = 0.45 + 0.2 * (routes.length - 1) + 1.1;
    // each host lands as its wire's draw finishes
    hosts.slice(0, 3).forEach((h, i) => tl.to(h, { ...pin, duration: 0.6 }, 0.45 + i * 0.2 + 0.8));
    tl.to(reveal, { drawSVG: "100%", duration: 0.75, ease: "power2.inOut" }, 1.3)
      .to(ghost, { opacity: 1, duration: 0.6, ease: "none" }, 1.55)
      .to(hosts[3], { ...pin, duration: 0.7 }, 1.6)
      .to(xMark, { scale: 1, opacity: 1, ...lib.SPR.play }, 2)
      .to(reveal, { drawSVG: "0%", duration: 0.6, ease: "power2.in" }, 2.3)
      .to(cap, { autoAlpha: 1, duration: 0.8, ease: "none" }, 2.1);
  }

  disposers.push(lib.whileVisible(stage, () => { visible = true; sync(); }, () => { visible = false; sync(); }));

  // ---- legend: every zero starts blank ("–", no reading yet) and rolls to 0 once. A zero never passes
  // through another digit, not even for a frame; hover re-rolls 0 over 0 (throttled so rolls never stack).
  const roll = gsap.timeline({ paused: true });
  qa(".pv-zero__n").forEach((el, i) => {
    const n = el.dataset.n;
    const roller = new lib.Roller(el, { value: "–" });
    el.classList.add("is-blank");
    let last = 0;
    roll.call(() => { el.classList.remove("is-blank"); roller.set(n); last = performance.now(); }, null, i * 0.12);
    const cell = el.closest(".pv-zero");
    if (lib.finePointer()) {
      const spin = () => {
        if (el.classList.contains("is-blank") || performance.now() - last < 700) return;
        last = performance.now();
        roller.bump();
      };
      cell.addEventListener("pointerenter", spin);
      disposers.push(() => cell.removeEventListener("pointerenter", spin));
    }
    disposers.push(() => { el.textContent = n; el.classList.remove("roller", "is-blank"); });
  });
  ScrollTrigger.create({ trigger: q(".pv-legend"), start: "top 90%", once: true, onEnter: () => roll.play() });

  // ---- 04 open source: the claim rises, then a teal ✓ stamps (the diagram's ✕, answered) and the star
  // button follows
  const os = q(".pv-os");
  const osIn = q(".pv-os__in");
  const ok = q(".pv-os__ok");
  const go = q(".pv-os__go");
  gsap.set(osIn, { yPercent: 105 });
  gsap.set(ok, { scale: 1.5, opacity: 0, transformOrigin: "50% 50%" });
  gsap.set(q("path", ok), { drawSVG: "0%" });
  gsap.set(go, { autoAlpha: 0, y: 16 });
  gsap.timeline({ scrollTrigger: { trigger: os, start: "top 82%", once: true } })
    .to(osIn, { yPercent: 0, duration: 0.9, ease: "edit" })
    .to(ok, { scale: 1, opacity: 1, ...lib.SPR.play }, 0.62)
    .to(q("path", ok), { drawSVG: "100%", duration: 0.32, ease: "power2.out" }, 0.74)
    .to(go, { autoAlpha: 1, y: 0, duration: 0.7, ease: "edit" }, 0.5);

  return () => disposers.reverse().forEach((fn) => fn());
}
