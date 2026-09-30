# Claude Meter site: MASTER SPEC (v2, final)

Owner: executive creative director. Architects, section builders and the integrator build from **this file alone**. The three lead specs in `web/specs/` are archived input and are not instructions.
Product truth: `Sources/ClaudeMeter/*.swift`. If this file and the Swift disagree, the Swift wins. Flag the conflict in your hand-off note and never invent a feature.
Exact copy in this file is final. Use it verbatim with curly quotes, `—`, `·`, `…` and non-breaking hyphens where shown.

**Product facts, current (they supersede anything older below):**
- Claude Meter is **open source (MIT)** on GitHub: `https://github.com/FreemanGT/claude-meter`. The site invites a star (§5.4 `.gh-chip`); the live count is baked in at build time and hidden below `MIN_STARS` (25) or while unknown (never "0" or "1 star").
- **Windows is not available.** Every Windows CTA opens the waitlist dialog (name + email). One label everywhere: `Windows · join the waitlist` (compact form where a tab is narrow: `Windows waitlist`). One promise everywhere: "One email when Windows ships. Nothing else."
- **Mac download:** a dialog offers an optional email field (`Email · optional`; blank still downloads), and `/ClaudeMeter.dmg` downloads at once on submit; the download never waits on the network. Phones and tablets: every Mac CTA reads "Get it on your Mac" (arrow up); its dialog has one button, "Send the link to my Mac" (share sheet, else copy), which also saves the email if one was given.
- **The site** stores the email (and the name, for Windows) in the maker’s Google Sheet (`web/signup-sheet.gs`), a Mac email only for Claude Meter updates, a waitlist entry for one email when Windows ships. Nothing else is tracked. **The app** still collects nothing: it reads Claude Code’s saved sign-in read-only and talks to `api.anthropic.com`, `platform.claude.com` and this site’s `/version.json` (once a day).
- About panel: `Version 1.2 (3)` and `© 2026 Yiftach Freeman. Not affiliated with Anthropic.`

---

## A. Decision record: scores and rationale

Each spec is scored 1–10 on five criteria. **Fit** means fit to the client's references: Hoy, Monocle, Alcove and Wispr Flow.

| Spec | Wow / originality | Product story | Conversion | 60fps feasibility | Fit | Total |
|---|---|---|---|---|---|---|
| **CINEMA** ("the notch is a projector") | 9 | 9 | 8 | 6 | 7 | **39** |
| **PLAY** ("poke it") | 8 | 7 | 7 | 7 | 8 | **37** |
| **TYPE** ("the site lives under the notch") | 8 | 9 | 8 | 9 | 8 | **42** |

**Base: TYPE.** It has the strongest single frame. The whole site is the top of a MacBook screen, with one live island hanging from a real notch that demos the product and then meters the page itself. It has the most disciplined grammar (FILL / FORECAST / HIT / RESET), an iconic hero word (WALL filling like liquid), and no dead weight. It is also the leanest to build at 60fps.

TYPE's weakness is that it is timid in the first second: paper, type and a small island. The client said "go crazy" and "don't give me worst designs." So the hero and the ending take CINEMA's light and camera work, and the playground takes PLAY's tactility.

**Grafted in:**
1. **CINEMA: the lit display plus the dolly-in.**
   - The hero is a night display framed in paper (Alcove's screen-in-page, which the client likes).
   - A real-time light beam falls from the notch across the giant WALL. The beam is hand-written WebGL, tinted by the live numbers, with dust that parts around the cursor.
   - Scrolling then pushes the camera into the island through all six app states in one pinned shot. This replaces TYPE's separate Anatomy section, which is the same story told flatter.
2. **CINEMA: the ending. HIT → iris closes into the camera lens → "resetting…" → iris opens on "Session reset".** It is the best last beat of the three, and it closes on the notch, where the page began.
3. **CINEMA: the island-shaped Download button.** It hangs from a hairline like the island hangs from the bezel, and on hover it opens like a peek to show "Free · v1.2 · macOS 14.4+". It is the signature CTA.
4. **CINEMA: the tilted strip of live island states** as the loop moment, crossed with TYPE's giant display-type marquee.
5. **PLAY: tactility in the playground.**
   - A spring-loaded PACE lever drives the real forecast wording.
   - macOS notifications with the app's real copy can be flicked away.
   - Easter eggs: Refresh twice gives the real throttle line; Quit and relaunch.
   - The page-island caption "This one meters the page. The real one meters Claude."
   - PLAY's fully consistent 10:04 → 15:04 clock maths for the Wall scene.
6. **PLAY and TYPE: squashable WALL letters and a ghost cursor** that shows hover and click in the tour.

**Cut, and why:**
- **CINEMA's film props:** the clapperboard, the "REC" timecode HUD, "Director's commentary", sprocket holes and the focus-bracket cursor. They are costume and they read cheesy. The camera *language* stays; the film *props* go.
- **CINEMA's separate "Wide shot" section.** External display, menu-bar item and full-screen hiding now live in the playground as working switches. That is more honest and one pin shorter.
- **PLAY's pull-to-pin.** The real app has no such gesture, so teaching it is a lie.
- **PLAY's "this page has a limit" interstitial section.** The hand-off caption does that job in two seconds.
- **PLAY's lens-wink easter egg.** Fluff.
- **OGL.** One full-screen triangle does not need a library; `beam.js` is about 90 lines of raw WebGL.
- **Warm cream paper (#F3EEE4 / #F2EDE3).** It sits too close to claude.ai's ivory. We use a cool bone-silver paper so the brand is visibly independent, and it makes the app's teal and lavender sing.

**Settled conflict:** PLAY asked what the default display is. `main.swift` registers `showPercent: true`, so **percentages are the default**. Tick bars are the option.

---

## 0. The big idea: **"Under the notch."**

The site is the top of a MacBook screen. A black menu-bar band runs across the top with a real camera notch, and **one live island** hangs from it for the whole visit. The island is the app's real UI rebuilt in code at 1:1 fidelity. It is never a screenshot.

- **Open:** a camera dot glints. The island grows out of it, and the black lifts into the band.
- **Hero:** a night display framed in paper. Light falls from the notch like a projector across a giant outlined **WALL**. The WALL fills like liquid up to the live session %, and you can squash its letters.
- **Tour:** scrolling dollies the camera into the island through every real state: collapsed → peek → pinned → forecast → red → notification.
- **The Wall:** the same afternoon twice. Blind, it ends in a hard stop. Metered, it ends in a clean commit.
- **Loop, Playground, Privacy, FAQ:** the product is proven by touch, not by claims.
- **Meanwhile the band's island meters *you*:** read %, sections seen, and a forecast from your scroll speed.
- **Ending:** the page hits its limit, the frame irises closed into the camera lens, "resetting…", and it opens again on "Session reset — your 5-hour window is back to full."

**Motion grammar. Every effect is one of four verbs, plus camera language; otherwise cut it.**

| Verb | What it does |
|---|---|
| **FILL** | rings, bars, counters and letters rise toward a limit |
| **FORECAST** | dashed or ghost extrapolation, "hits the cap in…" |
| **HIT** | red and bold together, one hard stop, a 120ms shake. **Exactly three on the page:** tour beat 05 (red flash only, no shake), the Wall's Act A, and the finale |
| **RESET** | spring back to calm, "resets in…", "back to full" |

**Camera language:** dolly (scale), focus pull (blur), hard cut (step ease), iris (circle clip), key light (cursor specular).

**Art direction in one line:** bone-silver paper, pure-black hardware, the app's four pastel meter colours as the only colour, colossal variable type that squashes and fills, one serif-italic word per headline, and hand-drawn ink notes.

**Hard no's:**
- purple or any gradient buttons, gradient text (hard-stop meter fills are allowed), glow buttons
- feature-card grids, bento, FAQ cards, centred-hero-plus-grid templates
- static hero images or composites, 3D laptops
- cursor blobs that hide the native cursor, horizontal-scroll galleries, scroll-snap hijack
- loaders over 1.2s, autoplay sound
- the Claude spark or asterisk, Anthropic logos, terracotta or orange (the amber is the app's pale `#FAC775`; never push it toward orange)
- emoji, exclamation marks, and the words "seamless / effortless / supercharge / unlock / elevate / powerful / game-changer"

---

## 1. Design tokens (`site/css/tokens.css`, architect)

### 1.1 Fonts

Self-host in `site/fonts/`, latin subset, `font-display: swap`. Get the files with `npm pack` and extract them. Preload the Anybody and Geist Mono files with `crossorigin`. Verify with `ls -l` that the total is ≤ 200 KB.

| Role | npm package | File | Axes | Use |
|---|---|---|---|---|
| Display + body | `@fontsource-variable/anybody` | the file with **both** `wdth 50–150` and `wght 100–900` (named `anybody-latin-wdth-normal.woff2` or `…-full-normal.woff2`). **Verify** by rendering `font-stretch:50%` next to `150%` in `web/fonts.test.html` | wdth, wght | everything except data and the accent |
| Accent | `@fontsource/instrument-serif` | `instrument-serif-latin-400-italic.woff2` | none | exactly one word or phrase per headline, never a paragraph |
| Data / mono | `@fontsource-variable/geist-mono` | `geist-mono-latin-wght-normal.woff2` | wght | numbers, running heads, marquees, terminal, chips. Always `font-variant-numeric: tabular-nums` |
| Island UI | none (system) | none | none | **only** inside islands, menus and banners, so they match the app (SF on a Mac) |

```css
@font-face{font-family:"Anybody";src:url(/fonts/anybody.woff2) format("woff2");font-weight:100 900;font-stretch:50% 150%;font-display:swap}
@font-face{font-family:"Instrument Serif";src:url(/fonts/instrument-serif-italic.woff2) format("woff2");font-style:italic;font-weight:400;font-display:swap}
@font-face{font-family:"Geist Mono";src:url(/fonts/geist-mono.woff2) format("woff2");font-weight:100 900;font-display:swap}
--f-display:"Anybody","Arial Narrow",system-ui,sans-serif;
--f-serif:"Instrument Serif",ui-serif,Georgia,serif;
--f-mono:"Geist Mono",ui-monospace,"SF Mono",Menlo,monospace;
--f-ui:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;
```

**Type scale** (fluid; `wdth` is set via `font-stretch`, `wght` via `font-weight`):

| Token | Size / line-height / tracking | wdth / wght | Use |
|---|---|---|---|
| `--t-wall` | `clamp(112px, 29vw, 500px)` / .78 / -.045em | 150 / 900 | "WALL" in the hero and the Wall scene |
| `--t-mark` | `clamp(72px, 15.2vw, 280px)` / .82 / -.035em | 120 / 900 | finale wordmark (one line ≥768px) |
| `--t-display` | `clamp(52px, 8.6vw, 148px)` / .86 / -.035em | 75 / 560 | hero "See the", "before you hit it." |
| `--t-h2` | `clamp(42px, 6.4vw, 112px)` / .9 / -.03em | 78 / 780 | section headlines |
| `--t-h3` | `clamp(26px, 2.7vw, 42px)` / 1.02 / -.015em | 90 / 680 | beat titles, FAQ questions |
| `--t-lede` | `clamp(18px, 1.45vw, 22px)` / 1.42 | 96 / 420 | lead paragraphs, max 36ch |
| `--t-body` | 17px (≥1024px: 18px) / 1.55 | 100 / 400 | body, max 60ch |
| `--t-label` | 12px mono / 1.2 / .08em uppercase / wght 500 | none | running heads, eyebrows |
| `--t-data` | 14px mono / 1.4 | none | chips, captions |

- **Serif word:** 1.08× the surrounding size, `letter-spacing:-.01em`, lowercase-leaning, with a baseline nudge of `.03em`.
- **Running heads:** every section except `stage` opens with a full-width 1px `--rule` line and a mono running head. It reads `§0N — NAME` on the left and a live datum on the right (given per section).

### 1.2 Colour

```css
:root{
  /* day */
  --paper:#EDEEE9; --paper-2:#E1E3DC; --paper-3:#D3D6CD;
  --ink:#111311; --ink-2:#4D5149; --ink-3:#7C8077;          /* ink-3: decorative or ≥24px only */
  --rule:rgb(17 19 17 / .14);
  /* night / hardware */
  --black:#000; --night:#070708; --night-2:#121312;
  --fg:#ECEDE8; --fg-2:#A8A8A8; --fg-3:#999;                /* fg-2 = Theme.text2 (white .66) */
  --rule-night:rgb(236 237 232 / .12);
  /* the app — Theme.swift, exact */
  --teal:#5CC9A6; --lav:#B0A8ED; --amber:#FAC775; --red:#F26B6B;
  --track:rgb(255 255 255 / .13);
  --rim-top:rgb(255 255 255 / .04); --rim-bot:rgb(255 255 255 / .20);
  /* text-safe accents on paper (≥4.5:1 on --paper; QA verifies) */
  --teal-ink:#146A51; --lav-ink:#5548C2; --amber-ink:#875600; --red-ink:#B3302D;
  /* highlighter marks behind words on paper */
  --hl-teal:rgb(92 201 166 / .42); --hl-amber:rgb(250 199 117 / .55);
}
```

**Rules:**
- Pastels are **text only on night/black**. On paper, use them only for fills and strokes; paper text uses the `-ink` variants.
- **Red is always paired with bold** (the app's `Theme.warn = 85`, strict `>`).
- The CTA colour is **hardware black** (or `--fg` on night), never a hue.
- `::selection{background:var(--teal);color:var(--ink)}`.
- `html[data-night]` swaps `--bg`, `--fg-text`, `--rule-c` and the nav/cursor tones. `body` background transitions over 400ms `--ease-edit`. It is never scroll-scrubbed.

### 1.3 Layout, radii, depth

- **Grid:** 12 columns, `max-width:1560px`, margins `--gutter: clamp(16px, 4vw, 64px)`, column gap `clamp(12px, 1.6vw, 24px)`.
- **Section padding:** `padding-block: clamp(96px, 14vh, 200px)`.
- **Radii:** `--r-screen: 28px` (bottom corners of displays), `--r-stage: 28px`, `--r-pill: 999px`, `--r-menu: 10px`, `--r-banner: 16px`.
  - `@supports (corner-shape: squircle){ .sq{corner-shape:squircle} }` on pills and stages.
  - Islands use the notch path, never border-radius.
- `--frame: clamp(8px, 1vw, 14px)` is the paper margin around the hero display.
- **Shadows (warm or neutral, never animated):**
  - `--sh-float: 0 24px 60px -20px rgb(10 12 10 / .35), 0 2px 8px rgb(10 12 10 / .12)`
  - Expanded island: `0 18px 40px rgb(0 0 0 / .45)` on a separate sibling layer whose **opacity** is what animates.
- **Layers:** grain 90, cursor tag 95, band 80, nav island 85, iris 100, intro 110, menus and banners 120.

### 1.4 Easing, springs, durations

```js
// lib/gsap.js
CustomEase.create("edit",   "0.625,0.05,0,1");                                   // reveals, camera moves
CustomEase.create("settle", "0.2,0.8,0.2,1");                                    // micro UI
CustomEase.create("island", "M0,0 C0.14,0.56 0.22,1.1 0.46,1.07 0.64,1.04 0.78,0.995 1,1"); // ~7% overshoot for scrubbed morphs
```

```css
--ease-edit:cubic-bezier(.625,.05,0,1); --ease-settle:cubic-bezier(.2,.8,.2,1); --ease-in:cubic-bezier(.5,0,.75,0);
/* SwiftUI .bouncy(0.4): island OPEN */
--spring-open: linear(0, 0.017, 0.062, 0.127, 0.205, 0.29, 0.378, 0.466, 0.55, 0.629, 0.702, 0.766, 0.824, 0.873, 0.915, 0.949, 0.978, 1, 1.017, 1.029, 1.038, 1.043, 1.045, 1.046, 1.045, 1.043, 1.039, 1.036, 1.032, 1.028, 1.024, 1.02, 1.016, 1.013, 1.01, 1.008, 1.005, 1.004, 1.002, 1.001, 1, 0.999, 0.999, 0.998, 0.998, 0.998, 0.998, 0.998, 1); --spring-open-dur:590ms;
/* SwiftUI .smooth(0.4): island CLOSE */
--spring-close: linear(0, 0.014, 0.05, 0.099, 0.158, 0.222, 0.286, 0.351, 0.413, 0.472, 0.527, 0.579, 0.626, 0.669, 0.707, 0.742, 0.774, 0.801, 0.826, 0.848, 0.868, 0.885, 0.9, 0.913, 0.925, 0.935, 0.943, 0.951, 0.958, 0.964, 0.969, 0.973, 0.977, 0.98, 0.983, 0.985, 0.987, 0.989, 0.991, 0.992, 0.993, 0.994, 0.995, 0.996, 0.996, 0.997, 0.997, 0.998, 1); --spring-close-dur:540ms;
/* PLAY: small tactile accents only (switch thumbs, banner snap-back, lever return, cursor tag) */
--spring-play: linear(0, 0.03, 0.108, 0.22, 0.352, 0.49, 0.627, 0.754, 0.867, 0.962, 1.037, 1.094, 1.132, 1.154, 1.163, 1.16, 1.149, 1.131, 1.11, 1.088, 1.065, 1.044, 1.025, 1.009, 0.996, 0.986, 0.98, 0.975, 0.974, 0.974, 0.975, 0.978, 0.981, 0.985, 0.989, 0.992, 0.995, 0.998, 1, 1.002, 1.003, 1.004, 1.004, 1.004, 1.004, 1.004, 1.003, 1.003, 1); --spring-play-dur:1170ms;
--d-micro:180ms; --d-ui:320ms; --d-reveal:900ms;
```

- **GSAP defaults:** `{ease:"power3.out", duration:.6}`.
- **Text reveals:** .9s `edit`, staggers of .08 per line, .035 per word, .012 per char.
- **Value tweens** (rings, bars): .5s, matching the app's `.smooth(0.5)`.
- **Scrubbed scenes:** `scrub:.8`, `anticipatePin:0` under Lenis (1 only for native touch scroll), **never** `snap`.
- **Loops:** 3–30s, `ease:"none"`, always inside `whileVisible`.
- `--spring-play` is never used on layout-sized elements.

### 1.5 Grain, materials, key light

**Grain.** Static, never animated. `body::after` is fixed at `inset:0`, z 90, `pointer-events:none`. Its background is an SVG data-URI tile at 180px (`feTurbulence type=fractalNoise baseFrequency=.85 numOctaves=2 stitchTiles=stitch` plus a greyscale `feColorMatrix`). Paper: `opacity:.06; mix-blend-mode:multiply`. `html[data-night]`: `opacity:.08; mix-blend-mode:screen`.

**Island materials** (the app's `Appearance`). The island is never lighter than about rgb 38; the scrim is always there.
- **Solid:** pure black, fused to the notch. A faint rim (white 4% → 20%, top → bottom) only when expanded.
- **Frosted:** a heavy blur (the app’s NSVisualEffect `hudWindow`) under a black scrim gradient .80 (top) → .56 (bottom), and a uniform white 16% 1px rim, collapsed too.
- **Liquid Glass:** a thin lensing sheet (macOS 26 `glassEffect`, black tint .2) under a scrim .70 → .52, with a 1.25pt specular rim lit by a radial gradient (white .8 → .22 → .06) centred on the pointer (top-left when it is away). In Chromium the lensing is `backdrop-filter:url(#cm-liquid)`; `#cm-liquid` is an inline SVG filter (once, in `index.html`): `feTurbulence baseFrequency=.008 numOctaves=1` → `feDisplacementMap scale=18`, where `scale` is JS-adjustable for the shimmer egg.
- **Frosted and Glass lift the text** like the app: secondary white .84, tertiary white .74, track white .22, and a 1.5px black 50% text shadow.
- **The camera housing** (185×32pt black, 10pt bottom radius) is always pure black on top of the material, so it reads as hardware.

**Rim (every mode, expanded states).** A 1px SVG stroke on the shape path, `linearGradient` from `--rim-top` to `--rim-bot`.

**Key light.** On every interactive island and on the M CTA, a second rim stroke uses a `radialGradient` centred at the pointer, with opacity 0→.55 by proximity within 220px. `--mx` / `--my` are set with `gsap.quickTo` (.35s). It is off under reduced motion and on touch.

---

## 2. Stack and file layout (architect)

- **Vendor** (`site/vendor/`, from `npm pack gsap@3.15.0` and `lenis@1.3.26`): classic `<script defer>` in `<head>`, in this order: `gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.min.js`, `ScrambleTextPlugin.min.js`, `DrawSVGPlugin.min.js`, `CustomEase.min.js`, `Draggable.min.js`, `InertiaPlugin.min.js`, `lenis.min.js`. Inline `lenis.css` into `base.css`. That is about 95 KB gz.
- Then `<script type="module" src="/js/main.js">`. Module scripts run after deferred ones, so the `window.gsap` globals exist.
- **No three.js, no OGL.** The one WebGL effect is `site/js/stage-beam.js`, written raw by the stage builder (§6.1).
- **Budget:** total JS ≤ 200 KB gz, fonts ≤ 200 KB. Nothing else is fetched at runtime (no CDN).
- **Templates:**
  - `web/index.html` holds the head, band, intro and SVG defs. It contains `<main id="top">` with `<!-- @section:<id> -->` markers in this order: `stage wall loop yours privacy faq finale`.
  - `web/build.mjs` (node, no deps) replaces each marker with `web/sections/<id>.html` → `site/index.html`, and fails loudly on a missing file.
- **Section contract:**
  - Markup is `<section id="<id>" class="s s--<id>" data-section="<id>" aria-labelledby="<id>-title">` (plus `data-night` where stated).
  - A builder touches only `web/sections/<id>.html`, `site/css/<id>.css` and `site/js/<id>.js`, and may add `site/js/<id>-*.js` helpers.
  - CSS is scoped under `.s--<id>`.
  - JS: `export default function init(root, ctx) { … return cleanup }`. Everything runs inside `ctx.gsap.context(() => {…}, root)`.
  - A section **never** registers plugins, creates Lenis, or reads `matchMedia` itself.
- **`main.js`:**
  1. `initMotion()`: reduced-motion state, Lenis, grain, band, cursor tag, CTAs, nav island, intro.
  2. `await document.fonts.ready`.
  3. For each id in order, `const mod = await import(\`./${id}.js\`)` and call `mod.default(root, ctx)`.
  4. `ScrollTrigger.refresh()`.
  5. `ctx = { gsap, ScrollTrigger, SplitText, reduced, mobile, lenis, meter, navIsland, Island, lib }`, where `lib` holds every export of §3.
  6. The whole run is wrapped in `gsap.matchMedia()` with `{motion:"(prefers-reduced-motion: no-preference)", reduced:"(prefers-reduced-motion: reduce)", mobile:"(max-width: 767px)"}`, so a change of preference or breakpoint reverts and re-inits cleanly.
- **Never hide content in CSS by default.** Initial hidden states are set by JS or scoped under `html[data-motion="full"]`. With no JS, the page is complete and static.

---

## 3. Shared motion kit (`site/js/lib/*.js`, architect). Builders import; they never re-implement.

| Module | Exports | Behaviour | Reduced motion |
|---|---|---|---|
| `gsap.js` | `gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin, CustomEase, Draggable, InertiaPlugin` | reads `window`, registers plugins, sets defaults and eases (§1.4) | none |
| `motion.js` | `reduced()`, `mobile()`, `onChange(fn)`, `spring({duration, bounce})` → `{ease, duration}`, `SPR = {open, close, value, play}` | SwiftUI-accurate damped spring as a GSAP function ease (same maths as the CSS `linear()` tokens) | none |
| `smooth.js` | `lenis`, `scrollTo(target, {progress})`, `stop()`, `start()` | `new Lenis({lerp:.1, smoothWheel:true, syncTouch:false, autoRaf:false, anchors:{offset:-48}})`, `lenis.on("scroll", ScrollTrigger.update)`, `gsap.ticker.add(t=>lenis.raf(t*1000))`, `lagSmoothing(0)`. `scrollTo("#stage", {progress:.16})` scrolls to `st.start + p·(st.end-st.start)` of that section's pin. `a[href^="#"]` with an optional `data-progress` routes through it | no Lenis; native `scrollIntoView({behavior:"auto"})` |
| `split.js` | `revealLines(el, {delay, stagger=.08, trigger=el, start="top 85%"})`, `revealChars(el, opts)` | `SplitText.create(el,{type:"lines,words", mask:"lines", autoSplit:true, aria:"auto", onSplit})` → `yPercent 110→0`, `edit` .9s, once | no-op |
| `numbers.js` | `class Roller(el, {value, format})` `.set(n)`; `countTo(el, to, {from, duration=.8, suffix="%"})`; `scramble(el, text, {duration=.6, chars="0123456789%·:hm "})` | **Roller** is the Alcove rolling digit. It uses per-char slots. The incoming char goes from `y ±60%, scale .8, blur(3px)` to rest (spring .45s); the outgoing char goes the other way to opacity 0. Direction follows the sign of the change, and tabular nums keep the width stable. Used for **every live number** | writes instantly |
| `format.js` | `fmtPct`, `fmtDur(sec)` → `"2h 13m"` / `"36m"`, `fmtReset(secOrDate)` → `"resets in 2h 13m"` (<48h), `"resets Sat 1:05 PM"` (locale `toLocaleString` weekday short plus time), or `"resetting…"` (≤0), `fmtForecast(sec)` → `"hits the cap in 1h 12m"`, `CLEARS = "on track — resets first"`, `fmtAgo` → `"just now"` | mirrors `Format` in `Theme.swift` | none |
| `magnetic.js` | `magnetic(el, {strength=.3, radius=120, inner})` → destroy | `quickTo` x/y (.4s `power3`); the inner label moves 1.5×; release uses `SPR.play`. The transform goes on an inner span so focus rings stay put. Only on `(hover:hover) and (pointer:fine)` | no-op |
| `cursor.js` | `initCursorTag()` | **The native cursor always stays.** A black capsule (22px tall, `0 10px`, mono 11px, white) trails at (+14, +18) via `quickTo` .35s. It shows only over `[data-cursor]`, displaying that attribute's text. It enters with a clip-path widen from centre (`SPR.play`) and a text roll. `aria-hidden` | not created |
| `marquee.js` | `marquee(track, {speed=60, dir=1, velocity=true, hoverSlow=.2})` → `{pause, play, kill}` | Clones children to ≥2× the viewport (clones get `aria-hidden`). An `xPercent` loop with a `modifiers` wrap. With velocity, `ScrollTrigger` velocity drives `timeScale` (1 + min(\|v\|/1200, 3)) and `skewX` (±3°, eased back over .5s). Pauses when offscreen and when the tab is hidden; hover slows it to `hoverSlow` over .4s | static first set |
| `reveal.js` | auto-binds `[data-reveal="up\|fade\|lines\|draw\|mark"]`, optional `data-reveal-delay` | `up`: y 32→0 plus opacity. `lines` → `revealLines`. `draw`: DrawSVG 0→100% over .9s. `mark`: a highlighter bar `::after` scaleX 0→1 from the left, .6s `edit`. Uses `ScrollTrigger.batch` at `start:"top 85%"`, stagger .06 | all visible, marks drawn |
| `pin.js` | `pinScene(section, {length="300%", mobileLength="200%", scrub=.8, build(tl, {mobile})})` → `{tl, st}` or `null` | Pins `section.querySelector(".pin")` with `start:"top top"`, `end:"+="+len`, `pinSpacing`, `anticipatePin:1`, `invalidateOnRefresh`. **No snap.** It also hides or shows the nav island (§5.3) when `section.dataset.ownIsland` is present | returns null and adds `.is-static`, and the section's CSS renders the static composition |
| `night.js` | `nightZone(el, {start="top 55%", end="bottom 45%"})`, `setNight(key, bool)` | Toggles `html[data-night]`, reference-counted | same |
| `loop.js` | `whileVisible(el, start, stop, margin="10%")` | IntersectionObserver plus a `visibilitychange` guard. Wrap every ambient loop and timer in it | loops never start |
| `meter.js` | `meter`: `{scrolled, sections:[{id,label,read}], velocity, override(pct\|null), subscribe(fn)}` | One ScrollTrigger for `0 → max`, plus one per section (read % = progress through it). Velocity is a 3s EMA in px/s. `override` lets the finale drive the wing | same (no velocity) |
| `notch-path.js` | `notchPath(w, h, rt, rb)` | the exact port of `NotchShape.path` (below) | none |
| `island-derive.js` | `derive(data, opts)` → view model | pure function holding every app rule (§4.2). **Tested** by `node web/island-derive.test.mjs` | none |
| `island.js` + `site/css/island.css` | `class Island` | §4 | §4.7 |
| `menu.js` | `openMenu(island, {x, y, items})`, `defaultItems(island, hooks)` | a macOS menu replica (§4.6) shared by every interactive island | instant |
| `banner.js` | `showBanner(host, {title, body, icon=true, flick=false, timeout=6000})` → el | a macOS notification (§4.8). With `flick`, it gets Draggable x plus Inertia | appears instantly, with a close button |
| `band.js` | `statusItem(on, data)`, `setBandNight(bool)` | the band's status-item slot (§5.1) | same |
| `cta.js` | `initCtas()` | wires every `.cta` (§5.4) | static, meta always visible |
| `squash.js` | `squash(el, {min=62, max=150, radius=220, wght:[800,900]})` → destroy | Splits into chars (keeping `aria-label` on the parent). Pointer proximity sets per-char `--sq` (0..1), which the section combines into its own `font-stretch` (`calc`), plus `wght`. Chars return with `SPR.play` via `quickTo` on proxies. Updates are rAF-throttled. Fine pointer only | no-op |
| `scribble.js` | `scribble(svg, {duration=.9, delay=0, trigger=true})` | DrawSVG on the paths in document order. Ink style: `stroke:currentColor; stroke-width:2.25; stroke-linecap:round; vector-effect:non-scaling-stroke` | pre-drawn |
| `demo.js` | `DEMO`, `spark(seed, endPct, {drop})` | canonical demo data (§4.5) and the seeded 6h sparkline generator (36 samples, monotone-ish with 2–3 plateaus, ending at `endPct`; session includes one reset drop) | none |

**Performance rules for every builder:**
- Animate only transform, opacity, clip-path, SVG stroke/dash, `filter` on small elements, and `font-stretch`/`font-weight` on ≤ 30 glyphs at a time.
- The island's width/height is the one allowed "layout" animation. It happens on a single absolutely positioned element and never reflows siblings.
- Never tween box-shadow, top/left, width or background-color on scroll.
- DPR is capped at 2. `will-change` is set only while a tween runs.
- No long task > 50ms after load.

---

## 4. The ISLAND component (architect; the most important code on the site)

It must match `scratchpad/snaps2/*.png`, which are 2× renders: divide pixels by 2 to get pt. The magenta outline there is the camera housing and is **never drawn**. Build `web/island.test.html` to show every state next to its PNG, and check each one by eye.

### 4.1 API

```js
import { Island } from "./lib/island.js";
const isl = new Island(host, {
  scale: 2,             // px per pt. The DOM is laid out at this scale (sets --u). Render at the MAX scale a scene needs; cameras may only scale DOWN (≤1) so text stays crisp.
  state: "collapsed",   // "collapsed" | "peek" | "pinned" | "hidden"
  display: "percent",   // "percent" (default, matches the app) | "ticks"
  material: "solid",    // "solid" | "frosted" | "glass"
  notch: true,          // false → no-notch pill (external display / Mac without notch)
  bezel: false,         // true → draw the decorative camera lens in the housing (hero, band, stages)
  burnRate: true,       // forecast text, projected arc + tick
  interactive: true,    // hover 200ms → peek; click/Enter/Space → pin toggle; Esc/outside → collapse; contextmenu → menu
  hint: false,          // first-launch row "Hover to peek · click to pin · right-click for settings & Quit"
  live: true,           // "resets in" counts down each minute (shared ticker, paused offscreen)
  labels: null,         // page-meter overrides (§5.3)
  data: DEMO
});
isl.setState(s, { instant=false })   // interactive spring morph → Promise; retargets safely if called mid-morph
isl.modeTimeline(from, to)           // PAUSED linear-time timeline (geometry on "island" ease) for scrubbing inside a scene
isl.update(patch, { duration=.5, roll=true })  // deep-merge; rings/bars tween, digits Roll
isl.data + isl.render()              // scrub path: mutate numbers, call render(); writes Math.round() directly, never rolls
isl.setOption(key, value)            // display | material | burnRate | notch | hint | scale (collapsed only)
isl.lock(bool)                       // scenes drive state; user hover/click ignored while locked
isl.pulse()                          // HIT: 120ms shake, x 0,-2u,2u,-1u,0
isl.quit() / isl.relaunch()          // §4.6 item 14
isl.on("state"|"contextmenu"|"interact", fn); isl.off(...); isl.el; isl.destroy()
```

**`IslandData`:**

```ts
{ plan:"Max 20x", updated:"just now",
  session:{ pct, resetIn /*s*/, projected /*% at reset, optional*/, forecast:{exhaustsIn:s} | {clears:true} | null, spark:number[] },
  weekly: { pct, reset:"Sat 1:05 PM" | resetIn, spark },
  models: [{ name:"Opus", pct, reset, spark }] }
```

### 4.2 Derived rules (`derive()`, pure and tested; exactly as `IslandView.swift`)

- **Right wing:** the model with the highest pct, **if its pct is greater than** weekly pct, in amber with the model's name. Otherwise weekly in lavender.
- **Tint:** `pct > 85` → `--red` plus one weight step up (semibold → bold, medium → semibold/bold). Otherwise session is teal, weekly lavender and models amber. Bars and rings go red too.
- **Forecast** (session only, when `burnRate`):
  - `exhaustsIn` → `hits the cap in ${fmtDur}`. It is amber when ≥3600s and red when <3600s.
  - `clears` → `on track — resets first` in `--fg-2`.
  - `null` → nothing.
- **Limit note** (peek and pinned): if any window has pct ≥100, a red row with a 5pt red dot and `${name} limit reached · ${fmtReset}`. The name is "Session", "Weekly" or the model name, e.g. `Opus limit reached · resets Sat 1:05 PM`. **It takes priority.**
- **Pinned footer when there is no limit:** `Session ${forecast}`, e.g. `Session hits the cap in 1h 12m` (amber or red) or `Session on track — resets first` (`--fg-2`). Peek shows no footer except the limit note.
- **Reset column (pinned):** shown only when it differs from the previous row's.
- **`aria-label`** mirrors the app's collapsed label: `Claude usage, session 46 percent, Opus 62 percent`.
- **The test asserts:**
  - the right-wing choice, both ways
  - the 85 vs 85.1 tint
  - forecast colour at 3599 vs 3600s
  - the reset formats (<48h, ≥48h, ≤0 → `resetting…`)
  - limit-note text and priority
  - the pinned footer prefix

### 4.3 Geometry (pt × `scale`)

| Part | Value |
|---|---|
| Housing | 185 × 32. Pure black, 10pt bottom radius, drawn above the material. A decorative 7pt lens `#0A0B10` with a 2pt `rgb(90 110 255/.35)` highlight sits at its centre, **only when `bezel:true`** (hero, band, stages) |
| Collapsed | width 185 + 2×wing. Wing = 46 (percent) or 40 (ticks), so 277 / 265. Height 32. Radii top 6 / bottom 14. Each metric is centred in its lane (`wing − rt`), padded `rt` from the wall. Text: caption 10pt semibold, bold >85, `tabular-nums` |
| Ticks | one 26×4 capsule per wing. Track `--track`, fill `max(4, 26·pct/100)` in the tint |
| Peek | width `max(500, 185+240)` = 500. Radii 19/24. Content inset `rt + 20` |
| Peek header | inside the 32pt band beside the housing: `plan` at the left, `updated` at the right, caption 10pt `--fg-2`, with a 197pt gap (housing + 12) |
| Peek body | 12pt gap, then three equal columns. Each: ring 54 (stroke 5, round cap, 12 o'clock clockwise, track `--track`, session projected arc pct→projected at 30% in the tint), ring % 15pt semibold white (bold >85, red stroke >85), 6pt, label 11pt medium white, 2pt, reset caption 10pt `--fg-2`, forecast caption 10pt medium (the row is reserved in all columns when any has one). Bottom 12; +16 above a limit note. About 166pt tall |
| Pinned | width 560, radii 19/24. The header adds an 8pt pin SVG after `updated` (no emoji) |
| Pinned rows | 8pt row gap, 12pt column gap. Columns: label 84pt (11pt white) · spark 44×14 (area in tint at .28, 1pt line at .85) · bar flex, 6pt capsule (track `--track`, fill `max(6, w·pct/100)`, session **projected tick** 2×10pt at `projected` in the tint, clamped with a 2pt red cap past 100) · pct 38pt right-aligned 11pt medium (bold >85) · reset 96pt right-aligned caption `--fg-2` |
| Hint | a centred caption row, `--fg-2`: `Hover to peek · click to pin · right-click for settings & Quit` |
| No-notch pill | NotchShape flush with the top edge, collapsed radii, width 117 (percent) / 101 (ticks), height 24. Both metrics side by side, separated by a 1×10 `--track` capsule with a 10pt gap. No housing. Expanded states keep their widths with a 12pt top inset instead of the notch band. Check against `snaps2/collapsed-nonotch.png` |

**Shape path** (port of `NotchShape.path`, quad curves, top corners flare outward):

```js
export const notchPath=(w,h,rt,rb)=>`M0 0Q${rt} 0 ${rt} ${rt}L${rt} ${h-rb}Q${rt} ${h} ${rt+rb} ${h}L${w-rt-rb} ${h}Q${w-rt} ${h} ${w-rt} ${h-rb}L${w-rt} ${rt}Q${w-rt} 0 ${w} 0Z`;
```

### 4.4 DOM, rendering and morph

```html
<div class="island" data-state="collapsed" data-material="solid" data-display="percent" style="--u:2px">
  <button class="island__hit" type="button" aria-expanded="false" aria-controls="…" aria-label="Claude usage, session 46 percent, Opus 62 percent"></button>
  <div class="island__shadow" aria-hidden="true"></div>
  <div class="island__backdrop" aria-hidden="true"></div>                 <!-- frosted/glass, clip-path:path(d) -->
  <svg class="island__shape" aria-hidden="true"><path class="fill"/><path class="rim"/><path class="rim-hot"/></svg>
  <div class="island__housing" aria-hidden="true"><i class="lens"></i></div>
  <div class="pane pane--collapsed" aria-hidden="true">…wings…</div>
  <div class="pane pane--peek" role="group" inert>…rings…</div>
  <div class="pane pane--pinned" role="table" aria-label="Claude usage limits" inert>…rows…</div>
  <p class="sr-only" role="status"></p>                                   <!-- updated on state change only -->
</div>
```

- The root is `position:absolute; left:50%; top:0; translateX(-50%)`. Its parent reserves only the collapsed size, so morphs never reflow siblings.
- **Morph:** GSAP tweens the proxy `{w, h, rt, rb}`. `onUpdate` writes the path `d` (fill, rim, rim-hot), the backdrop `clip-path:path()`, the hit-area size and `--w`/`--h`. There are no layout reads: pane sizes are measured once per `scale` change with a ResizeObserver.
  - Open uses `SPR.open`; close uses `SPR.close`.
  - `modeTimeline` uses the `island` ease for scrubbing.
- **Panes** are laid out at final size and never reflow.
  - Enter: `opacity 0, blur(8px), scaleX(.6)` → rest over .3s `settle`, delay .06s, origin top centre (the Alcove squeeze).
  - Leave: → `opacity 0, blur(4px), scaleX(.3)` over .18s.
  - Rings draw from 0 on first reveal (`pathLength="100"`, dashoffset). Bars and ticks use `scaleX` from the left. The projected tick uses `translateX`.
- **Hover nudge** (collapsed, interactive): scale 1.03 from the top centre, so it never detaches from the edge. Press: .97.
- The shadow layer's opacity follows the state (0 collapsed, 1 expanded). `filter` is never animated on the shape.
- **Scale changes are collapsed-only.** The mobile page island switches scale before expanding.

### 4.5 Canonical demo data (`lib/demo.js`)

```js
export const DEMO = { plan:"Max 20x", updated:"just now",
  session:{ pct:46, resetIn:2*3600+13*60, projected:71, forecast:{ exhaustsIn:72*60 }, spark:spark("s",46,{drop:true}) },
  weekly: { pct:38, reset:"Sat 1:05 PM", spark:spark("w",38) },
  models:[{ name:"Opus", pct:62, reset:"Sat 1:05 PM", spark:spark("o",62) }] };
```

The collapsed wings read **46% teal · 62% amber** (Opus is tighter than weekly). That is correct app behaviour, so show it everywhere.

### 4.6 Right-click menu (`menu.js`), in the app's real order

- **Opens on:** `contextmenu`, Shift+F10, the ContextMenu key, a 500ms long-press on touch, or a visible `⋯` button that appears on hover/focus at the island's right edge and is always visible on touch.
- `preventDefault` only on islands.
- **Look:** 260px wide, `rgb(40 40 42/.82)` with `backdrop-filter:blur(30px) saturate(1.6)`, radius 10, a 1px `rgb(255 255 255/.12)` border, `--sh-float`. `--f-ui` 13px `--fg`, 22px rows, 5px padding, separators `rgb(255 255 255/.1)`. The highlight row is `rgb(176 168 237/.28)` (lavender, instead of system blue) with radius 5.
- **Motion:** opens from the pointer corner, scale .96→1 plus opacity over 140ms `settle`.
- **Accessibility:** `role="menu"`, `menuitem` / `menuitemcheckbox` / `menuitemradio`, roving tabindex, arrow keys, Enter, Esc returns focus to the trigger. It closes on outside click or scroll.

**Items:**

1. `Session  46% · resets in 2h 13m`, `Weekly  38% · resets Sat 1:05 PM`, `Opus  62% · resets Sat 1:05 PM`. These are disabled, live from `isl.data`, with a 6px metric-colour dot.
2. separator
3. **Refresh now:** "just now" dips in opacity while it refetches (product UI never scrambles); digits do a same-value roll. **Easter egg:** a second click within 10s sets the header to the real throttle string `just refreshed · updating in 180s`, counting down each second, and reverting to "just now" at 0 or after 12s.
4. **Open usage on claude.ai:** a real link to `https://claude.ai/settings/usage`, `target="_blank" rel="noopener"`.
5. separator
6. **Appearance ▸** with the submenu `Solid` / `Frosted` / `Liquid Glass` (radio, checkmark on the current one) → `setOption("material")`.
7. **Show percentages** (checkbox, **on** by default) → `display`.
8. **Burn-rate estimates** (checkbox, on) → `burnRate`.
9. **Usage notifications** (checkbox, **off**; opt-in like the app) → hook `onNotifications(bool)`.
10. **Menu bar item** (checkbox, off) → hook `onMenuBar(bool)`.
11. **Launch at login** (checkbox, off) → checkmark only, plus a 2.4s toast: `Saved — for real once it’s installed on your Mac.`
12. separator
13. **About Claude Meter:** a small card with the icon (64px, `/assets/icon-256.png`), `Claude Meter`, `Version 1.2 (3)` and `© 2026 Yiftach Freeman. Not affiliated with Anthropic.` Esc or click closes it.
14. **Quit Claude Meter:** `isl.quit()`. The panes squeeze into the housing (`SPR.close`), the width tweens to the housing (185), and the wings disappear. After 900ms an ink pill appears under the notch: `Quit. (It’s that easy.) Relaunch ↺`, a button that calls `relaunch()`, which springs the island back with `SPR.open`.

Each section passes hooks. Toggles persist to `localStorage` inside try/catch, as a per-viewer convenience only.

### 4.7 Interaction, accessibility, reduced motion

- **Pointer:** 200ms dwell → peek. Leave (not pinned) → collapse after a 120ms grace. Click toggles pinned. Esc, or an outside click while pinned, collapses.
- **Keyboard:** focus → peek after 200ms. Enter/Space → pin toggle. Esc → collapse and restore focus.
- **Focus-visible:** a 2px `--teal` outline following the shape (a `drop-shadow` pair on an outline twin path), offset 3px.
- **Touch:** tap cycles peek → pinned → collapsed. Long-press opens the menu. There is no hover dependence.
- **Reduced motion:** every morph and roll is instant (at most a 120ms crossfade). No hover nudge, no key light. Everything else still works.

### 4.8 macOS banner (`banner.js`)

- **Look:** 340px wide (`min(340px, 100% - 24px)`), radius 16, `rgb(30 30 32/.72)` with `backdrop-filter:blur(30px) saturate(1.6)`, a 1px `rgb(255 255 255/.1)` border.
- **Contents:** app icon 32px (`/assets/icon-256.png`), a `CLAUDE METER` caption (11px `--fg-2`), `now` at the right, then the title (SF 13 semibold `--fg`) and body (SF 13 `--fg-2`).
- **Motion:** enters from `x:+110%` with `SPR.open`; exits to `x:+110%` with an opacity fade. Stacks newest on top, 3 max.
- **Real app copy only** (`Notifier.swift`):

| Event | Title | Body |
|---|---|---|
| Session threshold | `Session at 50%` / `80%` / `95%` | `50% used · resets in 2h 13m` (reset format as the app) |
| Weekly / model threshold | `Weekly limit at 80%` / `95%`, `Opus limit at 80%` / `95%` | same body format |
| Reset | `Session reset` | `Your 5-hour window is back to full.` |
| Reset (weekly or model) | `Weekly limit reset` / `Opus limit reset` | `Back to full.` |

---

## 5. Global elements (architect)

### 5.1 The band (header = the Mac's menu bar)

- `<header class="band">`: fixed, top 0, full width, z 80. Its background layer is `#000`.
- **Heights:**
  - desktop: 40px
  - mobile: 44px
  - hero: the stage display's black top is continuous with the band, so they read as one bezel
- **Screen corners:** two fixed 18px paper-coloured quarter-circle cutouts sit directly under the band's left and right ends, so the viewport reads as a display's top corners. Under `html[data-night]` they turn black (invisible).
- **Left** (white, macOS menu-title style, `--f-display` 14px wght 600 wdth 100):
  - the app icon at 18px (`/assets/favicon.png`)
  - **Claude Meter** (wght 760)
  - `How it works` → `#stage` with `data-progress=".16"`
  - `Privacy` → `#privacy`
  - `FAQ` → `#faq`
  - Hover: a `rgb(255 255 255/.12)` rounded 4px highlight behind the item, padding `0 8px`, exactly like a macOS menu title.
- **Centre:** the notch housing (185×32pt at nav scale 1.25 = 231×40px) holding the **nav island** (§5.3).
- **Right:**
  - **Status item slot** (hidden by default): `lib/band.js` exports `statusItem(on, data)`. It shows the app's real menu-bar item as `46%  38%`: session in teal, two spaces, weekly (all models) in lavender, SF 11 medium tabular, red and bold above 85, or `▮` blocks in ticks mode. The stage menu's "Menu bar item" toggle uses it.
  - A live local clock in macOS format (`Tue 2:47 PM`, via `toLocaleString` weekday short plus time; updates each minute), mono 13px `--fg-2`, hidden under 1024px.
  - The **GitHub star** (menu-title style): octocat + `Star` + the live count after a hairline (`data-cta="github"`, hidden on phones).
  - The **band Download pill**: `--fg` background, `--ink` text, 13px wght 650, 28px tall, radius 999, with a 14px ring glyph that fills on hover. It links to `/ClaudeMeter.dmg`, has the `download` attribute and `data-cta="mac"`, and reads `Download`. On Windows (`html[data-os="windows"]`) it is replaced by `Windows waitlist` (`data-cta="windows"`).
- **Mobile (<768px):**
  - Left is the icon only. Right is the ↓ icon button (`aria-label="Download Claude Meter for Mac"`).
  - The menu links live in the nav island's pinned table, and the island's `aria-describedby` says "Menu: open the island".
  - Island scale is `min(1, (vw − 112)/277)`.
- **Skip link:** the first focusable element, "Skip to download", targeting `#finale-cta`.

### 5.2 Intro (≤ 1.2s, once per session)

Skip it when `sessionStorage['cm-intro']` is set, under reduced motion, or when `location.hash` is set. It is a fixed `#intro` overlay (z 110, `aria-hidden`), and the full hero is already painted underneath, so LCP is the hero H1.

| t | What happens |
|---|---|
| 0 | Black. Only the 7pt lens at top centre. Its highlight sweeps once (.2s) |
| .12s | The housing grows out of the lens: width 7→185pt, height →32pt (`SPR.open`) |
| .38s | The wings slide out. The **stage island** is born in place at hero scale, and both numbers count `00 → 46` and `00 → 62` (Roller, .5s) |
| .85s | The overlay retracts up into the band: `clip-path: inset(0 0 100% 0)` over .35s `edit`. Hero line reveals start at .9s |
| 1.2s | The overlay is removed and `sessionStorage` is set |

Any key, click or wheel jumps to the end (`tl.progress(1)`). Lenis is stopped during the intro.

### 5.3 The nav island: "the page has a limit too"

- An `Island` at scale 1.25 in the band's housing, `bezel:false`, `labels` mode, `live:false`.
- **Hidden while `#stage` is in view** (it has its own island in that exact spot): `yPercent:-130` with `SPR.close`. It also hides during `#wall` (which has `data-own-island`).
- It **springs in** (`SPR.open`) when the stage pin ends. The values scramble from demo data to page data (.6s), and a mono caption fades in under the band for 2.2s: `NOW METERING: THIS PAGE`.
- **Collapsed:**
  - Left (teal): `meter.scrolled` % of the page, red and bold above 85.
  - Right (lavender): sections read (a section counts once it is ≥60% read, shown as a %).
- **Peek (hover or focus):**
  - Header: `This page` on the left, `just now` on the right.
  - Rings:
    - `Page`: read %, caption `resets at the top`
    - `Sections`: %, caption `4 of 7`
    - `FAQ`: amber, the FAQ's opened %, caption `10 questions`
  - Forecast under ring 1, from `meter.velocity`:
    - scrolling down: `hits the bottom in 1m 12s` (amber; red under 60s)
    - idle or scrolling up: `on track — resets first`
  - Caption row: `This one meters the page. The real one meters Claude.`
- **Pinned = the table of contents.** `role="navigation" aria-label="Sections"`.
  - One row per section, each a real `<a href="#id">` routed through `scrollTo`: `Tour` (#stage), `The wall`, `Loop`, `Yours`, `Privacy`, `FAQ`, `The end`.
  - Each row: spark = that section's read history (sampled every 2s); bar = read %; pct; reset column = `§01`…`§07`.
  - A last row holds a full-width teal pill with ink text, `Download for Mac`.
- **Mobile:** tap goes straight to pinned (the TOC). Peek is skipped.
- **Finale override:** see §6.7.

### 5.4 The CTA: an island that opens (`.cta`, `cta.js`)

```html
<div class="cta-hang"><!-- 1px --rule line the CTA hangs from, full width of the CTA block -->
  <a class="cta" id="hero-cta" href="/ClaudeMeter.dmg" download data-cursor="free · one click">
    <svg class="cta__shape" aria-hidden="true"><path/><path class="rim-hot"/></svg>
    <span class="cta__row"><span class="cta__ring" aria-hidden="true"><svg viewBox="0 0 24 24"><circle class="trk"/><circle class="val" pathLength="100"/><path class="arrow"/></svg></span><span class="cta__label">Download for Mac</span></span>
    <span class="cta__meta">Free · v1.2 · macOS 14.4+</span>
  </a>
</div>
<p class="req">Free · v1.2 · macOS 14.4+ · Apple Silicon &amp; Intel<br><span class="seal" aria-hidden="true">✓</span> Signed &amp; notarized by Apple</p>
```

- **Shape:** a NotchShape (`notchPath`), black on paper and `--fg` on night.
  - **M:** 272×56, rt 10, rb 22.
  - **L** (loop and finale): 320×68, 22px label.
  - The shape's flat top sits exactly on the `.cta-hang` hairline, so the button *hangs* from it like the island hangs from the bezel.
- **Label:** `--f-display` 17px wght 700 wdth 92, white (ink on night). The ring is 22px: track `rgb(255 255 255/.2)`, value `--teal`, resting at 46%, with a ↓ arrow inside.
- **Hover/focus:** the shape morphs taller (56→86, `SPR.open`), exactly like a peek. `.cta__meta` enters with the pane recipe (mono 12px `--fg-2`). The ring FILLS to 100% (.5s) and turns red and bold past 85 on the way, a wink. The arrow drops 2px twice. Magnetic strength .3 (on the inner row). Key light.
- **Press:** scale .97.
- **Click:** a 120ms shake, the ring RESETs to 0 with a spring, and the label rolls to `Downloading…` for 2.4s. The download proceeds normally.
- **Reduced motion:** 86px tall at rest with the meta always visible. No morph.
- **Placement:**
  - `#hero-cta` (M, `--fg` variant on night)
  - `#mid-cta` (L, in `loop`)
  - `#finale-cta` (L)
  - The band has its own pill (§5.1).
- **The contract** (`lib/cta.js`; sections write markup only): `data-cta="mac"` opens the Mac dialog, `data-cta="windows"` the waitlist dialog, `data-cta="github"` links to the repo (a `[data-stars]` inside shows the count). Mac links keep `href="/ClaudeMeter.dmg"` as the no-JS fallback. The dialogs (`lib/signup.js`) load on the first intent. They are the island opened into a form: whatever island hangs in the notch tucks into its camera housing, the black panel grows out of that housing (`.bouncy(.4)`), the band stays crisp above the dim, the camera lens sits in the header, the submit is this CTA on night (`.cta--night`, same click choreography, label rolling to `Downloading…`), done views FILL a ring into a teal check, and on close the panel folds back into the housing and the island grows out again.
- **`.cta-ghost` (Windows):** the same NotchShape, dashed (dashed = forecast). It hangs under the primary tab inside its `.cta-hang` and rides the peek, or hangs from its own hairline elsewhere. Hover, keyboard focus or a Windows visitor fill it solid. The loop’s inline text link is the one small variant.
- **`.gh-chip` (GitHub):** octocat + label + a mono count capsule after a hairline; paper by default, it follows the contextual tokens into night sections, `.gh-chip--night` outside them. Hover rules the border in and tilts the octocat.

### 5.5 Cursor tag and grain

`initCursorTag()` (§3). The grain follows §1.5.

### 5.6 Footer

The footer lives inside `#finale` (§6.7) as `<footer>`.

---

## 6. Sections, in order

Scroll map (desktop / mobile):

| # | id | Pin | Length | Tone |
|---|---|---|---|---|
| 01 | `stage` | yes | 460vh / 320vh | a night display framed in paper |
| 02 | `wall` | yes | 320vh / 220vh | paper, with a night flood at the HIT |
| 03 | `loop` | no | ~140vh | paper plus ink bands |
| 04 | `yours` | no (sticky column) | ~150vh | paper, night desk |
| 05 | `privacy` | no | ~170vh | night zone |
| 06 | `faq` | no | auto | paper |
| 07 | `finale` | short pin | 160vh / 120vh | paper → iris black → paper, then night footer |

The build briefs are also returned to the orchestrator as structured output, with the same text.

### 6.1 `stage`: Hero + dolly-in tour (`data-own-island`, the spine; most senior builder)

See the `stage` brief (same text as the structured output). Summary: a night display framed in paper, a WebGL light beam from the notch, the liquid-fill squashable WALL, the island at 2×, an attract loop, and then a 460vh scrubbed dolly through six beats (collapsed → peek → pinned → forecast → red → notification).

### 6.2 `wall`: two afternoons, same refactor

See the `wall` brief.

### 6.3 `loop`: the loop, plus the mid CTA

See the `loop` brief.

### 6.4 `yours`: the playground

See the `yours` brief.

### 6.5 `privacy`: reads, never writes

See the `privacy` brief.

### 6.6 `faq`: questions, metered

See the `faq` brief.

### 6.7 `finale`: HIT → iris → reset, plus the footer

See the `finale` brief.

(The full briefs follow in §9, verbatim.)

---

## 7. Head, SEO, OG (architect, `web/index.html`)

- `<html lang="en">`. **Title:** `Claude Meter — Claude usage limits in your MacBook notch`.
- **Meta description:** `Free macOS app that turns your MacBook’s notch into a live gauge for your Claude Pro or Max limits: the 5-hour session, the weekly cap and per-model limits, with reset countdowns and a burn-rate forecast.`
- **Canonical:** `https://claudemeter.vercel.app/`.
- **OG:** `og:type website`, title, description, `og:image https://claudemeter.vercel.app/assets/og.png` (1200×630), `og:url`.
- **Twitter:** `twitter:card summary_large_image`.
- **Theme colour:** `theme-color #000000`.
- **Icons:** `/assets/favicon.png` and `/assets/apple-touch-icon.png`.
- **JSON-LD `SoftwareApplication`:**
  - name `Claude Meter`
  - `operatingSystem` "macOS 14.4 or later"
  - `applicationCategory` "UtilitiesApplication"
  - `softwareVersion` "1.2"
  - `offers` `{price:"0", priceCurrency:"USD"}`
  - `downloadUrl` "https://claudemeter.vercel.app/ClaudeMeter.dmg"
  - `author` Person "Yiftach Freeman"
  - `image` the icon-512 URL
- **JSON-LD `FAQPage`:** generated at build time by `build.mjs`, which parses the `#faq` `<details>` so the text is identical.
- **Landmarks:** `<header class="band">`, `<main id="top">`, `<footer>` (inside the finale). Exactly one `<h1>` (in the stage).
- **OG image** (`web/og.html` → `site/assets/og.png`, headless Chrome, 1200×630, DPR 1):
  - Paper `--paper` with grain.
  - Top: a black band 64px tall with the housing and a collapsed island at scale 2 (46% teal / 62% amber).
  - Left, three lines: "See the" (Anybody 560 wdth 75, 84px), **WALL** (900 wdth 150, 230px, a 3px ink outline with a teal hard-stop fill to 46% and a sine-wave top edge), and "*before* you hit it." (serif italic plus Anybody).
  - Bottom right, mono 18px: `Claude Meter · free for macOS`.

---

## 8. QA gates, truth check, build order

**QA script** (`web/qa.mjs`, architect; uses puppeteer-core with the system Chrome):
- Runs at 1440×900 and 390×844, plus a full pass with `prefers-reduced-motion: reduce`.
- Scrolls in 400px steps with 350ms waits and saves a screenshot per step to `scratchpad/qa/<run>/`.
- Captures 10-frame sequences at 60ms through the stage beats 02 and 05, the Wall HIT (progress .40–.47) and the finale iris.
- Logs console errors and long tasks (>50ms after load).
- Asserts `scrollWidth <= innerWidth` at 320, 375, 390, 768, 1024, 1440 and 1920.
- Runs a contrast check on paper text.
- **Look at every screenshot with the Read tool.** "It ran" is not "it's right".

**Acceptance:**
- **Alive at first paint:** the hero is live in the first second. With no JS, the page is complete and in reading order.
- **Island fidelity:** every state matches `snaps2`: ring 54/5, bar 6, widths 277/500/560, radii 6/14 and 19/24, red and bold above 85, an amber right wing when a model is tighter.
- **Reduced motion:** no Lenis, no pins (static compositions), no loops, no intro. All content is visible and every toy still works, instantly.
- **Keyboard:** Tab reaches the skip link, the band links, every island (Enter pins, Shift+F10 opens the menu), menus, switches, the lever, banner close buttons, FAQ summaries and every Download link. Focus is always visible.
- **Performance:** 60fps on an M1 Air during the stage pin. The beam pauses offscreen. JS ≤ 200 KB gz, fonts ≤ 200 KB.

**Truth check before sign-off.** Grep the built `site/index.html` for `closed source|official|testimonial|iPhone app|Anthropic’s|API key support`. There must be no hits except the legal line, the "not supported" lines and the "Is this made by Anthropic?" FAQ. `open source`, `MIT`, `GitHub` and `Star` are allowed (the repo is public, MIT); so are `Windows` hits that are the waitlist (label `Windows · join the waitlist`, promise "One email when Windows ships. Nothing else.") or the "not yet" FAQ. Every string on an island, menu or banner must exist in the Swift sources, or be a clearly site-only line (the page meter, toasts, the signup dialogs).

**Build order:**
1. **Architect:**
   - tokens.css and base.css (reset, grain, band, corners, cursor tag, CTA, banner, menu, `.req`, `.sr-only`, focus)
   - fonts and vendor
   - all of `lib/*`, plus `Island` with `island.css`, `web/island.test.html` and `web/island-derive.test.mjs`
   - the nav island and meter
   - the intro
   - `web/index.html` with the markers and SVG defs (`#cm-liquid`)
   - `build.mjs`, `og.html` → og.png, `qa.mjs`
   - stub `sections/*.html` and `js/*.js` so the page builds from minute one
2. **Seven builders in parallel**, one per section. `stage` goes to the most senior builder.
3. **Integrator:**
   - build, then QA at both viewports plus reduced motion
   - fix the seams: the nav-island hand-off at the end of the stage, `data-night` counts, pin spacing and refresh order, the finale override
   - run the truth check and the budgets

**Definition of done:** it could win Site of the Day, nothing on it could be mistaken for a template, and every sentence is true to the Swift sources.

---

## 9. Section build briefs (final)

### 9.1 `stage` — Hero + dolly-in tour (§01)

FILES: web/sections/stage.html, site/css/stage.css, site/js/stage.js, site/js/stage-beam.js. Most senior builder. Uses: Island, menu.js, banner.js, band.js, cta.js, numbers.js (Roller, scramble), split.js, squash.js, scribble.js, pin.js, loop.js, motion.js (SPR), demo.js.

MARKUP: `<section id="stage" class="s s--stage" data-own-island aria-labelledby="stage-title"><div class="pin"><div class="display">…</div></div></section>`. The display holds: `canvas.beam` + `.beam-fallback` (z0), `.numeral` (z1), `h1`, `.lede`, `.cta-hang` + `.req`, `.note` (hand-drawn), `.cue`, `.captions` (6 beats), `.ghost` cursor, `.stage-cam > .island-host` (z5).

LAYOUT (desktop 1440×900):
- `.pin` is 100svh with a paper background. `.display` is 100vw × 100svh, background `--night`, clipped to a paper frame: `clip-path: inset(0 var(--frame) var(--frame) var(--frame) round 0 0 var(--r-screen) var(--r-screen))`. The top edge is flush with the viewport, so its black joins the band into one bezel. Add a 1px inner top highlight `rgb(255 255 255/.06)`. Never animate margins; only animate this clip-path.
- **Island:** `new Island(host,{scale:3, bezel:true, data:DEMO})`. It renders at 3px/pt and `.stage-cam` scales it **down** (camera scale = target/3), so text stays crisp. The camera is anchored at the top centre with `transform-origin:50% 0`. Hero target is 2 (collapsed 554×64px); on mobile it is `min(1.1,(vw−24)/277)`. The first state is collapsed, reading 46% teal · 62% amber.
- **H1** `#stage-title`, DOM order `<span class="l1">See the</span> <span class="wall" data-cursor="squash">wall</span> <span class="l3"><em>before</em> you hit it.</span>`. Place the parts with CSS grid areas; the screen reader reads "See the wall before you hit it."
  - `.l1`: `--t-display`, `--fg`, top-left at 17vh.
  - `.l3`: `--t-display`, right-aligned across cols 6–12 at 34vh. "before" is Instrument Serif italic.
  - `.wall`: `text-transform:uppercase`, `--t-wall`, wdth 150 wght 900. It is anchored to the display bottom with about 6% of the letters cropped. Its font-size is fitted once per resize (one measurement) so W and L touch the gutters.
- **WALL is a liquid meter.** Each letter is `.ch` with two layers.
  - **Stroke layer:** `color:transparent; -webkit-text-stroke:max(1.5px,.14vw) var(--fg)`.
  - **Fill layer** (`aria-hidden`): `color:var(--fill-c)` and `clip-path:inset(calc(100% - var(--fill)) 0 0 0)`, where `--fill` is a registered `@property <percentage>`.
    - The top edge is a liquid surface: `mask-image` a repeating SVG sine wave, `mask-size:40vw 100%`, with `mask-position-x` looping over 3.2s linear inside `whileVisible`.
    - `--fill` = the stage island's session % (46%) and tweens over 1.2s on change.
  - **Colour:** teal ≤70, amber 70–85. Above 85 it is red and the stroke is 1.5× thicker (the bold rule).
  - **Width:** `font-stretch: clamp(50%, calc(var(--wscroll) * (1 - .55 * var(--sq))), 150%)`. `--wscroll` comes from the scroll (starts at 150%). `--sq` is per-char, from `squash()`: letters near the pointer squash flat and spring back.
- **Right column** (cols 9–12, top 17vh, max 380px):
  - **Lede** (`--t-lede`, `--fg-2`, key phrases in `--fg`): "Claude Meter turns your MacBook’s notch into a live gauge for your Claude plan: the 5‑hour session [● 46%], the weekly cap [● 38%], and any model limit your account reports [● Opus 62%]. Hover to peek. Click to pin. Stop finding out mid‑task."
  - **Chips:** `--night-2` background, 1px `--rule-night`, mono 13px `--fg`, a 6px teal/lavender/amber dot, 26px tall, `0 10px` padding, `nowrap`. Their numbers are Rollers bound to the island (update on its `interact`/`update` events).
  - Then `#hero-cta` (M, `--fg` night variant) hanging from a `--rule-night` hairline, and `.req` in `--fg-2`.
- **Hand-drawn note:** right of the island, about 24px under the band. It is an ink SVG arrow curling up to the island's right wing, plus Instrument Serif italic 22px `--fg-2` rotated −4°: "psst — it’s live. hover it." (on touch: "psst — it’s live. tap it.").
  - It draws with `scribble()` 1.6s after the intro.
  - Every 5s it nudges 3px toward the island (`--spring-play`).
  - It fades out for good after the first island interaction.
- **Scroll cue:** bottom-right, `mix-blend-mode:difference`, mono 12px: `SCROLL TO BURN THE SESSION ↓`, with a 26×4 tick bar filling on a 2.4s loop.

BEAM (`stage-beam.js`, raw WebGL1, about 90 lines, no library):
- One full-screen triangle and one fragment shader. The canvas renders at 0.5× CSS size × `min(devicePixelRatio,1.5)` and is composited with `mix-blend-mode:screen`.
- **Uniforms:** `uTime, uRes, uApex` (the notch's bottom centre in px), `uMouse, uIntensity, uTint[3], uW` (weights).
- **Cone:** apex at the notch, spreading to about 70% of the display width at the bottom. Soft `smoothstep` edges and a distance falloff.
- **Haze:** 3-octave value noise drifting slowly (`uTime*.03`).
- **Motes:** a hashed grid of soft points inside the cone, about 220 visible, drifting slowly up and sideways. The pointer repels them within 90px and adds 12% brightness under the cursor.
- **Tint:** teal near the apex, falling off to lavender and amber lower down. The weights are session%/100 for teal and the top model%/100 for amber. Update the uniforms on every island update.
- **Intensity:** .35 at rest.
- **Loading:** init via `requestIdleCallback` (fallback `setTimeout` 600) after the intro. Until then `.beam-fallback` shows: a CSS `conic-gradient(from 180deg at 50% 0, …)` of teal and lavender at low alpha, a bottom mask, `filter:blur(40px)`. The canvas cross-fades in over 600ms.
- **Fallback only (no canvas):** no WebGL, `navigator.connection?.saveData`, reduced motion, or mobile with `hardwareConcurrency ≤ 4`.
- The rAF pauses via `whileVisible(display)` and on a hidden tab. Export `setBeam({intensity, weights})` for the timeline.

ATTRACT LOOP (until the first pointerenter, focus or touch on the island; paused offscreen):
- 2.0s after the intro: `setState("peek")`, hold 2.6s, collapse.
- Then every 8s: collapsed for 5s, peek for 3s.
- Session +1 every 7s from 46 to 52 max, then hold. The chips, WALL fill and beam weights follow.
- It stops permanently on interaction.

REAL INTERACTION:
- The island is fully interactive before the pin starts and after it ends.
- Menu: `menu.js defaultItems` with these hooks:
  - Appearance → `material`
  - Show percentages → `display` (the WALL keeps reading the session %)
  - Usage notifications → on: toast "Notifications on. You’ll hear from it at 50, 80 and 95%."
  - Menu bar item → `band.statusItem(on, isl.data)`
  - Quit/Relaunch: built in.

DOLLY (`pinScene(root,{length:"460%", mobileLength:"320%", scrub:.8, build})`)
- One master timeline with labels b0–b6. Island data is timeline-driven through `isl.data` plus `render()` only: no rolls while scrubbing. State changes use `isl.modeTimeline()` nested in the master.
- `isl.lock(true)` for progress .02–.98.
- **Camera target scales** (px per pt), W = display width:
  - `S_col = min(3, .62·W/277)`
  - `S_peek = min(1.9, .5·W/500)`
  - `S_pin = min(1.7, .5·W/560)`
  - mobile: `S_peek=(vw−24)/500`, `S_pin=(vw−24)/560`
- **Desktop camera x:** during beats 02–05 the island centre moves to 62% of W (x = +.12W) so the captions fit on the left.

TIMELINE (progress):

| Progress | What happens |
|---|---|
| .00–.10 | **Dolly in.** The display clip-path opens to `inset(0 round 0)`. Focus pull: `.lede`, CTA, `.req` and `.note` go to y +60, blur(10px), opacity 0 (.00–.06); `.l1`/`.l3` the same (.02–.08). WALL `--wscroll` 150→60%, yPercent +30, opacity →0 (.00–.10). `setBeam` intensity .35→.6. Camera S_hero→S_col. The attract loop stops. |
| .10–.24 | **Beat 01 (collapsed).** The caption fades in. At .16 `setOption("display","ticks")`, and back to percent at .21 (`tl.call` both directions). |
| .24–.40 | **Beat 02 (peek).** The ghost cursor (22px macOS arrow SVG, white with a black stroke, `aria-hidden`) glides from the lower left onto the island (.24–.27). A 200ms-style dwell ring fills around its tip (.27–.29). Then `modeTimeline("collapsed","peek")` runs (.29–.34) while the camera goes to S_peek, x→+.12W. The rings fill 0→46/38/62 (.33–.38). The reset lines scramble in: "resets in 2h 13m", "resets Sat 1:05 PM". Under the session ring, in amber: "hits the cap in 1h 12m". |
| .40–.54 | **Beat 03 (pinned).** The ghost clicks (scale .9→1 plus a ripple) at .41. `modeTimeline("peek","pinned")` (.42–.47), camera → S_pin. Sparklines draw (DrawSVG on the line, then the area fades in, .46–.50). Bars fill. The session projected tick slides to 71. The header shows "Max 20x" and "just now" plus the pin glyph. The footer reads "Session hits the cap in 1h 12m" in amber. The ghost fades out by .52. |
| .54–.70 | **Beat 04 (forecast).** Session 46→71 (.55–.62), then 71→80 (.62–.68). The forecast exhaustsIn goes 72m→52m, and the footer text switches at the thresholds: amber "Session hits the cap in 1h 12m", then **red** "Session hits the cap in 52m" once under 60m (≈.66). The projected tick walks right and clamps at the end with a 2pt red cap. Beam weights shift toward amber. |
| .70–.84 | **Beat 05 (red).** Weekly 38→89: it crosses 85 at ≈.76 and turns red and bold. Opus 62→100 (.72–.80), red and bold. The footer is replaced by the limit note "● Opus limit reached · resets Sat 1:05 PM". The display gets a red vignette `radial-gradient(circle at 50% 0, rgb(242 107 107/.14), transparent 60%)` whose opacity = (weekly−85)/15. The camera does a ±6px scrubbed sine handheld drift. No shake. |
| .84–1.00 | **Beat 06 (nudges).** `modeTimeline("pinned","collapsed")` (.85–.88). The wings read 80% teal · 100% red bold. The camera pulls back to S_hero, x→0. At .87 a `tl.call` (forward only; the banner is removed on reverse) runs `showBanner(display)` with "Session at 80%" / "80% used · resets in 1h 5m". At .93 a second banner stacks: "Session reset" / "Your 5-hour window is back to full." The display clip-path returns to the paper frame (.94–1.0). Beam intensity →.25. |

BEAT CAPTIONS:
- **Position:** left column, x = gutter, vertically centred, width `min(30ch,32vw)`.
- **Parts:** mono index `01 / 06` (`--fg-2`), then an h3 (`--t-h3`, `--fg`) with one serif phrase, then body (`--t-body`, `--fg-2`).
- **Transitions:** out to y −24, opacity 0, blur 6px; in from y 24. Title first, body .06 later. Scrubbed.
- **Giant numeral** behind the captions: `--f-display` wdth 50 wght 900, 24vw, `-webkit-text-stroke:1.5px rgb(236 237 232/.22)`, transparent. A fill copy is clipped from the bottom to the beat's % in the beat's tint:

| Beat | Fill | Tint |
|---|---|---|
| 01 | 46 | teal |
| 02 | 46 | teal |
| 03 | 46 | teal |
| 04 | 80 | amber |
| 05 | 100 | red, with a 3px red stroke |
| 06 | 80 | teal |

  The digits scramble at beat boundaries.

COPY (final):
- 01 / 06 — **Two numbers, *hugging the notch.*** "Left: your 5‑hour session, in teal. Right: your weekly limit in lavender, or whichever model limit is tighter, in amber. Percentages by default. Tick bars if you prefer."
- 02 / 06 — **Hover. *Don’t click.*** "Rest the pointer on the notch for a beat and it opens: three rings, and exactly when each one resets."
- 03 / 06 — **Click, *and it stays.*** "Six hours of history per limit, a bar for each, a tick for where your session is heading, every reset time, and your plan in the corner."
- 04 / 06 — **It does the math *on your pace.*** "Burning fast? It tells you when you’ll hit the session cap: amber when it’s coming, red when it’s under an hour. Ease off and it says “on track — resets first.”"
- 05 / 06 — **Past 85%, *it gets loud.*** "Red and bold at once, so it reads even if red and green look alike to you. At 100% it tells you which limit, and when it’s back."
- 06 / 06 — **Or it taps you *on the shoulder.*** "Opt‑in alerts at 50, 80 and 95% of a session, at 80 and 95% of weekly and model limits, and once more when a tight window is back to full."

HAND-OFF: when the pin ends, `pin.js` shows the nav island (§5.3). The stage island keeps its timeline-driven state; at progress 0 it is back to the DEMO values.

MOBILE (<768px):
- **Display:** full width, 8px frame, 100svh.
- **Stack:** `.l1` and `.l3` at 14vw, left-aligned, padding-top 120px. WALL at 30vw under them. Then the lede at 16px, the chips, a full-width CTA, and `.req` at the bottom.
- **Height check:** if the content exceeds 100svh (check at 390×844 and 375×667), hide the chip sentence below 700px of height.
- **Squash:** off; the WALL "breathes" `--wscroll` 150↔120% on a 5s loop instead. The note says "tap it". The pin runs 320%.
- **Captions:** in the lower half under the island, with no left column and camera x = 0. The numeral is 40vw at .5 opacity behind the caption. The ghost cursor becomes a tap ripple.
- **Island:** tapping does nothing during the pin; it is interactive after the pin.
- **Beam:** half the motes, or the CSS fallback.

REDUCED MOTION (`.is-static`):
- No pin, no dolly, no attract loop, a static CSS beam, the WALL fill static at 46% with no wave, no squash, no intro reveals.
- The hero renders as designed, and the island is interactive with instant changes.
- Below the display, the six beats render as a list. Each row pairs a caption with a static Island (`interactive:false`, instant) in that beat's end state:
  1. collapsed
  2. peek
  3. pinned
  4. pinned, with the red "Session hits the cap in 52m"
  5. pinned with the limit note
  6. collapsed 80/100, plus two static banners
- Desktop is two columns (island right); mobile stacks. Islands are fitted to width.

---

### 9.2 `wall` — Two afternoons, same refactor (§02)

FILES: web/sections/wall.html, site/css/wall.css, site/js/wall.js. Uses: Island, pin.js, night.js (`setNight`), numbers.js (Roller, scramble), split.js, scribble.js, motion.js.

MARKUP: `<section id="wall" class="s s--wall" data-own-island aria-labelledby="wall-title">`. Running head: `§02 — THE WALL` on the left, live datum on the right `SESSION CLOCK 10:04` (it mirrors the terminal clock). `.pin` holds `.wall__night` (an absolute black layer, `clip-path:circle(0% at X Y)`), `.wall__bg` (a giant word), `.term`, `.bezel` + island, `.act` (label, H2 `#wall-title`, sub) and `.note`.

LAYOUT (desktop):
- **Background word:** "WALL", `--t-wall`, colour `--paper-2`, right-aligned and bleeding 12% off the right edge, z0, wdth 150.
- **Terminal** (cols 1–7):
  - Radius 20, background `#0E0F0E`, 1px `--rule-night`, `--sh-float`.
  - A 36px title bar: three 10px `#3a3a3a` dots (neutral, **not** traffic-light colours), a centred mono title `~/app — zsh` in `--fg-2`, and a mono clock Roller `10:04` on the right.
  - Body: mono 15px/1.6 `--fg`, padding `20px 24px`, 14 lines visible. New lines append at the bottom; the content scrolls with `translateY`.
- **Bezel** above the terminal (Act B only): a 36px black strip, top radius 12, holding the housing and `new Island(host,{scale:1.5, interactive:false, live:false})`.
- **Right** (cols 9–12): a mono act label (scrambles), the H2 (`--t-h2`, which swaps with line reveals), and a sub (`--t-lede`, `--ink-2`, max 30ch).

TERMINAL SCRIPT (generic; no Anthropic UI or logo):
```
$ claude "move billing to the new invoice API"
  › reading src/billing/*.ts (14 files)
  ✓ mapped 38 call sites
  › editing src/billing/invoice.ts        +128 −41
  › editing src/billing/tax.ts             +77 −12
  ✓ tests: 212 passed
  › editing src/billing/refunds.ts         +64 −30
  › editing src/billing/webhooks.ts       +164 −90
  › migrating fixtures (3 of 9)
```
- **Act A HIT line** (red `--red`, bold): `✕ usage limit reached · resets 15:04`
- **Act B** replaces lines 7–9 with:
```
  $ git commit -am "billing: invoice API, part 1"
  $ echo "next: refunds + webhooks" >> HANDOFF.md
  › paused on your terms.
```
- **Clock per line (Act A):** 10:04, 10:31, 11:02, 11:30, 12:14, 12:47, 13:22, 13:52, 14:40 → HIT 14:52. The window starts at 10:04 and resets at 15:04; these numbers are internally consistent, so keep them exact.

TIMELINE (`pinScene` 320% / 220%, scrub .8):

| Progress | What happens |
|---|---|
| .00–.05 | Act label `ACT ONE · NO METER`. H2 "10:04. Deep in a *refactor.*" Sub "Four hours of good momentum. Nothing on screen says how much is left." |
| .05–.38 | **FILL.** Lines type in: SplitText chars `autoAlpha 0→1`, stagger .004, sequential on the timeline. The clock rolls line by line. The background WALL goes wdth 150→50% linearly, xPercent −8, colour `--paper-2`→`--paper-3`. A 1px red outline pseudo-element on the terminal goes 0→.35 opacity (not box-shadow). |
| .38–.44 | **HIT.** The clock reads 14:52. The red line prints. `.wall__night` expands `circle(0% at <red line>)`→`circle(150%)` (.38–.42). `setNight("wall", .40<p<.47)`. H2 → "14:52. Limit reached. *Mid‑file.*" Sub → "Tests half‑migrated. Context gone. See you at 15:04." The previous 3 lines' chars **drop**: y +60, seeded rotate ±20°, autoAlpha 0, stagger .006, `power2.in`, scrubbed. The background WALL at 50% turns `--red`, wght 900. On the forward crossing only, `tl.call` shakes the terminal x 0,−6,5,−3,0 over 120ms. |
| .44–.54 | **RESET / rewind.** A mono chip `rewind ⟲` sits centred on the terminal. Lines un-type in reverse (ScrambleText to empty, scrubbed). The clock scrambles back to 10:04. The night circle shrinks to 0. The background WALL springs back to 150% on the `island` ease inside the scrub (visible overshoot), in its day colour. |
| .54–.58 | Act label `ACT TWO · SAME AFTERNOON, WITH A METER`. H2 "10:04. Same *refactor.*" Sub "This time the notch is keeping count." The bezel and island drop in from y −40 (`island` ease). Data: session 4%, weekly 38%, Opus 22%, so the right wing is weekly 38% lavender. Forecast null. |
| .58–.80 | Lines type again and the clock advances. Session: 10:31→12, 11:30→28, 12:47→50, 13:40→71. At **.66 (13:40)** `tl.call` → `setState("peek")` (both directions). The forecast exhaustsIn is 72m, amber "hits the cap in 1h 12m", with the projected arc to 100. H2 "13:40. It sees the wall *coming.*" Sub "At this pace you run out at 14:52. That’s an hour and change to land the plane." A hand-drawn arrow (DrawSVG) runs from the island's forecast to a margin note in serif italic 22px, ink: "commit. write it down. stop clean." At **.74 (13:53)**: session 75, and the forecast rolls to **red** "hits the cap in 59m". |
| .80–.92 | The Act B lines type. Session 84 (still teal; 85 is the line). `tl.call` → `setState("pinned")`. The pinned footer is red "Session hits the cap in 22m", and the session reset reads "resets in 34m". H2 "14:30. Committed. *Notes written.*" Sub "Stopped at a clean line, not a cliff." |
| .92–1.00 | Centred under the terminal, Instrument Serif italic at `--t-h3`×1.2: "An hour’s notice beats a hard stop." A teal-ink hand-drawn strike-zigzag draws across the background WALL (DrawSVG). |

MOBILE:
- **Stack:** the headline on top (`--t-h3`×1.3), then the bezel and island (scale 1 collapsed; when pinned, `min(1,(vw−32)/560)` via `setOption` while collapsed), then the terminal.
- **Terminal:** 13px, 10 lines, each line truncated with `text-overflow:ellipsis`.
- **Background WALL:** 60vw, rotated −90° along the right edge, opacity .6.
- Pin 220%.

REDUCED (`.is-static`): no pin and no rewind. Two panels, side by side on desktop and stacked on mobile.
- **A:** a night card with the full Act A log plus the red line, the H2 "14:52. Limit reached. Mid‑file." and its sub.
- **B:** paper, with the Act B log plus a static pinned island (session 84, red "Session hits the cap in 22m"), the H2 "14:30. Committed. Notes written." and the serif closing line.

---

### 9.3 `loop` — The loop + mid-page CTA (§03)

FILES: web/sections/loop.html, site/css/loop.css, site/js/loop.js. Uses: Island (static instances), marquee.js, numbers.js (Roller), split.js, cta.js, loop.js, magnetic.js.

MARKUP: `<section id="loop" class="s s--loop" aria-labelledby="loop-title">`. Running head: `§03 — LOOP` on the left, `EVERY 5 MIN · SOONER WHEN YOU HOVER` on the right. Use `overflow-x:clip` on the section (never on body). About 140vh, not pinned.

STRIP A (live states):
- **Band:** a 100vw+ band rotated −3°, 250px tall (mobile 180px), background `--night`, padding `22px 0`.
- **Frames:** 300×180 (mobile 210×126), gap 20, radius 14, background `#0D0E0D`, 1px `--rule-night`. Each frame is a mini screen:
  - a soft radial wash of one metric colour at .12
  - a static island (`interactive:false, live:false`) hanging from the frame top, scale `(frameW−24)/560` for all states
  - a caption under the frame: mono 11px `--fg-2`, uppercase
- **Frames (8, true states):**
  1. `01 · COLLAPSED · 46% / 62%`
  2. `02 · COLLAPSED · TICK BARS`
  3. `03 · PEEK · RINGS`
  4. `04 · PINNED · MAX 20X`
  5. `05 · FORECAST · 1H 12M` (peek, amber line)
  6. `06 · LIMIT · OPUS 100%` (pinned with the red note)
  7. `07 · NO NOTCH · PILL` (`notch:false`)
  8. `08 · FIRST LAUNCH` (pinned, `hint:true`)
- **Motion:** `marquee(track,{speed:45, dir:-1, velocity:true})`.
- **Hover/focus on an original frame** (`tabindex=0`, `aria-label` = its caption, `data-cursor="hover to play"`):
  - the strip eases to 0 speed over .4s and the frame scales 1.06 (`--spring-play`)
  - its island plays one morph to its next state and returns after 1.6s: collapsed→peek, peek→pinned, pinned→collapsed, pill→peek
  - only one frame animates at a time
  - clones (`aria-hidden`, inert) only scale

STRIP B (display marquee):
- **Band:** overlaps A by −40px, rotated +2°, background `--ink`, 22vh tall (mobile 16vh). Type is `--f-display` wght 820 wdth 70 at 11vw (mobile 18vw), `--paper`. It moves right at 70px/s with velocity reaction.
- **Content:** `46% · resets in 2h 13m · hits the cap in 1h 12m · 89% · on track — resets first · Opus limit reached · 38% · just now ·`
  - Numbers are in metric colours: 46 teal, 38 lavender, 89 red and bold.
  - The separator is a 0.35em-tall 26×4 capsule, track `rgb(255 255 255/.13)`, partly filled teal.
- **Live:** every 2s, the number span nearest the viewport centre rolls (Roller) to a new plausible value (teal 30–70, lavender 20–60; >85 is red and bold). At most one roll per 2s, inside `whileVisible`.
- **Counter-parallax:** both strips move scrubbed across the section, A `x:−6%` and B `x:+6%`, on top of the loops.

CTA BLOCK (12-col, after the strips):
- **Left** (cols 1–7):
  - H2 `#loop-title` (revealLines): "Free. Open source." / "No Dock icon. *Just the notch.*"
  - Body `--t-lede` `--ink-2`, max 40ch: "The notch is already there, doing nothing but holding a camera. Claude Meter moves into the space around it. No window to lose, nothing to sign up for."
  - `#mid-cta` (L, `data-cursor="v1.2 · one click"`) hanging from a hairline, then `.req`.
- **Right** (cols 9–12):
  - `/assets/icon-512.png` at 240px. It floats on a 6s ±6px bob (`whileVisible`) and tilts toward the pointer, rotateX/Y max 8° (`quickTo` .6s, perspective 800px).
  - A soft contact-shadow ellipse under it scales inversely with the bob.
  - A mono caption under it: `V1.2 · NEW LIQUID GLASS ICON`.

MOBILE: the strips use the sizes above. The CTA block stacks with the icon (140px) above the H2, and the CTA is full width.

REDUCED:
- **Strip A:** static, with frames in `overflow-x:auto` plus scroll-snap so they stay browsable.
- **Strip B:** a static single line clipped with a right-edge fade mask. No rolls.
- **Icon:** no bob, no tilt.
- **Text:** H2 visible.

---

### 9.4 `yours` — Make it yours (the playground) (§04)

FILES: web/sections/yours.html, site/css/yours.css, site/js/yours.js. Uses: Island, menu.js (with hooks), banner.js (`flick:true`), Draggable + InertiaPlugin, motion.js (SPR), loop.js, numbers.js.

MARKUP: `<section id="yours" class="s s--yours" aria-labelledby="yours-title">`. Running head: `§04 — MAKE IT YOURS` on the left; on the right a live `APPEARANCE ▸ SOLID` that updates with the setting. About 150vh.

LEFT (cols 1–4, sticky top 96px):
- H2 `#yours-title`: "Make it *yours.*"
- Lede: "Everything lives behind one right‑click. Try it on the island here. It’s the real menu, and every switch below is a setting in the app."
- Mono fact list, each item with a tiny 26×4 teal tick bar:
  - `NO DOCK ICON`
  - `HIDES IN FULL‑SCREEN APPS`
  - `LAUNCH AT LOGIN`
  - `UPDATES EVERY 5 MIN · AND ON HOVER`

RIGHT (cols 5–12): THE DESK. Radius 28, aspect 16/10 (mobile 4/5), `overflow:hidden`, background `--night-2`.
- **Wallpaper:** three blurred radial blobs, each 60% of the desk with `filter:blur(60px)`: teal .35 alpha, lavender .35, amber .25. They drift on CSS keyframes (22s / 27s / 31s), with `whileVisible` toggling `animation-play-state`. This is the only place blobs are allowed: they are the desktop behind the glass.
- **Menu bar:** 24px strip, `rgb(0 0 0/.28)` with blur 20.
  - Left: "Finder  File  Edit  View  Window", SF 12px white .85. No Apple logo.
  - Right: a status-item slot (hidden) and the real local time.
  - The menu bar is split around the notch like a real Mac.
- **Island:** at the desk's top centre with its housing, scale 1.4 (mobile `min(1,(deskW−24)/560)` via `setOption` while collapsed), interactive, `data-cursor="right-click me"`, material solid, DEMO data.
- **Windows:** two paper-coloured windows (radius 12, 14px title bar with three grey dots, grey text lines) drift horizontally behind the island on 14s and 19s sine ping-pong loops, so Frosted and Liquid Glass visibly shift.
- **Key light** is on. **Shimmer egg:** in Liquid Glass, pointer speed over the island >1200px/s spikes `#cm-liquid` `feDisplacementMap scale` 18→34, decaying with `SPR.close`.
- **PACE LEVER.** Desktop: vertical, inside the desk's right edge, 24px inset.
  - A 180px track and a 44px knob (Draggable type y, bounds, inertia). Mono labels: `PACE` above, `vibe‑coding` at the top end, `easy` at the bottom.
  - `role="slider"`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow`, `aria-valuetext` = the current forecast string. Arrow keys ±10.
  - **Mapping:**

| Knob | Forecast |
|---|---|
| 0–15% | `{clears:true}` → "on track — resets first"; session holds |
| 15–70% | amber, from "hits the cap in 2h 5m" down to "hits the cap in 1h 0m" |
| 70–100% | red, from "hits the cap in 59m" down to "hits the cap in 38m" |

  - While the knob is above 15%, session climbs +1% per tick, with the interval scaling from 600ms down to 150ms as pace rises.
  - **Release:** the knob springs back to "easy" over 1.2s (`--spring-play`). The value holds, then the forecast cools to "on track — resets first".
- **NOTIFICATIONS** (only while "Usage notifications" is on): when session crosses 50, 80 or 95, `showBanner(desk,{flick:true})` fires with the real copy, "Session at 80%" / "80% used · resets in 1h 5m", taking the body's reset from the island data.
  - **Flick:** velocity >600 or distance >120 flies it off with a rotation proportional to the throw; otherwise it snaps back with `--spring-play`.
  - Auto-dismiss after 6s, 3 max, a close button always present, `data-cursor="flick →"`.
- **CONTROLS** (below the desk; frosted-paper panel `rgb(237 238 233/.8)` with blur 16, radius 24):
  - **Appearance:** segmented radiogroup `Solid | Frosted | Liquid Glass`. The thumb slides with `--spring-play`.
  - **Switches:** `<button role="switch" aria-checked>`. The thumb travels with `--spring-play` and squashes scaleX 1.25 mid-travel.
    - `Show percentages` (on)
    - `Burn‑rate estimates` (on)
    - `Usage notifications` (off)
    - `Menu bar item` (off)
  - **Display:** segmented `MacBook | External display`. External → `setOption("notch",false)`: the desk's housing width tweens to 0, the menu bar joins up, and the island becomes the compact pill.
  - **Menu bar item on:** the desk's status item shows session % teal, two spaces, weekly % lavender, SF 11 medium tabular (▮ blocks in ticks mode), red and bold >85.
  - **One store in `yours.js`.** Menu hooks and controls call the same setters and stay in sync.
- **LINKS** under the controls (mono 13px, a wavy underline draws on hover):
  - **"Simulate a busy hour":** a 4s tween of session 46→97 (fires the 50/80/95 banners if notifications are on). Then, 1.2s later, a RESET to 3 with `SPR.close` and the "Session reset" / "Your 5-hour window is back to full." banner (if on).
  - **"Open a full‑screen app":** one window scales up from its drift position to cover the desk (.4s `edit`). The island hides (scaleY 0 into the housing, `SPR.close`) and a caption appears: "Out of the way in full‑screen apps." The label becomes "Leave full screen". Click again or press Esc to reverse; the island returns with `SPR.open`.
- **Easter eggs** (built into `menu.js`): Refresh twice → "just refreshed · updating in 180s". Quit → "Quit. (It’s that easy.) Relaunch ↺".

MOBILE:
- The left column stacks above. The desk is 4/5 at full width.
- Controls wrap as chip rows. The lever becomes a horizontal range under the desk (same mapping).
- A visible "⋯ Open menu" button sits under the desk. Long-press also opens the menu. Flick works with touch.

REDUCED: blobs and windows static (the windows placed half behind the island). The lever is a plain `input[type=range]`. Banners appear and disappear without motion, with close buttons. All toggles are instant and everything still works.

---

### 9.5 `privacy` — Reads. Never writes. (§05)

FILES: web/sections/privacy.html, site/css/privacy.css, site/js/privacy.js. Uses: night.js (`nightZone`), scribble.js, numbers.js (Roller, scramble), reveal.js, loop.js.

MARKUP: `<section id="privacy" class="s s--privacy" data-night aria-labelledby="privacy-title">`. `nightZone(root)` covers the whole section: background `--night`, text `--fg`. Running head: `§05 — PRIVACY` on the left, `3 HOSTS · 0 ANALYTICS` on the right. About 170vh.

HEADLINE (`#privacy-title`, full width, two lines):
- **"Reads."** at `--t-wall`×.55, wght 900. wdth is scrubbed 60→130% over the section's first 40%.
- **"*Never* writes."** at `--t-h2`×1.4.
  - "Never" is Instrument Serif italic in `--red`, with a one-time ScrambleText through "✕—" before it settles.
  - "writes." gets a teal highlighter swipe (`--hl-teal` `::after`, scaleX 0→1, .6s `edit`, on enter).

LEAD (`--t-lede`, `--fg-2`, max 46ch): "Claude Meter uses the sign‑in Claude Code already saved on your Mac. It reads it from the macOS Keychain, through Apple’s own security tool, or from ~/.claude/.credentials.json, and never changes it. Short‑lived tokens are refreshed in memory, never written back."

NETWORK DIAGRAM: an inline SVG, viewBox 1200×440, max-width 1100px. On mobile it is a vertical variant, viewBox 400×720.
- **Left node:** `/assets/icon-256.png` at 96px, with a mono label `YOUR MAC`.
- **Three curved paths** to host chips (mono 14px, 1px `--rule-night` pill, with a dot in the path's colour):
  - `api.anthropic.com` — "your usage numbers" (teal)
  - `platform.claude.com` — "token refresh, kept in memory" (lavender)
  - `claudemeter.vercel.app/version.json` — "once a day: is there an update?" (amber)
- **Drawing:** the paths draw with DrawSVG on enter, stagger .2.
- **Packets:** 4px dots in the path colour travel Mac → host → Mac using CSS `offset-path: path(…)` keyframes: usage every 2.8s, token every 7s, version every 12s. `whileVisible` toggles `animation-play-state`.
- **Fourth path:** dashed, `--red`, toward a chip `anything else`.
  - It draws halfway, then a red ✕ stamps (scale 1.4→1, `--spring-play`) and the dashed line retracts.
  - Caption: "nobody. that’s the list."
  - It never carries a packet.

THREE COLUMNS (4/4/4, each with a top rule and a mono head):
- **READS:** "The sign‑in Claude Code already saved on this Mac. Read‑only: Claude Meter never writes to it."
- **TALKS TO:** "api.anthropic.com for your usage. platform.claude.com when a short‑lived token needs refreshing. This site, once a day, to check for updates."
- **NEVER:** "Analytics. An account. A server of our own. Writes to your sign‑in." Under it, the mono line `analytics · accounts · servers · writes` gets a red hand-drawn strike-zigzag (scribble) on enter.

ODOMETERS (5 cells):
- Digits in Geist Mono wght 300 at `--t-h2`, with mono captions.
- On enter, Rollers roll from random to final values, stagger .12.

| Value | Caption |
|---|---|
| `0` | analytics |
| `0` | accounts |
| `0` | servers of ours |
| `3` | hosts, total |
| `5` | min between checks (sub-caption "never faster than 3") |

SMALL PRINT (`--fg-2`, 15px): "Works with Claude Pro and Max sign‑ins from Claude Code. API‑key (Console) logins and a custom CLAUDE_CONFIG_DIR aren’t supported."

MOBILE: the diagram is vertical, the columns stack, and the odometers sit in a 2-column grid with the last cell spanning both.

REDUCED: everything pre-drawn. No packets, no rolls (final values shown), no scramble. "Reads." is static at wdth 100.

---

### 9.6 `faq` — Questions, metered. (§06)

FILES: web/sections/faq.html, site/css/faq.css, site/js/faq.js. Uses: meter.js (it reports opened/10 to the nav island's FAQ ring), notch-path.js, numbers.js (Roller), split.js, smooth.js (`scrollTo`).

MARKUP: `<section id="faq" class="s s--faq" aria-labelledby="faq-title">`, on paper. Running head: `§06 — FAQ` on the left; on the right a live `0 OF 10 OPENED` (Roller). `build.mjs` parses these `<details>` into the FAQPage JSON-LD, so keep the text in plain markup.

LAYOUT:
- **Left** (cols 1–4, sticky):
  - H2 `#faq-title`: "Questions, *metered.*"
  - Mono sub: `EACH ANSWER YOU OPEN USES A LITTLE OF THIS PAGE’S SESSION.`
- **Right** (cols 5–12): 10 native `<details>` rows (no `name`, so several can be open). Each row has a top hairline and `padding:28px 0`.
- **`<summary>`:**
  - Left: a mono % label `00%`, `10%` … `90%` in `--ink-3`, turning `--teal-ink` on hover or open.
  - The question in `--t-h3` wdth 90, going to wdth 100 on hover (.3s).
  - Right: a 22px inline SVG NotchShape glyph (collapsed proportions) that morphs to a peek shape when open (path `d` tween .44s with the `island` ease).
- **Bar:** under the summary, a 6pt capsule, full width, track `--rule`, fill `--teal`. On first open it goes scaleX 0→1 over .5s and **stays filled** (used).
- **Answer:** `--t-body`, `--ink-2`, max 60ch, fading up 12px.
- **Open animation:** `:root{interpolate-size:allow-keywords}` plus `details::details-content{block-size:0;overflow:clip;transition:block-size .5s var(--ease-edit),content-visibility .5s allow-discrete}` and `details[open]::details-content{block-size:auto}`. Where unsupported, it simply opens.
- **After the list:** a mono button. It shows `N of 10 opened` in `--ink-3` until all 10 are opened. Then it becomes `100% — you’ve read everything. Resets at the top ↑` in `--ink`, and clicking it runs `scrollTo(0)`.

Q&A (final; verbatim in the JSON-LD):
1. **Is it actually free?** Yes. No trial, no account, nothing to upgrade to. It’s signed with an Apple Developer ID and notarized by Apple, so macOS opens it without a fight.
2. **What do I need?** A Mac on macOS 14.4 or later (Apple Silicon or Intel) and Claude Code signed in with a Claude Pro or Max plan. API‑key (Console) logins and a custom CLAUDE_CONFIG_DIR aren’t supported.
3. **What does it do with my sign‑in?** It reads the credentials Claude Code already saved (the macOS Keychain first, then ~/.claude/.credentials.json) and never writes to them. When a short‑lived token needs refreshing, the new one lives in memory only.
4. **Who does it talk to?** Three places: api.anthropic.com for your usage, platform.claude.com to refresh a token, and this site’s /version.json once a day to check for updates. No analytics, no account, no server of ours.
5. **How fresh are the numbers?** It refreshes every 5 minutes, and again when you hover. Never more often than every 3 minutes, because the usage endpoint rate‑limits.
6. **What does “hits the cap in 1h 12m” mean?** It’s the burn‑rate forecast for your 5‑hour session: at your recent pace, that’s when you’d hit 100%. Amber means it’s coming, red means it’s under an hour. If you’ll make it to the reset, it says “on track — resets first.” You can switch it off.
7. **Will it nag me?** Only if you ask it to. Notifications are off until you turn them on. Then you get a heads‑up at 50, 80 and 95% of a session, at 80 and 95% of weekly and per‑model limits, and a “back to full” when a tight window resets.
8. **My Mac doesn’t have a notch.** You get a compact pill at the top centre of the screen instead, and you can add a menu bar item. It works on external displays too, and gets out of the way in full‑screen apps.
9. **How do I quit it, or change settings?** There’s no Dock icon, so right‑click the island. Appearance, percentages, burn‑rate estimates, notifications, the menu bar item, launch at login and Quit all live there.
10. **Is this made by Anthropic?** No. It’s an independent project by Yiftach Freeman, not affiliated with or endorsed by Anthropic.

MOBILE: a single column; the sticky header becomes static.

REDUCED: no transitions. Bars fill instantly, and the glyph swaps shape instantly.

---

### 9.7 `finale` — HIT → iris → reset, plus the footer (§07)

FILES: web/sections/finale.html, site/css/finale.css, site/js/finale.js. Uses: pin.js, meter.js (`override`), navIsland (`ctx.navIsland.pulse()`), banner.js, night.js (`setNight`), squash.js, split.js, cta.js, smooth.js.

MARKUP: `<section id="finale" class="s s--finale" aria-labelledby="finale-title">`. Running head: `§07 — THE END` on the left; on the right a live `SESSION 46% · THIS PAGE` showing the fill value. The `.pin` holds a mono label, the wordmark, and `.after` (H2 `#finale-title`, `#finale-cta`, `.req`, how-to line). `<footer>` sits after the pin. There is a global fixed `#iris` layer; create it from JS, `aria-hidden`.

WORDMARK:
- "Claude Meter", `--t-mark`, one line ≥768px and two lines on mobile ("Claude / Meter" at 28vw), wght 900 wdth 120, `aria-hidden` (the brand is already in the band).
- A mono label above it: `THIS PAGE · SESSION`.
- **Outline layer:** transparent with `-webkit-text-stroke:1.5px var(--ink)`.
- **Fill layer:** clipped `clip-path:inset(0 calc(100% - var(--fill)) 0 0)`, coloured with hard-stop zones: `background:linear-gradient(90deg,var(--teal) 0 60%,var(--lav) 60% 75%,var(--amber) 75% 85%,var(--red) 85% 100%); background-clip:text`. These are hard stops, not a blend.
- Past 85%: the stroke becomes 3px `--red-ink` and letter-spacing tightens −.01em (the bold signal).
- `--fill` is scrubbed 0→100% over pin progress 0–.70 (`pinScene` 160% / 120%).
- `meter.override(fill)`, so the nav island's left wing mirrors it exactly (red and bold >85).

HIT → IRIS → RESET: a timed timeline, **not** scrubbed. It fires once when progress crosses .72 going forward, and re-arms when progress drops below .5.

| t | Step |
|---|---|
| 0–.12s | **HIT:** the wordmark shakes, x ±4px ×3 over 120ms. `navIsland.pulse()`. |
| .12–.62s | **IRIS CLOSE:** `#iris` (fixed, z 100, `#000`) `clip-path:circle(150% at 50% 20px)`→`circle(5px at 50% 20px)` (`edit`). 20px is the band lens position. `setNight("iris",true)`. |
| .62–.95s | Hold black. Only the 7pt lens shows, and its glint sweeps once. A mono `resetting…` fades in at the centre in `--fg-2` (the app’s own string). While black: set `--fill` to 0, set the stroke back to ink, and `meter.override(0)`, so the nav wing rolls to 0% teal. |
| .95–1.55s | **IRIS OPEN:** `circle(5px)`→`circle(150%)`. `setNight("iris",false)`. From here on the fill mapping is rebased to `fill = min(12, (p−.72)/.28·12)%`: a fresh window creeps up. |
| 1.2s | Banner below the band, top-right: "Session reset" / "Your 5-hour window is back to full." (auto-dismiss 6s). |
| 1.4s | `.after` reveals by lines: H2 "Fresh window." / "*Spend it well.*", then `#finale-cta` (L) hanging from a hairline, `.req`, and a mono line "Download, drag to Applications, open. Hover the notch." |

- `.after` is visible with no JS. In motion mode, JS hides it before the HIT and never re-hides it once shown.
- **Idle:** while in view after the reset, the fill breathes +6% and back every 12s (teal).
- **Egg:** `squash()` on the wordmark letters (fine pointer), `data-cursor="squash the meter"`.
- On leaving (scrolling past the end or back above), `meter.override(null)`.

FOOTER (`<footer>`, background `--night`, text `--fg-2`, padding `64px var(--gutter)`, a top `--rule-night`):
- **Left:** icon 20px + `Claude Meter v1.2 · Made by Yiftach Freeman`.
- **Centre links:** `How it works` (#stage, `data-progress=.16`) · `Privacy` · `FAQ` · `Usage on claude.ai` (https://claude.ai/settings/usage, `rel="noopener"`) · `llms.txt` · `Back to top ↑` (`scrollTo(0)`; the nav meter visibly drains as you travel).
- **Right:** `Free · macOS 14.4+ · Apple Silicon & Intel`.
- **Last line**, full width, 12px, verbatim: "Independent project. Not affiliated with or endorsed by Anthropic. Claude is a trademark of Anthropic, PBC."
- The very bottom pixel row is a 1px teal rule with `scaleX = meter.scrolled/100`.

MOBILE: the wordmark sits on two lines. The iris centres on the top-centre lens. Pin 120%. The footer stacks.

REDUCED: no pin, no iris, no shake. The wordmark shows a solid teal fill at 100%, with the mono caption `SESSION RESET · BACK TO FULL`. The H2, CTA, how-to line and a static "Session reset" banner card render in place. The footer is unchanged.

