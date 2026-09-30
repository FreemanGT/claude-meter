// node web/island-derive.test.mjs — asserts the app rules (IslandView.swift) in the derive() that
// island.js actually paints from, plus lib/format.js (the site's copy of Theme.swift's Format).
import assert from "node:assert/strict";
import { derive } from "../site/js/lib/island-derive.js";
import * as F from "../site/js/lib/format.js";

const base = () => ({
  plan: "Max 20x", updated: "just now",
  session: { pct: 46, resetIn: 2 * 3600 + 13 * 60, projected: 71, forecast: { exhaustsIn: 72 * 60 } },
  weekly: { pct: 38, reset: "Sat 1:05 PM" },
  models: [{ name: "Opus", pct: 62, reset: "Sat 1:05 PM" }],
});

// right wing, both ways (+ the strict > tie)
let v = derive(base());
assert.equal(v.right.name, "Opus"); assert.equal(v.right.tone, "amber");
let d = base(); d.models[0].pct = 30; v = derive(d);
assert.equal(v.right.key, "weekly"); assert.equal(v.right.tone, "lav");
d = base(); d.models[0].pct = 38; assert.equal(derive(d).right.key, "weekly", "tie → weekly");

// 85 vs 85.1: red + bold together
d = base(); d.session.pct = 85; v = derive(d); assert.equal(v.session.tone, "teal"); assert.equal(v.session.hot, false);
d.session.pct = 85.1; v = derive(d); assert.equal(v.session.tone, "red"); assert.equal(v.session.hot, true);

// forecast colour at 3599 vs 3600
d = base(); d.session.forecast = { exhaustsIn: 3600 }; v = derive(d);
assert.equal(v.forecast.tone, "amber"); assert.equal(v.forecast.text, "hits the cap in 1h 0m");
d.session.forecast = { exhaustsIn: 3599 }; v = derive(d);
assert.equal(v.forecast.tone, "red"); assert.equal(v.forecast.text, "hits the cap in 59m");
d.session.forecast = { clears: true }; assert.equal(derive(d).forecast.text, "on track — resets first");
assert.equal(derive(base(), { burnRate: false }).forecast, null);

// reset formats: <48h, ≥48h, ≤0 (both implementations)
for (const fmtReset of [F.fmtReset]) {
  assert.equal(fmtReset(2 * 3600 + 13 * 60), "resets in 2h 13m");
  assert.equal(fmtReset(36 * 60), "resets in 36m");
  assert.match(fmtReset(49 * 3600), /^resets \w{3},? \d{1,2}:\d{2}/);
  assert.equal(fmtReset(0), "resetting…");
  assert.equal(fmtReset(-5), "resetting…");
  assert.equal(fmtReset("Sat 1:05 PM"), "resets Sat 1:05 PM");
}
d = base(); d.session.resetIn = 0; assert.equal(derive(d).session.reset, "resetting…");
d.session.resetIn = 49 * 3600; assert.match(derive(d).session.reset, /^resets \w{3},? \d{1,2}:\d{2}/);

// limit note text + priority (app order: session, weekly, models)
d = base(); d.models[0].pct = 100; v = derive(d);
assert.equal(v.notePeek.text, "Opus limit reached · resets Sat 1:05 PM");
assert.equal(v.notePinned.text, v.notePeek.text, "limit note replaces the pinned footer");
d.weekly.pct = 100; assert.equal(derive(d).notePeek.text, "Weekly limit reached · resets Sat 1:05 PM");

// pinned footer prefix; peek has no footer without a limit
v = derive(base());
assert.equal(v.notePinned.text, "Session hits the cap in 1h 12m"); assert.equal(v.notePeek, null);
d = base(); d.session.forecast = { clears: true }; v = derive(d);
assert.equal(v.notePinned.text, "Session on track — resets first"); assert.equal(v.notePinned.tone, "muted");
d.session.forecast = null; assert.equal(derive(d).notePinned, null);

// reset column only when it differs from the previous row
assert.deepEqual(derive(base()).rows.map((r) => r.showReset), [true, true, false]);

// aria label mirrors collapsedLabel
assert.equal(derive(base()).aria, "Claude usage, session 46 percent, Opus 62 percent");
d = base(); d.models = []; assert.equal(derive(d).aria, "Claude usage, session 46 percent, weekly 38 percent");

// format.js extras
assert.equal(F.fmtDur(4320), "1h 12m"); assert.equal(F.fmtAgo(30), "just now"); assert.equal(F.fmtAgo(3 * 3600), "3h 0m ago");

console.log("island-derive: all assertions passed");
