// Small pure helpers for the Friday stack: Dread Check, Frankenghost, Daily Haunt, share line.
// No DOM, no storage: the app passes runs in and renders what comes out.
// A run = { route, steps: [names], splits: [cumulative ms], guessMs?, date: "YYYY-MM-DD" }

export const fmt = ms => {
  const s = Math.round(ms / 1000), m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};
const segs = splits => splits.map((c, i) => c - (i ? splits[i - 1] : 0));

// --- Dread Check ---------------------------------------------------------
/** "You guessed 25:00. It took 9:12." plus how many minutes of dread that was. */
export function dreadCheck(run) {
  if (!run.guessMs) return null;
  const actual = run.splits.at(-1), dread = run.guessMs - actual;
  return {
    line: `You guessed ${fmt(run.guessMs)}. It took ${fmt(actual)}.`,
    dreadMs: Math.max(0, dread),
    overran: dread < 0, // took longer than guessed; the copy stays neutral, PB takes the blame
  };
}
/** Lifetime minutes of dread you no longer pay. Only ever goes up. */
export const dreadTax = runs => runs.reduce((sum, r) => sum + (dreadCheck(r)?.dreadMs || 0), 0);

// --- Frankenghost (sum of best) ------------------------------------------
/** Best segment per step across all runs of a route, stitched into one ghost. */
export function frankenghost(runs) {
  if (!runs.length) return null;
  const n = runs[0].steps.length, best = Array(n).fill(Infinity), from = Array(n).fill(null);
  for (const r of runs) segs(r.splits).forEach((d, i) => { if (d < best[i]) { best[i] = d; from[i] = r.date; } });
  let acc = 0;
  return { route: runs[0].route, steps: runs[0].steps, splits: best.map(d => (acc += d)), stitchedFrom: from };
}

// --- Daily Haunt -----------------------------------------------------------
export const HEXES = [
  { id: "lefty", name: "Lefty%", rule: "Off hand only." },
  { id: "nobacktrack", name: "No-Backtrack%", rule: "Never walk back to a spot you already cleared." },
  { id: "onesong", name: "One-Song%", rule: "Finish before the song ends." },
  { id: "silent", name: "Silent%", rule: "No audio cues. PB is watching quietly." },
  { id: "blind", name: "Blind%", rule: "Timer hidden until the finish." },
  { id: "reverse", name: "Reverse%", rule: "Do the steps in reverse order." },
  { id: "tidy", name: "Put-Back%", rule: "Every item returns to its home before the next split." },
];
/** Same hex for everyone on the same date, no server. */
export function dailyHex(dateStr) {
  let h = 2166136261;
  for (const c of dateStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return HEXES[(h >>> 0) % HEXES.length];
}

// --- Share line --------------------------------------------------------------
/** Wordle-style, spoiler-free. 🟨 gold split, 🟩 beat PB, ⬛ slower than PB. */
export function shareLine(run, ghost, hex) {
  const mine = segs(run.splits), pb = ghost ? segs(ghost.splits) : null;
  const best = ghost?.goldSegs; // optional: per-step best segments
  const squares = mine.map((d, i) => (best && d < best[i]) ? "🟨" : (!pb || d <= pb[i]) ? "🟩" : "⬛").join("");
  const total = run.splits.at(-1), diff = ghost ? total - ghost.splits.at(-1) : null;
  const vs = diff === null ? "Ghost saved" : diff < 0 ? `PB −${fmt(-diff)}` : `PB +${fmt(diff)}`;
  return `Ghostrun · ${run.route}${hex ? " · " + hex.name : ""} 👻 ${fmt(total)} ${squares} ${vs}`;
}
