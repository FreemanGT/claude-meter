// The app rules (IslandView.swift) live in island.js's pure `derive`, so the island paints from the
// exact function web/island-derive.test.mjs asserts. Import from here only in section code that
// already depends on islands (a static import makes island.js a hard dependency of the importer).
export { derive, fmtPct, fmtDur, fmtReset, fmtForecast } from "./island.js";
export const WARN = 85; // Theme.warn, strict >
