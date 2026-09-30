# Island API

`site/js/lib/island.js` + `site/css/island.css`. This is a web port of `IslandView.swift`, `Theme.swift` and `NotchShape.swift`. It has **no hard dependencies**: it runs its own damped-spring engine (SwiftUI maths: ω = 2π/duration, ζ = 1 − bounce) and uses WAAPI for pane squeezes and digit rolls. It uses `window.gsap` only to return a real timeline from `modeTimeline()`. It imports the pure helpers from `format.js` and `demo.js`, so there is one copy of each rule.

QA page (not linked): `/island-lab.html`. It has a playground, a scrub slider, every `snaps2` scene, and 27 self-tests covering the derive rules and designed-vs-laid-out heights.
- `?solo=<scene>` renders one scene at 2×, 1240×760, for a pixel compare with `snaps2/<scene>.png`.
- `&morph=peek&at=120` gives a deterministic morph frame.
- `&scrub=peek&p=.5` gives a scrub frame.

Node test: `node web/island-derive.test.mjs`.

## Fidelity (verified against `snaps2/*.png` at 2×)

Every text run, tick, bar, ring and edge measured lands within 1px of the app render: positions, ink widths, line boxes, colours, ring geometry and heights. What got it there:
- **Optical size.** SwiftUI picks SF's optical size from the **pt** size, not the @2× px size. So every text step pins `font-variation-settings:"opsz" <pt>` and uses fitted tracking: 10pt `.033em`, 11pt `.018em`, 15pt `-.027em`.
- **Font smoothing.** `-webkit-font-smoothing:auto`, not `antialiased`. CoreText's default smoothing is what gives the app's text its weight on black.
- **Family.** Chrome ignores `-apple-system`; `BlinkMacSystemFont` is what renders SF there.

Morph frame pacing is a flat 16.7ms (p95) in solid, frosted and glass, with no long tasks. The first switch to a translucent material costs one frame while its layer is created.

## Construct

```js
import { Island } from "./lib/island.js";
import { demo } from "./lib/demo.js";

const isl = new Island(host, {     // host: the island hangs from host's top-centre (made position:relative if static)
  scale: 2,            // px per pt (sets --u). Or "fit" (fits 560pt into host width, ≤ maxScale). Cameras may only scale DOWN.
  maxScale: 2,
  state: "collapsed",  // "collapsed" | "peek" | "pinned" | "hidden"
  display: "percent",  // | "ticks"
  material: "solid",   // | "frosted" | "glass"
  notch: true,         // false → no-notch pill (117×24 / 101×24); expanded states use a 12pt top inset
  notchWidth: 185,     // housing width in pt (the snaps2 Mac is 189)
  bezel: false,        // draw the camera lens in the housing
  burnRate: true,      // forecast text, projected arc/tick, sparklines
  interactive: true,   // hover 200ms → peek, click/Enter/Space → pin (stays pinned until clicked again, like the app), Esc folds a peek, touch tap cycles
  touchPeek: true,     // false: touch tap goes collapsed ↔ pinned (mobile nav)
  hint: false,         // first-launch row; auto-clears after the first user unpin (like the app)
  live: true,          // "resets in"/forecast count down (shared 5s ticker, paused offscreen/hidden tab)
  labels: null,        // { session, weekly, model, aria, table } display-name overrides (nav island)
  data: demo(),
});
```

The root is `isl.el` (`.island`). It is absolutely positioned at `left:50%; top:0` and its box is the collapsed size (`--cw`/`--ch` pt). Everything else overflows it, so morphs never reflow siblings. The host is responsible for reserving space. `isl.size(state)` returns `{w, h}` in px.

## Data

```js
{ plan: "Max 20x", updated: "just now",
  session: { pct: 46, resetIn: 7980, projected: 71, forecast: { exhaustsIn: 4320 } /* | {clears:true} | {text,tone} | null */, spark: [...] },
  weekly:  { pct: 38, reset: "Sat 1:05 PM" /* or resetIn: seconds, or a Date */, spark: [...] },
  models:  [{ name: "Opus", pct: 62, reset: "Sat 1:05 PM", spark: [...] }],
  // optional
  note: { text, tone: "dim"|"muted"|"amber"|"red", attention },  // status line; beats the limit note (peek + pinned); attention → amber dot under the session wing
  rows: [{ label, pct, spark, caption, href, tone }],             // replaces the pinned table rows (nav TOC)
  cta:  { label, href },                                          // last pinned row: teal pill
}
```

Any window can also carry:
- `label`: display name
- `caption`: replaces the reset text
- `href`: turns the pinned row into a link

Sparklines are raw pct samples. They are normalised the app's way: peak = max(10, max), inset 2.

Derived rules live in `derive(data, {burnRate, labels}, elapsedSec)` and are exported. They are exactly IslandView:
- Right wing = the top model **iff** its pct > weekly, otherwise weekly.
- Red + bold when pct > 85.
- Forecast is red under 3600s, amber at or above.
- Limit note, in app order: `Opus limit reached · resets Sat 1:05 PM`.
- Pinned footer: `Session hits the cap in 1h 12m`.
- The pinned reset column shows only when it changes from the row above.
- The aria label reads `Claude usage, session 46 percent, Opus 62 percent`.

## Methods

```js
await isl.setState("peek");                 // spring morph: open = .bouncy(0.4), close = .smooth(0.4); retargets mid-flight with velocity kept
isl.setState("pinned", { instant: true });

// Scrubbed scenes (no springs, no rolls): geometry on the "island" ease; panes leave [0,.3], enter [.2,.7]
const tl = isl.modeTimeline("collapsed", "pinned"); // GSAP Timeline if window.gsap, else {progress(p), duration(), kill()}
master.add(tl, "b2");                                // or tl.progress(p)
isl.lock(true);                                      // user hover/click/keys ignored (hit area leaves tab order)

isl.update({ session: { pct: 91 } });                // deep merge (arrays replace); rings/bars spring over .5s, digits roll
isl.update(patch, { duration: 0.6, roll: false });

Object.assign(isl.data, pageData()); isl.render();  // scrub path: rounded values written directly, never rolls

isl.setOption("material", "glass");  // display | material | burnRate | notch | hint | live; "scale" applies when collapsed (else deferred)
isl.pulse();                          // HIT: 120ms shake
isl.quit(); isl.relaunch();           // squeeze into the housing → 900ms → "Quit. (It’s that easy.) Relaunch ↺" pill
isl.on("state", (state, prev) => {});
isl.on("interact", ({ type, state }) => {});         // user-driven changes only
isl.on("contextmenu", ({ x, y, source }) => openMenu(isl, { x, y, items })); // right-click, Shift+F10/ContextMenu key, 500ms long-press, ⋯ button
isl.off(type, fn); isl.destroy();
```

Notes for builders:
- **The `⋯` button** is only created once something subscribes to `"contextmenu"` (`attachMenu` does). `preventDefault` happens only then.
- **No outside-click collapse.** Like the app, a pinned island stays pinned until it is clicked again (Escape only folds a peek).
- **Materials** mirror the app's Appearance: Solid (pure black, rim only when expanded), Frosted (heavy blur under a .80→.56 scrim, uniform 16% rim), Liquid Glass (thin lensing sheet under a .70→.52 scrim, 1.25pt specular rim lit from the pointer). Translucent modes lift secondary/tertiary text and add a text shadow.
- `warn` option (default 85): the red threshold. The nav island raises it so the page meter only goes red during the finale's HIT.
- **Scale** is read in pt everywhere. Render at the largest scale a camera needs, then scale the camera down.
- **Reduced motion:**
  - Morphs, value tweens and rolls are instant, and panes crossfade in 120ms.
  - There is no hover nudge and no key light.
  - Every interaction still works.
- **Hooks for the menu:**
  - `[data-updated]` holds the header "just now".
  - `.island__hit` is the focus/trigger element.

## Deliberate calls where SPEC and Swift disagree (Swift wins)

- **Shadow:** peek only. `IslandView` removes it while pinned; the SPEC said "expanded".
- **Ring %:** 15pt **medium**, bold above 85. The SPEC said semibold.
- **Projected tick:** 2×6pt (bar height). The SPEC said 2×10.
- **Hover-out grace:** 250ms (`hoverChanged`). The SPEC said 120ms.
- **`data.note`** (nav's caption line) is the app's status-note slot. It shows in peek **and** pinned, and it takes priority over the limit note and the forecast footer.
