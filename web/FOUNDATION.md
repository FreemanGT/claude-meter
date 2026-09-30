# FOUNDATION — for section builders

Read `web/SPEC.md` §0–§5 plus your own brief in §9. This file tells you how the foundation is wired. If the SPEC and the Swift sources disagree, the Swift wins.

## 1. Files and ownership

| You own (section `<id>`) | Shared, do not edit (architect/integrator) |
|---|---|
| `web/sections/<id>.html` | `web/index.html`, `web/build.mjs`, `web/qa.mjs`, `web/og.*` |
| `site/css/<id>.css` (scope every rule under `.s--<id>`) | `site/css/tokens.css`, `site/css/base.css` |
| `site/js/<id>.js`, plus optional `site/js/<id>-*.js` helpers | `site/js/main.js`, `site/js/lib/*` |
| | `site/js/lib/island.js`, `site/css/island.css`, `site/island-lab.html` (island agent) |

IDs, in order: `stage wall loop yours privacy faq finale`. Stubs exist for all of them, so the page builds and runs now. Replace the stub contents; keep the section's root attributes:
`<section id="<id>" class="s s--<id>" data-section="<id>" aria-labelledby="<id>-title">`. Add `data-own-island` on stage and wall, and `data-night` on privacy.

- Exactly one `<h1>`, and it is in `stage`.
- Never hide content with CSS by default. Set hidden states from JS, or under `html[data-motion="full"]`. Without JS the page must be complete.
- FAQ: `build.mjs` builds the FAQPage JSON-LD from `#faq details`. The question goes in `<span class="faq__q">` inside `<summary>`. Everything after `</summary>` is the answer. The stub already has all 10 Q&As verbatim.

## 2. Section module contract

```js
// site/js/<id>.js
export default function init(root, ctx) {
  const { gsap, ScrollTrigger, reduced, mobile, lib, Island } = ctx;
  // ...build...
  return () => { /* optional: kill intervals, listeners, islands (island.destroy()) */ };
}
```

- `main.js` imports every section up front and calls `init` in page order, inside `gsap.context(…, root)`. So tweens, ScrollTriggers and SplitTexts you create **synchronously** are reverted for you. For anything you create later (timers, async callbacks), wrap it in `ctx.add(() => …)` or clean it up yourself.
- The whole run sits inside `gsap.matchMedia()` (motion / reduced / mobile). When a preference or breakpoint flips, your cleanup runs and `init` is called again, so it must be idempotent.
- **Never** register plugins, create Lenis, or read `matchMedia` yourself. Use `ctx.reduced` and `ctx.mobile` (booleans for this run).
- `ctx` = `{ gsap, ScrollTrigger, SplitText, reduced, mobile, lenis, meter, navIsland, Island, intro, lib, add }`
  - `lenis` is null under reduced motion.
  - `Island` is null if `island.js` failed to load. Guard with `if (Island)`.
  - `navIsland` = `{ island, pulse(), show(), hide() }` (it is safe to call even if the island is missing).
  - `intro` = `{ skipped, wings, reveal, done }`, three promises. The same moments are also dispatched as `document` events `cm:intro` with `detail.phase` `"wings" | "reveal" | "done"`.
- A section that throws is logged and skipped. It never takes the page down.
- Debug in the console with `window.__cm` → `{ lenis, ScrollTrigger, gsap, meter, navIsland, lib }`.

## 3. Utilities (`ctx.lib.*`, or `import { … } from "./lib/<module>.js"`)

| Name | Signature | Notes |
|---|---|---|
| **Motion** | `reduced()`, `mobile()`, `finePointer()`, `spring({duration, bounce})` → `{ease, duration}`, `SPR.open / close / value / play` | Spread a spring into a tween: `gsap.to(el, { y: 0, ...SPR.open })`. Eases `"edit"`, `"settle"` and `"island"` are registered |
| **Pin** | `pinScene(root, {length:"280%", mobileLength:"220%", scrub:.8, build(tl, {mobile})})` → `{tl, st}` or `null` | Pins `root.querySelector(".pin")`. **Author the timeline in progress units:** the position is the progress and the total is 1 (it is padded to 1). `anticipatePin` is 0 under Lenis (it would pin early and jump), 1 on native touch scroll. Reduced motion → returns `null` and adds `.is-static` to root, so render your static composition with `.s--x.is-static …`. The pin gets its own spacer (`.pin-own`, ScrollTrigger's `pinSpacer`), so a refresh never moves `.pin` in the DOM (a DOM move restarts CSS animations inside it). Ship `<div class="pin-own"><div class="pin">` in markup to avoid even the first wrap |
| **Smooth** | `scrollTo(target, {progress, immediate})`, `stop()`, `start()`, `readingPosition()`, `restorePosition(pos)` | `target` = px, `"#id"` or an element. `progress` lands inside a pinned section. Every `a[href^="#"]` (with optional `data-progress`) is already routed through it. main keeps the reading position (pin progress / section ratio) across resizes and breakpoint rebuilds |
| **Text** | `revealLines(el, {delay, stagger:.08, trigger:el, start:"top 85%"})` → `{kill}` | Masked lines, `edit` .9s, once. Splits at the first reveal (not at boot) and reverts when done; `aria:"auto"` only on headings (aria-label is prohibited on `<p>`). No-op under reduced motion |
| **Declarative reveals** | `data-reveal="up\|fade\|lines\|draw\|mark"`, `data-reveal-delay=".2"` | Auto-bound by main after every init. `mark` animates the `.mark` highlighter (`<span class="mark" data-reveal="mark">writes.</span>`; add `.mark--amber` for amber) |
| **Numbers** | `new Roller(el, {value, format})` with `.set(n)` / `.bump()`; `countTo(el, to, {from, duration, suffix})`; `scramble(el, text, {chars, delay})` | Roller = rolling digits, used for every live number (and the CTA label roll). It keeps an sr-only text twin. `scramble` is 400ms, time-based, for **mono labels only** (two on the page: #yours datum, loop icon caption); it loads ScrambleTextPlugin on its first call and returns a Promise. Never product UI, never scrubbed: cross-fade labels, roll numbers |
| **Format** | `fmtPct`, `fmtDur`, `fmtReset`, `fmtForecast`, `CLEARS`, `fmtAgo`, `fmtClock` | Mirrors `Format` in Theme.swift |
| **Loops** | `whileVisible(el, start, stop, margin)` → dispose; `visibleInterval(el, fn, ms)` | Wrap **every** ambient loop in one of these. They never start under reduced motion |
| **Marquee** | `marquee(track, {speed:60, dir:1, velocity:true, hoverSlow:.2})` → `{pause, play, setSpeedFactor(f), kill}` | Clones children (`aria-hidden`, inert). Scroll velocity changes speed and skew |
| **Night** | `nightZone(el, {start, end})`, `setNight(key, bool)`, `onNight(fn)` | Reference-counted `html[data-night]` (fades a fixed backdrop). The tokens `--bg`, `--fg-text`, `--fg-text-2`, `--rule-c` swap per section via `.is-night` on the sections on screen, never on `:root` |
| **Pointer** | `magnetic(el, {strength:.3, inner})`, `squash(el, {radius:220, wght:[800,900]})`, `initCursorTag()` (main runs it) | Put `data-cursor="text"` on anything to get the trailing tag. `squash` sets a per-char `--sq` (0..1); map it in your CSS: `.ch{font-stretch:clamp(50%, calc(var(--wscroll,150%)*(1 - .55*var(--sq))), 150%)}` |
| **Ink** | `scribble(svg, {duration:.9, delay, trigger:true})` | Draws the paths in DOM order. Styles come from `.ink` (added for you) |
| **Page meter** | `meter` has `.scrolled`, `.display`, `.sections[]`, `.velocity`, `.override(pct\|null)`, `.setFaq(opened, total)`, `.subscribe(fn)` | The finale drives `override`; FAQ calls `setFaq` |
| **Band** | `statusItem(on, data, {display})`, `renderStatus(slot, data, {display})`, `setBandNight(bool)` | The menu-bar item text is `46%  38%` |
| **GSAP hygiene** | `untracked(fn)`, `loadDrag()` → `Promise<{Draggable, InertiaPlugin}>`, `loadPlugin(name)` | A tween created inside a scrub/ScrollTrigger/tween callback is recorded in your section's context forever: wrap transient ones in `untracked`. Draggable, Inertia and ScrambleText are not in the page's scripts; load them on demand |
| **Banners** | `showBanner(host, {title, body, flick, timeout, static, announce})` | `announce:true` (role=status) only for banners the user caused; scroll-driven ones stay out of the accessibility tree |
| **Menu** | `attachMenu(island, hooks)` → detach; `openMenu(island, {x, y, items})`; `defaultItems(island, hooks)`; `closeMenu()` | hooks: `onMaterial, onDisplay, onBurnRate, onNotifications, onMenuBar, onLaunchAtLogin, onQuit, onRefresh, state, persist`. With no hook, it calls `island.setOption` for material, display and burnRate. Refresh-twice throttle egg, About card and Quit are built in |
| **Banner** | `showBanner(host, {title, body, flick, timeout:6000, static})` → el (`el.dismiss()`); `toast(text, {host, duration})` | `host` must be `position:relative`, or `document.body` (fixed under the band). Real Notifier.swift copy only |
| **CTA** | `initCtas(scope)`, `paintStars(scope)`, `REPO`, `DMG` | Main binds every `.cta` and `.cta-ghost` after init. The contract is delegated, page-wide: `data-cta="mac"` → the Mac email dialog, `data-cta="windows"` → the waitlist dialog, `data-cta="github"` → the repo, with the live count in a `[data-stars]` inside (baked in by `build.mjs`, hidden while 0). `html[data-os="windows"]` is set before paint for Windows visitors. Use the markup below |
| **Data** | `DEMO`, `demo()` (a deep clone), `spark(seed, endPct, {drop})`, `notchPath(w, h, rt, rb)` | `island-derive.js` re-exports island.js's `derive` (tested by `web/island-derive.test.mjs`). A static import of it makes island.js a hard dependency |

**CTA markup** (M by default; add `cta--l` for the loop and finale; add `cta--night` + `cta-hang--night` on night backgrounds; add `cta-hang--full` to go full width on mobile):

```html
<div class="cta-hang"><a class="cta" id="hero-cta" href="/ClaudeMeter.dmg" download data-cursor="free · one click">
  <svg class="cta__shape" aria-hidden="true"><path/><path class="rim-hot"/></svg>
  <span class="cta__row"><span class="cta__ring" aria-hidden="true"><svg viewBox="0 0 24 24"><circle class="trk" cx="12" cy="12" r="10"/><circle class="val" cx="12" cy="12" r="10" pathLength="100"/><path class="arrow" d="M12 7.5v8m-3.5-3.5L12 15.5l3.5-3.5"/></svg></span><span class="cta__label">Download for Mac</span></span>
  <span class="cta__meta">Free · v1.2 · macOS 14.4+</span>
</a></div>
<p class="req">Free · v1.2 · macOS 14.4+ · Apple Silicon &amp; Intel<br><span class="seal" aria-hidden="true">✓</span> Signed &amp; notarized by Apple</p>
```

Mac CTAs also carry `data-cta="mac"` (keep the `href` as the no-JS fallback). **Windows** is the shared ghost: put it inside the Mac tab's `.cta-hang`, right after the `<a class="cta">`, and it hangs dashed from the tab and rides its peek; anywhere else give it its own `<div class="cta-hang">`. One label everywhere (the ` · join the` drops by itself when the tab is under 250px):

```html
<button class="cta-ghost" type="button" data-cta="windows" data-cursor="soon · we’ll email you">
  <svg class="cta-ghost__shape" viewBox="0 0 300 52" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0Q8 0 8 8L8 32Q8 52 28 52L272 52Q292 52 292 32L292 8Q292 0 300 0"/></svg>
  <span class="cta-ghost__row"><span class="cta-ghost__ring" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" pathLength="100"/><path d="M12 7.5V12l3 2.2"/></svg></span><span class="cta-ghost__label">Windows<span class="cta-ghost__x"> · join the</span> waitlist</span></span>
</button>
```

**GitHub** is the shared chip (paper by default; it follows the night tokens; add `gh-chip--night` outside sections). Its `aria-label` starts with the exact visible label (WCAG 2.5.3); `lib/cta.js` appends the star count once it reaches `MIN_STARS`:

```html
<a class="gh-chip" data-cta="github" href="https://github.com/FreemanGT/claude-meter" target="_blank" rel="noopener" aria-label="Star on GitHub: Claude Meter (opens in a new tab)" data-cursor="MIT · read every line">
  <svg class="gh-chip__mark" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="…octocat…"/></svg><span class="gh-chip__t">Star on GitHub</span><span class="gh-chip__n" data-stars hidden></span>
</a>
```

**Running head:** `<div class="wrap"><p class="rh"><span>§02 — THE WALL</span><span class="rh__datum">SESSION CLOCK 10:04</span></p></div>`

## 4. Island (built by the island agent; the full API is in the `island.js` header and in `web/FOUNDATION-ISLAND.md`)

```js
export default function init(root, { Island, lib, reduced }) {
  if (!Island) return;
  const isl = new Island(root.querySelector(".island-host"), { scale: 1.4, bezel: true, data: lib.demo() });
  const detach = lib.attachMenu(isl, { onMenuBar: (on) => lib.statusItem(on, isl.data) });
  // Scenes: isl.lock(true); tl.add(isl.modeTimeline("collapsed","peek"), .29); scrub numbers with isl.data.session.pct = 71; isl.render();
  // Live:   await isl.setState("pinned"); isl.update({ session: { pct: 80 } }); isl.pulse();
  return () => { detach(); isl.destroy(); };
}
```

- `new Island(host, {scale, state, display, material, notch, bezel, burnRate, interactive, hint, live, labels, touchPeek, data})`.
  - The host must reserve the collapsed size, because the island is absolutely positioned at top centre.
  - Render at the largest scale a scene needs, and let cameras only scale **down**.
- Methods: `setState(s, {instant})` → Promise, `modeTimeline(from, to)` (paused, for scrubbing), `update(patch, {duration, roll})`, `data` + `render()` (no rolls; this is the scrub path), `setOption(key, v)`, `lock(bool)`, `pulse()`, `quit()` / `relaunch()`, `on/off("state"|"contextmenu"|"interact")`, `el`, `destroy()`.
- Data: `{plan, updated, session:{pct, resetIn, projected, forecast:{exhaustsIn}|{clears:true}|{text,tone}, spark}, weekly:{pct, reset|resetIn, spark}, models:[{name, pct, reset, spark}]}`.
  - Labels-mode extras used by the nav island: a per-window `caption` and `label`, plus `rows[]` (with `href`), `cta`, `note`.
- The app rules are all enforced by island.js: the amber right wing when a model is tighter, red + bold >85, forecast amber/red at 3600s, the limit note, and the pinned footer. Do not re-implement them.
- The **nav island** is owned by main (`lib/nav.js`).
  - It hides while any `[data-own-island]` section spans "top 50%" → "bottom bottom" of the viewport (for pinned sections, that is exactly until the pin ends).
  - It springs back after the stage pin with "NOW METERING: THIS PAGE".
  - The finale uses `ctx.meter.override(pct)` and `ctx.navIsland.pulse()`.

## 5. Tokens (`site/css/tokens.css`)

- **Fonts:** `--f-display` Anybody (wdth 50–150 via `font-stretch`, wght 100–900), `--f-serif` Instrument Serif italic (one word per headline; `h1/h2/h3 em` and `.serif` are pre-styled), `--f-mono` Geist Mono (always tabular), `--f-ui` system (islands, menus and banners only).
- **Type:** `--t-wall --t-mark --t-display --t-h2 --t-h3 --t-lede --t-body --t-label --t-data`, with matching `--lh-*` and `--tr-*`. The helper classes `.t-wall .t-mark .t-display .t-h2 .t-h3 .t-lede .t-body .t-label .t-data` carry the SPEC wdth/wght. `.s h2` and `.s h3` get h2/h3 styles automatically.
- **Colour:** paper `--paper/-2/-3`, ink `--ink/-2/-3`, `--rule`; night `--black --night --night-2 --fg --fg-2 --fg-3 --rule-night`; app `--teal --lav --amber --red --track --rim-top --rim-bot`; text-safe on paper `--teal-ink --lav-ink --amber-ink --red-ink`; highlighters `--hl-teal --hl-amber`.
  - Contextual (they flip under `html[data-night]`): `--bg --fg-text --fg-text-2 --rule-c`.
  - Pastels are text colours only on night. Red always comes with bold.
- **Layout:** `.wrap` (max 1560 + `--gutter`), `.grid` (12 columns, or 4 on mobile), `.s` (section padding `--section-pad`), `--band-h` (40, or 44 on mobile), `--frame`, radii `--r-screen --r-stage --r-pill --r-menu --r-banner`, `--sh-float`, `--sh-island`.
- **Layers:** `--z-band 80 --z-nav 85 --z-grain 90 --z-cursor 95 --z-iris 100 --z-intro 110 --z-menu 120`.
- **Motion:** `--ease-edit --ease-settle --ease-in --spring-open(-dur) --spring-close(-dur) --spring-play(-dur) --d-micro --d-ui --d-reveal`. `@property` is registered for `--fill` (a percentage), `--sq` and `--mark`.
- **Global CSS already in `base.css`:** grain, band, corners, cursor tag, Roller, CTA, `.req`, menu, About card, banner, toast, intro, `.sr-only`, `:focus-visible` (2px teal), skip link, and a reduced-motion kill switch for CSS animations.

## 6. Build and QA

```sh
cd "web"
node build.mjs                 # web/index.html + sections → site/index.html (+ FAQ JSON-LD, section <link>s)
node island-derive.test.mjs    # app-rule assertions against island.js's derive
node og.mjs                    # web/og.html → site/assets/og.png
# server: python3 -m http.server 4321 --directory site  (already running)
node qa.mjs --run stage-1                          # desktop + mobile, 400px steps, screenshots + errors
node qa.mjs --run stage-2 --viewport desktop --only-frames --frames stage:.26,stage:.72
node qa.mjs --run rm --reduced --steps 8           # reduced-motion pass
node qa.mjs --run intro --viewport desktop --intro --only-frames   # 14 frames of the intro
node qa.mjs --run ovf --overflow --only-frames     # scrollWidth at 320…1920
```

- Screens go to `…/scratchpad/qa/<run>/`. **Open them with Read.** "It ran" is not "it's right."
- `qa.mjs` exits 1 on console or page errors, failed requests or overflow. It also lists long tasks (>50ms after load).
- **Budgets now:** eager JS is ~184 KB gz of the 200 KB budget (vendor ~61 KB). `lib/signup.js` (~9 KB) is prefetched and imported on the first CTA intent; ScrambleText, Draggable and Inertia load on demand. Fonts are 102 KB of 200 KB.
- `qa.mjs` ignores `api.github.com` failures (a per-IP rate limit must not fail the gate).
