# Claude Meter — "CINEMA" direction spec (v2 site)

Owner: creative lead. Audience: architect/integrator + section builders.
Read the whole file before writing code. Product truth lives in `Sources/ClaudeMeter/*.swift`; if this spec and the Swift disagree, the Swift wins, then tell the lead.

---

## 0. The big idea: **The notch is a projector.**

The MacBook's camera notch is the one piece of hardware on the screen that never moves. We treat it as a **lens and a light source**. It is where the film starts, where the light comes from, and where the page ends.

- **Open (intro):** the page starts as a black lid. A camera dot glints, stretches into the notch, and the live island springs out of it.
- **Hero:** a giant screen framed on silver paper. A soft **projector beam** falls from the notch, with dust drifting in it and tinted by the live usage numbers. The real island hangs from the top edge, alive, and you can hover, click and right-click it.
- **Spine (scroll):** scrolling is a camera. It **dollies in** until the island fills the frame (macro product shot), cuts through the app's real states, shoots the same coding session in **two takes** (without and with Claude Meter), **pulls back** to a wide shot with an external display, and ends with an **iris close into the camera lens**. The iris reopens on a fresh window: "Session reset."
- **The page has a limit too.** A fixed nav island tracks your reading like a session window. It reads 0% at the top and fills as you scroll: teal, then red and bold past 85%. It HITs at the finale and RESETs with the app's real notification copy. A small viewfinder HUD at the bottom shows a timecode running 00:00:00 → 05:00:00 across the page (the 5-hour window) and the current scene slate.

**Four motion verbs, nothing else moves:** FILL, FORECAST, HIT, RESET. Every effect has to be one of them, or be camera/light grammar (dolly, focus pull, cut, iris, key light). HIT happens exactly twice (end of Take 1, finale).

**Art direction in one line:** a silver-screen print (cool silver paper, film grain, huge condensed poster type, one serif-italic word per headline) intercut with night shots of a real black notch lit by pastel meter light.

Why silver and not cream: cream and terracotta read as Anthropic's own brand (claude.ai ivory). We must stay visibly independent. Cool silver paper, black hardware and the app's four pastel metric colours are ours.

**Hard no's:** purple gradients, gradient-text headlines, glow buttons, feature-card grids, bento, centred-hero-plus-grid templates, static composite hero images, 3D Spline laptops, cursor blobs that hide the native cursor, horizontal-scroll galleries, scroll-snap hijack, loaders over 1.2 s, autoplay sound, the Claude spark, Anthropic orange.

---

## 1. Design tokens (`site/css/tokens.css`, architect-owned)

### 1.1 Fonts (self-host woff2, latin subset, `font-display: swap`, preload the display face)

| Role | Family | npm package | Files / axes | Notes |
|---|---|---|---|---|
| Display + body | **Anybody** (variable) | `@fontsource-variable/anybody` | `files/anybody-latin-standard-normal.woff2` (axes **wght 100–900, wdth 50–150**) | The signature: condensed poster titles (wdth 62–75, wght 800), squash-against-the-wall effect (wdth 150→50), body copy at wdth 100 / wght 420 |
| Accent | **Instrument Serif** | `@fontsource/instrument-serif` | `400-italic` (latin) + `400-normal` (latin, for FAQ numerals) | Exactly one emotional word or phrase per headline, lowercase-leaning, never a whole paragraph |
| Mono / HUD / numbers | **Geist Mono** (variable) | `@fontsource-variable/geist-mono` | `files/geist-mono-latin-wght-normal.woff2` (wght 100–900) | Timecodes, slates, marquee strings, terminal, FAQ labels. Always `font-variant-numeric: tabular-nums` |
| Island UI | system | none | `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif` | **Only inside the island and fake macOS chrome**, so it matches the app (SF on a Mac). Always `tabular-nums` |

```css
--f-display: "Anybody Variable", "Anybody", ui-sans-serif, system-ui, sans-serif;
--f-serif:   "Instrument Serif", ui-serif, Georgia, serif;
--f-mono:    "Geist Mono Variable", ui-monospace, "SF Mono", Menlo, monospace;
--f-ui:      -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
```

Type scale (fluid, `clamp()`):

| Token | Value | Use |
|---|---|---|
| `--t-mega` | `clamp(72px, 15.5vw, 280px)` / lh .82 / wdth 62 / wght 820 / tracking -0.035em | Finale wordmark, "WALL" |
| `--t-h1` | `clamp(52px, 9.4vw, 176px)` / lh .86 / wdth 70 / wght 800 / tracking -0.03em | Hero headline |
| `--t-h2` | `clamp(40px, 6.2vw, 112px)` / lh .9 / wdth 72 / wght 780 / tracking -0.025em | Section headlines |
| `--t-h3` | `clamp(26px, 2.8vw, 44px)` / lh 1.0 / wdth 85 / wght 700 | Beat captions |
| `--t-body-l` | `clamp(18px, 1.45vw, 22px)` / lh 1.4 / wdth 100 / wght 420 | Lead paragraphs (max 34ch) |
| `--t-body` | `17px` / lh 1.5 / wdth 100 / wght 420 | Body (max 58ch) |
| `--t-mono` | `12px` / lh 1.3 / tracking .04em / uppercase for slates | HUD, slates, labels |
| `--t-mono-l` | `clamp(15px, 1.2vw, 18px)` | Terminal, marquee |

The serif word is set 1.08× the surrounding size with a baseline nudge of `0.04em` so it optically matches the caps height.

### 1.2 Colour

```css
/* Day (paper) */
--paper:      #E9EBE6;  /* silver-screen paper, page background */
--paper-2:    #DEE1DA;  /* rules, FAQ row hover, filmstrip base */
--ink:        #111311;  /* primary text on paper (17.4:1) */
--ink-2:      #50544C;  /* secondary text on paper (6.6:1) */
--ink-3:      #7C8077;  /* tertiary, non-essential only (3.4:1, ≥18px or decorative) */
--rule:       rgba(17,19,17,.14);

/* Night (screen / hardware) */
--night:      #060607;  /* screen black, night sections */
--bezel:      #000000;  /* island, notch, bezel: true black like the app */
--fg:         #ECEDE8;  /* text on night (17:1) */
--fg-2:       #A8A8A8;  /* = Theme.text2 (0.66 white): labels, reset times */
--fg-3:       #999999;  /* = Theme.text3 */
--track:      rgba(255,255,255,.13); /* = Theme.track */

/* Metric colours, exactly Theme.swift */
--teal:       #5CC9A6;  /* session */
--lavender:   #B0A8ED;  /* weekly (all models) */
--amber:      #FAC775;  /* per-model limit, forecast "soon" */
--red:        #F26B6B;  /* >85%, forecast < 1h, limit reached; ALWAYS paired with bold */

/* Metric colours as TEXT on paper (AA ≥4.5:1 on --paper) */
--teal-ink:     #17745A;
--lavender-ink: #5A4FC0;
--amber-ink:    #8E5A06;
--red-ink:      #B83232;

/* Light */
--beam-a: rgba(92,201,166,.55);  /* beam colour stops, driven live by JS */
--beam-b: rgba(176,168,237,.45);
--beam-c: rgba(250,199,117,.40);
--glint:  #FFFFFF;
```

Rules:
- Pastel metric colours appear as **text only on night**. On paper, use the `-ink` variants for text; pastels are fills and strokes only.
- The accent for CTAs is **black hardware**, never a colour. The CTA is an island (see 3.3).
- Selection: `background: var(--teal); color: var(--night)`.

### 1.3 Radii, spacing, layers

```css
--r-screen: 28px;   /* hero display, stage frames (bottom corners; top corners 14px like a lid) */
--r-card:   20px;   /* macOS window/menus in demos use 10–12px, see components */
--r-pill:   999px;
--gutter:   clamp(16px, 3.2vw, 48px);  /* page side padding; 16px min on phones */
--frame:    clamp(8px, 1vw, 14px);     /* paper margin around the hero display */
--max:      1440px;                    /* content max width; stages go full-bleed */
--z-grain: 90; --z-hud: 80; --z-nav: 70; --z-cursor: 95; --z-intro: 100;
```

Spacing unit is 4px. Section vertical rhythm: `padding-block: clamp(96px, 14vh, 200px)`.

### 1.4 Easing and duration

```js
// site/js/lib/motion.js registers these once
CustomEase.create("cine",   "M0,0 C0.625,0.05 0,1 1,1");               // text reveals, camera moves
CustomEase.create("island", "M0,0 C0.14,0.56 0.22,1.1 0.46,1.07 0.64,1.04 0.78,0.995 1,1"); // island morph, ~7% overshoot (SwiftUI .bouncy 0.4 feel)
CustomEase.create("settle", "M0,0 C0.2,0.8 0.2,1 1,1");                // small UI
CustomEase.create("clap",   "M0,0 C0.5,0 0.8,0.4 1,1");                // slate clapper (accelerating hit)
```

```css
--ease-cine:   cubic-bezier(.625,.05,0,1);
--ease-settle: cubic-bezier(.2,.8,.2,1);
--spring-soft: linear(0, 0.044, 0.15, 0.287, 0.431, 0.569, 0.691, 0.793, 0.874, 0.936, 0.98, 1.009, 1.027, 1.036, 1.038, 1.037, 1.033, 1.028, 1.022, 1.017, 1.012, 1.008, 1.005, 1.003, 1.001, 1);
--spring-pop:  linear(0, 0.052, 0.183, 0.357, 0.544, 0.722, 0.875, 0.996, 1.083, 1.136, 1.16, 1.161, 1.146, 1.121, 1.091, 1.061, 1.034, 1.011, 0.994, 0.982, 0.976, 0.973, 0.975, 0.978, 0.982, 0.987, 0.992, 0.996, 1);
--d-micro: 180ms;  --d-ui: 320ms;  --d-island: 440ms;  --d-reveal: 900ms;  --d-cut: 60ms;
```

- Micro hover/press: 160–220 ms, `settle`.
- Island morph (interactive): 0.44 s `island`. Collapse: 0.4 s `settle` (the app uses `.smooth(0.4)` to close).
- Text reveals: 0.9 s `cine`, line stagger 0.08, word 0.04, char 0.012.
- Scrubbed scenes: `scrub: 0.8`, `anticipatePin: 1`, never `snap`.
- Loops: 4–12 s, `ease: "none"`, paused offscreen and on `visibilitychange`.
- `--spring-pop` only for tiny accents (clapper bounce, notification arrival, the "psst" arrow). Never on layout.

### 1.5 Grain, glass, light recipes

**Grain** (`base.css`, one fixed pseudo-element, never a full-screen animated filter):
```css
.grain{position:fixed;inset:-50%;z-index:var(--z-grain);pointer-events:none;
  background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity:.06; mix-blend-mode:multiply; animation:grain .9s steps(6) infinite;}
html[data-night] .grain{mix-blend-mode:screen;opacity:.07}
@keyframes grain{0%{transform:translate(0,0)}20%{transform:translate(-3%,2%)}40%{transform:translate(2%,-4%)}60%{transform:translate(-4%,-1%)}80%{transform:translate(3%,3%)}100%{transform:translate(0,0)}}
@media (prefers-reduced-motion:reduce){.grain{animation:none}}
```
`html[data-night]` is toggled by the ScrollTrigger of every night section (see 2.9).

**Island materials** (faithful to `Appearance`: every mode stays at least as dark as the camera housing):
- Solid: `background:#000`.
- Frosted: `background: rgba(0,0,0,.84); backdrop-filter: blur(24px) saturate(1.4);`
- Liquid Glass: Frosted, plus a 1px inner specular (`box-shadow: inset 0 1px 0 rgba(255,255,255,.10)` via an SVG stroke along the shape path), plus in Chromium only `@supports (backdrop-filter: url(#x))` a subtle `url(#cm-liquid)` displacement (`feTurbulence baseFrequency .008`, `feDisplacementMap scale 18`) before the blur. Other browsers get Frosted plus the specular stroke.
- **Rim** (all modes, `Theme.rim`): 1px SVG stroke on the shape path, `linearGradient` top→bottom `rgba(255,255,255,.04)` → `rgba(255,255,255,.20)`.
- Shadow under expanded island: `filter: drop-shadow(0 18px 40px rgba(0,0,0,.45))` on the wrapper, **not animated**. Fade its opacity with a sibling layer instead.

**Key light** (cursor-reactive glass, used on the island and the CTA): a `::after` radial gradient `radial-gradient(160px circle at var(--lx) var(--ly), rgba(255,255,255,.14), transparent 60%)` with `mix-blend-mode: screen`, masked to the shape, driven by `gsap.quickTo` on `--lx/--ly`. It shows only on the rim and top edge: the mask is the rim stroke widened to 6px and blurred.

**Projector beam**: see §4.1 (stage), WebGL (OGL) with CSS fallback.

---

## 2. Global motion system (architect provides; sections consume)

### 2.1 Libraries (self-host in `site/vendor/`, exact files)

- `gsap@^3.13` → `gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.min.js`, `ScrambleTextPlugin.min.js`, `DrawSVGPlugin.min.js`, `Flip.min.js`, `CustomEase.min.js`, `Observer.min.js`. Load the ESM builds from `gsap/dist/*.js` (or `esm/`), imported by relative path.
- `lenis@^1.3` → `lenis.mjs`.
- `ogl@^1` → only `Renderer, Program, Mesh, Triangle` (tree-shaken by hand: copy the ESM files needed, or import `ogl/src/index.js` and let the browser fetch only what's used; aim ≤ 30 KB gz). Loaded **lazily** by `stage.js` after first paint.
- Budget check: GSAP set about 75 KB gz, Lenis 5 KB, OGL about 25 KB, our code under 60 KB. Total at most 170 KB, well under 350.

### 2.2 `site/js/main.js` (architect)

```js
import { boot } from "./lib/motion.js";
const sections = ["stage","takes","reel","lighting","wide","privacy","commentary","finale"];
boot(async (ctx) => {           // ctx = { gsap, ScrollTrigger, SplitText, Flip, lenis, reduced, mobile, Island, lib }
  for (const id of sections) {
    const root = document.getElementById(id);
    if (!root) continue;
    const mod = await import(`./${id}.js`);
    mod.default?.({ ...ctx, root });   // returns optional cleanup; boot() collects them per matchMedia context
  }
  ScrollTrigger.refresh();
});
```

Contract for every section module: `export default function init(ctx) { ...; return () => {/* cleanup */} }`. All GSAP work goes inside `ctx.gsap.context(() => {...}, root)` so the architect's `matchMedia` can revert it when motion preferences or breakpoints change. **A section never registers plugins, creates Lenis, or reads `matchMedia` itself: it uses `ctx.reduced` and `ctx.mobile`.**

### 2.3 `lib/motion.js`: boot, Lenis, GSAP defaults, reduced-motion switch

```js
gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin, Flip, CustomEase, Observer);
gsap.defaults({ ease: "cine", duration: 0.9 });
ScrollTrigger.config({ ignoreMobileResize: true });
const mm = gsap.matchMedia();
mm.add({
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
  mobile: "(max-width: 767px)",
}, (c) => {
  const { reduced, mobile } = c.conditions;
  document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, wheelMultiplier: 1, anchors: { offset: -80 }, autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // run section inits with { reduced, mobile, lenis }; return cleanup that destroys lenis
});
document.fonts.ready.then(() => ScrollTrigger.refresh());   // SplitText waits for fonts too
document.addEventListener("visibilitychange", () => document.hidden ? gsap.globalTimeline.pause() : gsap.globalTimeline.resume());
```

Without JS: everything is visible and static (no `opacity:0` in CSS unless it's under `html[data-motion="full"]`). **Critical rule: never hide content in CSS by default.** Initial hidden states are set by JS (`gsap.set`) or scoped under `[data-motion="full"]`.

### 2.4 Shared utilities: `site/js/lib/*.js` (architect writes all of these, each with a JSDoc signature)

| File | Export | Behaviour | Reduced motion |
|---|---|---|---|
| `split.js` | `revealLines(el, {delay, stagger=.08, trigger=el, start="top 85%"})` | `SplitText.create(el, {type:"lines,words", mask:"lines", autoSplit:true, aria:"auto"})`; lines from `yPercent:110, rotate:2.5deg (origin 0 100%)` to rest, `cine` 0.9 s. Returns the tween. Also `revealChars(el, opts)` (chars from `yPercent:100, opacity 0`, stagger .012). | Returns null, text untouched |
| `scramble.js` | `scrambleTo(el, text, {duration=.6, chars="0123456789%·:hm "})` | ScrambleTextPlugin with mono-only charset (numbers never scramble into letters) | Sets text instantly |
| `counter.js` | `countTo(el, to, {from, duration=.8, suffix="%", format})` and `rollDigits(el, value)` | `countTo` tweens a proxy and writes `Math.round()`. `rollDigits` is the Alcove rolling-digit: each changed digit enters `y ±h/3, scale .8, blur(h/6), opacity 0` → rest (0.45 s `island`), old digit exits `y ∓h/2, scale .6, opacity 0`, direction by sign of the change. Container is `tabular-nums` so width never jitters | Writes value instantly |
| `magnetic.js` | `magnetic(el, {strength=.28, radius=120})` | `gsap.quickTo` x/y (0.5 s, `power3`) toward pointer inside radius; label moves 1.4× for parallax; resets on leave. Only `(hover:hover) and (pointer:fine)` | No-op |
| `focus.js` | `initFocusBrackets()` | **Autofocus brackets** (§3.2) | Not created |
| `marquee.js` | `marquee(track, {speed=60 /*px/s*/, direction=1, velocity=true})` | Clones children until ≥2× viewport width, `xPercent` loop with `gsap.to(..., {repeat:-1, ease:"none"})` plus `modifiers` wrap. With `velocity`, a shared `ScrollTrigger` reads `getVelocity()` and sets `timeScale(1 + |v|/1200)` (clamped 1–4) and `skewX(clamp(v/-400, -3, 3))` on the track via quickTo. Pauses when offscreen (IntersectionObserver) and on hover/focus-within | Static, first set only, no clones visible to AT (`aria-hidden` on clones) |
| `reveal.js` | `reveal(els, {y=28, stagger=.06, start="top 88%"})` | Batch fade-rise via `ScrollTrigger.batch`. Use for small elements only | Visible |
| `pin.js` | `pinScene(root, {length:"300%", mobileLength:"180%", scrub:.8, onUpdate})` → `{tl, st}` | Standard pinned scrubbed timeline: `ScrollTrigger.create({trigger:root, start:"top top", end:"+="+len, pin:true, pinSpacing:true, anticipatePin:1, scrub, invalidateOnRefresh:true})`. Also sets `html[data-night]` when `root.dataset.night` is present, and updates the HUD slate (`root.dataset.slate`) | Returns `{tl:null}`: section renders its end-state composition |
| `night.js` | `nightZone(el)` | Toggles `html[data-night]` while el is under the viewport top+50%. The nav, HUD and grain read it | Same (not motion) |
| `hud.js` | `initHud()` | Bottom-left timecode + bottom-right slate (§3.4) | Timecode static per section, no ticking |
| `notch-path.js` | `notchPath(w, h, rt, rb)` → SVG `d` string | Exact port of `NotchShape.path` (quad curves, see §5.2) | n/a |
| `island.js` | `class Island` | §5 | §5.8 |
| `cta.js` | `initCtas()` | Island-shaped Download buttons (§3.3) | Static, hover colour only |

### 2.5 Scroll timing summary (desktop / mobile)

| # | id | Pin | Length | Day/Night |
|---|---|---|---|---|
| 1 | `stage` | yes | 520vh / 300vh | Night (inside a paper frame at top) |
| 2 | `takes` | yes | 360vh / 220vh | Day → hard cut Night → Day |
| 3 | `reel` | no | ~130vh | Day |
| 4 | `lighting` | no (sticky stage in a 2-col layout) | ~140vh | Night stage on Day page |
| 5 | `wide` | yes | 220vh / 140vh | Day |
| 6 | `privacy` | no | ~160vh | Day |
| 7 | `commentary` | no | auto | Day |
| 8 | `finale` | short pin | 160vh / 120vh | Day → Iris to Night → Day |

---

## 3. Global elements (architect-owned, in `web/index.html` + `base.css` + `main.js`/lib)

### 3.1 Nav: **the bezel**

- Fixed, `z-nav`, height 56px, full width, `pointer-events:none` except its children. Uses `mix-blend-mode: difference` on the text parts only, so they flip automatically over night and day (`color:#E9EBE6`).
- **Left:** app icon 22px (`/assets/favicon.png` at 2x), then "Claude Meter" in Anybody wdth 80 wght 700 16px. Link to `#top`. Hover: the icon does a 10° tilt and springs back (`--spring-pop`, 500 ms).
- **Centre: the nav island.** A second `Island` instance (`navIsland`, collapsed, `scale:0.9`) anchored to the viewport top edge. **Hidden while `#stage` is pinned** (the stage island occupies that exact spot, see §4.1). It enters when the stage pin ends by springing down from `y:-40` (0.5 s `island`) and leaves the same way when you scroll back into the stage.
  - Left wing (teal): **page %**, meaning reading progress 0–100 through the document (`ScrollTrigger` start 0, end "max"). It follows the app's rules: tint red and bold above 85%.
  - Right wing (lavender): **scene number** as "3/8". Lavender is the weekly colour, and the page's scenes are its "week".
  - Hover (after 200 ms, like the app) or focus+Enter: **peek** to 420pt wide. It shows three rings: "Page" (read %), "Scene" (current scene progress %), "Left" ("resets in" = estimated reading time left, e.g. "resets in 2m", computed from remaining scroll ÷ 1100 px/min). Beneath them: "hits the cap in 1m 40s" (amber, from your scroll speed over the last 10 s) or "on track — resets first" if you're reading slowly. This is the burn-rate forecast, pointed at the page. It's a joke that teaches the feature.
  - Click: **pinned** table of contents. One row per scene: label ("01 Stage", "02 Two takes"…), sparkline (not needed, omit), bar = that scene's progress, % and a "jump" affordance. Rows are real `<a href="#id">` with Lenis `scrollTo`. Esc or outside click collapses. `aria-expanded` is kept in sync.
  - Mobile: tap = pinned table (no peek). Island `scale: 0.8`.
- **Right:** a small island-shaped "Download" button (§3.3, size S) with `href="/ClaudeMeter.dmg"`. Mobile: label "Get it for Mac". It still links to the DMG, and a secondary "Copy link" icon button (clipboard API, toast "Link copied. Open it on your Mac.").
- A skip link, "Skip to download", as the first focusable element, targeting `#finale-cta`.

### 3.2 Cursor: **autofocus brackets** (native cursor always visible)

- A fixed 0×0 element with four 10px L-shaped corner brackets (1.5px stroke, `currentColor`, `mix-blend-mode:difference`, colour `#E9EBE6`).
- At rest: the brackets collapse into a 14×14 square that trails the pointer (`quickTo` 0.35 s `power3`) at 35% opacity. It is a viewfinder, not a blob.
- Over any `[data-focus]` element (buttons, links, island, filmstrip frames, FAQ rows): the brackets **snap to the element's bounding box + 8px** (0.42 s `island`), opacity 1. A 1-frame "focus confirm" follows: the brackets scale 1.06 → 1 over 180 ms, like a camera AF lock. Over the island they take the island's live size each frame while it morphs.
- Over text inputs or selectable body text they hide. Created only for `(hover:hover) and (pointer:fine)` and full motion.
- Keyboard: `:focus-visible` gets a real outline (`2px solid var(--teal); outline-offset:4px`, ink-teal on paper). The brackets are decoration and never replace the outline.

### 3.3 The CTA: **an island that opens**

- The Download button is a black NotchShape (flat top edge, rounded quad corners) drawn with `notchPath()`. **M** size: 264×56, `rt 10`, `rb 22`. **S** size (nav): 150×34.
- Contents at rest: a teal ↓ glyph in a 20px ring (the ring's `stroke-dashoffset` is at 0%), then the label "Download for Mac" in Anybody wdth 90 wght 700 17px `--fg`.
- **Hover/focus:** the shape morphs taller (56 → 84, `island` 0.44 s) exactly like a peek. A second row fades in with the Alcove content recipe (`opacity 0, blur(8px), scaleX(.7)` → rest, 0.3 s, delay 0.05) and reads "Free · v1.2 · macOS 14.4+". The ↓ ring FILLS 0→100% (0.6 s). The key light follows the pointer, and `magnetic()` is applied.
- **Press:** scale .96 (160 ms), then release springs back. After click, the ring stays full and the label rolls to "Downloading…" for 2.5 s via `rollDigits`-style letter roll.
- Under every M CTA, two meta lines (mono 12px, `--ink-2` or `--fg-2`):
  `Free · v1.2 · macOS 14.4+ · Apple Silicon & Intel`
  `Signed & notarized by Apple`
- Placement: hero (`#hero-cta`), reel (`#mid-cta`), finale (`#finale-cta`). Nav has S.
- Reduced motion: no morph. The meta row is always visible under the label (the button is 84 tall at rest).

### 3.4 HUD: **viewfinder**

- Bottom-left, fixed, mono 12px, `mix-blend-mode:difference`: a `● REC` dot (red, 1 s blink, off under reduced motion) + timecode `TC 01:12:40`. Timecode = document scroll progress × 5 h (00:00:00 → 05:00:00), written each frame via ScrollTrigger `onUpdate`. It is the page's session window.
- Bottom-right: slate `SC 02 · TWO TAKES` from the current pinned or visible section's `data-slate`. On change, `scrambleTo()` 0.4 s.
- Hidden below 768px except the timecode (which moves to bottom-centre, 11px). Both are `aria-hidden="true"`.

### 3.5 Intro: **lid open** (≤ 1.1 s, once per session)

- JS-inserted `<div class="intro" aria-hidden="true">` (no JS = no intro). Skipped when `sessionStorage.cm_intro` is set, under reduced motion, or when the page loads with a hash.
- The hero HTML is fully rendered underneath from first paint (LCP = the H1 text).
- Timeline (`gsap.timeline()`), total 1.1 s:
  1. 0.00: full black. A 12px camera lens at top-centre, `y = 16px` (dark `#101014` disc, a 1px ring `#1c1c22`, and a 3px teal-lavender glint at 30% / 30%).
  2. 0.00–0.22: the glint pulses (opacity .3 → 1 → .6).
  3. 0.22–0.52: the lens **stretches into the notch** (width 12 → 185·u, height 12 → 32·u, radius → notch shape; use the island's own collapsed geometry so there is no seam). Wings spring out (`island` ease). Wing numbers `countTo` 0 → 46% (teal) and 0 → 62% (amber).
  4. 0.52–1.10: the black **retracts upward into the bezel**, `clip-path: inset(0 0 0 0)` → `inset(0 0 100% 0)` with `cine`, revealing the stage. The hero H1 `revealLines` starts at 0.62. The intro island is swapped for the real stage island at the same pixel position, with no visible handoff (both are `Island` instances with the same state).
  5. At 1.10: remove the node and set `sessionStorage.cm_intro = 1`.
- Clicking or pressing any key during the intro jumps to the end (`tl.progress(1)`).

### 3.6 Footer (global, after `#finale`)

Paper, `--ink-2`, 14px, two rows, max width `--max`:
- Row 1: app icon 20px + "Claude Meter v1.2" · "Made by Yiftach Freeman" · links: "FAQ" (`#commentary`), "Privacy" (`#privacy`), "Usage on claude.ai" (`https://claude.ai/settings/usage`, `rel="noopener"`), "llms.txt".
- Row 2 (legal, verbatim): **"Independent project. Not affiliated with or endorsed by Anthropic. Claude is a trademark of Anthropic, PBC."**
- The last pixel row of the page shows a 1px teal rule that fills to 100% as you reach the bottom (page-%, FILL).

### 3.7 Semantics, SEO and meta (architect)

- `<header>` (nav), `<main id="top">` with sections as `<section id aria-labelledby>`, `<footer>`. One `<h1>` (hero).
- Title: `Claude Meter — Claude usage limits in your MacBook notch`.
- Meta description: `Free macOS app that turns your MacBook's notch into a live gauge for your Claude session and weekly limits. Hover to peek, click to pin, get a heads-up before you hit the cap.`
- Canonical `https://claudemeter.vercel.app/`. OG + Twitter `summary_large_image` with `/assets/og.png`.
- JSON-LD `SoftwareApplication`: name "Claude Meter", operatingSystem "macOS 14.4 or later", applicationCategory "UtilitiesApplication", softwareVersion "1.2", offers price "0" priceCurrency "USD", downloadUrl `/ClaudeMeter.dmg`, author Person "Yiftach Freeman". Also `FAQPage` generated from the `#commentary` Q&As (keep text identical).
- **OG image** (`web/og.html`, 1200×630): silver paper `#E9EBE6` + grain. Left: "See the wall / *before* you hit it." in `--t-h1` style at 92px. Right top: a black screen corner with the notch and the collapsed island (46% teal / 62% amber), a soft beam below it. Bottom-left mono: `Free · macOS 14.4+ · claudemeter.vercel.app`. Render with headless Chrome at DPR 1.

---

## 4. Sections, in order

Each section owns `web/sections/<id>.html`, `site/css/<id>.css`, `site/js/<id>.js`. Scope all CSS under `#<id>`. Copy below is final: use it verbatim. Curly quotes and the real `—`, `·`, `…` characters.

---

### 4.1 `#stage`: Hero + Dolly-in (the spine). `data-slate="SC 01 · STAGE"`, night

**Layout (desktop, first viewport)**
- The page background is paper. `#stage` holds a **display**: `position:relative; margin: 0 var(--frame) ; height: calc(100svh - var(--frame))`. Its top edge is flush with the viewport top: the notch hangs from the real top of the browser. Background `--night`. Corners: top 0, bottom `--r-screen`. A 1px inner top highlight suggests glass.
- **Notch + stage island** at top-centre, `top:0`, `Island` instance `stageIsland`, `scale: 1` (desktop) `--u:1px`. Starts collapsed: session 46% (teal), right wing = Opus 62% (amber, because the tightest per-model limit is higher than weekly 38%).
- **Beam** (canvas behind everything in the display): a soft volumetric cone from the notch downward, spreading to about 70% of the display width at the bottom. Its colour is a vertical mix of `--beam-a` near the notch, fading to `--beam-b`/`--beam-c`, weighted by the island's live values (teal weight = session%, amber weight = top model%). Overall intensity 0.35 at rest. About 220 dust motes drift slowly upward-sideways inside the cone, brighter where the cone is brighter. The pointer parts the dust (radius 90px repel) and adds a 12% brightness bump under the cursor.
  - Implementation: OGL, one fullscreen Triangle, fragment shader with an analytic cone mask (`smoothstep` on angle from the apex), 3-octave value noise for haze drift, and motes as a hashed grid of soft points (no particle buffers). Render at 0.5× resolution, `dpr = min(devicePixelRatio, 1.5)`. Uniforms: `uTime, uRes, uMouse, uIntensity, uTint[3]`. Pause the rAF when `#stage` is not intersecting or the tab is hidden. Load OGL with `import()` after `requestIdleCallback`. Before it loads, a **CSS fallback** is showing (`conic-gradient` cone with `mask` and blur 40px), and the canvas cross-fades in over 600 ms.
  - Fallback also for: no WebGL, `saveData`, reduced motion (static CSS cone, no motes).
- **Headline block**, bottom-left of the display, padding `var(--gutter)`, colour `--fg`:
  - Eyebrow (mono 12px, `--fg-2`, uppercase): `A free Mac app for Claude Pro & Max`
  - H1 (`--t-h1`, 2 lines):
    `See the wall`
    `<em>before</em> you hit it.` (the `em` is Instrument Serif italic)
  - The word **"wall"** is its own span with `font-stretch` driven live: it stretches wide (wdth 118) when your pointer is on the left of the display and condenses (wdth 64) as the pointer nears the notch, as if pressed against something. `quickTo` on a CSS var, 0.6 s. On touch it breathes 70↔100 on a 6 s loop. (FILL grammar, and a teaser for the takes.)
- **Right column**, bottom-right, max 380px:
  - Lead (`--t-body-l`, `--fg-2` with key phrases in `--fg`): `Claude Meter turns your MacBook’s notch into a live gauge for your Claude limits: the 5‑hour session, the weekly cap, and any per‑model limit. Hover to peek. Click to pin. Stop finding out mid‑task.`
  - M CTA `#hero-cta` (§3.3) + the two meta lines.
- **"Psst" annotation**: to the right of the island, 20px below the notch. A hand-drawn SVG arrow (single path, 1.5px, `--fg-2`) curling up toward the island, and next to it Instrument Serif italic 20px `--fg-2`: `psst — it’s live. hover it.` The arrow draws with DrawSVG 0.8 s after the intro (delay 1.2 s). Every 5 s the arrow nudges 3px toward the island (`--spring-pop`). It hides forever after the first island hover.
- **Attract mode** (until the first user interaction with the island): a loop every 7 s. It holds collapsed for 3 s, then goes to peek via the island's real `setMode('peek')` (with a ghost-hover highlight on the rim) for 3 s, then collapses. During the loop, session ticks up 1 point every 7 s (46 → 52 max, then resets to 46 with a RESET roll). It stops permanently on any pointerenter or focus of the island.
- **Real interactivity**: hover 200 ms → peek; click → pinned; right-click / Shift+F10 / the `⋯` button that appears on focus → context menu (reuse the `lighting` menu? **No**: the stage menu is a minimal version: "Refresh now" (rolls "just now"), "Open usage on claude.ai" (link), "Show percentages" (toggles ticks mode), "Quit" (island shrinks into the notch; 1.2 s later a mono toast says `It’s a website. Click the notch to bring it back.`)). Escape closes.

**Scroll: the dolly-in** (`pinScene(root, {length:"520%", mobileLength:"300%"})`, one scrubbed master timeline, labels per beat). Numbers below are timeline progress (0–1).

| Progress | Camera | Island | Copy (left column, see beat copy) |
|---|---|---|---|
| 0.00–0.10 | **Dolly in.** The display's paper frame closes (`clip-path: inset(0 var(--frame) var(--frame) round 0 0 28px 28px)` → `inset(0 round 0)`) and the display scales 1 → 1.04. The headline block gets **focus-pulled out**: `y:+60, filter: blur(10px), opacity:0` (the lead and CTA leave first, the H1 0.03 later). Beam intensity .35 → .6. The "psst" annotation fades. | The camera wrapper around the island scales 1 → 2.1 (desktop) / 1 → 1.35 (mobile) with `transform-origin: 50% 0` (the island stays hanging from the top edge). Attract mode stops. | none |
| 0.10–0.24 | Hold, with slow drift (scale 2.1 → 2.2). | Collapsed. At 0.17 the display switches **percent → tick bars** (the real `ticks` option: 26×4pt ticks) and back at 0.22, cross-fading with the Alcove recipe. | **Beat 01** in |
| 0.24–0.40 | The camera scale eases to fit peek (2.2 → 1.55; mobile 1.35 → 0.72). | `modeTimeline('collapsed','peek')` morph, then the rings FILL from 0 to 46 / 38 / 62 (DrawSVG on the ring arcs) and the reset lines `scrambleTo` "resets in 2h 13m", "resets Sat 1:05 PM", "resets Sat 1:05 PM". | **Beat 02** |
| 0.40–0.54 | Camera to fit pinned (→ 1.4; mobile → 0.64). | `modeTimeline('peek','pinned')`. Sparklines draw left→right (DrawSVG on the line, fill fades up after it). Bars FILL. The projected tick on the session bar slides in from the fill end to 71%. Header "Max 20x" / "just now 📌" fades in. | **Beat 03** |
| 0.54–0.70 | Slow push (1.4 → 1.5). Beam tint shifts toward amber. | Session 46 → 80 (tween the state; digits written directly while scrubbing). At 0.58 a forecast line appears **under the table** as in the app's pinned footer, amber: `hits the cap in 1h 12m`. At 0.66 it becomes red: `hits the cap in 52m`. The projected tick walks right with the fill and reaches the end. | **Beat 04** |
| 0.70–0.84 | A small handheld drift (±6px, sine, scrubbed, not random). Beam goes warm-red at 20%. | Weekly 38 → 89 (crosses 85 → the bar goes red and the % goes **bold**, and the weekly row label stays white as in the app). Opus 62 → 100 → red bold. The note row appears: red dot + `Opus limit reached · resets Sat 1:05 PM`. | **Beat 05** |
| 0.84–1.00 | **Pull back** (→ scale 1, `y` 0). Beam intensity → .25. The display frame re-opens to paper (`inset` back to `--frame`), preparing the cut to Day. | At 0.86 a **macOS notification** banner arrives top-right of the display (`--spring-pop`, from `x:+120%`): 340×68, radius 16, frosted dark glass (`rgba(30,30,32,.72)` + blur 30), app icon 32px, title `Session at 80%` (SF semibold 13), body `80% used · resets in 1h 5m` (SF 13 `--fg-2`), "now" at the right. At 0.93 the island collapses (collapse morph); wings read 80% (teal) and 100% (red, bold). | **Beat 06** |

At the end of the pin, the `navIsland` springs in (§3.1) and the stage island stays at the top of the scrolled-away display.

**Beat copy** (left column over the display, x = gutter, vertically centred; each beat: mono index `01 / 06` in `--fg-2`, `h3` title in `--t-h3` `--fg`, one paragraph `--t-body` `--fg-2`, max 30ch. Beats cross-fade: out `y:-24, opacity 0, blur 6px`, in `y:24→0`, `cine`, staggered title → body 0.06):

- **01 · Collapsed**. *Two numbers, hugging the camera.* "Left: your 5‑hour session. Right: your weekly limit, or whichever model limit is tighter, in amber. Percentages or tick bars. Your call."
- **02 · Peek**. *Hover. Don’t click.* "Rest the pointer on the notch for a beat and it opens: three rings, and exactly when each one resets."
- **03 · Pinned**. *Click, and it stays.* "Six hours of history per limit, a bar for each, a tick for where your session is heading, and every reset time. Your plan’s up in the corner."
- **04 · Forecast**. *It does the maths on your pace.* "Burning fast? It tells you when you’ll hit the session cap: amber when it’s coming, red when it’s under an hour. Ease off and it says “on track — resets first.”"
- **05 · Over 85%**. *Red, and bold.* "Past 85% a number turns red and heavier, so it reads even if red and green look alike to you. Hit 100% and it tells you when you’re back."
- **06 · Nudges**. *Optional nudges.* "Switch on notifications and it taps you at 50, 80 and 95% of a session, at 80 and 95% of weekly and model limits, and when a tight window resets."

On the right side of the display during beats, one **live inline chip** trails the caption, in the Hoy manner: a tiny mono pill echoing the current state (`● 46%` → `● 80%`) coloured by the metric. It FILLS in sync.

**Mobile (<768px)**
- The display fills the width minus 8px margins, `100svh`. The H1 at 52px sits top-left under the notch area (padding-top 96px). Lead + CTA at the bottom. The "wall" wdth breathes on a loop.
- Pin length 300vh. The caption sits **below** the island in the lower half (no left column), with the island camera scales listed above so pinned (560pt) fits `100vw - 24px`. Tapping the island during the pin does nothing (scroll drives it). After the pin, the island is interactive.
- Beam at 0.5× res, 90 motes, or the CSS fallback if `navigator.hardwareConcurrency <= 4`.

**Reduced motion**
- No pin, no dolly, no attract loop, static CSS beam, no motes. The hero renders as designed. Below it, the six beats render as a vertical list. Each beat is a static `Island` rendered in that beat's final state (collapsed / peek / pinned / pinned+forecast / pinned+limit / collapsed + a static notification card), with its caption beside it (desktop 2-col, mobile stacked). The hero island stays interactive with instant state changes.

---

### 4.2 `#takes`: The Wall, in two takes. `data-slate="SC 02 · TWO TAKES"`, day, with one night cut

**Idea:** the same coding session, shot twice. Take 1 you find out when it stops. Take 2 you see it coming. A clapperboard separates them. This is the site's first HIT.

**Layout (desktop)**
- Pinned (`length:"360%"`, mobile `220%`). Paper background.
- **Left 58%: the "monitor"**. A macOS terminal window (radius 12, `#0E0F0E` body, 28px title bar `#1A1B1A` with three dots `#FF5F57 #FEBC2E #28C840` at 12px, title `~/shop — zsh` in SF 12 `--fg-2`). The body is mono 15px `--fg`, 22px line height, padding 20px, 14 visible lines. **Above** the window sits a 36px black bezel strip with a notch at its centre. In Take 2 the notch shows a mini `Island` (`scale:.8`). In Take 1 the notch is **empty black**.
- **Right 42%: the slate column**. Top: the scene slate (§ clapper below). Middle: the headline (`--t-h2`, changes per take). Bottom: the giant word **WALL** in `--t-mega`, right-aligned, bleeding off the right edge by 4%, ink.
- The HUD timecode is overridden during this pin to show the **fictional session clock** `10:04` → `14:52` (mono, top-right of the terminal title bar too).

**Terminal script** (illustrative; not Claude Code's UI, no spark, no product name). Lines appear by progress (each line `scrambleTo` its text over 0.25 of its slot, then settles):

```
$ claude
> add retries to the payment webhooks and backfill the failed ones
  · reading src/webhooks/payments.ts
  · reading src/queue/retry.ts
  · editing 4 files
  · running tests — 38 passed
  · writing migration 0042_retry_queue.sql
  · backfilling 1,204 failed events… 312 / 1,204
  · backfilling 1,204 failed events… 768 / 1,204
```

**Scrubbed timeline**

| Progress | What happens |
|---|---|
| 0.00–0.07 | **Slate TAKE 1.** The clapperboard (a 300×190 black board; top stick with diagonal black/white stripes, 45°, 18px bands; board text in mono white: `CLAUDE METER` / `SCENE 02` · `TAKE 1` / `ROLL 10:04`) enters from `y:-40`. The stick is open at -24° and **claps** to 0° (`clap` ease, 0.12 of the slot). On the clap the monitor gets a 2px, 80 ms shake and the timecode starts. |
| 0.07–0.40 | Lines type in, time runs 10:04 → 14:40, **"WALL" condenses** from wdth 150 → 58 as progress approaches the hit (FILL: the letters are pressed together by an invisible meter). Right headline (Take 1): `Take 1: you find out when it stops.` (serif italic on `when it stops`). |
| 0.40–0.44 | **HIT.** A hard cut: the whole pinned section flips to `--night` over `--d-cut` (60 ms). Use a **step** in the scrubbed timeline (`ease:"steps(1)"`), not a fade. `html[data-night]` turns on. The terminal prints in red bold: `✕ usage limit reached · resets 3:00 PM`. The last backfill line's characters **drop** 40px with gravity (`power2.in`, stagger .01, from the end) and fade. "WALL" is now at wdth 50 in `--red`. The headline swaps to: `Mid-task. Mid-thought. Back at 3.` |
| 0.44–0.52 | **Rewind.** The terminal lines scramble backwards (`scrambleTo` to empty, reverse order), the time spins back 14:52 → 10:04 (`countTo` on minutes, with a 2px vertical scanline sweeping up), night → day (cut back, step), and WALL springs back out to wdth 150 in ink. |
| 0.52–0.58 | **Slate TAKE 2.** Same clapper, with `TAKE 2` written in by ScrambleText before the clap. On the clap, the mini island **springs out of the notch** above the terminal (0 → collapsed, `island` ease). Session 22% teal, right wing Opus 30% amber. |
| 0.58–0.95 | The same lines type again. The island session fills with the typing (22 → 71 → 80 → 84). At 0.70 (71%), the island **auto-peeks** (the camera nudges 1.08×, the terminal dims to 60%). Under the session ring, in amber: `hits the cap in 1h 12m`. A hand-drawn DrawSVG arrow from the forecast to a margin note in Instrument Serif italic 22px, ink: `commit. wrap up. pick a smaller task.` At 0.78 the terminal shows the user's next line: `> commit this and stop after the backfill`, then `· committed 3f9e21c — “webhook retries + backfill”`. At 0.86 the burn slows, and the forecast rolls to `on track — resets first` (`--fg-2`). The island collapses. Headline (Take 2): `Take 2: same session. <em>You saw it coming.</em>`. WALL stays wide and never condenses in Take 2: it drifts from wdth 150 to 140 and stays ink. |
| 0.95–1.00 | Hold, and the WALL letters get a DrawSVG hand-drawn strike-through in `--teal-ink` (the wall is crossed out). |

**Mobile:** the monitor is full-width on top (12 visible lines, 13px mono), the headline below, WALL under that at `--t-h2` size. The clapper is 220×140, top-right, overlapping the monitor corner. Pin 220vh.

**Reduced motion:** no pin. Two static stacked panels labelled `TAKE 1` and `TAKE 2`, each with its final terminal state and headline. Take 1's panel is night with the red line; Take 2 shows the island peeking with the forecast and the note. WALL is static at wdth 58 (Take 1) and 150 with the strike (Take 2).

---

### 4.3 `#reel`: The Reel + mid CTA. `data-slate="SC 03 · THE REEL"`, day

**Idea:** a loop of film. Every frame is a real state of the island. The client asked for loops and marquees; this is ours.

**Layout**
- **Strip A:** a 35mm filmstrip band, 100vw, rotated -3.5°, height 240px (mobile 170px). Base `--night`. Sprocket holes are 14×10 rounded rects every 28px along the top and bottom 14px margins (a CSS `repeating-linear-gradient` masked with `radial-gradient`). Frames are 300×180 (mobile 210×126), 20px gaps, each a mini night "screen" with a notch at top and a static `Island` (`interactive:false`) in a different state. Beneath each frame, mono 11px `--fg-2` edge-code text (like film edge markings): `CM-01 ▸ COLLAPSED 46% · 62%`.
  Frames (8, faithful states):
  1. `COLLAPSED · PERCENT` (46% teal / 62% amber)
  2. `COLLAPSED · TICKS` (tick bars)
  3. `PEEK · RINGS` (46 / 38 / 62)
  4. `PINNED · MAX 20X`
  5. `FORECAST · 1H 12M` (peek, amber line)
  6. `LIMIT · OPUS 100%` (pinned with red note)
  7. `NO NOTCH · PILL` (external-display pill at top-centre, no notch cut-out)
  8. `FIRST LAUNCH` (pinned-welcome: the hint line `Hover to peek · click to pin · right-click for settings & Quit`)
  Scrolls left at 45 px/s with `marquee(..., {velocity:true})`. **Hover a frame**: the strip pauses, the frame scales 1.06 (`--spring-pop`), and its island plays one morph to its next state and back (tactile). Focusable frames (`tabindex=0`, `aria-label` = the edge code) do the same on focus.
- **Strip B:** below A, rotated +2°, overlapping by 40px, a mono ticker (paper-2 background, `--t-mono-l`, ink) moving right at 70 px/s. It carries real strings from the app, separated by a coloured `●`:
  `resets in 2h 13m ● hits the cap in 1h 12m ● on track — resets first ● Session at 80% ● 80% used · resets in 1h 5m ● Weekly limit at 95% ● Opus limit reached · resets Sat 1:05 PM ● Session reset — Your 5-hour window is back to full. ● just now ● Max 20x ●`
  Dots cycle teal / lavender / amber / red.
- **Mid CTA block** (below the strips, left-aligned grid, 7/5 columns):
  - H2: `Costs nothing.` / `Takes up <em>no room.</em>`
  - Body: `The notch is already there, doing nothing but holding a camera. Claude Meter moves into the space around it. No Dock icon, no window to lose, no account to make.`
  - M CTA `#mid-cta` + meta lines.
  - Right column: the app icon (`/assets/icon-512.png`, 220px) floating with a 6 s ±6px bob and a 2° tilt that follows the pointer (`quickTo`, max 8°). Under it, mono: `v1.2 · Liquid Glass icon`.

**Motion:** the strips enter with a slight counter-parallax (A moves `x:-6%`, B `x:+6%` across the section scroll, scrubbed, on top of the loops). The H2 uses `revealLines`.

**Mobile:** strips at the sizes above, the CTA block stacks, the icon is 140px and sits above the H2.

**Reduced motion:** strips static (first 3 frames visible, `overflow-x:auto` with scroll-snap so they're still browsable; the ticker is static text wrapping on 2 lines). No bob, no tilt.

---

### 4.4 `#lighting`: Lighting test (appearance + right-click menu). `data-slate="SC 04 · LIGHTING"`, night stage on day

**Layout (desktop):** two columns, 5/7.
- **Left (sticky text, paper):**
  - Mono eyebrow `LIGHTING TEST`
  - H2: `Solid, Frosted,` / `or <em>Liquid Glass.</em>`
  - Body: `Three finishes, all dark enough to melt into the camera housing. Frosted and Liquid Glass let your windows glow through as they slide past. The notch never turns grey.`
  - A **segmented control** (real `role="radiogroup"`, 3 `role="radio"` buttons, arrow-key navigation): `Solid · Frosted · Liquid Glass`. A black pill with a sliding lavender-tinted indicator (Flip, 0.44 s `island`).
  - Below it, a second line of copy: `Right‑click the island for everything else. Yes, including Quit.` plus a small mono key hint: `right‑click · ⇧F10 · or ⋯`.
- **Right (the set):** a 16:10 night "screen" (radius 22, `--night`), with a notch at top-centre and an `Island` pinned (session 46, weekly 38, Opus 62, forecast off). The **wallpaper** is a slow CSS gradient field: two large blurred radial blobs (`#2C4A7A`, `#6B3F6E`, 60% opacity, `filter:blur(60px)`) drifting on a 14 s loop. Honest note: this is the one place gradient blobs are allowed, because they are the desktop *behind* the glass, and the point is to show them glowing through. Two **fake windows** (glassy light rectangles `rgba(236,237,232,.9)` with a title bar and a few grey lines) slide horizontally *behind the island* on a 9 s ping-pong loop, so Frosted/Glass visibly shift.
  - **Key light**: the pointer over the set moves a specular highlight along the island's rim and top edge (§1.5). The whole set tilts ±3° (`rotateX/rotateY`, perspective 1400px, `quickTo` 0.6 s).
  - Switching appearance cross-fades the island materials over 0.35 s. On Liquid Glass (Chromium), the displacement filter is on. The label under the set reads the current mode in mono: `APPEARANCE ▸ LIQUID GLASS`.
- **The right-click menu** (opens on the set island via contextmenu, Shift+F10, ContextMenu key, or the `⋯` button that appears on hover/focus at the island's right). A faithful macOS menu: 260px, radius 10, `rgba(40,40,42,.82)` + `backdrop-filter: blur(30px) saturate(1.6)`, 1px `rgba(255,255,255,.12)` border, SF 13px `--fg`, 22px rows, 5px padding, separators `rgba(255,255,255,.1)`. `role="menu"`, arrow keys, Enter, Esc. Items:
  1. `Session 46% · resets in 2h 13m` (disabled row, teal dot)
  2. `Weekly 38% · resets Sat 1:05 PM` (disabled, lavender dot)
  3. `Opus 62% · resets Sat 1:05 PM` (disabled, amber dot)
  4. separator
  5. `Refresh now`: the island header rolls `just now` and the numbers do a tiny `rollDigits` shuffle (same values).
  6. `Open usage on claude.ai`: real link, new tab.
  7. separator
  8. `Appearance ▸` with a submenu `Solid / Frosted / Liquid Glass` (checkmark on current; synced with the segmented control).
  9. `Show percentages` ✓: toggles collapsed display ticks/percent (the island collapses to show it, then re-pins after 1.6 s).
  10. `Burn-rate estimates` ✓ (off → on): shows the forecast line `hits the cap in 1h 12m`.
  11. `Usage notifications`: toggling on drops a macOS banner into the set: `Session at 50%` / `50% used · resets in 2h 13m`. Honest about opt-in: the item starts unchecked.
  12. `Menu bar item`: toggles a tiny menu bar strip at the top-right of the set showing `46%  38%` (teal + lavender, SF 11 medium, as the real status item).
  13. `Launch at login` (toggle checkmark only)
  14. separator
  15. `About Claude Meter`: a small About card: icon 64px, `Claude Meter`, `Version 1.2`, `Made by Yiftach Freeman`.
  16. `Quit Claude Meter`: the island shrinks into the notch (0.4 s), then 1.2 s later a mono toast in the set: `Quit. It’s a website, though. Click the notch to bring it back.`
  - The menu opens with scale .96 → 1 + opacity from the pointer origin, 140 ms `settle`, like macOS.

**Mobile:** the set goes on top (full width, 4:3), then the text and control. A long-press (500 ms) on the island opens the menu; the `⋯` button is always visible. Tilt and key light are off.

**Reduced motion:** wallpaper blobs static, windows static (placed half behind the island), no tilt, instant menu.

---

### 4.5 `#wide`: The wide shot (any display). `data-slate="SC 05 · WIDE"`, day

**Idea:** the camera pulls all the way back. The island isn't only for the notch.

**Layout + scrubbed timeline** (`pinScene`, 220% / 140%):
- The set is drawn in simple, crisp CSS/SVG: no photos, no 3D. **MacBook**: a black-bezel screen (radius 14 top), a notch, a thin aluminium base line (`#BFC3BB` 6px, radius 0 0 12 12), a lighter night screen inside (`#111`) with a 22px menu bar. **External display**: a 16:9 black-bezel screen with no notch, a stand (`#BFC3BB`), and a menu bar.

| Progress | What happens |
|---|---|
| 0.00–0.25 | **Start tight** on the MacBook's notch (the set scaled 3.2×, origin at the notch): collapsed island 46% / 38% (lavender, since weekly is the right-wing metric now, no model is tighter). |
| 0.25–0.55 | **Pull back** (scale 3.2 → 1, `cine`). The external display slides in from the right (`x:+30%`, 0.2 later). The headline reveals. |
| 0.55–0.75 | On the external display, a **compact pill** springs out at top-centre (a small black capsule, 150×24, `46% · 38%`), since there's no notch there. In its menu bar, the **menu bar item** `46%  38%` fades in (SF 11 medium, teal + lavender, exactly as `StatusItem`). A DrawSVG leader line connects the pill to a caption: `No notch? A compact pill at the top, plus an optional menu bar item.` |
| 0.75–0.90 | A fullscreen video/app window scales up on the MacBook to cover the screen (a dark rect, 0.3 s), and the island **hides** (scale-y into the notch). A caption appears: `Goes out of the way in fullscreen apps.` Then the window shrinks and the island returns. |
| 0.90–1.00 | Three kinetic fact lines stagger in under the set (see below). |

- **Headline** (top-left, `--t-h2`): `Plugged into a monitor?` / `<em>It comes along.</em>`
- **Fact lines** (mono 13 uppercase label + `--t-h3` value, 3 columns, separated by `--rule`):
  - `DOCK` / `No Dock icon.`
  - `REFRESH` / `Every 5 minutes, and whenever you hover.`
  - `FIRST RUN` / `Opens pinned, with a one-line how-to.`
  Each value's last word gets a tiny `FILL` underline (2px teal-ink line that draws on reveal).

**Mobile:** the MacBook only, then the external display stacked below it (no side-by-side). Pin 140vh, with the tight→wide pull on the MacBook only; the external display's pill/menu-bar animate on enter (not scrubbed).

**Reduced motion:** no pin, the final wide composition (both displays, pill, menu bar item, captions), static.

---

### 4.6 `#privacy`: Reads. Never writes. `data-slate="SC 06 · PRIVACY"`, day

**Layout**
- A giant two-line headline spanning the width (`--t-mega`, but wdth 70):
  `Reads.`
  `<em>Never writes.</em>` (serif italic, `--t-mega` × 0.92)
  On scroll-in, "Reads." reveals by chars. "Never writes." reveals by lines, with a DrawSVG **hand-drawn circle** looping around "Never" in `--red-ink` (0.9 s, delay 0.3).
- **Lead** (`--t-body-l`, max 46ch): `Claude Meter uses the sign‑in Claude Code already saved on your Mac. It reads it from the macOS Keychain (or ~/.claude/.credentials.json) and never changes it. Short‑lived tokens get refreshed in memory, never written back.`
- **The route map** (the set piece): an SVG diagram, 1200×420 viewBox, ink on paper.
  - A left node: a small MacBook glyph labelled `Your Mac`.
  - Three curved paths (DrawSVG on scroll, stagger .2) to three right nodes, each a mono label with a plain-English line under it:
    - `api.anthropic.com`, "your usage numbers"
    - `platform.claude.com`, "token refresh"
    - `claudemeter.vercel.app/version.json`, "is there an update? once a day"
  - Along each path, a small dot (teal / lavender / amber) travels Mac → host → Mac in a loop (`motionPath` isn't needed: animate `stroke-dashoffset` of a 4px dash on a duplicate path, 3.2 s, staggered). This loop stops under reduced motion.
  - A fourth path heads toward a node labelled `anyone else`. It **stops short**, and the node is struck through with a hand-drawn red line (DrawSVG). The label under it: `nobody. that’s the list.`
- **Zero counters row** (4 columns, `--t-h2` numbers counting on enter with `countTo`, then mono labels):
  `0` `analytics` · `0` `accounts` · `0` `servers of ours` · `3` `hosts, total`
- Small print (`--ink-2`, 15px): `Works with Claude Pro and Max sign‑ins from Claude Code. API‑key (Console) logins and a custom CLAUDE_CONFIG_DIR aren’t supported.`

**Mobile:** the route map becomes vertical (Mac at the top, hosts stacked below, paths going down). Counters are 2×2.

**Reduced motion:** paths fully drawn, no travelling dots, counters show final values, the circle and strike are pre-drawn.

---

### 4.7 `#commentary`: Director's commentary (FAQ). `data-slate="SC 07 · COMMENTARY"`, day

**Layout**
- Left (sticky, 4 cols): mono `DIRECTOR’S COMMENTARY`, H2 `Questions,` / `<em>answered straight.</em>`, and a note: `Ten things people ask before they download.`
- Right (8 cols): a list of native `<details>` rows, no cards. Each row has a top rule (`--rule`), 28px vertical padding, a summary in `--t-h3` (wdth 85) ink, and on the far left a mono track number `TRK 01`. On the far right, a 24px icon: a tiny collapsed island that **morphs to a peek shape** when open (the notch-path morph, 0.44 s). Answers are `--t-body` `--ink-2`, max 60ch. Opening animates height via `interpolate-size: allow-keywords` + `::details-content` transition where supported (0.4 s `settle`), and instantly elsewhere.
- Hover a row: the track number scrambles once and the row background tints `--paper-2` (200 ms).

**Q&As (final; also used for the FAQPage JSON-LD):**
1. **Is it actually free?** Yes. No trial, no account, no catch. It’s signed with an Apple Developer ID and notarized by Apple, so macOS opens it without a fight.
2. **Which Claude plans work?** Claude Pro and Max, as long as you’re signed in to Claude Code on the same Mac. API‑key (Console) logins aren’t supported, and neither is a custom CLAUDE_CONFIG_DIR.
3. **What does it do with my sign‑in?** It reads the credentials Claude Code already saved (macOS Keychain first, then ~/.claude/.credentials.json) and never writes to them. When a short‑lived token needs refreshing, the new one lives in memory only.
4. **Who does it talk to?** Three places: api.anthropic.com for your usage, platform.claude.com to refresh a token, and this site’s /version.json once a day to check for updates. No analytics, no account, no server of ours.
5. **How fresh are the numbers?** It refreshes every 5 minutes, and again when you hover. Never more often than every 3 minutes, because the usage endpoint rate‑limits.
6. **What does “hits the cap in 1h 12m” mean?** It’s the burn‑rate forecast for your 5‑hour session. At your recent pace, that’s when you’d hit 100%. Amber means it’s coming, red means it’s under an hour. If you’ll make it to the reset, it says “on track — resets first.”
7. **Will it nag me?** Only if you ask it to. Notifications are off until you turn them on. Then you get a heads‑up at 50, 80 and 95% of a session, 80 and 95% of weekly and per‑model limits, and a “back to full” when a tight window resets.
8. **My Mac doesn’t have a notch.** It shows a compact pill at the top centre of the screen instead, and you can add a menu bar item. It also works on external displays and gets out of the way in fullscreen apps.
9. **Where’s the Quit button?** There’s no Dock icon, so right‑click the island: settings, appearance, launch at login and Quit all live there. Requirements, for the record: macOS 14.4 or later, Apple Silicon or Intel.
10. **Is this made by Anthropic?** No. It’s an independent project by Yiftach Freeman, not affiliated with or endorsed by Anthropic.


**Mobile:** single column, the sticky header becomes static.

**Reduced motion:** no height animation, no scramble.

---

### 4.8 `#finale`: Hit → Iris → Reset. `data-slate="SC 08 · RESET"`, day → night → day

**Idea:** the page's own session hits 100%. The frame irises closed into the camera lens, then opens on a fresh window.

**Layout**
- Short pin (`160%` / `120%`). Paper.
- The giant wordmark `Claude Meter` (`--t-mega`, wdth 62, wght 820, one line on desktop, two on mobile), centred. It is **filled like a meter**: the text is `color: transparent; -webkit-text-stroke: 1.5px var(--ink)` and a `background: linear-gradient(90deg, var(--teal) 0 var(--fill), transparent var(--fill))` clipped to text. `--fill` is scrubbed 0 → 100% across the first 70% of the pin. As `--fill` passes 70% the fill colour tweens to amber, and past 85% to `--red`, with `font-weight` → 900 (the app's bold rule, via `font-variation-settings`).
- The nav island's page-% (which reads real scroll) reaches 100% at the same moment, red and bold.
- Above the wordmark, mono: `SESSION 100% · THIS PAGE`.

**The HIT → IRIS → RESET sequence.** It is a **timed** timeline (not scrubbed), played once when the scrub reaches 0.72 (`onUpdate` threshold), and reset when progress goes back below 0.6:
1. 0.00–0.12 s **HIT**: the wordmark gets a 120 ms micro-shake (x ±4px, 3 cycles). The nav island does the same.
2. 0.12–0.62 s **IRIS CLOSE**: a full-viewport night overlay `#iris` (fixed, `z-intro`), `clip-path: circle(150% at 50% 16px)` → `circle(6px at 50% 16px)`, `cine`. It closes onto **the camera position of the nav island's notch** (top-centre). `html[data-night]` turns on.
3. 0.62–0.95 s: hold on black with only the lens (the same 12px lens as the intro, glint pulsing once). Mono text fades in at the centre: `resetting…` (the app's own string for a window at its reset moment).
4. 0.95–1.55 s **IRIS OPEN** (`circle(6px)` → `circle(150%)`, `cine`). It reveals the page with the wordmark **reset to 0%**: the fill springs back to 0 (0.6 s `island`, from the right), the stroke returns to ink, and the weight is back to 820. The nav island's page-% rolls to `0%`. The HUD timecode rolls to `00:00:00`.
5. 1.20 s: a macOS notification banner drops in top-right (same component as the stage), with the app's real copy: title `Session reset`, body `Your 5-hour window is back to full.`
6. 1.40 s: the headline under the wordmark reveals by lines:
   H2: `Fresh window.` / `<em>Spend it well.</em>`
   Then the M CTA `#finale-cta` + meta lines, and one short line: `Download, drag to Applications, open. Hover the notch.`

After the sequence, the nav island page-% continues from 0 relative to a new baseline (the remaining scroll), a gentle joke that the "session" restarted. While `#finale` remains in view, idle loop: every 12 s the wordmark fill breathes 0 → 6% → 0 in teal.

**Mobile:** same, with the wordmark on two lines and the iris centred at the top-centre of the viewport. Pin 120vh.

**Reduced motion:** no pin, no iris. The wordmark is shown fully filled in teal with a static caption `SESSION RESET`. H2, CTA and the notification card render statically.

---

## 5. The shared ISLAND component (`site/js/lib/island.js`, architect-owned)

The most important code on the site. It must look like the screenshots in `scratchpad/snaps2/` and follow `Theme.swift` / `IslandView.swift`.

### 5.1 API

```js
import { Island } from "./lib/island.js";

const isl = new Island(container, {
  mode: "collapsed",            // "collapsed" | "peek" | "pinned" | "hidden"
  display: "percent",           // "percent" | "ticks" (collapsed wings only)
  appearance: "solid",          // "solid" | "frosted" | "glass"
  notch: true,                  // false => external-display pill (no camera cut-out; frame starts at top with edge padding)
  scale: 1,                     // px per pt; sets --u
  interactive: true,            // hover 200ms → peek, click → pinned/unpin, Esc → collapse, keyboard Enter/Space, contextmenu event
  forecast: true,               // "Burn-rate estimates"
  plan: "Max 20x",
  updated: "just now",
  welcome: false,               // first-launch hint row
  reducedMotion: ctx.reduced,
  data: {
    session: { pct: 46, resetsIn: 7980, history: null /* auto-generate 6h series ending at pct */, projected: 71, forecast: { kind: "exhausts", inSec: 4320 } },
    weekly:  { pct: 38, resetsLabel: "resets Sat 1:05 PM" },
    models:  [{ key: "opus", label: "Opus", pct: 62, resetsLabel: "resets Sat 1:05 PM" }],
  },
});

isl.setMode("peek", { immediate = false });        // interactive spring morph; returns a Promise
isl.modeTimeline(from, to) → gsap.core.Timeline     // PAUSED, linear-time, for scrubbing inside a scene timeline
isl.update(patch, { roll = true, duration = 0.5 }); // deep-merge data; animates rings/bars (0.5s smooth, like the app), rolls digits unless roll:false
isl.state                                           // live plain object; scenes may gsap.to(isl.state.session, {pct:80, onUpdate: () => isl.render()})
isl.render()                                        // sync DOM from state (cheap; no layout reads)
isl.setAppearance("glass"); isl.setDisplay("ticks"); isl.setForecast(bool);
isl.notify({ title, body })                         // optional helper: emits "notify" event; banner component is separate (lib/banner.js)
isl.on("mode" | "contextmenu" | "interact", fn); isl.destroy();
isl.el                                              // root element (for Flip / focus brackets)
```

Derived rules (put them in one `derive(state)` function and test it; this is logic, so it gets a check, see §7):
- **Right wing metric** = the per-model limit with the highest pct if it is **greater than** weekly pct (colour amber), else weekly (colour lavender). Its label is the model's label.
- **Tint**: `pct > 85` → red + bold weight (700 for values that are normally 600, 600 for normally 400). Otherwise the metric colour.
- **Forecast text** (session only, when `forecast` is on): `exhausts` → `hits the cap in ${fmt(inSec)}`, amber if `inSec ≥ 3600`, else red. `clears` → `on track — resets first` in `--fg-2`. `idle` → none.
- `fmt(sec)`: `h > 0 ? "${h}h ${m}m" : "${m}m"` (Format.duration). The reset label is `resets in ${fmt}` if under 48 h, else `resets Sat 1:05 PM` style (pass `resetsLabel` directly).
- **Limit note** (pinned and peek): if any metric is ≥ 100, the red row `● ${Label} limit reached · ${resetsLabel without "resets "} → "Opus limit reached · resets Sat 1:05 PM"`. Session → `Session limit reached · resets in 1h 5m`. Weekly → `Weekly limit reached · resets Sat 1:05 PM`.
- The `aria-label` is kept in sync like the app's `collapsedLabel`: `Claude usage, session 46 percent, Opus 62 percent`.
- `resetsIn` counts down in real time (a minute ticker shared by all instances; paused when hidden). The stage/takes scenes may freeze it with `live:false`.

### 5.2 Geometry (pt; multiply by `--u`)

- Physical notch: **185 × 32**. The shape path is the exact port of `NotchShape`:
  ```js
  export const notchPath = (w, h, rt, rb) =>
    `M0 0Q${rt} 0 ${rt} ${rt}L${rt} ${h-rb}Q${rt} ${h} ${rt+rb} ${h}L${w-rt-rb} ${h}Q${w-rt} ${h} ${w-rt} ${h-rb}L${w-rt} ${rt}Q${w-rt} 0 ${w} 0Z`;
  ```
- **Collapsed**: `rt 6, rb 14`. Height 32. Width = notchWidth + 2·wing (IslandView line 64), wing = 46 (percent) / 40 (ticks), so 277 in percent mode and 265 in ticks on a 185pt notch. Each metric is centred in its lane = wing − rt (between the side wall at `rt` and the notch edge), so margins stay symmetric.
  - Wing text: SF 13pt semibold (`Theme.Step.value`), `tabular-nums`, metric colour, bold if >85.
  - Ticks mode: a single 26×4pt bar per wing (`Theme.tick`) with rounded ends: track `--track`, fill = pct, metric colour.
- **Peek**: width **max(500, notch + 240)** = 500, `rt 19, rb 24`. Content inset = `rt + gutter(20)` each side. Top padding: the notch height (32) + `row` (8).
  - Header row: at `y = 10`, the plan `Max 20x` left (SF 11 regular `--fg-2`) and `just now` right (same), vertically centred on the notch band, outside the notch cut-out.
  - Rings: three equal columns. Ring 54pt, stroke 5, track `--track`, round cap, starting at 12 o'clock clockwise. Value centred inside the ring in SF 15pt semibold (`ring` step), `--fg`, red+bold if >85 (the ring stroke goes red too). If `projected` exists (session), draw a second arc from pct → projected in the metric colour at 35% opacity.
  - Under each ring: label SF 13 semibold `--fg` (`Session`, `Weekly`, model label), 4pt gap, `resets in 2h 13m` SF 11 `--fg-2`, then the forecast line (session only) SF 11 semibold in the forecast colour.
  - Optional limit note row: `group` (16) above it, left-aligned at the content inset. A 6pt red dot + SF 13 semibold `--red`.
  - Bottom padding 16. Height is content-driven (~176pt without the note, ~200 with it).
- **Pinned**: width **560**, `rt 19, rb 24`.
  - Header as in peek, plus a `pin.fill` glyph (a small SVG pin, 8pt) after `just now`.
  - Table rows (`row` 8pt apart, 30pt row pitch), columns with 12pt gaps: label (SF 13 `--fg`, 80pt) · sparkline 44×14 (area fill metric colour at 25% + 1pt line in the metric colour) · bar (flex; 6pt tall, radius 3, track `--track`, fill metric colour, red if >85; for session a 2×10pt projected tick at `projected%` in the metric colour) · pct (SF 13 semibold right-aligned, 44pt, red+bold >85) · reset label (SF 11 `--fg-2`, right-aligned, 120pt).
  - Footer: the forecast line if any (SF 11 semibold), then the limit note if any. Bottom 16.
- **Welcome** (first launch): pinned, plus a centred row under the table: `Hover to peek · click to pin · right-click for settings & Quit` in SF 11 `--fg-2`.
- **No notch / pill**: no camera cut-out. Collapsed becomes a 12pt-radius capsule `wing·2 + 40` wide, 24 tall, metrics separated by a 1pt `--track` divider, detached 6pt from the top edge. Expanded modes keep their widths, with top padding `edge` (12) instead of the notch height.
- **Camera housing**: the island draws a pure black 185×32 rect with 10pt bottom radius at the top centre, under the content. It is the same black as Solid, so it disappears into it; under Frosted/Glass it stays pure black, reading as hardware.

### 5.3 DOM structure

```html
<div class="island" data-mode="collapsed" data-appearance="solid" data-display="percent" style="--u:1px">
  <button class="island__hit" aria-expanded="false" aria-label="Claude usage, session 46 percent, Opus 62 percent" data-focus></button> <!-- full-size transparent hit area; keyboard + pointer -->
  <svg class="island__shape" aria-hidden="true"><defs>rim gradient, liquid filter</defs><path class="fill"/><path class="rim"/></svg>
  <div class="island__housing" aria-hidden="true"></div>
  <div class="island__wings" aria-hidden="true"><span class="wing wing--l">46%</span><span class="wing wing--r">62%</span></div>
  <div class="island__peek" aria-hidden="true">…rings…</div>
  <div class="island__pinned" role="table" aria-label="Claude usage limits">…rows…</div>
  <div class="island__keylight" aria-hidden="true"></div>
</div>
```
- The expanded contents stay in the DOM and are toggled with `inert` + `visibility` when not active, so screen readers get the pinned table only when it's open.
- **Morph**: animate `this.geo = {w, h, rt, rb}` with GSAP; `onUpdate` sets the SVG `viewBox`, the path `d` and the root `width/height` (the root is `position:absolute`, anchored at top-centre with `translateX(-50%)`, so width changes don't reflow siblings; the island's parent reserves the collapsed size only). Content layers cross-fade with the Alcove recipe: enter `opacity 0, filter blur(10px), scaleX(.6)` → rest (0.3 s, delay 0.06); leave `opacity 0, blur(4px), scaleX(.25)` (0.22 s). Transform origin is top-centre.
- `modeTimeline()` is the same tweens on a paused timeline, with `ease:"none"` on geometry wrapped in the `island` ease via `CustomEase.getEaseFunction`, so scrubbing feels springy but reversible.
- The shadow layer is a separate blurred black rounded rect under the shape, whose opacity/scale follows the mode (never animate `filter` on the shape itself).

### 5.4 Interactions (when `interactive`)

- Pointer enters and stays 200 ms → `peek`. Leave (and not pinned) → collapse after 120 ms grace.
- Click / Enter / Space → toggle `pinned` (from any mode). Esc → collapse. Clicking outside while pinned → collapse.
- Hover scale: 1.03 on the whole island while collapsed (250/14-ish wobble: `--spring-pop` 0.5 s). Press: scale .97.
- `contextmenu` / Shift+F10 / ContextMenu key → emits `contextmenu` with coordinates; the section decides which menu to show. `preventDefault` **only** on the island.
- Touch: tap = toggle pinned; no hover peek.
- The key light (§1.5) follows the pointer while it is within 200px of the island.

### 5.5 Numbers

- Interactive changes: `rollDigits` on wing values, ring values and table pcts. Rings and bars tween over 0.5 s `settle` (the app's `.smooth(0.5)`).
- Scrubbed changes (`state` + `render()`): write `Math.round(pct)` directly, with no roll (rolls look broken when scrubbed backwards).

### 5.6 History / sparkline generator

`history` is an array of 36 samples (every 10 min over 6 h), 0–100. Auto-generate with a seeded PRNG (seed from the key), so it's stable between renders: a monotone-ish rise with 2–3 plateaus, ending exactly at `pct`. Session history resets to near 0 at the most recent 5-hour boundary: include one drop. Render as an SVG path, 44×14.

### 5.7 Performance

- One `requestAnimationFrame` write per frame at most. There are no layout reads during animations (measure once on `resize` via `ResizeObserver`).
- `will-change: transform` only while a camera/scene tween is active; remove it after.
- Frames in `#reel` are **static renders** (`interactive:false, live:false`); they only animate on hover.

### 5.8 Reduced motion

`setMode` is instant. No hover wobble, no rolls (values write instantly), no key light. Scenes get `modeTimeline()` = null and render end states. All interaction (hover/click/keyboard/menu) still works.

---

## 6. Accessibility, performance and QA gates

- **Reduced motion**: Lenis off, no pins, no loops (marquees static, attract mode off, grain static, beam static CSS), no intro, instant reveals. **All content visible and in reading order** with no JS too.
- **Keyboard**: every island, menu, segmented control, filmstrip frame and FAQ row is reachable. `:focus-visible` rings are always on. The menu has roving tabindex and Esc returns focus to its trigger.
- **Contrast**: body text uses `--ink`/`--ink-2` on paper and `--fg`/`--fg-2` on night. Pastels are never used as text on paper.
- **Overflow**: at 320–390px no horizontal scroll. Rotated strips sit inside `overflow:clip` wrappers; the mega type uses `clamp` and `overflow-wrap:anywhere` where needed. Test 320, 375, 390, 768, 1024, 1440, 1920.
- **Performance**: 60 fps on an M1 Air in the stage pin. Animate only transform/opacity/clip-path/filter on small elements, plus `font-stretch` on single words. Lazy-init the WebGL beam and pause it offscreen. No long tasks > 50 ms after load. LCP is the hero H1 (< 2.0 s local).
- **QA script** (`web/qa.mjs`, architect): 1440×900 and 390×844, scroll in 400px steps with 350 ms waits, screenshot each step into `scratchpad/qa/<run>/`, capture a 10-frame sequence at 60 ms through the takes HIT (progress 0.38–0.46) and the finale iris, log console errors and long tasks, and assert `document.documentElement.scrollWidth <= innerWidth`. Also run once with `emulateMediaFeatures([{name:'prefers-reduced-motion', value:'reduce'}])` and screenshot the full page.
- **Truth check** before sign-off: grep the built `index.html` for "open source", "GitHub", "Anthropic's", "official" and "API key support". There must be none except the legal line and the "not supported" line.

---

## 7. Build order and ownership

1. **Architect**: tokens.css, base.css (reset, grain, nav, HUD, footer, cta, focus brackets, banner), `lib/*` (§2.4), `island.js` + a `web/island.test.html` visual fixture rendering every state next to the snaps2 PNGs, plus a tiny `node web/island-derive.test.mjs` assert script for `derive()` (right-wing choice, tint threshold, forecast colour, reset label format, limit note text), template `web/index.html` with section markers in the §4 order, `build.mjs`, vendor fetch, fonts, SEO/JSON-LD, og.html, qa.mjs.
2. **Builders in parallel** (one per section): `stage` (the most senior builder; it owns the beam), `takes`, `reel`, `lighting`, `wide`, `privacy`, `commentary`, `finale`.
3. **Integrator**: run build, QA at both viewports + reduced motion, look at every screenshot, fix seams (nav island handoff at the stage end, `data-night` toggles, pin spacing, refresh order).

Definition of done: the hero is alive in the first second, every scene reads without motion, nothing on the page could be mistaken for a template, and every sentence is true to the Swift sources.
