// Canonical demo data (SPEC §4.5) + seeded 6-hour sparkline generator.

function rng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * 36 samples (6h at 10-min steps), monotone-ish with 2–3 plateaus, ending exactly at endPct.
 * drop:true adds one session-reset drop to ~0 in the first half (the 5-hour window rolling over).
 */
export function spark(seed, endPct, { drop = false } = {}) {
  const r = rng(seed);
  const n = 36;
  const plateaus = new Set();
  const count = 2 + Math.floor(r() * 2);
  while (plateaus.size < count) {
    const at = 3 + Math.floor(r() * (n - 8));
    for (let k = 0; k < 3 + Math.floor(r() * 3); k++) plateaus.add(at + k);
  }
  const dropAt = drop ? 8 + Math.floor(r() * 8) : -1;
  const start = dropAt >= 0 ? dropAt : 0;
  const base = dropAt >= 0 ? 0 : Math.max(0, endPct * (0.35 + r() * 0.25));
  const steps = [];
  for (let i = start + 1; i < n; i++) steps.push(plateaus.has(i) ? 0 : 0.4 + r());
  const sum = steps.reduce((a, b) => a + b, 0) || 1;
  const out = [];
  if (dropAt >= 0) {
    const before = endPct * (0.55 + r() * 0.3);
    for (let i = 0; i < dropAt; i++) out.push(Math.round((before * (0.4 + (0.6 * i) / dropAt)) * 10) / 10);
  }
  let v = base;
  out.push(Math.round(v * 10) / 10);
  for (const s of steps) {
    v += ((endPct - base) * s) / sum;
    out.push(Math.round(v * 10) / 10);
  }
  out[n - 1] = endPct;
  return out;
}

export const DEMO = {
  plan: "Max 20x",
  updated: "just now",
  // projected 71% at the reset → the forecast says "on track — resets first" (UsageHistory: a session
  // that hits the cap first is projected to 100). Burning variants set projected: 100 + exhaustsIn.
  session: { pct: 46, resetIn: 2 * 3600 + 13 * 60, projected: 71, forecast: { clears: true }, spark: spark("s", 46, { drop: true }) },
  weekly: { pct: 38, reset: "Sat 1:05 PM", spark: spark("w", 38) },
  models: [{ name: "Opus", pct: 62, reset: "Sat 1:05 PM", spark: spark("o", 62) }],
};

/** Deep clone so every island owns its data. */
export const demo = () => structuredClone(DEMO);
