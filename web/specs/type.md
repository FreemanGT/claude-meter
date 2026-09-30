# Claude Meter site: creative spec ("type" lens: EDITORIAL-KINETIC)

Owner: creative lead. Audience: the architect/integrator and the section builders.
Status: final direction. Build it as written. If something is ambiguous, pick the bolder option that is still true to the product facts.

Sources of truth:
- `Sources/ClaudeMeter/Theme.swift`, `IslandView.swift` and `NotchShape.swift` for UI metrics and copy.
- `scratchpad/snaps2/*.png` (and `web/specs/*.png`) for real app renders. These are **2x**: divide pixels by 2 to get points. The magenta outline marks the camera housing. It is not UI, so never draw it.
- Research: `scratchpad/research/trends.md` and `alcove.md`.

---

## 0. The big idea: "The whole site lives under the notch"

The website is a MacBook screen, and its header is the menu bar.

- The top of every page is a black band with a real camera notch in the centre. The island hangs out of that notch for the entire visit. There is one island: in the hero it demos the product at 2x scale, then it shrinks into the header and becomes the site's navigation.
- After the hero, the island **meters the page itself**:
  - Left wing: how much of the page you've scrolled (teal).
  - Right wing: sections read (lavender).
  - Hover it for rings and a *forecast from your scroll speed* ("hits the bottom in 1m 12s").
  - Click it and the pinned table is the table of contents: one bar per section.
- At the footer the page hits its own limit. The giant wordmark fills to red and bold, the island reads 100%, a single shake plays, and everything springs back to zero ("back to full").

**Typography is the second instrument.** Huge variable type fills like a meter, using Anybody's width axis (50–150) and weight axis (100–900):
- "WALL" in the hero is an outlined word that fills with liquid up to the live session %.
- In The Wall scene it **condenses against the edge** as usage climbs.
- The footer wordmark is the page's progress bar.

Every number on the site is set in monospaced digits, the way the app does it, and rolls instead of cutting.

**Motion grammar (the rule every effect obeys).** An animation has to be one of four verbs, or it gets cut:
- **FILL:** rings, bars, letters and counters rise.
- **FORECAST:** dashed or ghost states extrapolate ahead ("hits the cap in…").
- **HIT:** red, bold, one hard stop, a 120ms shake. It happens only twice: the Wall scene and the footer.
- **RESET:** a spring back to calm ("resets in 2h 13m", "back to full").

**Art direction:**
- Warm paper, black product and ink, with the app's four metric colours as the only electric accents.
- Scroll-driven "night" beats (The Wall at HIT, Privacy, Anatomy's stage) flip parts of the page to black.
- Editorial grid: hairline rules, mono running heads ("§03 — ANATOMY"), gigantic type cropped by the viewport, an Instrument Serif italic word per headline, and hand-drawn ink annotations.
- **Never:** a dark SaaS hero, purple gradient buttons, gradient text, a bento or feature-card grid, blobs, a WebGL background, a static hero image, or a custom cursor that hides the native one.

---

## 1. Design tokens (`site/css/tokens.css`, architect-owned)

### 1.1 Fonts (self-host woff2, latin subset, `font-display: swap`)

| Role | npm package | Axes/weights to ship | Use |
|---|---|---|---|
| Display + body | `@fontsource-variable/anybody` | the file that carries **both wght 100–900 and wdth 50–150** (fontsource names it `anybody-latin-full-normal.woff2` or `…-wdth-normal.woff2`; verify both axes by rendering `font-stretch:50%` vs `150%`) | everything that isn't data or the accent |
| Accent | `@fontsource/instrument-serif` | 400 **italic** only (`instrument-serif-latin-400-italic.woff2`) | one word per headline |
| Data / mono | `@fontsource-variable/jetbrains-mono` | wght axis, normal only | running heads, marquees, terminals, chips, counters |
| Island UI | none (system) | `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif` + `font-variant-numeric: tabular-nums` | only inside the island replica, so it matches the app exactly on a Mac |

- Preload only the Anybody file. Budget: ≤ 200 KB total. Check with `ls -l`.
- Declare `@font-face { font-family: "Anybody"; font-weight: 100 900; font-stretch: 50% 150%; }`.

```css
--f-display: "Anybody", "Arial Narrow", system-ui, sans-serif;
--f-serif:   "Instrument Serif", "Times New Roman", serif;
--f-mono:    "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
--f-ui:      -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
```

### 1.2 Type scale

| Token | Size | Leading | Tracking | Font settings | Notes |
|---|---|---|---|---|---|
| `--t-mega` | `clamp(120px, 31vw, 520px)` | .78 | -.045em | wght 900, wdth 150 | "WALL", finale wordmark |
| `--t-display` | `clamp(52px, 9vw, 150px)` | .86 | -.035em | wght 500, wdth 75 | |
| `--t-h2` | `clamp(44px, 7vw, 120px)` | .88 | -.03em | wght 700, wdth 80 | the serif italic word inside is set 1.06× larger, tracking -.01em |
| `--t-h3` | `clamp(26px, 2.8vw, 44px)` | 1.02 | -.015em | wght 650, wdth 90 | |
| `--t-lede` | `clamp(19px, 1.6vw, 24px)` | 1.4 | -.005em | wght 420, wdth 95 | |
| `--t-body` | 17px mobile / 18px desktop | 1.55 | 0 | wght 400, wdth 100 | max 62ch |
| `--t-label` | 12px mono | 1.2 | .08em | uppercase, wght 500 | running heads, kickers |
| `--t-data` | 14px mono | 1.4 | 0 | tabular | |

### 1.3 Colour

Contrast on paper is computed against `#F2EDE3`. The ink variants of the accents all clear AA (4.5:1) on paper. The pastel originals are for fills and strokes on paper, or for any text on black.

```css
/* surfaces */
--paper:   #F2EDE3;  --paper-2: #E8E1D3;  --rule: rgb(21 19 15 / .12);
--ink:     #15130F;  --ink-2:   #57503F;  --ink-3: #8A8172; /* ink-3 only ≥24px or decorative */
--night:   #0B0A09;  --night-2: #161412;  --rule-night: rgb(242 237 227 / .12);
--on-night:#F2EDE3;  --on-night-2: #A9A294;
/* the product — exact app values (Theme.swift) */
--island:  #000;
--i-text:  #FFFFFF;  --i-text2: #A8A8A8;  /* white .66 */  --i-text3: #999999;
--track:   rgb(255 255 255 / .13);
--rim-top: rgb(255 255 255 / .04);  --rim-bot: rgb(255 255 255 / .20);
--teal:    #5CC9A6;  /* session   */
--lav:     #B0A8ED;  /* weekly    */
--amber:   #FAC775;  /* per-model, forecast */
--red:     #F26B6B;  /* > 85%, always with bold */
/* accent ink for text on paper (AA) */
--teal-ink:#146B52;  --lav-ink: #5E52C9;  --amber-ink:#8C5A00;  --red-ink:#B8322F;
/* highlighter swipes behind words on paper (Alcove-style mark) */
--hl-teal: rgb(92 201 166 / .45);  --hl-amber: rgb(250 199 117 / .6);  --hl-red: rgb(242 107 107 / .35);
```

- **Night zones:** `[data-night]` sections swap `--bg` / `--fg` / `--fg-2` / `--rule-c`. `body` background transitions over 400ms `var(--ease-edit)` when `html[data-night]` toggles.
- **Selection:** `::selection { background: var(--teal); color: var(--ink) }`.
- Never use Anthropic terracotta or orange anywhere. The amber is the app's `#FAC775`: keep it pale, never push it toward orange.

### 1.4 Layout, radii, shadows

- **Grid:** 12 columns, `max-width: 1600px`. Margins `clamp(16px, 4vw, 64px)`, gutter `clamp(12px, 1.6vw, 24px)`. Put hairline column rules on `.grid-debug` only. Every section opens with a full-width 1px `--rule` line and a mono running head: left `§0N — NAME`, right a live datum.
- **Radii:**
  - `--r-pill: 999px`, `--r-card: 28px` (demo stages only), `--r-screen: 18px` (screen corners under the band).
  - Where supported, add `corner-shape: squircle` inside `@supports (corner-shape: squircle)` for pills and stages.
  - The island uses the exact notch path (§4).
- **Shadows:** always warm and tinted, never neutral grey on paper.
  - `--sh-float: 0 24px 60px -20px rgb(40 25 5 / .35), 0 2px 8px rgb(40 25 5 / .12)`
  - Island peek shadow is the app's: `0 8px 32px rgb(0 0 0 / .5)`, not while pinned.

### 1.5 Easing and durations

```css
--ease-edit:  cubic-bezier(.625, .05, 0, 1);  /* text reveals, scene moves */
--ease-out:   cubic-bezier(.16, 1, .3, 1);    /* expo-out: enters */
--ease-micro: cubic-bezier(.2, .8, .2, 1);    /* hovers, presses */
--ease-in:    cubic-bezier(.5, 0, .75, 0);    /* exits, HIT drops */
--ease-spring: linear(0, .009, .035 2.1%, .141 4.4%, .723 12.9%, .938 16.7%, 1.017 19.9%, 1.043 23.2%, 1.035 27.4%, .999 37.1%, .994 41.6%, 1)
               /* ≈ stiffness 250, damping 22; CSS-only hovers */;
--d-micro: 180ms; --d-ui: 320ms; --d-reveal: 900ms; --d-scene: 1200ms;
```

- **GSAP defaults:** `gsap.defaults({ ease: "power3.out", duration: .6 })`.
- **Island springs:** via the `spring()` util (§3). There are no bouncy springs on anything larger than the island.

| Spring | stiffness / damping |
|---|---|
| Peek open | 250 / 24 |
| Pin | 220 / 24 |
| Collapse | 280 / 30 |
| Hover nudge (scale 1.03) | 300 / 18 |
| Press (scale .97) | 400 / 30 |

- **Staggers:** lines .08s, words .035s, chars .012s.

### 1.6 Grain and glass recipes

- **Grain:** static only.
  - `body::after`: fixed, inset 0, `pointer-events: none`, `z-index: 90`. Background is an SVG `feTurbulence` tile (`type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"`) as a data-URI, 180px tile, `opacity: .06`, `mix-blend-mode: multiply`.
  - In `html[data-night]`: `opacity: .08; mix-blend-mode: screen`.
  - Never animate it.
- **Frosted (app mode):**
  ```css
  background: rgb(0 0 0 / .84);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  ```
- **Liquid Glass (app mode):** the same 0.84 scrim (the app never lets the island get lighter than about rgb 38), plus the following, and also the cursor specular:
  - Chromium: `backdrop-filter: url(#cm-liquid) blur(6px) saturate(1.6)` inside `@supports (backdrop-filter: url(#a))`. `#cm-liquid` is an inline SVG filter: `feTurbulence baseFrequency=".008" numOctaves="1"` → `feDisplacementMap scale="18"`.
  - A specular rim: a `::before` with `radial-gradient(120px circle at var(--mx) var(--my), rgb(255 255 255 / .22), transparent 60%)` masked to a 1.5px border ring (`mask-composite: exclude`). `--mx` / `--my` follow the pointer via `quickTo`.
- **Island rim (all modes, expanded only):** an SVG stroke 1px with a linearGradient from `--rim-top` to `--rim-bot`, top to bottom.

---

## 2. Stack and file layout (architect)

- **Vendor, classic `<script defer>` in `<head>`**, self-hosted from npm into `site/vendor/`:
  - `gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.min.js`, `ScrambleTextPlugin.min.js`, `DrawSVGPlugin.min.js`, `CustomEase.min.js` (all from `gsap@3.15.0/dist/`)
  - `lenis.min.js` (from `lenis@1.3.26/dist/`)
  - Then `<script type="module" src="/js/main.js">`. Module scripts run after deferred classic scripts, so `window.gsap` exists by then.
  - Budget is about 75 KB gz vendor. No three.js or OGL: the idea is type and DOM. WebGL would earn nothing here.
- **`js/lib/gsap.js`:** `export const { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin, CustomEase } = window;`, then `registerPlugin` and `gsap.defaults`.
- **`js/main.js`:**
  1. Init reduced-motion, smooth scroll, grain, nav island, cursor tag and intro.
  2. Then `await document.fonts.ready`.
  3. Then dynamic-`import()` each section module in DOM order and call its `export default function init(sectionEl, ctx)`.
  4. `ctx = { gsap, ScrollTrigger, island, lib, reduced }`.
  5. Each module returns an optional cleanup.
  6. Call `ScrollTrigger.refresh()` after all have initialised.
- **Section contract:**
  - Each section is `<section id="<id>" class="s s--<id>" data-section="<id>" aria-labelledby="<id>-title">`.
  - Builders touch only `web/sections/<id>.html`, `site/css/<id>.css` and `site/js/<id>.js`.
  - Section CSS is scoped under `.s--<id>`.
  - Section ids in order: `hero`, `wall`, `anatomy`, `ticker`, `yours`, `privacy`, `faq`, `finale`.

---

## 3. Global motion system (`site/js/lib/*`, architect-owned; builders import, never re-implement)

| Module | Exports | Behaviour |
|---|---|---|
| `motion.js` | `reduced` (bool, live), `onReducedChange(fn)`, `spring(stiffness, damping, mass=1)` → `{ ease: (t)=>number, duration }` | `spring` integrates a damped oscillator and normalises time to its settle time (\|x-1\|<.001), so it returns a GSAP-compatible function ease plus its natural duration. Under `reduced`, every lib helper sets end states instantly. |
| `smooth.js` | `lenis` (or null), `scrollTo(target, opts)`, `stop()`, `start()` | `new Lenis({ lerp: .1, smoothWheel: true, syncTouch: false, wheelMultiplier: 1 })`. `lenis.on('scroll', ScrollTrigger.update)`. `gsap.ticker.add(t => lenis.raf(t*1000))`. `gsap.ticker.lagSmoothing(0)`. **Not created under reduced motion.** `scrollTo` falls back to native `scrollIntoView({behavior: reduced ? 'auto' : 'smooth'})`. Anchor links (`a[href^="#"]`) route through it. |
| `split.js` | `revealLines(el, {delay, stagger=.08, duration=.9, trigger=el, start="top 85%"})`, `revealChars(el, …)`, `splitWords(el)` | SplitText with `mask: "lines"`, `autoSplit: true`, `aria: "auto"`, and `onSplit` returning the tween so re-splits keep state. Lines go `yPercent 110 → 0`, ease `--ease-edit` (CustomEase "edit"). Run it once per element (`once: true` ScrollTrigger). |
| `numbers.js` | `class Roller(el, {value, format})` with `.set(n)`; `scramble(el, text, {duration=.8, chars="0123456789%"})`; `countTo(el, to, {duration=1.2, format})` | **Roller**: per-character slots. On change, the incoming digit goes `y ±60%`, `scale .8`, `blur(3px)` → rest (spring 150/14); the outgoing digit goes the other way to `opacity 0`. Direction follows the sign of the change. Width is stable because of tabular nums. This is used for **every live number** (island, chips, odometers). |
| `format.js` | `fmtPct(n)` → `"46%"`; `fmtDur(sec)` → `"2h 13m"` / `"36m"`; `fmtReset(sec or date)` → `"resets in 2h 13m"` (<48h) or `"resets Sat 1:05 PM"` (uses `toLocaleString` weekday short + hour/minute, locale-aware like the app); `fmtForecast(sec)` → `"hits the cap in 1h 12m"`; `CLEARS = "on track — resets first"` | Mirrors `Format` in `Theme.swift` exactly. |
| `magnetic.js` | `magnetic(el, {strength=.3, radius=120})` | `pointermove` within the radius → `quickTo(x, y)` at .4s `power3`. The inner label moves 1.5× (parallax). It releases on leave with spring 200/14. Only on `(pointer: fine)` and when not reduced. |
| `cursor.js` | `initCursorTag()` | A **mini island** cursor companion. The native cursor always stays visible. |
| `marquee.js` | `marquee(track, {speed=60 /*px/s*/, dir=1, velocity=true, hoverSlow=.2})` → `{pause, play, kill}` | Content is duplicated until it's ≥ 2× the viewport. xPercent loop, `ease: none`. With `velocity`, a ScrollTrigger `getVelocity()` feeds `timeScale` (1 + min(\|v\|/1200, 3)) and `skewX` (clamped ±4°, eases back over .5s). It pauses offscreen (IntersectionObserver) and on `document.hidden`. Under reduced motion it isn't animated. |
| `reveal.js` | auto-binds `[data-reveal]` (values `up`, `fade`, `lines`, `draw`) | `up`: y 32 → 0 + opacity, .9s ease-out. `fade`. `lines` → `revealLines`. `draw` → DrawSVG `0% → 100%` over 1s. Optional `data-reveal-delay`. Reduced: everything visible, no tweens. |
| `pin.js` | `pinScene(section, { length:"250%", mobileLength:"160%", scrub:.8, build(tl, isMobile) })` → timeline or null | Wraps `gsap.matchMedia()` with `(min-width: 768px)`, `(max-width: 767px)` and `reduced`. Creates `ScrollTrigger({ trigger: section, pin: true, start: "top top", end: "+=" + length, scrub, anticipatePin: 1, invalidateOnRefresh: true })`. **No snap.** Under reduced it returns null and adds `.is-static` to the section, so its CSS shows the static composition. |
| `night.js` | `nightZone(el, {start="top 55%", end="bottom 45%"})` | Toggles `html[data-night]` while the zone is active. Several zones are reference-counted. |
| `loop.js` | `whileVisible(el, start, stop)` | IntersectionObserver plus a `visibilitychange` guard for every ambient loop. |
| `pageMeter.js` | `meter` store: `{ scrolled: 0..100, sections: [{id, label, read: 0..100}], velocity, subscribe(fn) }` | One ScrollTrigger (`start: 0, end: "max"`) plus one per section. Feeds the nav island and the finale. |
| `island.js` | `class Island` | §4. |

**Cursor tag detail.** A black capsule, 22px tall, `padding 0 10px`, `--f-mono` 11px, white.

- It follows the pointer with an offset (+14, +18) via `gsap.quickTo`, .35s `power3`.
- It is visible only while hovering `[data-cursor]` elements. Its text is the attribute value, for example `data-cursor="hover to peek"`.
- Enter: width springs from 0 → auto (clip-path inset from centre), spring 250/22. The text rolls in.
- Only on `(hover: hover) and (pointer: fine)`. Otherwise it isn't used.

---

## 4. The ISLAND component (`site/js/lib/island.js` + `site/css/island.css`, architect-owned)

It is a faithful replica of the app, in DOM and SVG. Everything below is in **points**. Rendered px = pt × `scale`.

### 4.1 API

```js
import { Island } from "./lib/island.js";
const isl = new Island(hostEl, {
  scale: 2,                 // px per pt (the DOM is rendered at this scale; don't CSS-scale text up)
  notch: true,              // false → no-notch pill mode (external display)
  display: "percent",       // "percent" | "ticks"
  material: "solid",        // "solid" | "frosted" | "glass"
  burnRate: true,           // show forecast line / projected arcs
  interactive: true,        // hover→peek (200ms dwell), click/Enter/Space→pin, Esc/outside→collapse
  hint: false,              // pinned-welcome row "Hover to peek · click to pin · right-click for settings & Quit"
  labels: null,             // override labels (nav island meta mode), see 4.6
  data: { /* IslandData */ }
});
isl.setState("collapsed" | "peek" | "pinned", { instant = false }) // → Promise (resolves on settle)
isl.update(partialData, { duration = .6 })   // tween every number, ring, bar, tick, spark; rollers for text
isl.setOption(key, value)                     // display / material / burnRate / notch / hint, animated
isl.on("state" | "contextmenu", fn); isl.off(...)
isl.lock(bool)       // scenes drive state; user hover ignored while locked (click still allowed only if !locked)
isl.el               // root element;  isl.state (string)
isl.destroy()
```

```ts
IslandData = {
  plan: "Max 20x",  updated: "just now",
  session: { pct: 46, resetIn: 7980 /*s*/, projected: 71 /*pct at reset, optional*/,
             forecast: { exhaustsIn: 4320 } | { clears: true } | null, spark: number[] /*≤24 pts, 0–100*/ },
  weekly:  { pct: 71, reset: "Sat 1:05 PM" /*or resetIn*/, spark: [] },
  models:  [{ name: "Opus", pct: 82, reset: "Sat 1:05 PM", spark: [] }]   // 0..n, pinned shows all
}
```

**Derivations** (match `IslandView.swift`):
- Collapsed right wing = the higher of the weekly % and the tightest model %. The colour is lavender for weekly and amber for a model.
- `tint(p) = p > 85 ? red : base` and `weight(p) = p > 85 ? bold(700) : base`.
- Forecast text:
  - `exhaustsIn` present → `hits the cap in ${fmtDur}`, amber if ≥ 3600s, red if < 3600s.
  - `clears` → `on track — resets first` in `--i-text2`, medium weight.
  - Session only.
- Limit note: if any window's pct ≥ 100, show a red row with a 5pt red dot and the text `${name} limit reached · ${fmtReset}` (name is "Session", "Weekly" or the model name).
- The live "resets in" countdown ticks each minute from the real clock. It pauses offscreen.

### 4.2 Geometry (points)

| Thing | Value |
|---|---|
| Notch housing | 185 × 32 (MacBook Pro 14"). Collapsed height = 32. |
| Collapsed width | 185 + 2 × `wing`, where wing = 46 (percent) or 40 (ticks). The metric is centred in its wing. |
| Collapsed radii | top 6, bottom 14 |
| Expanded radii | top 19, bottom 24 |
| Peek width | 500 · Pinned width 560. Content inset = gutter 20 + top radius 19 from each frame edge. |
| Header row (expanded) | Sits in the 32pt band beside the housing: `plan` left, `updated` right (+ pin glyph when pinned). Caption 10pt, `--i-text2`. |
| Peek body | 12pt top gap. Three equal columns, each: ring 54 (stroke 5, round cap, track `--track`, projected ghost arc from pct→projected at 30% opacity in the same tint), then 6pt, then label 11pt medium white, 2pt, reset caption 10pt `--i-text2`, then forecast caption 10pt medium (the row is reserved in all columns if any has one). Ring % is 15pt medium white, bold when > 85. Bottom inset 12 (+16 above a limit note). About 166pt tall with the forecast row. |
| Pinned rows | Label col 84pt (13pt, white). Spark 44 × 14 (line 1pt in tint, area fill tint at 25%). Bar flex, height 6, capsule, track `--track`, fill tint, plus a **projected tick** 2pt wide at the projected % in tint (session). Pct col 38pt right-aligned, 13pt semibold (bold when > 85). Reset col 96pt right, 11pt `--i-text2`. Row gap 8, column gap 12. |
| Ticks display | 26 × 4 capsule; fill width = max(4, 26 × pct/100). |
| Camera lens | In the housing centre, 7pt circle `#0A0B10` with a 2pt inner radial highlight `rgb(90 110 255 / .35)`. Decorative only; the app doesn't draw it, but on a giant bezel it sells "hardware". |

**Shell path** is a port of `NotchShape.path` using quadratic curves:

```js
export function notchPath(w, h, rt, rb) { return `M0 0 Q${rt} 0 ${rt} ${rt} L${rt} ${h-rb}
  Q${rt} ${h} ${rt+rb} ${h} L${w-rt-rb} ${h} Q${w-rt} ${h} ${w-rt} ${h-rb}
  L${w-rt} ${rt} Q${w-rt} 0 ${w} 0 Z`; }
```

### 4.3 Rendering and animation (no layout thrash)

- The root is a fixed-size box of 560pt × max expanded height, with `pointer-events: none` except on the shell hit-area. The shell is an inline `<svg>` with one `<path>` (fill `#000`, or the material) plus a rim path (stroke gradient, shown when expanded).
- **Morph:**
  - GSAP tweens a proxy `{ w, h, rt, rb }` with the spring ease. `onUpdate` writes `d` on both paths and `--w` / `--h` on the root.
  - The hit area is sized via `clip-path: path()` from the same string.
  - Content never reflows during the morph.
- **Content layers:** three absolutely positioned panes (`.i-collapsed`, `.i-peek`, `.i-pinned`), each laid out once at its final size.
  - Enter: `opacity 0, filter blur(8px), scaleX(.6)` → rest over .32s `--ease-out`, delay .06s.
  - Leave: → `opacity 0, blur(4px), scaleX(.3)` over .18s.
  - This is the Alcove squeeze-into-the-notch.
- **Ring:** SVG circle r = 24.5 with `pathLength="100"`. `stroke-dashoffset` is tweened, rotated -90°.
- **Bars and ticks:** `transform: scaleX()` on the fill, origin left. The projected tick is positioned by `translateX`.
- **Materials:** for frosted and glass, the shell fill becomes transparent and an HTML backdrop layer clipped to the same `path()` carries the recipe from §1.6. `material` changes cross-fade over .4s.
- **Cursor-reactive (all instances with `interactive`):**
  - Pointer over the shell sets `--mx` / `--my`, and a specular rim highlight follows it. This is subtle in solid mode and strong in glass.
  - Hover also runs the hover nudge: scale 1.03, spring 300/18. The origin is top centre, so it never detaches from the band.
  - Press runs scale .97.
- **Accessibility:**
  - The shell hit-area is a `<button class="i-toggle" aria-expanded aria-controls="…-panel" aria-label="Claude Meter demo: session 46%, weekly 71%. Press to pin.">`.
  - Focus-visible gives a 2px `--teal` outline offset 3px, following the notch path via an outline pseudo-element or a `drop-shadow` pair.
  - Keyboard focus → peek after 200ms. Enter/Space → pin/unpin. Esc → collapse and restore focus. The ContextMenu key or Shift+F10 fires the `contextmenu` event.
  - The panes are `aria-hidden` while not shown.
  - A visually hidden `<p role="status">` updates only on state change (not on every tick).
  - Reduced motion: every morph and roller is instant, and hover still works.
- **Touch:** tap toggles peek → pinned → collapsed. There is no hover dependence.

### 4.4 Default demo data (use everywhere unless a scene overrides)

```js
{ plan:"Max 20x", updated:"just now",
  session:{ pct:46, resetIn: 2*3600+13*60, projected:71, forecast:{ clears:true },
            spark:[4,6,9,12,14,18,21,24,26,31,35,39,41,43,46] },
  weekly:{ pct:71, reset:"Sat 1:05 PM", spark:[40,44,47,51,55,58,61,63,66,68,70,71] },
  models:[{ name:"Opus", pct:82, reset:"Sat 1:05 PM", spark:[50,56,60,64,69,73,77,80,82] }] }
```

With these values the collapsed right wing shows **82% in amber** (Opus is higher than weekly). That is correct app behaviour, so show it.

### 4.5 Instances on the page

1. **The header island** (global, one element, `#island`): the hero demo, then the page meter.
2. **Stage islands:**
   - Wall scene: scale 1.5 desktop, 1 mobile.
   - Anatomy: scale 1.6 desktop, fit-to-width on mobile.
   - Yours: scale 1.4 desktop.
   - Each is its own `new Island()` inside its section's mini bezel (a `.bezel` component: black band exactly 32pt × scale tall with the housing, rendered by the Island when `notch: true` and `bezel: true`).

### 4.6 Nav-island "page meter" mode (`labels` option)

After the hero, the header island calls `isl.update()` from `meter.subscribe`:

- **Collapsed:** left = `scrolled%` in teal, with red + bold above 85. Right = `sections read` as a % in lavender.
- **Peek:** three rings.
  - "This page": scrolled %, caption "resets at the top".
  - "Sections": % of sections ≥ 60% read, caption "4 of 8".
  - "FAQ": the FAQ's read %, amber, caption "10 questions".
  - Forecast line under ring 1, from the smoothed scroll velocity (3s EMA). While scrolling down: `hits the bottom in 1m 12s` (amber; red under 60s). Idle or scrolling up: `on track — resets first`.
  - Header row: left "This page", right a live "just now".
- **Pinned:** the **table of contents**. One row per section:
  - Label: "The wall", "Anatomy", "Free", "Yours", "Privacy", "FAQ", "The end".
  - Spark: that section's reading history, which is fun but real.
  - Bar: the read %.
  - Pct.
  - Reset col shows "§02" and so on.
  - Each row is a real `<a href="#id">` (so the pinned pane has `role="navigation" aria-label="Sections"`).
  - A final row holds a full-width black-on-teal "Download for Mac" pill inside the island.
- **Hand-off moment:** when the hero exits, the values *scramble* from the product data to the page data (`scramble()` .6s). A mono caption fades in under the band, "now metering: this page", and fades out after 2.2s.

---

## 5. Global elements (architect-owned)

### 5.1 The band (header = menu bar)

- `<header class="band">`: fixed, top 0, full width, z 80, background `#000`.
- **Height:** 32pt × island scale. That is 64px in the hero at desktop (scale 2) and **40px** after the hero (scale 1.25). On mobile it is 44px (scale 1.375) throughout.
- **Height change is transform-only.** The band's background layer is `scaleY`'d from the top. The island is `transform: scale(.625)` from scale-2 render, origin top centre. The side items `translateY`. All of it is scrubbed over the last 40% of the hero.
- **Left menu items** (white, `--f-display` 15px wght 600 wdth 100, looks like macOS menu titles):
  - App icon 20px (`/assets/favicon.png` at 2x).
  - "Claude Meter" (bold), then "How it works" (`#anatomy`), "Privacy" (`#privacy`), "FAQ" (`#faq`).
  - Hover: a white 12% rounded highlight behind the item, exactly like a macOS menu title hover (4px radius, 0 8px padding).
- **Right:** live local time in the macOS menu-bar format (`Tue 2:47 PM`, `toLocaleString` weekday short + time), in mono 13px `--on-night-2`, plus a compact **Download** pill: white bg, black text, 13px wght 650, `↓` glyph.
- **Screen corners:** two fixed 18px quarter-circle masks (paper-coloured cutouts on a black corner) directly under the band's left and right ends. Together with the band, the viewport reads as the top of a MacBook display. They switch colour in night zones (black on black, so effectively invisible).
- **Mobile (<768px):**
  - Left: icon + "Claude Meter".
  - Right: the Download pill as an icon button (`↓`, `aria-label="Download Claude Meter for Mac"`).
  - The menu links live in the island's pinned table (tap the island). A visually hidden "Menu: tap the island" hint is announced for screen readers via `aria-describedby`.
- A skip link comes first in the DOM ("Skip to download") and targets the hero CTA.

### 5.2 Intro (≤ 1.2s, once per session)

- `sessionStorage['cm-intro']` records it. Skip under reduced motion or if `location.hash` is set.
- It is a fixed black overlay (`#intro`, z 100, `aria-hidden`). The HTML hero is painted underneath from first paint, so LCP isn't blocked.

| t | What happens |
|---|---|
| 0 | Only the 7pt camera lens is visible at top centre, and it glints once (radial highlight sweep). |
| .12s | The housing grows out of the lens: width 7 → 185pt, height → 32pt (spring 250/24). |
| .38s | The wings slide out and the header island is born in place. Both numbers count 00 → 46 and 00 → 82 in mono (rollers, .5s). |
| .85s | The overlay retracts **up into the band**: `clip-path: inset(0 0 100% 0)` over .35s `--ease-edit`. The hero headline line reveals start at .9s. |
| 1.2s | Overlay removed. |

### 5.3 Other global elements

- **Hand-drawn annotation kit** (`/assets/ink/*.svg`, inline in the section HTML): arrow-curve, arrow-loop, circle-scribble, underline-wave, strike-zigzag and check-seal.
  - Stroke `currentColor`, 2.5px, round caps. Draw with DrawSVG via `data-reveal="draw"`.
  - The hero note uses `--f-serif` italic 22px, rotated -4°.
- **Grain:** §1.6.
- **Background shader:** none. This is deliberate.
- **Footer:** lives inside the `finale` section (§6.8) as `<footer>`.

---

## 6. Sections (in order)

Every section opens with a hairline rule and a mono running head: `§0N — NAME` on the left, a live datum on the right.

---

### 6.1 `hero`: "See the WALL before you hit it."

**Layout** (desktop 1440 × 900, 12-column grid, top offset = band 64px):

- **Running head** at y ≈ 88: left `§01 — CLAUDE METER / V1.2`. Right, live: `SESSION RESETS IN 2H 13M · 14:47 LOCAL`.
- **H1** is one element, with three visual lines stacked left-to-right across the full width:

  ```html
  <h1 id="hero-title"><span class="l1">See the</span> <span class="l2 wall">wall</span> <span class="l3"><em>before</em> you hit it.</span></h1>
  ```

  - `.l1`: `--t-display` (≈130px at 1440), col 1–7, left.
  - `.l2`: "WALL" (CSS `text-transform: uppercase`) at `--t-mega`, wdth 150 wght 900. Full-bleed edge to edge (fit with `font-size: 31vw`, tune so W and L touch the margins). The bottom of the letters is cropped by the viewport by about 6%.
  - `.l3`: right-aligned, col 5–12. "before" is Instrument Serif italic at 1.1 × display size. "you hit it." is display.
  - Visual order: l1, then l3 **above** l2. Use `display: grid` with named areas so DOM order stays l1, l2, l3, which reads correctly for screen readers.
- **Lede and CTA block**: cols 9–12, top-aligned with `.l1`.
  - **Lede** (`--t-lede`) with live chips:
    > Claude Meter turns the notch on your MacBook into a live gauge for your Claude plan: the 5-hour session **[● 46%]**, the weekly cap **[● 71%]**, and every model limit your account reports **[● Opus 82%]**.

    Chips are black pills (`--f-mono` 13px, white text, 6px dot in teal / lavender / amber, height 26px, padding 0 10px, baseline-aligned, `white-space: nowrap`). The numbers are Rollers bound to the header island's data.
  - **CTA row:**
    - Primary: `<a class="btn btn--primary" href="/ClaudeMeter.dmg" download data-cursor="free · 1 click">Download for Mac</a>`. Black pill, 56px tall, 22px padding, `--f-display` 17px wght 650, white. Left of the label is a 20px **fill ring** (SVG circle, teal) that fills 0 → 100% on hover over .6s, with the arrow glyph inside springing down 2px. Magnetic.
    - Secondary: a text link, "How it works ↓" → `#anatomy`, with an underline-wave drawn on hover.
  - **Meta** (mono 12px, `--ink-2`, two lines): `Free · v1.2 · macOS 14.4+ · Apple Silicon & Intel` and `Signed & notarized by Apple`, with a 12px check-seal glyph drawn in.
- **Hand-drawn note:** an arrow-curve from about x 60% / y 20% up to the island's right wing. Serif italic "it's live. hover it." (touch: "it's live. tap it."), rotated -4°, ink colour.
- **Scroll cue** (bottom-right, mono 12px): `SCROLL TO BURN THE SESSION ↓`, with a 26 × 4 tick bar beside it filling in a 2.4s loop.

**Animations:**

1. **Load (after intro, or at 0 when there's no intro):**
   - `.l1`, `.l3` and the lede lines run `revealLines` (stagger .08, delay .9).
   - "WALL" letters rise from yPercent 100 inside a mask, stagger .05, 1.1s `--ease-edit`.
   - Chips pop (scale .6 → 1, spring 300/18).
   - The CTA fades up.
   - The note draws after 1.6s.
2. **WALL is a meter:**
   - `.wall` is transparent text with `-webkit-text-stroke: max(2px, .18vw) var(--ink)`, layered with a copy (`.wall__fill`, `aria-hidden`) that has `color: var(--fill-c)` and `clip-path: inset(calc(100% - var(--fill)) 0 0 0)`.
   - `--fill` is a registered `@property <percentage>` and equals the header island's session % (46% → teal).
   - **Liquid surface:** the fill copy also has `mask-image` of a horizontally tiling SVG sine wave (`mask-size: 40vw 100%`), animating `mask-position-x` in a 3.2s linear loop via `whileVisible`. The top edge of the fill ripples like liquid.
   - Colour rules: teal ≤ 70, amber 70–85, red > 85, and at > 85 the stroke also thickens 1.5×. This is the bold rule.
3. **Hero ambient loop:** the header island ticks `session.pct` +1 every 7s up to 52%, then holds, and the fill follows (Roller + `--fill` tween 1.2s).
   - At 2.0s after load, the island auto-**peeks** once for 2.6s, then collapses. After that the hint arrow wiggles (rotate ±3°, twice).
   - Autoplay stops permanently as soon as the user hovers or focuses the island.
4. **Scroll-out (scrub, hero top → bottom):**
   - WALL condenses: `font-stretch` 150% → 55% and `letter-spacing` -.045em → -.06em. The meaning is pressure: the wall is closing in.
   - `.l1` and `.l3` drift up (yPercent -30) and fade to 0.
   - The band shrinks 64 → 40px and the island scales down (the §5.1 hand-off).
   - The data scramble (§4.6) happens at progress 1.
5. **Cursor proximity (fine pointer only):** each WALL letter's `--fill` gets +8% boost within 180px of the pointer (quickTo .5s), so the liquid bulges toward you. Recompute on `pointermove`, throttled to rAF.

**Mobile (390px):**
- Band 44px, island scale 1.375.
- Order: running head (one line: `§01 — V1.2 · FREE`), then l1 (14vw), l3 (14vw, left-aligned), WALL (36vw, full-bleed), lede, chips (wrap allowed between chips, never inside one), CTA full-width 56px, meta.
- The note says "tap it". No proximity effect.
- Autoplay peek runs once at scale 1.375. Peek width 500pt × 1.375 = 687px is too wide, so on mobile the header island **peeks at scale `min(1.375, (vw-16)/500)`**: the island re-renders at that scale while expanded, and `Island` supports `setOption('scale')` while collapsed.

**Reduced motion:** no intro, no reveals, fill static at 46% with no wave, no autoplay, no condense, and the band is fixed at 40px.

---

### 6.2 `wall`: "Two afternoons. Same refactor." (pinned scrub, the set piece)

**Pin:** `pinScene(section, { length: "280%", mobileLength: "200%", scrub: .8 })`.

**Layout (desktop):**
- The section background is paper with a section-local **night layer** (`.wall__night`, absolute, black, `clip-path: circle(0% at X Y)`).
- **Behind everything:** the word "WALL" again at `--t-mega`, right-aligned, bleeding off the right edge, colour `--paper-2`, z 0.
- **Front left (cols 1–7):** a terminal card.
  - Radius 28, bg `#0E0D0B`, 1px `--rule-night`, `--sh-float`.
  - Header: three 10px grey dots (not traffic-light colours), a mono title `~/billing — zsh`, and a right-aligned mono **clock** (Roller).
  - Body: mono 15px, `--on-night`, 22 lines tall.
- **Front right (cols 9–12):** the headline slot (`--t-h2`) plus a mono act label.
- **Above the terminal:** a mini bezel with a stage Island (scale 1.5), visible in Act B only.

**Terminal script** (generic shell and agent log; don't imitate Claude Code's UI or logo):

```
Act A lines (typed):
$ claude "refactor billing into services, keep tests green"
  › reading 42 files
  › planning: split invoice.ts → pricing/, tax/, ledger/
  › editing pricing/rates.ts            +128 −41
  › editing tax/vat.ts                   +77 −12
  › running tests … 212 passed
  › editing ledger/post.ts               +164 −90
  › migrating 9 call sites
  › editing invoice.ts                  +31 −288
✕ Usage limit reached · resets 3:00 PM          ← red, bold
Act B lines: same first 7, then:
  › editing ledger/post.ts               +164 −90
$ git commit -am "billing: pricing + tax extracted, tests green"
$ echo "next: ledger call sites (9), see NOTES.md" >> NOTES.md
  › session paused on your terms.
```

**Timeline (scrub progress 0 → 1):**

| p | Beat |
|---|---|
| 0–.06 | Act label `A — WITHOUT` (mono, scramble in). Headline "An ordinary afternoon." line-reveals. |
| .06–.40 | **FILL.** Lines type in. Each line is SplitText chars `autoAlpha 0 → 1`, stagger .004, placed sequentially on the timeline. The clock runs 10:04 → 14:52 via an onUpdate mapping. The background "WALL" condenses `font-stretch` 150% → 50% and slides left (xPercent -8), so the word presses toward the terminal. The terminal card gets a very subtle warm heat tint (box-shadow colour tween to `rgb(242 107 107 / .25)`, the one allowed shadow tween; it's small and paused offscreen). |
| .40–.47 | **HIT.** The red line prints. `.wall__night` expands `circle(0%) → circle(150%)` from the red line's position, so the page goes black. Headline swap: "Mid-refactor. *No warning.*" ("No warning." in serif italic, `--red`). The previous line's characters **drop**: y 0 → 140px, rotation ±25° random, `autoAlpha → 0`, stagger .006 `--ease-in`. Once per forward crossing (not scrubbed), a callback fires a 120ms shake on the terminal (x: 0, -6, 5, -3, 0). |
| .47–.56 | **RESET / rewind.** ScrambleText rewinds the terminal text back to the first line (chars `"$›+−0123456789 "`). The clock scrambles to 10:04. `.wall__night` shrinks back to 0%. The act label scrambles to `B — WITH CLAUDE METER`. The mini bezel and island drop in from y -40 (spring 250/22). |
| .56–.95 | **FILL + FORECAST.** Act B lines type. The stage island updates, scrubbed via a proxy: session.pct 12 → 91, spark grows, forecast `null` → `{ exhaustsIn: 4320 }` at pct 70 (p ≈ .70). At p .70 the island is **set to peek** (auto, `lock(true)`), showing amber "hits the cap in 1h 12m". Sub-beats below. |
| .95–1 | Headline final "Same afternoon. / *Your call.*" A red-ink hand-drawn circle-scribble draws around the `git commit` line. Caption (mono): `Commit. Leave a note. Stop on your terms.` |

Sub-beats inside .56–.95:
- p .80: 48 minutes left, so the forecast becomes red "hits the cap in 48m" (roller).
- p .86: pct > 85, so the ring and wing go red and bold.
- p .88: the `git commit` line types. Headline swaps to "An hour's notice." with "notice" in serif italic.
- p .93: the island collapses back to wings (91% red bold on the left). The reset caption rolls "resets in 2h 13m".

- **Night zone:** registered only while `.wall__night` > 50% (from the timeline), so the band's screen corners and the grain switch. Implement with a `onUpdate` → `html.dataset.night` toggle at thresholds.
- **Interactivity:** the stage island is hoverable and clickable only when the timeline is settled (velocity ≈ 0) outside the locked range.

**Mobile:**
- Stack the headline (top, `--t-h3` × 1.3), then the bezel and island (scale 1), then the terminal (13px, 16 lines, horizontal scroll hidden; lines are pre-truncated with `…` via CSS `text-overflow` per line).
- Background WALL at 60vw, vertical, rotated -90° along the right edge.
- Same timeline with pin length 200%.

**Reduced / `.is-static`:** no pin. Two panels side by side (stacked on mobile):
- A: the full Act A log with the red line, on a night card, titled "Mid-refactor. No warning."
- B: the Act B log plus the static island in peek with amber "hits the cap in 1h 12m", titled "An hour's notice. Your call."

---

### 6.3 `anatomy`: "How it works", six states (pinned)

**Pin:** `length: "360%"`, 6 steps × 60%, scrub .6. Steps are discrete: each step's transitions are *played* (not scrubbed) when progress crosses a step boundary, using `onUpdate` to compute the step index and call `goTo(i)`. The island's springs then stay springy, and scrolling back reverses them.

**Layout (desktop):**
- **Left (cols 1–5):**
  - Running head `§03 — ANATOMY`.
  - A **giant step numeral** "01"–"06": `--f-display` wght 900, wdth 50, 26vw tall, outlined (`-webkit-text-stroke: 2px var(--ink)`). Its fill rises like the hero WALL, to the step's featured %.
  - Below it: an `h3` step title and a 2-sentence body (max 36ch).
  - A **step rail**: six 26 × 4 capsules (the app's tick bars), with the active one filled teal and the past ones filled `--ink-3`. Each is a button that scrolls to the step.
- **Right (cols 6–12), the stage:**
  - Radius 28, night `#0E0D0B`, 1px rule, height 78vh.
  - Inside: a faint 32px dot grid (`rgb(255 255 255 / .05)`) and a slowly drifting blurred "window" rectangle behind (two 40% × 50% rounded rects in `#1D1B18` and `#23201C`, moving ±20px in a 12s loop), so the frosted modes have something to show later.
  - A bezel across the top with a stage Island at scale 1.6 (desktop 1440). Chalk annotations: white 70% serif italic 18px labels and ink arrows drawn with DrawSVG.
- Step changes:
  - Numeral: scramble "01" → "02" plus fill tween.
  - Title and body: lines out (yPercent -110, .35s), lines in (from 110, .6s `--ease-edit`, stagger .06).
  - Stage: island `setState` and `update`, annotations redraw.

**Steps (exact copy):**

1. **Collapsed.** Island collapsed, 46% teal / 82% amber. Annotations: "session" → left wing, "tightest limit" → right wing.
   - **h3:** "Two numbers. *Hugging the notch.*"
   - **Body:** "Your 5-hour session sits on the left in teal. The right shows your weekly limit in lavender, or whichever model limit is closer to the edge, in amber. Prefer bars to numbers? Switch to ticks."
   - At the end of the step, the display toggles percent → ticks → percent over 2.4s.
2. **Peek.** A ghost cursor (an SVG pointer, `aria-hidden`) glides onto the island. After 0.2s the island peeks.
   - **h3:** "Hover. *It opens.*"
   - **Body:** "Rest the pointer on it for a beat. The island drops into three rings: session, weekly and your busiest model, each with its own countdown to reset."
3. **Pinned.** The ghost cursor clicks (scale .9 pulse), and the island pins: the full table with Session, Weekly and Opus rows, sparklines and the projected tick.
   - **h3:** "Click. *It stays.*"
   - **Body:** "Pin it and you get the full table: a six-hour sparkline for every limit, a bar that marks where you'll land by reset, the exact reset time and your plan in the corner."
4. **Forecast.** Pinned stays pinned. Tween the session 46 → 64 with the spark climbing steeply. The forecast appears amber "hits the cap in 1h 12m", then counts down to "58m" in red. The projected tick on the bar slides past 100% and clamps to the end with a 2pt red cap.
   - Annotation: "your pace, extrapolated".
   - **h3:** "It does the math *on your pace.*"
   - **Body:** "Burning fast? The session line reads 'hits the cap in 1h 12m', amber at first and red once it's under an hour. Pacing yourself? It says 'on track — resets first'."
   - When scrolling back, it returns to `clears`.
5. **Red zone.** Weekly 71 → 89 and Opus 82 → 100. Both go red and bold, and a limit note row appears: "Opus limit reached · resets Sat 1:05 PM". The stage background briefly flashes `rgb(242 107 107 / .08)`. This is the only red flash on the page outside the finale.
   - **h3:** "Past 85%, *it gets loud.*"
   - **Body:** "Red and bold at once, so it reads even if red and green look alike to you. At 100% it tells you exactly when you're back."
6. **Notifications.** The island collapses. A **macOS-style notification** slides in from the stage's top-right (x 110% → 0, spring 220/24):
   - Card: 340px, radius 16, `rgb(40 38 35 / .85)` + blur 20, white text.
   - App icon 20px (`/assets/icon-256.png`), "CLAUDE METER" 11px `--on-night-2`, title 13px semibold "Session at 80%", body 13px "80% used · resets in 1h 40m".
   - After 1.6s a second card stacks above it: "Session reset" / "Your 5-hour window is back to full."
   - **h3:** "Or it taps you *on the shoulder.*"
   - **Body:** "Opt-in alerts when your session passes 50, 80 and 95%, when weekly or model limits pass 80 and 95%, and once more when a tight window resets to full."

- **Interactive:** after each step settles, the stage island is live (hover and click), with `data-cursor="try it"`.

**Mobile:**
- No pin. Six stacked blocks, each with the numeral (40vw, outlined, fill on enter), title, body and its own compact stage (radius 20, height auto, island at scale `min(1, (vw-48)/560)` so pinned fits).
- The state is applied when the block enters (ScrollTrigger `onEnter` / `onEnterBack`). The notification card sits under the bezel instead of top-right.

**Reduced:** same stacked layout, with each island already in its step state.

---

### 6.4 `ticker`: "Free." (mid-page CTA and the loop)

**Layout:** about 110vh, not pinned.

- **Marquee 1:** a full-bleed **ink band**, 22vh tall, bg `--ink`. Text is `--f-display` wght 800 wdth 70 at 11vw, `--paper`. Numbers inside are set in their meter colours (pastels are fine on ink). Separator glyph: a 0.35em black-on-paper capsule "tick bar" (26 × 4 ratio) partially filled.

  ```
  46% · resets in 2h 13m · hits the cap in 1h 12m · 89% · on track — resets first · Opus limit reached · 71% · just now ·
  ```

  It runs left, 70 px/s, with velocity skew and speed-up.
- **Centre block** (cols 3–10, centred text, generous air):
  - **h2:** "Free. No account. / No Dock icon. *Just the notch.*"
  - A giant primary button: `Download for Mac` at 72px tall, 26px text, magnetic, with the fill ring. `data-cursor="v1.2 · 1 click"`.
  - Two mono lines: `Free · v1.2 · macOS 14.4+ · Apple Silicon & Intel` and `Signed & notarized by Apple`.
  - A check-seal glyph beside the second line draws itself on enter.
- **Marquee 2:** mono 16px uppercase, `--ink-2`, runs right at 40 px/s, with a hairline rule above and below.

  ```
  SESSION 46% · WEEKLY 71% · OPUS 82% · MAX 20X · UPDATED JUST NOW · EVERY 5 MIN · NEVER FASTER THAN 3 · ON HOVER, TOO ·
  ```

- **Interactions:**
  - Hovering a marquee slows it to 0.2× (tween timeScale .4s).
  - Every number in marquee 1 is a real span. When it crosses the viewport centre, it briefly rolls to a new random plausible value (a Roller on 3 spans at most, time-throttled to one per 2s), so the loop feels live and never identical.
- **Mobile:** marquee 1 at 18vw, band 16vh. The button is full-width. The h2 is `--t-h2`.
- **Reduced:** marquees become static single lines (overflow clipped with a fade mask at the right). No rolls.

---

### 6.5 `yours`: "Make it yours." (interactive playground)

**Layout (desktop):**
- **Left (cols 1–4, sticky top 120px):**
  - **h2:** "Make it *yours.*"
  - **Lede:** "Everything lives behind one right-click. Try it on the one below. It's the real menu."
  - A mono fact list (each with a tiny tick bar):
    - `NO DOCK ICON`
    - `HIDES IN FULLSCREEN APPS`
    - `LAUNCH AT LOGIN`
    - `UPDATES EVERY 5 MIN · AND ON HOVER`
- **Right (cols 5–12): a "desk".**
  - Radius 28, height 70vh, over a wallpaper made of drifting windows: three rounded rectangles in soft metric-tint gradients (teal 40% → paper, lavender, amber), each with 1px white 30% borders and fake title bars. They drift under the bezel on 18s, 23s and 29s `sine.inOut` loops. The drift is what makes Frosted and Liquid Glass visible, because the island shifts as windows move behind it (true to the app).
  - Across the top of the desk: a bezel with an Island at scale 1.4, `data-cursor="right-click me"`.
  - **Controls bar** under the desk, styled like macOS controls on paper:
    - **Appearance** segmented control (radio group): `Solid | Frosted | Liquid Glass`. Calls `isl.setOption('material')`, cross-fade .4s.
    - **Show percentages** switch: percent ↔ ticks.
    - **Burn-rate estimates** switch: removes or adds the forecast line and projected arcs.
    - **This Mac has a notch** switch: on → notch mode. Off → the bezel morphs into a flat external-display top edge. The housing width tweens to 0 and the island becomes the **compact pill at top centre** (`notch: false`), and a **menu-bar item** fades in at the desk's top-right: a mini 18px ring plus "46%".
- **Right-click, long-press (500ms touch) or ContextMenu key** on the island opens a **replica of the app menu**:
  - A macOS dark menu: `rgb(30 30 30 / .92)`, blur 20, radius 10, 13px `--f-ui`, 22px rows, 1px `rgb(255 255 255 / .1)` separators, hover row in `#3A7CF6`-ish system blue. **Use `--lav` instead to stay on-brand.**
  - It is keyboard navigable (`role="menu"`, arrows, Esc).
  - Rows:

    ```
    Session   46%
    Weekly    71%
    Opus      82%
    ─────────
    Refresh now                       → island "updated" rolls "just now", rings re-fill from 0 (1s)
    Open usage on claude.ai           → real link (https://claude.ai/settings/usage), opens new tab
    ─────────
    Appearance ▸ Solid / Frosted / Liquid Glass   (submenu, checkmark on current)
    ✓ Show percentages
    ✓ Burn-rate estimates
      Usage notifications             → toggles; when turned on, a notification card (6.3 style) pops in the desk: "Usage notifications on" / "We'll ping you at 50, 80 and 95%."  (site-only toast; phrase as the site's voice)
      Menu bar item                   → shows/hides the menu-bar item
      Launch at login                 → toggles (checkmark only)
    ─────────
    About Claude Meter                → small about card: icon, "Claude Meter 1.2", "Made by Yiftach Freeman"
    Quit Claude Meter                 → island shrinks into the notch (scale→0, .4s --ease-in), 1.2s pause,
                                        then springs back (250/18) + toast "It's a website. We relaunched it."
    ```

  - Controls and menu share state: the switches update when the menu toggles, and vice versa.
- **Mobile:**
  - The desk is 60vh and the island fits to width. The controls wrap into 2 rows.
  - The segmented control is full-width.
  - A visible "Open menu" button sits under the desk, since touch users can't right-click.
- **Reduced:** window drift is static (no loops). Everything else still works, with instant state changes.

---

### 6.6 `privacy`: "Reads. Never writes." (night zone)

**Layout:** a `nightZone` for the whole section.

- **h2 across full width**, two lines: "Reads." (wdth 60 wght 900, `--t-mega` × .6) and "*Never* writes." ("Never" in serif italic).
  - On scroll (scrub over the section's first 40%), "Reads." widens (wdth 60 → 130).
  - "writes." gets a **teal highlighter swipe** behind it: an `::after` scaleX 0 → 1 from the left, height .35em, at the bottom third.
- **Network diagram (centre, SVG, max 900px wide):**
  - The app icon (`/assets/icon-256.png`, 96px) in the centre, labelled "your Mac" in mono.
  - Three solid lines go to three host chips (mono 14px, bordered pill `--rule-night`):
    - `api.anthropic.com`, caption "your usage numbers"
    - `platform.claude.com`, caption "refreshing a short-lived token, in memory"
    - `claudemeter.vercel.app/version.json`, caption "once a day: is there an update?"
  - A fourth **dashed** line runs toward a chip "anything else". It draws halfway, then a red `✕` stamps on it (scale 1.4 → 1, spring) and the dashed line retracts.
  - Lines use DrawSVG on enter.
  - Then **packets loop:** a 4px teal dot travels each solid line (MotionPath not needed: animate `offset-distance` on an element with `offset-path: path()` via CSS keyframes, 2.8s, staggered). It runs inside `whileVisible`.
- **Three columns** (cols 1–4 / 5–8 / 9–12), mono head labels:
  - **READS:** "The sign-in Claude Code already saved on this Mac, from the macOS Keychain via Apple's own `security` tool, or from `~/.claude/.credentials.json`."
  - **TALKS TO:** "Anthropic's usage endpoint for your numbers. Anthropic's token service when a short-lived token needs refreshing, and the new one is kept in memory only. This site, once a day, to check for updates."
  - **NEVER:** "Writes to your credentials. Sends analytics. Asks you to make an account. Runs a server."
    - Under it, the mono line `analytics · accounts · servers` gets a red hand-drawn **strike-zigzag** drawn across it on enter.
- **Odometer row** (Rollers roll from random to final on enter, stagger .12), `--t-h2` digits with mono captions:
  - `0` analytics
  - `0` accounts
  - `0` servers
  - `3` hosts
  - `5` min between checks (caption: "never faster than 3")
- **Mobile:** the diagram becomes vertical, with the Mac at top and the chips stacked below with vertical lines. The columns stack.
- **Reduced:** everything is drawn, with no packets and no rolling.

---

### 6.7 `faq`: "Questions, metered."

**Layout:**
- **h2:** "Questions, *metered.*"
- **Sub (mono):** `EACH ANSWER YOU OPEN USES A LITTLE OF THIS PAGE'S SESSION.`
- A list of `<details>` rows, full grid width, separated by hairline rules.
- **Each `<summary>`:**
  - Left: a mono **% label** in `--ink-3`: `00%`, `10%`, `20%` … `90%`.
  - The question in `--t-h3`.
  - Right: a `+` that rotates to `×` (spring, CSS `--ease-spring`).
- **Under each row:** the app's **6pt bar**, a capsule with track `--rule` and fill teal. Its fill goes 0 → 100% when the row is opened, and it stays filled, as if you "used" it. The nav island's FAQ ring reads the count.
- **Hover:** the question shifts wdth 90 → 100 (.3s) and the % label turns `--teal-ink`.
- **Open animation:**

  ```css
  :root { interpolate-size: allow-keywords; }
  details::details-content { block-size: 0; overflow: clip; transition: block-size .5s var(--ease-edit), content-visibility .5s allow-discrete; }
  details[open]::details-content { block-size: auto; }
  ```

  Where unsupported, it simply opens. The answer is `--t-body`, max 62ch, fading up 12px.
- **After the last row:** a mono line `100% — you've read everything. Resets at the top.`, linking to `#top` via `scrollTo(0)`.

**Questions and answers (exact):**

1. **Do I need an API key or a password?** No. Claude Meter uses the sign-in Claude Code already saved on your Mac. If Claude Code works, Claude Meter works.
2. **Which plans work?** Claude Pro and Max, signed in through Claude Code. API-key (Console) logins don't carry plan limits, so they aren't supported.
3. **How fresh are the numbers?** It checks every 5 minutes, and whenever you hover. It never checks more often than every 3 minutes, because the usage endpoint rate-limits.
4. **What does "hits the cap in 1h 12m" actually mean?** It's your recent session pace, projected forward. If that line reaches 100% before the window resets, you get the time. It turns red when it's under an hour. If you'll make it, it says "on track — resets first". You can switch it off.
5. **My Mac doesn't have a notch.** It still works. Without a notch, or on an external display, it becomes a compact pill at the top centre of the screen, and you can add a menu-bar item too.
6. **Will it get in the way?** Collapsed, it's the notch plus two numbers. It hides in fullscreen apps and has no Dock icon.
7. **Is it safe to open?** It's signed with an Apple Developer ID and notarized by Apple, so macOS opens it without warnings. It reads your Claude Code sign-in and never writes to it.
8. **What does it send, and to whom?** Your usage request goes to Anthropic, a token refresh goes to Anthropic when needed, and once a day it asks this site whether there's a new version. No analytics, no account, no server of ours.
9. **Is Claude Meter made by Anthropic?** No. It's an independent app by Yiftach Freeman. It isn't affiliated with or endorsed by Anthropic.
10. **How do I quit it?** Right-click the island and choose Quit Claude Meter.

- These 10 Q&As also go into the FAQPage JSON-LD, verbatim.
- **Reduced:** no transitions. Bars fill instantly.

---

### 6.8 `finale`: the page hits its limit (HIT → RESET) + footer

**Layout:** a `nightZone` from the top of this section. About 130vh.

- **Top block** (cols 2–11, centred):
  - **h2:** "Go back to work. / *We'll watch the meter.*"
  - Primary CTA: the giant Download button (the same component as ticker).
  - The two meta lines.
  - Hand-drawn note beside the button in serif italic, `--amber`: "free. really."
- **The wordmark:** "Claude Meter" set **full-bleed** at `--t-mega` (≈ 17vw so it fits one line at 1440; two lines on mobile at 28vw), wght 900, wdth 120, `aria-hidden` (the brand is already in the band).
  - Outline stroke `--on-night-2` at 30%.
  - A **fill copy** clipped from the left (`clip-path: inset(0 calc(100% - var(--fill)) 0 0)`).
  - The fill colour is a hard-stop gradient across the word: teal 0–60%, lavender 60–75%, amber 75–85%, red 85–100%. The fill reveals the colour zones as it sweeps, and past 85% the whole fill flips to red and `font-weight` 900 → 1000 isn't possible, so **stroke thickens and letter-spacing tightens -.01em** as the bold signal.
  - `--fill` is scrubbed with the section progress from "top 80%" to "bottom bottom", and the header island's left wing (`scrolled%`) mirrors it exactly. At the page end both read 100%.
- **HIT at 100%** (callback, once per arrival):
  - A 120ms shake of the wordmark.
  - The island's wing goes red and bold at 100%.
  - The island auto-peeks with the limit row "This page limit reached · resets at the top".
  - Under the wordmark, a mono red line types: `● Page limit reached · resets at the top`.
- **RESET** (time-based, 1.4s later, unless the user scrolls up):
  - The fill **drains** right-to-left with spring 180/20 to 0%.
  - The island numbers roll down to 0% teal and the island collapses.
  - The red line scrambles to `Back to full.` in teal. This echoes the app's real "back to full" notification.
  - Then, while the section stays in view, the fill creeps back up to 12% over 6s and holds. Calm. No more HITs until the user leaves and returns.
- **Footer** (`<footer>`, below the wordmark, hairline rule above, mono 12px, `--on-night-2`, 3 columns):
  - Left: `Claude Meter v1.2 · Made by Yiftach Freeman`
  - Centre: links `How it works` · `Privacy` · `FAQ` · `Back to top ↑` (scrollTo 0, and the page meter visibly resets as you travel)
  - Right: `Free · macOS 14.4+ · Apple Silicon & Intel`
  - Last line, full width, 12px: **"Independent project. Not affiliated with or endorsed by Anthropic. Claude is a trademark of Anthropic, PBC."**
- **Mobile:** the wordmark stacks as "Claude / Meter" at 28vw. The HIT/RESET logic is the same. The footer stacks.
- **Reduced:** the wordmark is shown filled in teal at 100% width with no HIT and no drain, and the line reads `Back to full.`

---

## 7. SEO, meta, OG (architect)

- **`<title>`:** `Claude Meter — Claude usage limits in your MacBook notch`
- **Meta description:** `Free macOS app that turns your MacBook notch into a live gauge for your Claude Pro or Max limits: 5-hour session, weekly cap and per-model limits, with reset countdowns and a burn-rate forecast.`
- Canonical `https://claudemeter.vercel.app/`. OG and Twitter `summary_large_image` with `/assets/og.png`. Theme-color `#000000` (the band).
- **JSON-LD:**
  - `SoftwareApplication`: name, `operatingSystem: "macOS 14.4 or later"`, `applicationCategory: "UtilitiesApplication"`, `offers.price "0"` USD, `softwareVersion "1.2"`, `author` Person "Yiftach Freeman", `downloadUrl` `/ClaudeMeter.dmg`.
  - `FAQPage` with the §6.7 Q&As.
- **OG image** (`web/og.html` → 1200 × 630, headless Chrome):
  - Paper background with grain.
  - A black band 72px tall across the top, with the notch and a collapsed island at scale 2.25 (46% teal / 82% amber).
  - Left, 3 lines: "See the" (Anybody 500 wdth 75, 88px), "WALL" (900 wdth 150, 250px, outline plus teal fill to 46% with a wave edge), "*before* you hit it." (serif italic + Anybody).
  - Bottom-right, mono 18px: `Claude Meter · free for macOS`.

---

## 8. Accessibility and performance checklist (every builder)

- **Landmarks and headings:** one `<h1>` (hero). `<header>` is the band. `<main>` wraps sections. `<footer>` is in the finale. Every section is labelled by its h2. Heading levels are in order.
- **Text split with SplitText:** always use `aria: "auto"`. Never split the island's sr text.
- **Visible focus everywhere:** 2px outline `--teal-ink` on paper and `--teal` on night, offset 3px. The magnetic transform must not move the focus ring out of alignment: apply the magnetic transform to an inner span.
- **Contrast:** text is AA. Pastels are never used for text on paper; use the `*-ink` variants.
- **Motion:**
  - Everything goes through `reduced`. Pins become static compositions. No Lenis. No loops.
  - The hero fill is static. The island still works, instantly.
  - Test with the `prefers-reduced-motion` emulation in `qa.mjs`.
- **Touch:** every hover interaction has a tap equivalent. Island tap cycles its states. The replica menu opens on long-press and via the visible button.
- **Overflow:** no horizontal overflow from 320 to 1920px. Full-bleed type uses `overflow-x: clip` on its section, never on `body`.
- **Performance:**
  - Animate only transform, opacity, clip-path, filter (small elements only) and `font-stretch` (on ≤ 12 glyphs at a time).
  - Every ambient loop sits inside `whileVisible`.
  - One global `ScrollTrigger.refresh()` after fonts load.
  - Target 60fps on an M1 Air, and no long task over 50ms after load.
- **Download links:** every Download link is `href="/ClaudeMeter.dmg" download` with the text "Download for Mac" (or an `aria-label` on the icon version).

---

## 9. Copy voice rules

- Short, concrete and a little dry. Talk about real moments ("mid-refactor", "commit, leave a note").
- Banned: "seamless", "effortless", "supercharge", "unlock", "elevate", "game-changer", "powerful", "in today's world", exclamation marks, emoji.
- Numbers always in the app's own formats: `46%`, `resets in 2h 13m`, `resets Sat 1:05 PM`, `hits the cap in 1h 12m`, `on track — resets first`, `just now`, `Max 20x`.
- Never claim open source, stars, testimonials, user counts, Windows support or an iPhone app. Never show the Claude spark or Anthropic logos.
