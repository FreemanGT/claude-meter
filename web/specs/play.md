# Claude Meter site: creative spec "PLAY"

Creative lead spec. Architect and section builders build from this file alone. Where the spec gives exact copy, a number or a hex value, use it verbatim. Product truth lives in `Sources/ClaudeMeter/*.swift`. If this spec contradicts the source, the source wins; flag the conflict and do not invent anything.

---

## 0. The big idea: "The page has a limit too. Go ahead, poke it."

The island is not a picture of the product. **It is a toy you can grab.** It is the app's real UI, rebuilt in code at 1:1 fidelity, and it lives in a real-feeling MacBook notch at the top of the page for the whole visit.

It behaves like a physical object:

- **Pull it down:** it stretches like taffy and snaps open (pinned).
- **Let go early:** it wobbles back.
- **Right-click it:** you get the app's actual menu, and every toggle in that menu really changes the island on the page.
- **Scroll:** the island meters *you*. The teal wing is how far you've read, and it turns red and bold past 85%, exactly like the app. At the footer the page "hits its limit". The giant wordmark fills like a bar, the island says so, and then everything springs back to zero.

Three ingredients, fused:

1. **Cinematic scroll story.** Two pinned scenes:
   - *The Wall*: the same afternoon played twice, once blind and once with a meter.
   - *States*: the island blown up 3x centre stage, morphing collapsed → peek → pinned → red.
2. **Tactile play (our signature).** Everything reacts to the hand:
   - springy physics
   - a rim light that follows the cursor
   - letters you can squash
   - notifications you can flick away
   - a burn-rate lever
   - easter eggs worth screenshotting
3. **Editorial kinetic type.** A variable-width display face that *condenses against the wall* and *fills like a meter*, one serif-italic emotional word per headline, and mono marquees of real meter strings.

**Motion grammar.** Every animation expresses one of four verbs. If an effect fits none of them, cut it.

| Verb | What it covers |
|---|---|
| **FILL** | rings, bars, counters and type rising toward a limit |
| **FORECAST** | dashed extrapolations, "hits the cap in…", ghost states |
| **HIT** | compression, red + bold, one hard stop. Used twice only: the Wall and the footer |
| **RESET** | spring back to zero, calm "resets in…" |

Play interactions (pull, wobble, flick, squash) are FILL/RESET done by hand.

**Art direction.** Warm paper, a true-black product, the app's four metric colours as the only accents. Night beats (full black) happen twice: the Wall's HIT and the footer. Hand-drawn ink scribbles supply warmth. Nothing may look like the hated v1: no dark SaaS hero, no purple gradient button, no gradient text, no feature-card grid, no FAQ cards, no static screenshot hero.

---

## 1. Design tokens (`site/css/tokens.css`, architect-owned)

### 1.1 Fonts

Self-host under `site/fonts/`. Take the files from npm with `npm pack`, then extract them. Preload the first two.

| Role | npm package | File to copy | Size | Use |
|---|---|---|---|---|
| Display + body | `@fontsource-variable/anybody` (5.3.0) | `files/anybody-latin-wdth-normal.woff2` (axes wdth 50–150 **and** wght 100–900) | 57 KB | Headlines, body, UI. Body is `wdth 100, wght 420`. Headlines are `wdth 50–150, wght 700–900`. |
| Accent serif | `@fontsource/instrument-serif` | `files/instrument-serif-latin-400-italic.woff2` | 22 KB | One emotional word per headline, italic only. |
| Numbers / UI mono | `@fontsource-variable/geist-mono` | `files/geist-mono-latin-wght-normal.woff2` (wght 100–900) | 23 KB | Every number, meter string, marquee and terminal. Always `font-variant-numeric: tabular-nums`. |

The fonts total about 102 KB, within the ≤200 KB budget.

```css
@font-face{font-family:"Anybody";src:url(/fonts/anybody-wdth.woff2) format("woff2");font-weight:100 900;font-stretch:50% 150%;font-display:swap}
@font-face{font-family:"Instrument Serif";src:url(/fonts/instrument-serif-italic.woff2) format("woff2");font-style:italic;font-weight:400;font-display:swap}
@font-face{font-family:"Geist Mono";src:url(/fonts/geist-mono.woff2) format("woff2");font-weight:100 900;font-display:swap}
```

- **Island text** uses `-apple-system, "SF Pro Text", system-ui, sans-serif`. The app uses SF with `.monospacedDigit()`, so on a Mac the island looks exactly native. Island digits get `font-variant-numeric: tabular-nums`.
- **Island type steps** (from Theme.swift, in pt, multiplied by `--u`, the px-per-pt scale): caption 10, label 11, value 13, ring 15.

**Type scale** (clamp, fluid 390 → 1440):

| Token | Value |
|---|---|
| `--t-mega` | `clamp(88px, 17vw, 300px)`, line-height .82, tracking -0.04em (footer wordmark, "WALL") |
| `--t-h1` | `clamp(52px, 9.2vw, 156px)`, lh .88, tracking -0.035em |
| `--t-h2` | `clamp(40px, 6vw, 96px)`, lh .92, tracking -0.03em |
| `--t-h3` | `clamp(26px, 2.6vw, 40px)`, lh 1.02 |
| `--t-body` | `clamp(17px, 1.25vw, 20px)`, lh 1.5, max 34ch–58ch |
| `--t-small` | 14px/1.45 |
| `--t-mono` | 13px/1.3, tracking 0.02em, uppercase for eyebrows |

### 1.2 Colour

```css
:root{
  /* surfaces */
  --paper:#F3EEE4; --paper-2:#EAE3D6; --paper-3:#DED5C4;   /* sunk panels, hairlines */
  --ink:#1A1917; --ink-2:#5E594F; --ink-3:#8A8478;          /* ink-3: decoration / ≥24px only */
  --black:#000; --night:#0B0B0A; --night-2:#161513;
  /* metric identity: straight from Theme.swift. On black/island only, or as fills/strokes on paper */
  --teal:#5CC9A6; --lav:#B0A8ED; --amber:#FAC775; --red:#F26B6B;
  /* text-safe on paper (≥4.5:1 on --paper, verify with the QA contrast check) */
  --teal-ink:#17694F; --lav-ink:#5A4FCF; --amber-ink:#8F5B0A; --red-ink:#B8322A;
  /* island internals (Theme.swift) */
  --i-text:#fff; --i-text2:#A8A8A8; --i-text3:#999; --i-track:rgba(255,255,255,.13);
  --i-rim-top:rgba(255,255,255,.04); --i-rim-bot:rgba(255,255,255,.20);
  /* highlighter swipe */
  --marker:rgba(92,201,166,.42);
  --focus:#5A4FCF;
}
```

**Rules:**

- **Red is always paired with bold.** It appears when a value passes 85 (the app's `Theme.warn`).
- **Page background:** `--paper`. **Night beats:** `--night`.
- **Never use** Anthropic terracotta/orange, the Claude spark or asterisk, purple gradients, or gradient text. The one exception to the gradient-text rule is the footer wordmark, which is a *hard-stop* meter fill, not a gradient.

### 1.3 Radii, spacing, depth

| Token | Value |
|---|---|
| `--r-pill` | 999px |
| `--r-lg` | 40px (stages) |
| `--r-md` | 24px |
| `--r-sm` | 12px |

- Wrap radius-bearing rules in `@supports (corner-shape: squircle){ .sq{corner-shape:squircle} }` as progressive craft.
- **Island radii** come from Theme.swift and render via the NotchShape path (§4), not via border-radius:
  - collapsed: top 6, bottom 14
  - expanded: top 19, bottom 24
- **Spacing:** a 4px grid. Section vertical padding is `clamp(96px, 14vw, 200px)`. Page gutter is `clamp(16px, 4vw, 56px)`. Max content width is 1320px.
- **Shadows (warm, never grey):**
  - `--sh-1: 0 1px 0 rgba(255,255,255,.6) inset, 0 12px 30px -12px rgba(60,40,10,.25)`
  - `--sh-island: 0 18px 40px -18px rgba(0,0,0,.55)`

### 1.4 Easing and durations

```css
--ease-out: cubic-bezier(.2,.8,.2,1);          /* micro UI 160–220ms */
--ease-cm:  cubic-bezier(.625,.05,0,1);        /* text reveals, 0.9s */
--ease-io:  cubic-bezier(.65,0,.35,1);         /* night floods, clip-path */
/* SwiftUI .bouncy(duration:.4) (bounce .3): island OPEN. Settles in 0.59s */
--spring-open: linear(0, 0.017, 0.062, 0.127, 0.205, 0.29, 0.378, 0.466, 0.55, 0.629, 0.702, 0.766, 0.824, 0.873, 0.915, 0.949, 0.978, 1, 1.017, 1.029, 1.038, 1.043, 1.045, 1.046, 1.045, 1.043, 1.039, 1.036, 1.032, 1.028, 1.024, 1.02, 1.016, 1.013, 1.01, 1.008, 1.005, 1.004, 1.002, 1.001, 1, 0.999, 0.999, 0.998, 0.998, 0.998, 0.998, 0.998, 1);
--spring-open-dur: 590ms;
/* SwiftUI .smooth(duration:.4): island CLOSE. Settles in 0.54s */
--spring-close: linear(0, 0.014, 0.05, 0.099, 0.158, 0.222, 0.286, 0.351, 0.413, 0.472, 0.527, 0.579, 0.626, 0.669, 0.707, 0.742, 0.774, 0.801, 0.826, 0.848, 0.868, 0.885, 0.9, 0.913, 0.925, 0.935, 0.943, 0.951, 0.958, 0.964, 0.969, 0.973, 0.977, 0.98, 0.983, 0.985, 0.987, 0.989, 0.991, 0.992, 0.993, 0.994, 0.995, 0.996, 0.996, 0.997, 0.997, 0.998, 1);
--spring-close-dur: 540ms;
/* PLAY spring (bounce .5, 0.6): rubber-band release, flicks, buttons. Settles in 1.17s */
--spring-play: linear(0, 0.03, 0.108, 0.22, 0.352, 0.49, 0.627, 0.754, 0.867, 0.962, 1.037, 1.094, 1.132, 1.154, 1.163, 1.16, 1.149, 1.131, 1.11, 1.088, 1.065, 1.044, 1.025, 1.009, 0.996, 0.986, 0.98, 0.975, 0.974, 0.974, 0.975, 0.978, 0.981, 0.985, 0.989, 0.992, 0.995, 0.998, 1, 1.002, 1.003, 1.004, 1.004, 1.004, 1.004, 1.004, 1.003, 1.003, 1);
--spring-play-dur: 1170ms;
```

**Durations:**

| Kind | Timing |
|---|---|
| Micro | 180ms |
| Value tweens (bars, rings) | 500ms smooth, matching the app's `.smooth(duration: 0.5)` |
| Text reveals | 900ms, stagger lines .08 / words .04 / chars .012 |
| Floods | 700ms `--ease-io` |
| Loops | 4–8s periods |

### 1.5 Grain and glass recipes

**Grain.** One fixed `body::after`, `pointer-events:none`, `opacity:.05` (0.07 on night sections via `mix-blend-mode:overlay`). The background is a static SVG data-URI tile at 180×180: `feTurbulence type=fractalNoise baseFrequency=.85 numOctaves=2 stitchTiles=stitch` plus `feColorMatrix` to greyscale. **Never animate it.**

**Island materials** (the app's Solid / Frosted / Liquid Glass):

- **Solid:** fill `#000`.
- **Frosted:** a content-backdrop layer `backdrop-filter: blur(22px) saturate(1.4)` under a black scrim at **.84 alpha**. That's the app's `Appearance.scrim`: the island never gets lighter than about rgb 38.
- **Liquid Glass:** Frosted, plus:
  - A specular layer: `radial-gradient(120% 90% at var(--mx,50%) var(--my,0%), rgba(255,255,255,.14), transparent 55%)`, following the pointer.
  - An inner edge highlight: `inset 0 -1px 0 rgba(255,255,255,.22), inset 0 0 0 .5px rgba(255,255,255,.08)`.
  - In Chromium, `@supports (backdrop-filter: url(#x))` adds `backdrop-filter: url(#cm-refract) blur(14px) saturate(1.5)`. `#cm-refract` is an inline SVG filter: `feTurbulence baseFrequency=.012 numOctaves=1` → `feDisplacementMap scale=18`.
- **Rim, every mode:** an SVG stroke along the NotchShape path, 1px, `linearGradient` top→bottom from `--i-rim-top` to `--i-rim-bot`. This is Theme.rim. **Cursor-reactive:** within 240px of the pointer, a second rim stroke uses a `radialGradient` centred at the pointer (in island-local coords), opacity 0→.55 by proximity. The lip "catches the light" where your hand is.

---

## 2. Tech stack and global motion system (architect-owned)

### 2.1 Vendor (`site/vendor/`, no runtime CDN)

Get the files from `npm pack gsap@3.15.0` and `npm pack lenis@1.3.26`. Use the **UMD minified** builds loaded as classic `<script defer>` in this order:

1. `gsap.min.js`
2. `ScrollTrigger.min.js`
3. `SplitText.min.js`
4. `ScrambleTextPlugin.min.js`
5. `DrawSVGPlugin.min.js`
6. `Flip.min.js`
7. `CustomEase.min.js`
8. `Draggable.min.js`
9. `InertiaPlugin.min.js`
10. `lenis.min.js` (plus `lenis.css` inlined into base.css)

The JS totals about 90 KB gzipped. There is no three.js and no WebGL: the brief's shader budget is better spent on the island's glass. Our modules are `<script type="module" src="/js/main.js">` and read `window.gsap` and `window.Lenis`.

### 2.2 `site/js/lib/motion.js`

```js
export const gsap = window.gsap;
gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin, Flip, CustomEase, Draggable, InertiaPlugin);
gsap.defaults({ ease: "power3.out", duration: 0.6 });
CustomEase.create("cm", "0.625,0.05,0,1");
CustomEase.create("io", "0.65,0,0.35,1");
export const RM = matchMedia("(prefers-reduced-motion: reduce)");
export const reduced = () => RM.matches;
export const mm = gsap.matchMedia();            // sections register via mm.add({motion:"(prefers-reduced-motion: no-preference)", reduce:"(prefers-reduced-motion: reduce)", mobile:"(max-width: 767px)"}, ctx => …)
// SwiftUI-accurate spring as a GSAP ease. Same maths as the CSS linear() tokens.
export function spring({ duration = 0.4, bounce = 0 } = {}) {
  const w = 2 * Math.PI / duration, z = 1 - bounce, wd = w * Math.sqrt(Math.max(1e-6, 1 - z * z));
  const f = t => 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  const settle = { 0: 0.54, 0.3: 0.59, 0.5: 1.17 }[bounce] ?? duration * 1.6;
  return { ease: p => (p >= 1 ? 1 : f(p * settle)), duration: settle };
}
export const SPR = { open: spring({ duration: .4, bounce: .3 }), close: spring({ duration: .4 }), value: spring({ duration: .5 }), play: spring({ duration: .6, bounce: .5 }) };
```

**Reduced-motion switch.** On `RM.matches`:

- `document.documentElement.classList.add("rm")`
- no Lenis
- no intro
- `pinScene` returns static layouts
- marquees stop
- `countTo` and `scramble` set final values instantly
- the island changes state instantly (duration 0)

Listen to `RM.onchange` and reload the motion setup through `mm`.

### 2.3 Lenis (`main.js`)

```js
if (!reduced()) {
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, syncTouch: false, autoRaf: false, anchors: { offset: -80 } });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;   // sections use lenis.stop()/start() only for the intro
}
```

- Touch uses native scroll.
- **Never** use `snap` in pinned scenes.

### 2.4 Shared utilities (`site/js/lib/*.js`)

The architect builds these. The signatures are a contract for section builders.

| Module | Export | Behaviour |
|---|---|---|
| `split.js` | `splitReveal(el, {type:"lines"\|"words"\|"chars", from:"bottom"\|"top", stagger, delay, trigger:true\|false\|"start string", duration=.9})` → tween | SplitText with `mask:type`, `autoSplit:true`, and `aria:"auto"`. Waits for `document.fonts.ready`. Motion is yPercent 110→0 with ease `cm`. If `trigger` is set, it creates a ScrollTrigger `start:"top 82%"`, `once:true`. Under RM it is a no-op that leaves text visible. |
| `scramble.js` | `scramble(el, text, {chars="0123456789%", duration=.8, revealDelay=.2})` | ScrambleTextPlugin. Under RM it sets the text immediately. |
| `counter.js` | `countTo(el, to, {from, duration=.8, suffix="%", ease:"power2.out"})`; `class Roller(el, {height})` with `.set(value)` | `Roller` is the Alcove-style rolling digit: per-digit spans. On change the new digit enters from ±h/3 with blur(h/6)→0 and scale .8→1 using `SPR.play` (tuned to 150/14 feel), and the old digit exits to ∓h/2 with opacity 0 over .4s. Direction follows the sign of the change. Tabular digits keep the width fixed. |
| `magnetic.js` | `magnetic(el, {strength=.35, radius=1.4, inner?})` → destroy | `gsap.quickTo` x/y on the element (and `inner` at 1.6× for parallax). Release uses `SPR.play`. Skip on `(hover: none)` and RM. |
| `cursor.js` | `initCursorLabel()` | **Keeps the native cursor.** A 28px-tall ink pill (`--ink` bg, `--paper` text, mono 12px) trails the pointer by 18px/22px via quickTo (duration .35). It shows the text of `[data-cursor="…"]` on hover (e.g. "pull ↓", "right-click", "flick", "squash"), scaling 0.6→1 with `SPR.play`. It is hidden on touch, RM and keyboard focus, and it is `aria-hidden`. |
| `marquee.js` | `marquee(el, {speed=48 /*px/s*/, dir=1, skew=true, pauseOnHover=true})` | Duplicates the children (the clone gets `aria-hidden`) and translates with `gsap.ticker`. Scroll velocity from `ScrollTrigger` (`getVelocity`) adds up to ±2.5° skewX and a speed boost up to 3×, decaying back with `SPR.close`. Pauses when offscreen (IntersectionObserver), on a hidden tab and on hover. It is static under RM. |
| `reveal.js` | `initReveals()` | Auto-wires `[data-reveal="up"]` (y 32→0, opacity), `"mask"` (clip-path `inset(0 0 100% 0)`→`inset(0)`), `"scale"` (scale .94→1) and `"draw"` (DrawSVG 0→100% on child paths, .9s `io`). It uses `ScrollTrigger.batch` at `start:"top 85%"` and stagger .06. `data-reveal-delay` is optional. Under RM everything is visible. |
| `pin.js` | `pinScene(section, {length="250%", mobile="160%", scrub=.8, build(tl, ctx)})` → tl or null | Wraps `mm`. It pins `section.querySelector(".pin")` with `anticipatePin:1` and `invalidateOnRefresh:true`. Under RM it returns null and adds `.is-static` to the section, whose CSS then lays out the story as a static vertical sequence. |
| `visible.js` | `whenVisible(el, on, off, margin="10%")` | An IntersectionObserver used by all loops and timers. It also calls `off` when the tab is hidden. |
| `scribble.js` | `scribble(svg, {duration=.9, delay=0, trigger=true})` | DrawSVG on `path` in stroke order. Scribbles are inline SVG, `stroke:currentColor`, 2.25px, round caps, `vector-effect:non-scaling-stroke`. |
| `squash.js` | `squash(el, {min=60, max=150, radius=220, wght:[700,900]})` | Splits `el` into chars. On pointermove it sets each char's `font-stretch` by distance to the pointer: close chars condense toward `min`, pressed flat like fingers on dough. `wght` rises as they squash. Chars return to base with `SPR.play` via quickTo on a proxy `--w` variable (`font-variation-settings:"wdth" var(--w), "wght" var(--g)`). Touch uses drag. It is off under RM. The element carries `data-cursor="squash"`. |
| `island.js` | `class Island` | §4. |
| `pageIsland.js` | `initPageIsland()` | §5.2. |

**Performance rules (every builder):**

- Animate only transform, opacity, clip-path, filter (small elements), `font-variation-settings` (on at most about 30 glyphs at once), and SVG stroke/dash.
- Never animate box-shadow, top/left or width on scroll. The island's width/height morph is the one allowed layout-ish animation: a single element, only on state change, measured with a single read.
- Cap the device pixel ratio at 2.
- Every loop is gated by `whenVisible`.

---

## 3. Global elements

### 3.1 Intro (≤1.2s, once per session: `sessionStorage.cm_intro`; skipped under RM)

The black "lid" covers the viewport. The HTML hero is already rendered underneath, so LCP stays the hero H1.

| Time | What happens |
|---|---|
| 0–250ms | A 9px camera-lens dot (radial `#1a1a2a → #000`, with a 2px `rgba(80,110,255,.35)` glint) sits at top-centre y=16px. |
| 250–650ms | The page island (§5.2) springs **out of the dot** (`SPR.open`): width 0→collapsed, both wings popping in. The left wing's Roller counts `0%→100%` in teal. It is the "loading" counter, and it goes red and bold at 86+ for a split second, which is a wink. |
| 650–1150ms | The black lid retracts upward into the hero bezel: clip-path `inset(0 0 0 0)` → `inset(0 0 calc(100% - var(--bezel-h)) 0)` over 500ms `io`. The wing resets to `0%` (RESET) with a tiny bounce. |

- Hero H1 lines reveal starting at 800ms.
- `lenis.stop()` runs during the intro and `start()` at the end.
- Any key, click or wheel skips it immediately.

### 3.2 Nav (`<header>`, fixed, z above content, below the page island)

- **Left:** the app icon `assets/icon-256.png`, rendered at 30px (the full-bleed `full-1024.png` scaled with a 7px squircle mask), plus "Claude Meter" in Anybody wdth 88 wght 760, 17px.
  - Hover: the icon does a 1-turn "meter sweep". An SVG ring overlay around it draws 0→100% in teal (DrawSVG, .6s), then fades.
- **Right:**
  - Links "How it works" (#states), "Privacy" (#privacy) and "FAQ" (#faq), in 15px wght 560 `--ink-2`. On hover they turn `--ink`, and a hand-drawn underline scribble draws in (.35s).
  - Then the **Download pill** (§3.5, small size).
- **Background:** transparent at the top. After 40px of scroll it becomes a paper frost bar: `rgba(243,238,228,.72)` with `backdrop-filter: blur(16px) saturate(1.2)` and a hairline `--paper-3` bottom border. The transition is 300ms.
- **On night sections** (`[data-theme="night"]` in view, via ScrollTrigger toggleClass on `html`), the nav inverts to ink `rgba(11,11,10,.7)` with paper text.
- **Mobile (<768):** the icon only, plus the Download pill. The links are hidden; the FAQ is reachable via the footer.
- **Skip link:** "Skip to download", first focusable element, jumps to `#get`.

### 3.3 Page island

See §5.2. It is the persistent fixed notch at top-centre and it sits above the nav.

### 3.4 Grain

§1.5.

### 3.5 Download button (component, architect-owned: `.btn-dl` in base.css, `magnetic()` in main.js)

```html
<a class="btn-dl" href="/ClaudeMeter.dmg" download data-cursor="free · 1 click">
  <span class="btn-dl__ring" aria-hidden="true"><svg viewBox="0 0 24 24"><circle class="trk" r="10" cx="12" cy="12"/><circle class="val" r="10" cx="12" cy="12"/></svg><svg class="arrow">…↓…</svg></span>
  <span class="btn-dl__label">Download for Mac</span>
</a>
```

- **Look:** an ink pill (`--ink` bg, `--paper` text), wght 700, height 60px (44px small), padding 0 26px 0 10px, with a warm shadow `0 14px 30px -14px rgba(26,25,23,.55)`. The ring is a 36px mini meter:
  - The track is `rgba(243,238,228,.18)` and the value stroke is `--teal`.
  - At rest it shows `stroke-dashoffset` at 46% (a live-ish session).
- **Hover:**
  - The ring **FILLs** to 100% (.5s `SPR.value`) and turns red and **bold** past 85%.
  - The arrow drops 3px and back in a loop, 2 cycles.
  - The pill scales 1.03.
  - It is magnetic (strength .3).
- **Press:** scale .96 with `SPR.play`.
- **Click:**
  - The ring does a single 100% HIT: a 120ms micro-shake, x ±2px ×3.
  - Then it RESETs to 0 with a spring.
  - The page island shows a note for 3s: "Download started · see you in the notch".
  - The download proceeds normally.
- **On night sections:** a paper pill with ink text; the ring track is `rgba(26,25,23,.15)`.
- **Under it everywhere (the `.req` line):** mono 12.5px, `--ink-2`, reading **"Free · v1.2 · macOS 14.4+ · Apple Silicon & Intel"**, and on a second line **"Signed & notarized by Apple"** with a tiny check-seal glyph.

### 3.6 Footer

Section 8.

---

## 4. The ISLAND component (`site/js/lib/island.js` + `site/css/island.css`, architect-owned)

It is one class used by the hero/page island, the States scene, the Wall scene, the Playground and the FAQ. **Fidelity to the real app is the whole point.** Source files: IslandView.swift, Theme.swift, NotchShape.swift. Reference renders are in `scratchpad/snaps2/*.png`; they are 2× and the magenta outline is the camera-housing stand-in, not UI.

### 4.1 API

```js
const isl = new Island(hostEl, {
  u: 1.6,                         // px per pt (1 = real size). Hero ≈ 1.6–2.0, States 2.6–3.2, page island 1.
  state: "collapsed",             // "collapsed" | "peek" | "pinned" | "hidden"
  display: "percent",             // "percent" | "ticks"   (collapsed wings)
  appearance: "solid",            // "solid" | "frosted" | "glass"
  notch: true,                    // false → no-notch pill mode (top-centre pill, content under a 12pt top inset)
  burnRate: true,                 // shows forecast text + ring projection arc + bar projected tick + sparklines
  interactive: true,              // hover→peek (after 200ms), click→pin toggle, Esc→collapse, right-click→menu (§4.5), pull (§4.6)
  data: {
    plan: "Max 20x",
    fetched: "just now",
    session: { pct: 46, reset: "resets in 2h 13m", projected: 71, forecast: { kind: "exhausts", text: "hits the cap in 1h 12m", urgent: false } },
    weekly:  { pct: 38, reset: "resets Sat 1:05 PM" },
    models:  [{ name: "Opus", pct: 82, reset: "resets Sat 1:05 PM" }],
    spark:   { session: [..24 numbers 0–100], weekly: [...], Opus: [...] },   // 6h history
    note: null,                    // override bottom note text (e.g. "Opus limit reached · resets Sat 1:05 PM")
    hint: false                    // first-launch hint row
  }
});
isl.setState("peek", { duration });          // returns a Promise; springs per §4.3
isl.set(patch, { duration = .5 });           // deep-merge data; numbers tween (smooth .5 like the app); strings Roller/crossfade
isl.tween(patch, { duration, ease })         // returns a GSAP tween of a proxy → use inside scrubbed timelines (numbers only; strings switch at progress thresholds via callbacks)
isl.setAppearance("glass"); isl.setDisplay("ticks"); isl.setNotch(false); isl.setBurnRate(false);
isl.on("state", fn); isl.on("menu", fn); isl.on("pull", fn);
isl.pulse();                                 // HIT micro-shake 120ms, x ±2u
isl.destroy();
```

**Derived rules** (implement exactly as the app does):

- **Tint:** `pct > 85` gives `--red` plus a bold weight. Otherwise use the base colour: session teal, weekly lavender, model amber.
- **Collapsed right wing:** the weekly slot shows the **tightest** weekly limit. If the top model's pct is greater than weekly's, it shows the model in amber; otherwise weekly in lavender.
- **Collapsed percent font:** caption (10pt), semibold, bold when >85.
- **Ticks mode:** a 26×4pt capsule with the track `--i-track`, filled to `max(4, 26*pct/100)`.
- **Peek:** three equal columns.
  - The model column's label is the top model's name (e.g. "Opus"), and its colour is amber.
  - Each column has:
    - A ring: 54pt, stroke 5, round cap, starting at 12 o'clock and running clockwise.
    - The projection arc from `pct` to `projected` at 30% opacity in the ring's tint. This is **session only**; the app shows forecasts for the session only.
    - Ring text at ring 15pt, medium, bold >85, white.
    - The label: label 11pt medium, white.
    - The reset time: caption 10pt, `--i-text2`.
    - A forecast line in the session column (caption medium):
      - amber when `exhausts` ≥ 1h
      - **red when under 1h**
      - `--i-text2` for "on track — resets first"
    - When any column has a forecast, all three columns reserve that row.
  - Header row: plan (label, `--i-text2`) at the left, "just now" at the right, with a 185pt notch gap between them.
  - A bottom note appears only for a hit limit: a 5pt red dot followed by red, medium text, "Opus limit reached · resets Sat 1:05 PM".
- **Pinned:** a table. Each row has, in order:
  - The label, 84pt wide, label 11pt.
  - A sparkline, 44×14: an area filled with the colour at .28 and a line at .85.
  - A bar: 6pt high, capsule, flex width, fill `max(6, w*pct/100)`, plus a **2pt projected tick** in the same tint at `projected` (session only).
  - The percent: 38pt right-aligned, label size, medium, bold >85.
  - The reset: 96pt right-aligned, caption, `--i-text2`. It shows only when it differs from the previous row's reset.

  Header: the plan at the left, and "just now" plus a 📌-style pin glyph at the right (use an inline SVG pin, not an emoji). Bottom note:
  - limit reached: red, as above
  - otherwise the session forecast: "Session hits the cap in 1h 12m" (amber/red), or "Session on track — resets first" (`--i-text2`)
  - Row gap 8pt.
- **Hint:** with `hint:true` there is a centred caption row at the bottom, `--i-text2`: **"Hover to peek · click to pin · right-click for settings & Quit"**.

### 4.2 Geometry (in pt, multiplied by `u`)

| Item | Value |
|---|---|
| Notch (camera housing) | 185 × 32. Rendered as the black part of the shape, never outlined. |
| Collapsed | width 269 (notch + two wings), height 32, radii top 6 / bottom 14. Each metric is centred in its own wing. |
| Peek | width 500. Height auto: header 32, then 12 edge, rings block, 16 bottom. About 170 with a forecast, 150 without. |
| Pinned | width 560, height auto. About 150 for 3 rows plus a note. |
| Side inset | Content is inset by `topRadius + 20` (the gutter) from the frame edge, because NotchShape's wall sits `topRadius` inside. |
| No-notch mode | Collapsed is a 150×28 pill with radius 14 all round, both metrics side by side with a 1×10 divider (`--i-track`), 12pt from the top of its host. Expanded adds a 12pt top inset. |

**Shape.** Port `NotchShape.path(in:)` verbatim to JS. It returns an SVG path `d` for (w, h, rt, rb) using the same quad curves. Render one `<svg>` sized w×h with:

1. `path.fill` (black, or scrim for glass/frosted)
2. `path.rim` (the linear gradient stroke)
3. `path.rim-hot` (the pointer radial)

Content sits in an absolutely positioned div, clipped by `clip-path: path(d)`. It is updated on each morph frame, and only during morphs.

### 4.3 State morphs

- **Open** (collapsed → peek, peek → pinned, collapsed → pinned): width, height and radii tween with `SPR.open` (the app's `.bouncy(0.4)`).
- **Close:** `SPR.close` (`.smooth(0.4)`).
- **Content:**
  - Outgoing content fades out in 120ms.
  - Incoming content enters with opacity 0→1, `blur(6px)`→0 and scaleX .9→1 (origin top centre), over 260ms starting 90ms after the morph begins. This is the Alcove-style liquid squeeze.
  - Rings draw from 0 to value with `SPR.value` on first reveal, and numbers roll with `Roller`.
- **Hover/pin timing** follows the app:
  - Hover-enter opens peek after 200ms.
  - Leaving closes it unless pinned.
  - A click toggles pinned.
  - Esc collapses it.
- **Value changes:** bar and ring widths tween .5s (`SPR.value`). A tint flip to red happens at the >85 crossing, and the weight flips at the same frame.

### 4.4 Accessibility

- The host is a `<button type="button" class="island" aria-expanded aria-controls aria-label="Claude usage: session 46%, weekly 38%, Opus 82%">`. The label is updated on `set()`.
- The expanded content is `role="group"` with the metric labels exactly as the app's `metricLabel`, e.g. "Session 46%, resets in 2h 13m, hits the cap in 1h 12m".
- Enter/Space pins, Esc collapses, and **Shift+F10 or the context-menu key opens the menu** (§4.5).
- The focus ring is 2px `--focus`, offset 4px, following the shape: an outline on a wrapper with `border-radius` that matches the bottom radius.
- On touch:
  - tap → peek
  - second tap → pin
  - long-press 500ms → menu
- Under RM, all morphs are instant, with a crossfade of 120ms maximum.

### 4.5 Right-click menu: the real one (`Island.menu`)

On `contextmenu` over any interactive island, call `preventDefault` and show a macOS-style menu next to the pointer:

- Background `rgba(30,30,30,.72)` with `backdrop-filter: blur(30px) saturate(1.8)`, radius 10, a 0.5px `rgba(255,255,255,.12)` border and `--sh-island`.
- SF 13px white, rows 22px, highlight `#0A64D6` with radius 5.
- It opens with a scale .96→1 and opacity over 140ms from the pointer corner.

**Items, exactly in the app's order:**

1. The live usage rows: `Session  46% · resets in 2h 13m`, `Weekly  38% · resets Sat 1:05 PM`, `Opus  82% · resets Sat 1:05 PM`. They are disabled and grey.
2. A divider.
3. **Refresh now:** the island's "just now" scrambles, and after 600ms shows "just now" again. A second click within 10s shows the real throttle note in the header: "just refreshed · updating in 180s", ticking down.
4. **Open usage on claude.ai:** a link to `https://claude.ai/settings/usage`, `target=_blank rel=noopener`.
5. A divider.
6. **Appearance ▸** with a submenu: Solid / Frosted / Liquid Glass, with a checkmark on the current one. It calls `setAppearance`.
7. **Show percentages** (checkbox): toggles percent/ticks.
8. **Burn-rate estimates** (checkbox): toggles forecasts, projection arcs, ticks and sparklines.
9. **Usage notifications** (checkbox): when on, a notification (§7 of the Playground spec) fires when the demo crosses a threshold. In the page island it fires one demo banner immediately: "Session at 80%" / "80% used · resets in 1h 2m".
10. **Menu bar item** (checkbox): shows a tiny menu-bar readout at the top-right of the host stage. In the page island, it shows "46%" in the nav area.
11. **Launch at login** (checkbox): toggles, and a toast says "Saved… on your Mac, once you install it."
12. A divider.
13. **About Claude Meter:** a small About panel with the app icon, "Claude Meter", "Version 1.2" and "Made by Yiftach Freeman".
14. **Quit Claude Meter:**
    - The island shrinks back into the notch: width → the notch, wings squeezing in with `SPR.close`, then opacity 0.
    - After 900ms a small ink pill appears in its place: "Quit. (It's that easy.) Relaunch ↺".
    - Clicking Relaunch pops the island back with `SPR.play`.

Keyboard: arrow keys, Enter and Esc work, and the menu is `role="menu"`, with `menuitemcheckbox` for the toggles. Close it on outside click or scroll. The menu persists each toggle to `localStorage` wrapped in try/catch; this is a per-viewer convenience.

### 4.6 Pull-to-pin (the signature toy)

- Pointerdown on a collapsed or peek island, then drag downward with `Draggable` type "y" and a custom liveSnap.
  - The island's height stretches by `d' = 110*u * (1 - exp(-d/(160*u)))`, a rubber-band asymptote.
  - Width grows by `d' * .25`.
  - The bottom radius grows toward 24.
  - Content is stretched only via a counter-scale on an inner wrapper (text never distorts; it fades to .6).
- A horizontal drag tilts the island `rotate = clamp(dx*.03, -4, 4)deg` around the top centre.
- **Release:**
  - If `d' > 48u`, it pins (`SPR.open`) and a single "pop" happens: the rim flashes to .5 opacity for 200ms.
  - Otherwise it snaps back with `SPR.play` (a visible wobble).
- It emits a `pull` event that the hero uses for its scribble copy.
- It is disabled under RM and on `(pointer: coarse)`; tap is used instead.

**Idle breathing** (when interactive and visible, not RM): every 6s a rim-light sweep. The rim's radial highlight travels along the bottom edge from left to right over 1.2s. "just now" stays. Nothing else loops by default.

---

## 5. Page-wide systems

### 5.1 Theme beats

Any `section[data-theme="night"]` flips `html.is-night` while it's in view (`start:"top 50%"`, `end:"bottom 50%"`).

- `--bg` transitions from `--paper` to `--night` over 600ms `io` on `body` background-color. This is the one allowed background-color transition, and it isn't scroll-scrubbed.
- The text and nav tokens invert.

### 5.2 The page island (`pageIsland.js`, architect): "the page has a limit too"

- An `Island` with `u:1`, fixed top-centre at `top:0`, z-index 60, `notch:true`. On mobile (<768) it's a 126×37 Dynamic-Island-style pill (`notch:false`, `u:.9`).
- **Hero:** within the hero, the island is the hero stage's island (§Section 1 describes scaling). Implement it by giving the page island `u` 1.9 at scroll 0 and animating a CSS `--u` scale via ScrollTrigger scrub from 1.9 → 1 over the hero's height. Use a transform scale of the host, not a re-layout; set `transform-origin: top center`.
- **Data = the visitor:**
  - `session.pct` = document scroll progress 0–100 (via ScrollTrigger `start:0, end:"max"`). It's rounded, and the Roller only ticks on integer change.
  - `weekly.pct` = sections seen / total (a section counts when 40% of it is in view). The model slot is unused.
  - `session.reset` = "resets at the top". `weekly.reset` = "resets on reload".
  - `plan` = "This page". `fetched` = "just now".
  - At >70%, the peek forecast reads "hits the cap in N sections" (amber), turning red at 1 section left.
- **Peek/pinned labels:** "Read", "Seen" and "Downloads". The third ring is 0% until the visitor clicks Download, then it's 100% with the note "Downloads limit reached · resets never (you're set)".
  - A caption row at the bottom (caption, `--i-text2`) reads: **"This one meters the page. The real one meters Claude."**
- **Hide during** the Wall and States pins, which have their own islands. Move it `yPercent -130` with `SPR.close`, and bring it back with `SPR.open`.
- **At 100% (footer):** see Section 8.
- **Mobile:**
  - The pill shows the two numbers only.
  - A tap expands a compact 2-ring sheet (width `min(92vw, 360px)`).
  - Pull-to-pin is off.

---

## 6. Sections (in order)

Each section owns `web/sections/<id>.html`, `site/css/<id>.css` and `site/js/<id>.js`. The JS exports `init()`, which main.js calls after fonts are ready. Use `<section id="<id>" aria-labelledby="<id>-h">`. **Copy is final.** Keep the typographic quotes and the `·` separators exactly as written.

### Section 1: `hero` (paper; the stage)

**Layout (desktop 1440×900):**

- **Top band:** the **MacBook top bezel**. A full-width black band, `--bezel-h: clamp(44px, 6.2vw, 92px)`, with the display's inner corners (radius 22px at the bottom-left and bottom-right, where the black meets the paper "screen"). The camera lens dot is centred in the notch. The page island sits in it at `u≈1.9`, fused to the bezel: the notch *is* part of the band, and the wings hang below it.
  - Around the island, two hand-drawn ink scribbles:
    - On the left: a curly arrow with the word **"pull me"** in Instrument Serif italic 26px, rotated -6°.
    - On the right: a smaller arrow with **"or right-click"**.
  - Draw them in at 1.3s.
  - After the user pulls once, the left note scrambles to **"again?"**. After a second pull it becomes **"ok, you get it."** and the arrow un-draws.
- **Below**, a 12-col grid.
  - **H1 (cols 1–10, aligned left, starting 26vh from the top), 3 lines:**
    - `See the` / `wall` / `*before* you hit it.`
    - "wall" is a single giant word in `--t-mega`, `font-stretch:150%`, wght 900, spanning almost the full width. It has `squash()` applied and `data-cursor="squash"`.
    - "*before*" is Instrument Serif italic at 1.05em, `--ink`.
  - **Right column (cols 9–12, under "See the" and aligned to its baseline):**
    - Body: **"Claude Meter lives in your MacBook's notch and shows how much of your Claude plan is left: <chip teal>46% session</chip> <chip lav>38% weekly</chip> <chip amber>82% Opus</chip>. Glance up. Finish the task. Skip the surprise."**
      - Chips are Hoy-style inline pills: 0.9em mono, `--paper-2` bg, a 6px dot in the metric colour, and text in the matching `-ink` colour.
      - They tick in sync with the hero island's values, via a Roller.
    - Then `.btn-dl`, then `.req` (both lines).
- **Behind everything:** nothing. Clean paper and grain. The island is the only product image.

**Life / animation:**

1. **Load (after the intro or at t=0):**
   - H1 lines use `splitReveal` lines at 900ms with stagger .08.
   - "wall" enters **condensed** (`font-stretch 50%` → 150%), expanding over 1.1s with `SPR.play`. It is literally pushed open.
   - The body, CTA and req fade up at 1.1s / 1.2s / 1.3s.
2. **Hero island demo loop** (runs until the first user interaction with the island, and only while the hero is visible):

   | Time | Island state |
   |---|---|
   | 0s | Pinned **with the first-launch hint row** ("Hover to peek · click to pin · right-click for settings & Quit"), which is true to first launch |
   | 2.4s | Collapse |
   | 4s | Peek |
   | 6.5s | Collapse |

   - After that it loops every 8s between collapsed and peek.
   - Values drift slowly: session +1% every 4s from 46 to 58, then reset to 46 while collapsed, without an animation jump.
   - The chips in the body copy mirror them.
3. **Squash:** the "wall" letters react to the cursor (§2.4 `squash`). There's also a **scroll FILL**: as the hero scrolls out (0 → 100% of the hero), "wall" fills from ink to `--teal`, then above 85% to `--red`. Implement it as `background: linear-gradient(90deg, var(--fillc) var(--p), var(--ink) var(--p)); background-clip:text` with hard stops (no gradient blend), and `--p` scrubbed. Past 85%, weight 900 and a `--red` fill. This is "type that fills like a meter".
4. **Scroll out:**
   - The bezel band `scaleY` goes 1→0 (origin top) over the first 40% of hero scroll, so the island "undocks" into the page island.
   - The island `--u` goes 1.9→1 (§5.2).
   - The H1 translates y -8vh (a subtle parallax).
   - The scribbles fade.

**Mobile (390):**

- The bezel is 40px, and the island is the Dynamic-Island pill at `u` .9, centred.
- The H1 stacks at 56px with "wall" at 30vw.
- The right column falls below.
- Tap the island to peek (the "pull me" scribble becomes "tap me").
- There's no squash; instead "wall" breathes, scaleX 1→.94→1 every 5s, while visible.

**Reduced motion:** no intro and no loop. The island is shown in the collapsed state, interactive. "wall" is static at 150%. The H1 is visible. The scribbles are pre-drawn.

---

### Section 2: `limit` (paper → a marquee band): "this page has a limit too"

**Layout:**

- A short section, about 90vh. A centred narrow column (max 22ch) holds the H2:
  - **"Heads up: this page has a *limit* too."**
  - "*limit*" is in Instrument Serif italic.
- A hand-drawn arrow scribble curls from the H2 up toward the fixed page island at top-centre (a fixed-position SVG that draws in when the section enters and fades when it leaves).
- Below it, body (22ch max, centred, `--ink-2`): **"See the notch? It's metering you now. Teal is how far you've read. Past 85% it turns red and bold, same as the real app. Scroll on and find out what happens at 100."**
- Then **two full-bleed marquee rows** (`marquee()`, mono 22px desktop / 15px mobile, uppercase off, 0.02em tracking), on a black band 132px tall. The band **tilts -2.5°** and extends past the viewport edges, with overflow clipped on the section (no page horizontal overflow).
  - **Row 1** (dir 1, speed 48). Items separated by a 6px dot in alternating metric colours; white text; values in their metric colours:
    `Session 46% · resets in 2h 13m` · `Weekly 71% · resets Sat 1:05 PM` · `hits the cap in 1h 12m` · `Opus 100% · limit reached` · `just now` · `Max 20x` · `on track — resets first` · `Session at 80%` · `Your 5-hour window is back to full.`
  - **Row 2** (dir -1, speed 36, `--i-text2`):
    `checks every 5 minutes` · `never faster than 3` · `reads, never writes` · `no Dock icon` · `hides in full-screen apps` · `macOS 14.4+` · `free` · `Apple Silicon & Intel` · `signed & notarized`
  - Every number in both rows is a live Roller, and some tick. In row 1, "Session 46%" climbs by 1 every 3s up to 58 and wraps. Numbers above 85 are red and bold.
  - Scroll velocity skews and speeds the rows (`marquee` option).
  - `data-cursor="hover to pause"`.

**Animation:**

- The H2 words `splitReveal` with stagger .04.
- When the reveal lands, the word "*limit*" gets a teal highlighter swipe: an absolutely positioned `--marker` bar, 0.42em tall at the lower half, scaleX 0→1 from the left over .6s `cm`.
- The page island gets `pulse()` once when this section hits the centre (it's being introduced).

**Mobile:** the same, with the band tilted -2°.

**RM:** the rows are static (the first set only, horizontally scrollable with `overflow-x:auto` inside the band, so the content stays reachable). The arrow is pre-drawn.

---

### Section 3: `wall` (pinned, night beat; the story)

**Concept:** the same afternoon played twice. Act 1 is blind and ends in the HIT. A rewind follows. Act 2 is metered and ends in a clean stop.

**Structure:**

- `section#wall[data-theme="night" only during Act 1's HIT]`. A `.pin` wrapper, 100vh.
- `pinScene(length: "420%", mobile: "300%", scrub: .8)`.
- The page island is hidden during the pin.

**Layout inside the pin (desktop):**

- **Left 58%:** a **terminal** card.
  - `--night-2` bg, radius 20, a hairline `rgba(255,255,255,.08)`, mono 15px/1.55.
  - A title-bar with three dots (neutral `#3a3a3a`, **not** the traffic-light colours) and a centred title "~/app — refactor".
  - It shows about 14 lines of a coding-agent session. Use generic text, no Anthropic branding.
- **Top of the terminal card:** a clock chip, mono 13px: `10:04`. It's a Roller.
- **Right 42%:** the **act headline** (H2, Anybody), plus a sub-line. In Act 2 the right side also holds a scene-local **Island** (`u` 1.6, collapsed ↔ peek, `interactive:false` during the scrub).
- **The giant word "WALL"** is absolutely positioned at the right edge, off the top of the right column, in `--t-mega`. It is ink on paper at the start of Act 1, set `font-stretch:150%`, and bleeds off the right edge by 20%.

**Terminal content** (lines appear by scrub progress; the typing uses ScrambleText on the latest line only):

```
› refactor the billing module to the new invoice API
  reading src/billing/*.ts (14 files)
  ✓ mapped 38 call sites
  editing src/billing/invoice.ts
  editing src/billing/tax.ts
  ✓ tests: 212 passed
  editing src/billing/refunds.ts
  editing src/billing/webhooks.ts
  migrating fixtures (3 of 9)
```

**Scrubbed timeline:**

| Progress | What happens |
|---|---|
| 0–0.05 | Act label (mono eyebrow, `--ink-3`): **"ACT ONE · NO METER"**. H2: **"10:04. Deep in a refactor."** Sub: **"Four hours of good momentum. Nothing on screen says how much is left."** |
| 0.05–0.38 | Lines type in. The clock Roller goes 10:04 → 11:30 → 12:47 → 13:52 → 14:40 (clock steps map to line progress). **"WALL" condenses**: `font-stretch` 150% → 50% linearly, wght 900. The type is pushed toward the viewport edge as the unseen meter fills (FILL, felt but not shown). The terminal scroll offset advances. |
| 0.38–0.44 | **HIT.** The clock reads 14:52. The last line is replaced by a red, bold line: `✕ usage limit reached · resets 15:04`. Then: the section flips to night (`--night` flood via clip-path `circle(0% at 70% 50%)` → `circle(150%)` over 0.06 of progress), the H2 swaps to **"14:52. Limit reached. Mid-file."** with the sub **"Tests half-migrated. Context gone. See you at 15:04."**, and the terminal's last 3 lines' characters **drop** (y +40px, rotate ±12°, opacity 0, stagger .01, gravity ease `power2.in`). "WALL" sits at 50% width, red, bold. |
| 0.44–0.54 | **Rewind (RESET).** A mono chip reads "rewind ⟲". The clock Roller runs backward to 10:04 and the terminal lines un-type (ScrambleText in reverse). Night retracts (clip-path back to 0%). "WALL" springs back to 150% (tweened with the `SPR.play` ease *inside* the scrub, so the scroll shows a wobble). |
| 0.54–0.58 | Act label: **"ACT TWO · SAME AFTERNOON, WITH A METER"**. H2: **"10:04. Same refactor."** Sub: **"This time the notch is keeping count."** The scene Island fades in (collapsed, session 12%, weekly 38%). |
| 0.58–0.80 | Lines type again, and the clock advances. The Island `tween`s session 12 → 64 → 72, with teal wings. Around 0.66 (13:40) the Island opens to **peek** and the session forecast reads **"hits the cap in 1h 12m"** in **amber**. A dashed forecast line (DrawSVG) draws from the session ring's arc toward 100. H2: **"13:40. It sees the wall coming."** Sub: **"At this pace you run out at 14:52. That's an hour and change to land the plane."** At 0.74 (13:53), the forecast reads "hits the cap in 59m" and turns **red**, crossing under an hour exactly like the app. |
| 0.80–0.92 | The terminal adds: `✓ tests: 212 passed`, `git commit -m "billing: invoice API, part 1"`, `wrote HANDOFF.md`. The Island session reaches 84% (still teal, below 85). The Island goes **pinned**: session row, weekly row, Opus row; the projected tick sits at 100 on the session bar. H2: **"14:30. Committed. Notes written. Done for now."** Sub: **"Stopped at a clean line, not a cliff."** |
| 0.92–1.0 | The pinned Island's note stays honest: **"Session hits the cap in 22m"** in red (84% at a steep pace would hit the cap). The session reset reads "resets in 34m". Final line, large in Instrument Serif italic, centred under the terminal: ***"An hour's notice beats a hard stop."*** "WALL" stays at 150% and turns `--teal-ink`. The page island returns after the pin. |

The timeline is internally consistent: session start 10:04, window resets 15:04, hit at 14:52 in Act 1, forecast at 13:40 of "1h 12m" → 14:52.

**Mobile:**

- The terminal is full-width on top (11px mono, 9 lines visible), with the headline below it.
- "WALL" sits behind the terminal at 40vw, opacity .9.
- The Island is at `u` .95, centred below the headline.

**RM (`.is-static`):** two static stacked panels.

- **Act 1:** the terminal with all lines and the red limit line, a night background, and the H2 "14:52. Limit reached. Mid-file." plus its sub.
- **Act 2:** the terminal with the commit lines and the pinned island (session 84%, forecast red "hits the cap in 22m"), with the H2 "14:30. Committed…" and the closing serif line.
- No rewind.

---

### Section 4: `states` (pinned; anatomy of the island)

**Layout:**

- Paper background. `pinScene(length:"360%", mobile:"220%")`. The page island is hidden.
- **Centre-top of the viewport:** a **big scene island** (`u` = 2.6 desktop, 1.15 tablet, .7 mobile) hanging from a wide black bezel strip. The strip reuses the hero bezel style, at 70% of the viewport width with rounded ends, reading as a zoomed-in MacBook top.
- **Below the island, the left column (cols 1–5):** a step counter in mono (`01 / 04`, Roller) plus a stack of 4 step texts. Only one is visible at a time: the incoming one uses `splitReveal` lines and the outgoing one fades up -20px.
- **The right column (cols 8–12)** holds **callout leaders**: hand-drawn SVG lines drawn with DrawSVG from the text to the part of the island being described (each step has its own paths).
- **Step dots:** 4 dots at the left edge, which FILL teal as each step completes.

**Steps** (each takes 25% of the pin):

| # | H3 | Body | Island at this step | Leader targets |
|---|---|---|---|---|
| 01 | **Glance.** | **"Two numbers hug the notch. Left is your 5-hour session. Right is your week, or whichever model's weekly limit is tighter, in amber."** | collapsed; session 46 teal, right wing amber "82%" (Opus is tighter than the weekly 38) | left wing, right wing |
| 02 | **Hover.** | **"Rest the pointer for a beat and it opens: three rings, when each one resets, and where this session is heading."** | peek (rings draw 0→value), forecast "hits the cap in 1h 12m" amber. A **fake pointer** (a macOS arrow SVG, 22px) glides onto the island and rests 200ms before it opens: a nod to the real hover delay. | Session ring, "resets in 2h 13m", forecast line |
| 03 | **Click.** | **"Pin it for the whole table: six hours of history per limit, a tick where the session will land, your plan, and how fresh the numbers are."** | pinned: rows Session 46 / Weekly 38 / Opus 82, sparklines, projected tick at 71 on session, "Max 20x", "just now" + pin glyph. The fake pointer clicks (scale .9 → 1 ripple). | sparkline, projected tick, plan label |
| 04 | **Red means it.** | **"Past 85% the number goes red *and* bold, so it reads even if red and green look the same to you. At 100% it tells you which limit and when it's back."** | pinned; Weekly tweens to 89 (red, bold), Opus to 100 (red, bold); note **"Opus limit reached · resets Sat 1:05 PM"** draws in; `pulse()` once at the 100 crossing. | Weekly %, the red note |

- **Transitions** between steps use the Island's own `setState`. For **scrub safety**, drive them with `tl.call()` at the step boundaries, running forward and reverse (`setState` must handle rapid toggling: kill the prior morph and retarget).
- Numeric tweens are `isl.tween` inside the timeline, so scrubbing moves the rings and bars.

**Scene decoration (tactile):**

- In Step 04, the whole scene background gets a faint red vignette: `radial-gradient(circle at 50% 0, rgba(242,107,107,.12), transparent 60%)`. Its opacity follows the Weekly pct above 85.
- The step H3s are Anybody wght 850 at `--t-h2`. As each step completes, its H3 condenses slightly (wdth 110→96), a quiet echo of the wall.

**Mobile:** the island sits at the top (`u` .7 is too small for pinned text legibility, so for steps 2–4 use `u` .72 and let the island width fit `min(560u, 94vw)`, scaling via transform). The step text is below it. Leaders are hidden, and a step pill `01 Glance` sits above the text instead.

**RM:** four static rows, each a small static Island (instantiated at `u` 1 desktop / .7 mobile) in its step's state, with the text beside it.

---

### Section 5: `play` (the toy box; interactive, not pinned) + **mid-page CTA**

The playful heart. One large **desk stage**, not a grid of cards.

**Layout:**

- **Section header (left-aligned, cols 1–8):**
  - H2 **"Poke it. It's the real menu."** ("real" in Instrument Serif italic.)
  - Sub: **"Right-click the island below, or use the switches. Everything here is a setting in the actual app."**
- **The stage:** full content width, `aspect-ratio: 16/9` (4/5 on mobile), radius 40, `overflow:hidden`. It's a **stylised macOS desktop**:
  - **Wallpaper:** a slow-drifting soft abstract field, built only from the metric colours at low saturation over `--night-2`. Three large blurred radial blobs (teal, lav, amber), each 60% of the stage size with `filter: blur(60px)`, `transform`-animated on 22s/27s/31s loops. They are CSS keyframes, `whenVisible`-paused.
  - A menu-bar strip, 24px high, `rgba(0,0,0,.25)` with `backdrop-filter: blur(20px)`: on the left an Apple-less "Finder  File  Edit  View" in SF 12px white/.85, and on the right a clock that shows the visitor's **real local time**.
  - Two window rectangles (paper-coloured, radius 12, a fake title bar and grey text lines) slide slowly behind the island on 14s ping-pong loops. This demonstrates the app note that Frosted/Glass "quietly shifts as windows move behind it".
  - The stage **Island** (`u` 1.35 desktop / .8 mobile) sits in a black bezel strip across the stage top.
- **Control rail** (below the stage on mobile; overlapping the stage's bottom-left corner on desktop as a floating frosted-paper panel `rgba(243,238,228,.8)` with blur, radius 24):
  - **Appearance:** a segmented control, Solid / Frosted / Liquid Glass. The thumb slides with `SPR.play`.
  - **Show percentages:** a switch.
  - **Burn-rate estimates:** a switch.
  - **Usage notifications:** a switch.
  - **Menu bar item:** a switch.
  - **Display: MacBook / External:** a segmented control.
  - Each switch is a real `<button role="switch" aria-checked>`. The thumbs travel with `SPR.play` and squash to scaleX 1.25 mid-travel.
  - The rail and the right-click menu share state (both call the same Island setters).
- **The Burn lever** (right edge of the stage, vertical):
  - A physical lever: a 180px track and a 44px knob in `Draggable` type y, bounds set, with inertia.
  - Label on top in mono: "PACE". Bottom: "easy". Top: "vibe-coding".
  - The knob position sets the demo burn rate: 0 → session flat at 46, "on track — resets first"; mid → "hits the cap in 2h 5m" amber; top → "hits the cap in 38m" red.
  - Dragging makes the island's session value climb live, at up to +1%/150ms at the top setting. Releasing drifts the knob back to "easy" over 1.2s with `SPR.play` (a spring-loaded lever); the value holds, then cools.
  - `aria`: `role="slider"`, `aria-valuetext` = the forecast string, arrow keys ±10%.
- **Notifications:** when "Usage notifications" is on and the demo session crosses 50, 80 or 95 (from the lever, or from the "Simulate a busy hour" link), a **macOS banner** slides in at the stage's top-right. It's a 340px frosted dark banner, radius 16, with the app icon, "Claude Meter", "now", and the title and body strings from the app:
  - 50: "Session at 50%" / "50% used · resets in 2h 13m"
  - 80: "Session at 80%" / "80% used · resets in 1h 2m"
  - 95: "Session at 95%" / "95% used · resets in 41m"

  Banners stack, 3 max. **They are flickable:** Draggable x with Inertia. A throw of velocity > 600 or distance > 120 sends it off-stage with a rotation proportional to the throw; otherwise it springs back with `SPR.play`. They auto-dismiss after 6s. They carry `data-cursor="flick →"`. When the session later drops back after a "reset", the banner "Session reset" / "Your 5-hour window is back to full." appears.
- **Easter eggs (stage):**
  1. **Refresh twice** (menu) → the real throttle line: "just refreshed · updating in 180s".
  2. **Quit** → the island shrinks away. The Relaunch pill copy is **"Quit. (It's that easy.) Relaunch ↺"**.
  3. **Click the camera lens 5×** in any bezel → the lens "winks": its glint sweeps and the island's "just now" slot reads **"hi."** for 1.5s (no emoji).
  4. **Set Liquid Glass, then move the pointer fast across the island** → the refraction scale spikes with velocity (18 → 34, decaying with `SPR.close`). A jelly shimmer.
- **"Simulate a busy hour" link:** small, mono, under the stage. It runs a 4s tween of session from 46 → 97, then a "reset" back to 3 with the RESET spring and the back-to-full banner (if notifications are on).
- **Mid-page CTA,** directly under the stage, left-aligned with the rail:
  - **"Like it? It's free."** in Anybody wght 800, `--t-h3`.
  - `.btn-dl` plus `.req`.

**Mobile:**

- The stage is 4:5.
- The rail is below the stage as a horizontally wrapping chip set (no horizontal page overflow).
- The lever becomes a horizontal slider beneath the stage.
- Long-press the island to open the menu.
- Flick works with touch.

**RM:**

- The wallpaper blobs and window loops are static.
- All toggles work, with instant state changes.
- Banners appear and disappear without motion, and have a close button (the close button is always present for keyboard users).
- The lever is a plain range input.

---

### Section 6: `privacy`: "Reads. Never writes."

**Layout:**

- Paper. H2 spans the width: **"Reads. *Never* writes."** "Never" is in Instrument Serif italic, `--red-ink`, with a hand-drawn double underline scribble.
- Then **three kinetic columns** (desktop 3-col; mobile stacked). Each column has a mono eyebrow and big Anybody lines (wght 760, `--t-h3`):
  - **READS:** "The sign-in Claude Code already saved on this Mac." Small (`--t-small`, `--ink-2`): "From your macOS Keychain via Apple's own `security` tool, or `~/.claude/.credentials.json`. Short-lived tokens are refreshed in memory. Your saved sign-in is never modified."
  - **TALKS TO:** three rows, each a mono host with a teal dot:
    - `api.anthropic.com` (usage numbers)
    - `platform.claude.com` (token refresh)
    - `claudemeter.vercel.app/version.json` (once a day: is there an update?)
  - **NEVER:** **"Analytics. Accounts. A server of our own. Writes to your sign-in."** Every item gets a **red hand-drawn strike-through scribble** drawn in sequence (DrawSVG, .35s each, stagger .25).
- **Network diagram** (full width, under the columns, 240px tall desktop, 360px tall mobile, vertical):
  - A Mac glyph at the left: a simple line drawing of a MacBook top with the notch.
  - Three curved paths to the three host labels at the right.
  - The paths are drawn by DrawSVG when entering view.
  - Then **small dots travel along them** (a 3px circle; `gsap` MotionPath is not vendored, so use `getPointAtLength` in a ticker, `whenVisible`-gated). Timing:
    - the usage path: a dot every 2.5s (a compressed "every 5 min")
    - token refresh: occasionally
    - version.json: rarely
  - A fourth path, **dashed and red, leads to a crossed-out cloud** labelled "anything else". It never carries a dot.
- **Counter row:** four odometer stats (Roller on view):
  - **0** analytics
  - **0** accounts
  - **0** servers
  - **5 min** between checks, with the sub "(never faster than 3)"

**Motion:**

- The H2 chars `splitReveal`.
- "Never" gets a brief ScrambleText with glyphs `✕` and `—` before it settles.

**Mobile:** the columns stack, the diagram is vertical, and the counters are 2×2.

**RM:** the strikes and paths are pre-drawn, and there are no travelling dots.

---

### Section 7: `get`: install, requirements and a creative FAQ (`id="get"` holds the install block; `id="faq"` is on the FAQ sub-block)

**A. Install in three moves** (paper-2 band, radius 40 inset card, full width):

- H2: **"Up and running before your next prompt."**
- Three steps in a row (stacked on mobile), each with a big mono numeral in outline:
  1. **"Download."** "One small DMG. Free."
  2. **"Drag to Applications."** It comes with a looping **mini DMG window** built in CSS: the app icon (`assets/icon-256.png`) drags along an arc into an Applications folder glyph, the folder does a squish (`SPR.play`), and the loop repeats every 3.2s while visible.
  3. **"Open it."** "It opens pinned, with a hint: hover to peek, click to pin, right-click for settings & Quit." Add a mini Island at `u` .9 in pinned state with `hint:true`, static.
- **Requirements** block (a mono list with check glyphs):
  - "macOS 14.4 or later · Apple Silicon or Intel"
  - "Claude Code, signed in with a Claude Pro or Max plan"
  - "Not supported: API-key (Console) logins, a custom `CLAUDE_CONFIG_DIR`"
- Then `.btn-dl` and `.req`.

**B. FAQ: "Questions, answered by the island."**

- H2: **"Questions, *asked* for real."** ("asked" in Instrument Serif italic.)
- Each FAQ item is a **mini island**: a black NotchShape-styled `<details>` with the summary text inside a collapsed black pill (a static SVG shape, `u` 1, width `min(620px, 100%)`).
- Opening it **springs the shape open** (height and radii from collapsed 6/14 to expanded 19/24, `SPR.open`), and the answer fades in with the liquid squeeze.
  - The summary text is white SF 16px; the answer is `--i-text2` 15px, max 56ch.
  - A small ring glyph on the right fills from 0 to 100% when an item is open. It's teal; the last item's is amber.
- Use native `<details>/<summary>` for semantics and keyboard support. Animate via JS (intercept the toggle, animate height, then set `open`). Where `::details-content` and `interpolate-size` are supported, CSS does it.
- Alternate the alignment left and right, offset by 8vw, so the list zigzags down like notifications. It is not a card list.

**FAQ copy** (final; also used in the JSON-LD FAQPage):

1. **Is it really free?** "Yes. No trial, no account, nothing to upgrade to."
2. **What do I need?** "A Mac on macOS 14.4 or later (Apple Silicon or Intel) and Claude Code signed in with a Claude Pro or Max plan. Claude Meter reads that sign-in, so there's nothing else to set up."
3. **Does it touch my credentials?** "It reads them and never writes them. It uses the sign-in Claude Code saved in your Keychain (through Apple's own `security` tool) or in `~/.claude/.credentials.json`. Short-lived tokens are refreshed in memory only."
4. **What does it send, and where?** "Usage requests to api.anthropic.com, token refreshes to platform.claude.com, and a once-a-day update check to this site's version.json. No analytics, no account, no server of ours."
5. **Why not live, to the second?** "The usage endpoint rate-limits. Claude Meter checks every 5 minutes, never more often than every 3, and again when you hover."
6. **My Mac has no notch. Or I use an external display.** "You get a compact pill at the top centre of the screen instead, plus an optional menu-bar item."
7. **Will it get in my way?** "It hides when an app goes full screen and has no Dock icon. Right-click it for settings, or to quit."
8. **Which limits does it show?** "Your 5-hour session, your weekly limit across all models, and any per-model weekly limits your account reports, like Opus. It can warn you at 50, 80 and 95% of the session and at 80 and 95% of the weekly limits, and tell you when a tight one is back to full. Notifications are off until you turn them on."
9. **Does it work with an API key?** "No. API-key (Console) logins and a custom `CLAUDE_CONFIG_DIR` aren't supported."
10. **Is this made by Anthropic?** "No. It's an independent project by Yiftach Freeman, not affiliated with or endorsed by Anthropic. It's signed with an Apple Developer ID and notarized by Apple."

**Mobile:** the FAQ islands are full width with no zigzag.

**RM:** height changes are instant.

---

### Section 8: `footer` (night beat): the final HIT → RESET

**Layout:**

- `data-theme="night"`, `--night` bg, min-height 100vh.
- Top block, centred:
  - H2 **"Know before you hit it."** (paper colour, `--t-h2`).
  - `.btn-dl` (night variant) plus `.req` (paper/.6).
  - A small line: **"v1.2 · Made by Yiftach Freeman"**.
- **The giant wordmark:** "Claude Meter" set **edge to edge** in Anybody wght 900 at wdth 150, cropped by the bottom of the page (it sits 18% below the fold). Implement it as an SVG `<text>` with `textLength` on desktop for an exact full width, or a fitted CSS `font-size`.
  - The fill is **a meter**: ink-dark `#1d1c19` base plus a hard-stop fill clipped to the text. The fill colour steps through **teal → lavender → amber → red** by position:
    - 0–60% teal
    - 60–75% lav
    - 75–85% amber
    - >85% red and bold (the weight is already 900, so "bold" here means the stroke gains a 1.5px `--red` `-webkit-text-stroke`)
  - `--p` is scrubbed from `start:"top bottom"` to `end:"bottom bottom"`.
- **At 100% (the last pixel of scroll):**
  - The page island hits 100% and **turns red and bold**.
  - Its note appears: **"Page limit reached · resets at the top"**.
  - The wordmark does a single 120ms micro-shake (`pulse`).
  - Then, 900ms later, **both RESET**: the wordmark fill drains to 0 right-to-left over .9s with `SPR.close`, the island wing rolls down to "0%", and the note changes to **"back to full"**.
  - The fill then **refills gently in a loop** (0→100% every 6s, `ease:none`, never going red: it stops at 84%) while the footer is visible. This is the ambient loop.
  - Scrolling up re-arms the HIT.
- **Bottom row** (above the wordmark, `--t-small`, paper/.55, flex space-between; stacked on mobile):
  - **"Independent project. Not affiliated with or endorsed by Anthropic. Claude is a trademark of Anthropic, PBC."**
  - Links: Privacy (#privacy), FAQ (#faq), Download (/ClaudeMeter.dmg).
  - **"© 2026 Yiftach Freeman"**.
- **Easter egg:** hovering the wordmark makes the letters under the cursor **squash** (§2.4 `squash`, min 70). The cursor label reads **"squash the meter"**.

**Mobile:**

- The wordmark is 2 lines ("Claude / Meter") and still fills.
- The HIT runs at the scroll end the same way.
- There is no squash.

**RM:**

- The wordmark is shown at a static 84% teal fill.
- There's no HIT animation.
- The page island shows its value without a shake, and the note appears instantly.

---

## 7. Head, SEO and meta (architect, in `web/index.html`)

- **title:** `Claude Meter — Claude usage limits in your MacBook notch`
- **meta description:** "Free macOS app that shows your Claude Pro or Max usage limits in your MacBook's notch: 5-hour session, weekly, and per-model limits, with reset times and a burn-rate forecast."
- `link rel=canonical href="https://claudemeter.vercel.app/"`.
- **OG:** `og:type website`, `og:title` as the title, `og:description`, `og:image https://claudemeter.vercel.app/assets/og.png` (1200×630), `og:url`.
- **Twitter:** `twitter:card summary_large_image`.
- Favicons from `assets/favicon.png` and `apple-touch-icon.png`.
- `meta name="theme-color" content="#F3EEE4"`, plus a dark variant `#0B0B0A` via media.
- **JSON-LD:**
  - `SoftwareApplication`: name Claude Meter, `operatingSystem` "macOS 14.4 or later", `applicationCategory` "UtilitiesApplication", `softwareVersion` "1.2", offers price "0" priceCurrency "USD", author Person "Yiftach Freeman", `downloadUrl` "https://claudemeter.vercel.app/ClaudeMeter.dmg".
  - `FAQPage` from the §7 FAQ copy.
- **OG image** (`web/og.html` → `assets/og.png` via headless Chrome at 1200×630):
  - A paper background with grain.
  - A black bezel band at the top with the island **peek** at `u` 1.5 (Session 46 / Weekly 38 / Opus 82, forecast "hits the cap in 1h 12m").
  - Below it, "See the **wall** / *before* you hit it." using the same fonts, with "wall" in wdth 150 and a teal hard-stop fill at 60%.
  - Bottom-left: "Claude Meter · free for macOS".
- Preload the Anybody and Geist Mono woff2 files (`crossorigin`).
- **Landmarks:** `header`, `main` (all sections), `footer` (Section 8 is the `<footer>` element), and exactly one `<h1>`.

---

## 8. QA acceptance (what "done" means)

**Layout and states:**

- At 1440×900 and 390×844 there is no horizontal overflow, including the marquee band tilt and the wordmark (clip with `overflow-x: clip` on the sections).
- Every island state matches `snaps2` renders in proportions:
  - ring 54/5
  - bar 6
  - widths 269/500/560 × u
  - radii
  - red + bold above 85
  - an amber right wing when a model is tighter

**Motion and performance:**

- Scroll through all sections: no console errors, and no long tasks over 50ms during scrub on an M1 Air.
- The intro is ≤1.2s and skippable.
- RM path: everything is visible with no pins, no smooth scroll and no loops, and every toy still works.

**Keyboard and accessibility:**

- Tab reaches the skip link, the nav, every island (Enter pins, Shift+F10 opens the menu), the switches, the lever, the banner close buttons, the FAQ summaries and every Download button.
- Focus is visible everywhere.
- Contrast: body text ≥4.5:1 (`--ink-2` on paper passes). Metric pastels never appear as text on paper; use the `-ink` variants.

**Copy and legal:**

- Every product claim matches the facts list. Nowhere mentions open source, GitHub, stars, reviews or testimonials.
- The legal line is present in the footer.

---

## 9. Build order (so the page is never broken)

1. **Architect:** tokens, base, fonts, vendor, lib (motion, split, counter/Roller, reveal, marquee, magnetic, cursor, pin, visible, scribble, squash), `Island` + menu + pull, `pageIsland`, nav, intro, `build.mjs`, `qa.mjs`, the head/SEO block and OG.
2. **Sections in parallel:** hero, limit, wall, states, play, privacy, get, footer. Each builder uses only the lib APIs above.
3. **Integrator:**
   - Wire the page-island hide/show around the wall and states pins.
   - Wire the night beats.
   - Wire the footer HIT.
   - Run the QA screenshots at 1440 and 390, both motion and RM.
   - Look at every frame and fix.
