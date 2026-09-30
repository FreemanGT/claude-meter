// §06 faq — Questions, metered. Each answer you open "uses" 10% of the page's session:
// its hairline fills and stays filled, its gauge segment lights, the open row's mini island reads the new level,
// and the nav island's FAQ ring follows. Amber past half; past 85% it all turns red, as the app does.
// Glyph geometry is in viewBox units (0 0 120 48); the glyph is built here (decoration, hidden until hover/open).
const VB = 120;
const C = { w: 80, h: 22, rt: 3.2, rb: 9 };     // collapsed: hugs the top edge
const N = { w: 86, h: 27, rt: 3.6, rb: 10 };    // hover: a small peek
const P = { w: 120, h: 44, rt: 4.4, rb: 12 };   // open: peek, with the answer's key reading
const WING = { in: 7.6, w: 15 };                 // tick-bar readings sit this far inside the shape's edge
const HOT = 0.85;                                // Theme.swift: red above 85%
const WARM = 0.5;                                // amber past half
const SEG = 6.2;                                 // gauge segment length (pathLength units, see faq.css)
const NEXT = "Open the next one";
const HID = { scaleX: 0.7, scaleY: 0, opacity: 0 }, VIS = { scaleX: 1, scaleY: 1, opacity: 1 };
const RT = '<rect class="g-wt" y="9.3" width="15" height="3.4" rx="1.7"/>';
const GLYPH = `<path class="g-shape"/><g class="g-wing">${RT}<rect class="g-wf g-wf--lvl" y="9.3" width="15" height="3.4" rx="1.7"/></g>`
  + `<g class="g-wing">${RT}<rect class="g-wf g-wf--lav" y="9.3" width="5.7" height="3.4" rx="1.7"/></g><circle class="g-lens" cx="60" cy="11" r="2.5"/>`
  + '<g class="g-peek"><g class="g-pk"><circle class="g-trk" cx="22" cy="25" r="8.4"/><circle class="g-arc" cx="22" cy="25" r="8.4" pathLength="100" transform="rotate(-90 22 25)"/><text class="g-key" y="30" text-anchor="middle"></text></g></g>';

export default function init(root, ctx) {
  const { gsap, ScrollTrigger, SplitText, reduced, mobile, meter, lib } = ctx;
  const $ = (s, el = root) => el.querySelector(s);
  const $$ = (s, el = root) => [...el.querySelectorAll(s)];

  const items = $$(".faq__item");
  const total = items.length;
  const cost = `${Math.round(100 / total)}%`;   // what one answer "uses"
  const gauge = $(".faq__gauge");
  const segTrk = $$(".g-trk .seg", gauge), segGho = $$(".g-gho .seg", gauge), segVal = $$(".g-val .seg", gauge);
  const mark = $(".g-mark", gauge);
  const usedLabel = $(".faq__used");
  const btn = $(".faq__done"), btnTxt = $(".faq__done-txt"), btnGo = $(".faq__done-go"), btnArw = $(".faq__done-arw");
  const btnRing = $(".faq__done-ring .val");
  const answers = items.map((it) => $(".faq__a", it));
  const fcEl = $(".faq__fc");
  const fills = items.map((it) => $(".faq__fill", it));

  const offs = [];
  const on = (el, type, fn, opts) => { el.addEventListener(type, fn, opts); offs.push(() => el.removeEventListener(type, fn, opts)); };
  const isUsed = (it) => it.classList.contains("is-used");
  const usedCount = () => items.filter(isUsed).length;

  // ---------- live numbers ----------
  const countR = new lib.Roller($(".faq__count"), { value: usedCount() });
  const pctR = new lib.Roller($(".faq__pctnum"), { value: usedCount() * 10, format: (v) => `${Math.round(v)}%` });
  let btnR = null;
  // Labels cross-fade; numbers roll (Roller). Nothing here scrambles.
  const swap = (el, text, animate) => {
    if (el.textContent === text) return;
    if (!animate || reduced) { el.textContent = text; return; }
    lib.untracked(() => {
      gsap.killTweensOf(el);
      gsap.timeline()
        .to(el, { opacity: 0, y: -4, duration: 0.15, ease: "power2.in", onComplete: () => { el.textContent = text; } })
        .fromTo(el, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.3, ease: "settle", clearProps: "opacity,transform" });
    });
  };
  const renderBtn = (n, animate) => {
    const full = n >= total;
    btn.classList.toggle("is-full", full);
    // the visible spans run together for a screen reader; the name says the same words, punctuated
    btn.setAttribute("aria-label", full ? "100% — you’ve read everything. Resets at the top" : `${n} of ${total} opened. ${NEXT}`);
    btnRing.style.strokeDasharray = `${(n / total) * 100} 100`;
    btnRing.style.opacity = n ? 1 : 0;
    if (full) {
      btnR = null;
      swap(btnTxt, "100% — you’ve read everything.", animate);
      swap(btnGo, "Resets at the top", animate);
      btnArw.textContent = "↑";
    } else {
      if (!btnR) {
        btnTxt.innerHTML = `<span class="faq__done-n"></span> of ${total} opened`;
        btnR = new lib.Roller(btnTxt.firstElementChild, { value: n });
      } else btnR.set(n, { instant: !animate });
      swap(btnGo, NEXT, animate);
      btnArw.textContent = "↓";
    }
  };

  // ---------- NotchShape glyph: hidden ⇄ collapsed ⇄ hover ⇄ peek (path d tween on the "island" ease) ----------
  const glyphs = items.map((it) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "faq__glyph");
    svg.setAttribute("viewBox", `0 0 ${VB} 48`);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.innerHTML = GLYPH;
    const key = $(".g-key", svg);
    key.textContent = it.dataset.key || "";
    $("summary", it).insertBefore(svg, $(".faq__bar", it));
    // the peek is as wide as its reading needs: [rim · ring · gap · reading · rim], centred on the notch
    const pw = Math.min(VB, Math.max(88, Math.ceil(key.getComputedTextLength()) + 54));
    const P1 = { ...P, w: pw };
    $(".g-pk", svg).setAttribute("transform", `translate(${(VB - pw) / 2} 0)`);
    key.setAttribute("x", ((38 + pw - 14) / 2).toFixed(1));
    const path = $(".g-shape", svg), wings = $$(".g-wing", svg), peek = $(".g-peek", svg);
    const s = { ...C };
    let state = "h", paneOn = false, blinkId = 0;
    const draw = () => {
      path.setAttribute("d", lib.notchPath(s.w, s.h, s.rt, s.rb));
      path.setAttribute("transform", `translate(${((VB - s.w) / 2).toFixed(2)} 0)`);
      wings[0].setAttribute("transform", `translate(${(VB / 2 - s.w / 2 + WING.in).toFixed(2)} 0)`);
      wings[1].setAttribute("transform", `translate(${(VB / 2 + s.w / 2 - WING.in - WING.w).toFixed(2)} 0)`);
    };
    draw();
    gsap.set(svg, { ...HID, transformOrigin: "50% 0%" });
    // it drops out of the hairline, and folds back into it
    const reveal = (on, instant) => {
      gsap.killTweensOf(svg);
      if (instant) gsap.set(svg, on ? VIS : HID);
      else gsap.to(svg, on ? { ...VIS, ...lib.SPR.open } : { ...HID, duration: 0.26, ease: "power2.in" });
    };
    const shape = (target, instant, vars) => {
      gsap.killTweensOf(s);
      if (instant) { Object.assign(s, target); draw(); } else gsap.to(s, { ...target, ...vars, onUpdate: draw });
    };
    // the app's pane squeeze: in scaleX .6 → 1 over .3s after .06s, out to scaleX .3 over .18s, on (.2,.8,.2,1)
    const pane = (on, instant, delay = 0) => {
      if (on === paneOn) return;
      paneOn = on;
      gsap.killTweensOf([peek, ...wings]);
      if (instant) { gsap.set(peek, { opacity: on ? 1 : 0, scaleX: 1, svgOrigin: "60 25" }); gsap.set(wings, { opacity: on ? 0 : 1 }); return; }
      if (on) {
        gsap.to(wings, { opacity: 0, duration: 0.12 });
        gsap.fromTo(peek, { opacity: 0, scaleX: 0.6, svgOrigin: "60 25" }, { opacity: 1, scaleX: 1, duration: 0.3, delay: 0.06 + delay, ease: "settle" });
      } else {
        gsap.to(peek, { opacity: 0, scaleX: 0.3, svgOrigin: "60 25", duration: 0.18, ease: "settle" });
        gsap.to(wings, { opacity: 1, duration: 0.2, delay: 0.18 });
      }
    };
    const to = (next, instant = reduced) => {
      if (next === state) return;
      clearTimeout(blinkId);
      const prev = state;
      state = next;
      if (next === "h") {
        reveal(false, instant);
        shape(C, instant, { duration: 0.26, ease: "power2.in" });
        pane(false, instant);
        return;
      }
      if (prev === "h") reveal(true, instant);
      const open = next === "p";
      shape(open ? P1 : next === "n" ? N : C, instant,
        open || prev === "p" ? { duration: 0.44, ease: "island" } : { duration: 0.3, ease: "settle" });
      pane(open, instant, prev === "h" ? 0.08 : 0);
    };
    // ambient: an unread row's island drops out of its hairline for a beat, then folds back
    const blink = () => {
      if (state !== "h") return;
      to("c");
      blinkId = setTimeout(() => state === "c" && to("h"), 1300);
    };
    const kill = () => { clearTimeout(blinkId); gsap.killTweensOf([s, svg, peek, ...wings]); svg.remove(); };
    if (it.open) to("p", true);
    return { to, blink, kill, get state() { return state; } };
  });

  // ---------- "use" a question ----------
  const plus = (it) => {
    const el = document.createElement("span");
    el.className = "faq__plus";
    el.setAttribute("aria-hidden", "true");
    el.textContent = `+${cost}`;
    $("summary", it).append(el);
    gsap.timeline({ onComplete: () => el.remove() })
      .fromTo(el, { y: 8, autoAlpha: 0 }, { y: -10, autoAlpha: 1, duration: 0.32, ease: "power2.out" })
      .to(el, { y: -30, autoAlpha: 0, duration: 0.6, ease: "power1.in" }, 0.62);
  };

  // FORECAST: the app's burn-rate line, on your reading pace. Written on each open, never ticking.
  let t0 = 0;
  const forecast = (n, animate) => {
    let text = "";
    if (t0 && n >= 2 && n < total) {
      const sec = ((performance.now() - t0) / 1000 / (n - 1)) * (total - n);
      text = sec < 60 ? `hits the cap in ${Math.max(1, Math.round(sec))}s` : lib.fmtForecast(sec);
    }
    swap(fcEl, text, animate);
  };

  let armed = false; // all read → the next arrival at the top resets the FAQ
  const complete = () => {
    armed = true;
    swap(usedLabel, "all read", true);
    if (!reduced) gsap.fromTo(gauge, { scale: 0.93 }, { scale: 1, ...lib.SPR.open, clearProps: "transform" });
  };
  const sync = (animate) => {
    const n = usedCount();
    countR.set(n, { instant: !animate });
    pctR.set(n * 10, { instant: !animate });
    renderBtn(n, animate);
    root.style.setProperty("--lvl", n / total);   // the mark, the wings, the session rings, all in CSS
    root.classList.toggle("is-warm", n / total > WARM);
    root.classList.toggle("is-hot", n / total > HOT);
    root.classList.toggle("is-lit", n > 0);         // on the root: revealLines re-creates the heading's nodes
    meter.setFaq(n, total);
    forecast(n, animate);
    if (animate && n === total) complete();
  };
  // The new level travels out from the row just opened: 45ms per row of distance.
  const waveFrom = (i) => items.forEach((it, k) => it.style.setProperty("--d", `${Math.abs(k - i) * 0.045}s`));

  const markUsed = (i) => {
    const it = items[i];
    if (isUsed(it)) return;
    waveFrom(i);
    if (!t0) t0 = performance.now();
    it.classList.add("is-used");
    segVal[i].classList.add("is-used");
    segGho[i].classList.remove("is-on");
    $("summary", it).dataset.cursor = "already counted";
    if (!reduced) {
      gsap.fromTo(fills[i], { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "edit", clearProps: "transform" });
      // the new segment lands fat and settles to the ring's weight
      const sw = parseFloat(getComputedStyle(segVal[i]).strokeWidth) || 12;
      gsap.fromTo(segVal[i], { strokeDasharray: "0 100", opacity: 1, strokeWidth: sw * 1.9 },
        { strokeDasharray: `${SEG} 100`, strokeWidth: sw, duration: 0.8, ease: "edit", clearProps: "strokeDasharray,opacity,strokeWidth" });
      plus(it);
    }
    sync(true);
  };

  const resetAll = () => {
    armed = false;
    t0 = 0;
    items.forEach((it, i) => {
      it.open = false;
      it.classList.remove("is-used");
      segVal[i].classList.remove("is-used");
      $("summary", it).dataset.cursor = `uses ${cost}`;
    });
    usedLabel.textContent = "used";
    sync(false);
  };

  // Opening/closing an answer moves everything after that row: the rows below, the finale's pin, the page
  // meter. Once the height transition settles, re-measure only those triggers (page-wide ones, ones on an
  // ancestor, the row itself, or anything after it in the document). A full ScrollTrigger.refresh() re-measures
  // all ~60 and the hero: a 50–170ms long task while someone is reading.
  let refreshId = 0, fromRow = Infinity, measuredH = 0;
  const moves = (st, row) => { const el = st.trigger; return !el || el === row || el.contains(row) || !!(row.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING); };
  const refreshSoon = (i) => {
    fromRow = Math.min(fromRow, i);
    clearTimeout(refreshId);
    refreshId = setTimeout(() => {
      const row = items[fromRow];
      fromRow = Infinity;
      const h = document.documentElement.scrollHeight;
      if (h === measuredH) return;                  // opened and closed again before it settled
      measuredH = h;
      ScrollTrigger.getAll().forEach((st) => moves(st, row) && st.refresh());
      ScrollTrigger.update();
    }, reduced ? 50 : 560);
  };

  // ---------- rows: hover, toggle ----------
  let hovered = -1;
  items.forEach((it, i) => {
    const sum = $("summary", it);
    sum.dataset.cursor = isUsed(it) ? "already counted" : `uses ${cost}`;
    const enter = () => {
      hovered = i;
      if (!isUsed(it)) segGho[i].classList.add("is-on");
      if (!it.open) glyphs[i].to("n");
    };
    const leave = () => {
      if (hovered === i) hovered = -1;
      segGho[i].classList.remove("is-on");
      if (!it.open) glyphs[i].to("h");
    };
    on(sum, "pointerenter", (e) => e.pointerType === "mouse" && enter());
    on(sum, "pointerleave", (e) => e.pointerType === "mouse" && leave());
    on(sum, "focus", () => sum.matches(":focus-visible") && enter());
    on(sum, "blur", leave);
    on(it, "toggle", () => {
      refreshSoon(i);
      if (it.open) {
        glyphs[i].to("p");
        if (!reduced) gsap.fromTo(answers[i], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: "edit", delay: 0.06, overwrite: true });
        markUsed(i);
      } else {
        glyphs[i].to(hovered === i ? "n" : "h");
        if (!reduced) gsap.to(answers[i], { opacity: 0, y: 4, duration: 0.3, ease: "power2.in", overwrite: true });
      }
    });
  });
  items.forEach((it, i) => { if (it.open) markUsed(i); }); // a re-init with rows already open

  // ---------- the button after the list ----------
  btn.hidden = false;
  renderBtn(usedCount(), false);
  armed = usedCount() === total;
  usedLabel.textContent = armed ? "all read" : "used";
  on(btn, "click", () => {
    if (usedCount() >= total) { lib.scrollTo(0); return; }
    const next = items.find((it) => !isUsed(it));
    next.open = true;
    $("summary", next).focus({ preventScroll: true });
    const top = next.getBoundingClientRect().top;
    if (top < innerHeight * 0.12 || top > innerHeight * 0.62) lib.scrollTo(window.scrollY + top - innerHeight * 0.28);
  });
  const onScroll = () => { if (armed && window.scrollY <= 1) resetAll(); };
  on(window, "scroll", onScroll, { passive: true });

  meter.setFaq(usedCount(), total);

  // ---------- gauge marker: which row sits at the reading line ----------
  let active = -1;
  const setActive = (i) => {
    if (i === active) return;
    if (active >= 0) segTrk[active].classList.remove("is-here");
    active = i;
    // runs in ScrollTrigger callbacks: keep the marker tween out of the section's gsap.context
    const to = (vars) => lib.untracked(() => reduced ? gsap.set(mark, { ...vars, overwrite: true }) : gsap.to(mark, { ...vars, duration: 0.7, ease: "edit", overwrite: "auto" }));
    if (i < 0) { to({ opacity: 0 }); return; }
    segTrk[i].classList.add("is-here");
    to({ rotation: (i * 10 + 5) * 3.6, svgOrigin: "100 100", opacity: 1 });
  };
  if (!mobile) {
    items.forEach((it, i) => ScrollTrigger.create({
      trigger: it, start: "top 55%", end: "bottom 55%",
      onToggle: (st) => st.isActive ? setActive(i) : active === i && setActive(-1),
    }));
  }

  // ---------- scroll reveals (motion only; the static page is complete without them) ----------
  let disposeLoop = () => {};
  if (!reduced) {
    lib.revealLines($("#faq-title"));
    gsap.from($(".faq__sub"), { opacity: 0, y: 16, duration: 0.9, ease: "edit", delay: 0.15, scrollTrigger: { trigger: $(".faq__sub"), start: "top 88%", once: true } });
    gsap.fromTo(segTrk, { strokeDasharray: "0 100" }, {
      strokeDasharray: `${SEG} 100`, duration: 0.9, ease: "edit", stagger: 0.055, clearProps: "strokeDasharray",
      scrollTrigger: { trigger: gauge, start: "top 88%", once: true },
    });
    gsap.from($(".faq__num"), { autoAlpha: 0, scale: 0.9, duration: 0.9, ease: "edit", delay: 0.3, scrollTrigger: { trigger: gauge, start: "top 88%", once: true } });

    const parts = items.map((it) => ({ it, pct: $(".faq__pct", it), q: $(".faq__q", it) }));
    parts.forEach(({ it, pct, q }) => {
      gsap.set(it, { "--rs": 0 });
      gsap.set([pct, q], { opacity: 0 });   // never visibility: the question is the summary's name
    });
    const revealRow = ({ it, pct, q }, delay) => {
      gsap.timeline({ delay })
        .to(it, { "--rs": 1, duration: 1.1, ease: "edit" }, 0)
        .fromTo(pct, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: "edit", clearProps: "transform" }, 0.08)
        .add(() => ctx.add(() => {
          gsap.set(q, { opacity: 1 });
          const split = SplitText.create(q, { type: "lines", mask: "lines" });
          gsap.from(split.lines, { yPercent: 110, duration: 0.9, ease: "edit", stagger: 0.07, onComplete: () => split.revert() });
        }), 0.12);
    };
    ScrollTrigger.batch(items, {
      start: "top 92%", once: true,
      onEnter: (batch) => batch.forEach((it, j) => revealRow(parts[items.indexOf(it)], j * 0.09)),
    });

    // Ambient: while the list is on screen, the next unread question's island drops out of its hairline for a beat.
    // Its gauge segment ghosts for the same beat: this one costs 10%.
    let timer = 0, ghostId = 0;
    const tick = () => {
      if (hovered >= 0 || root.contains(document.activeElement) && document.activeElement.tagName === "SUMMARY") return;
      const i = items.findIndex((it) => !isUsed(it) && !it.open);
      if (i < 0 || glyphs[i].state !== "h") return;
      glyphs[i].blink();
      segGho[i].classList.add("is-on");
      ghostId = setTimeout(() => hovered !== i && segGho[i].classList.remove("is-on"), 1300);
    };
    disposeLoop = lib.whileVisible($(".faq__list"), () => { timer = setInterval(tick, 4200); }, () => { clearInterval(timer); clearTimeout(ghostId); });
  }

  return () => {
    clearTimeout(refreshId);
    offs.forEach((off) => off());
    disposeLoop();
    glyphs.forEach((g) => g.kill());
    root.querySelectorAll(".faq__plus").forEach((el) => el.remove());
    gsap.killTweensOf([...answers, ...fills, ...segVal, mark, gauge, fcEl]);
    fcEl.textContent = "";
    gsap.set(answers, { clearProps: "opacity,visibility,transform" });
    items.forEach((it) => it.style.removeProperty("--d"));
    root.style.removeProperty("--lvl");
    root.classList.remove("is-warm");
    root.classList.remove("is-hot");
    root.classList.remove("is-lit");
    gsap.set(fills, { clearProps: "transform" });
    gsap.set(segVal, { clearProps: "strokeDasharray,opacity" });
    if (active >= 0) segTrk[active].classList.remove("is-here");
    segGho.forEach((s) => s.classList.remove("is-on"));
  };
}
