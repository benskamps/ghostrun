// Race math for a live run against a ghost. Pure functions, no DOM.
// Splits are cumulative ms from the start of the run, one per step.

export const segs = (splits) => splits.map((c, i) => c - (i ? splits[i - 1] : 0))
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/** Run clock: 4:07.3 (or 1:02:07 past an hour). */
export function clock(ms) {
  const t = Math.max(0, ms) / 1000
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(Math.floor(s)).padStart(2, '0')}`
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

/** Signed gap: +4.2 / −1:03. Positive means PB is ahead (you are slower). */
export function delta(ms) {
  const sign = ms > 0 ? '+' : ms < 0 ? '−' : '±'
  const a = Math.abs(ms) / 1000
  if (a < 60) return `${sign}${a.toFixed(1)}`
  return `${sign}${Math.floor(a / 60)}:${String(Math.floor(a % 60)).padStart(2, '0')}`
}

/**
 * Live gap to the ghost, LiveSplit style. mine = your splits so far, t = elapsed ms.
 * The gap at your last split holds until the clock passes the ghost's next split,
 * then it grows with every second the ghost is already through that step.
 * Positive = PB ahead. null when there's no ghost to race.
 */
export function liveGap(mine, t, ghost) {
  if (!ghost?.length) return null
  const k = mine.length
  if (k >= ghost.length) return mine[ghost.length - 1] - ghost[ghost.length - 1]
  const held = k ? mine[k - 1] - ghost[k - 1] : 0
  return Math.max(held, t - ghost[k])
}

/** How far along the route someone is at time t, 0..1, given their cumulative splits. */
export function progressAt(splits, t) {
  const n = splits.length
  for (let i = 0; i < n; i++) {
    if (t < splits[i]) {
      const start = i ? splits[i - 1] : 0
      return (i + (t - start) / Math.max(1, splits[i] - start)) / n
    }
  }
  return 1
}

/** Your progress mid-run: whole steps done, plus a guess inside the current step from the ghost's pace. */
export function myProgress(mine, t, n, ghost) {
  const k = mine.length
  if (k >= n) return 1
  const start = k ? mine[k - 1] : 0
  const est = ghost ? segs(ghost)[k] : null
  const inside = est ? clamp((t - start) / est, 0, 0.95) : 0.5
  return (k + inside) / n
}

/** The opacity is the scoreboard: 60% when PB leads by `range`, 40% when you do. */
export function pbAlpha(gap, range = 30000) {
  if (gap == null) return 0.5
  return 0.5 + 0.1 * clamp(gap / range, -1, 1)
}

/** PB's face mid-run. */
export function liveMood(gap) {
  if (gap == null) return 'sneaky'
  if (gap > 10000) return 'taunt'
  if (gap > 2000) return 'smug'
  if (gap > -2000) return 'giggle'
  if (gap > -15000) return 'shocked'
  return 'dizzy'
}

/** Best segment per step across runs (sum of best). Runs must share the same steps. */
export function bestSegments(runs) {
  if (!runs.length) return null
  const n = runs[0].splits.length
  const best = Array(n).fill(Infinity)
  for (const r of runs) segs(r.splits).forEach((d, i) => { if (d < best[i]) best[i] = d })
  return best
}

/** Which steps of this run beat every earlier attempt at that step. */
export function goldFlags(splits, priorBest) {
  if (!priorBest) return splits.map(() => false)
  return segs(splits).map((d, i) => d < priorBest[i])
}

/** Pick the ghost to race: best verified run; if none is verified yet, best time-only run. */
export function pickPB(runs) {
  const byTime = (a, b) => a.splits.at(-1) - b.splits.at(-1)
  const verified = runs.filter((r) => r.verified).sort(byTime)
  if (verified.length) return verified[0]
  return [...runs].sort(byTime)[0] || null
}

/**
 * The finish: result, PB's mood and one speedrun-caster line. No shame: when PB wins,
 * PB brags; it never tells you that you failed.
 */
export function finish({ splits, steps, ghost, golds = [], firstRun = false, name = 'PB' }) {
  const total = splits.at(-1)
  if (firstRun || !ghost) {
    return { result: 'recorded', mood: 'proud', head: 'Ghost saved.', line: 'Come beat it tomorrow. PB will be waiting, smugly.' }
  }
  const diff = total - ghost.at(-1)
  const mine = segs(splits), theirs = segs(ghost)
  const swing = mine.map((d, i) => theirs[i] - d) // positive = you saved time on this step
  const bestStep = swing.indexOf(Math.max(...swing))
  const worstStep = swing.indexOf(Math.min(...swing))
  const nGold = golds.filter(Boolean).length
  const secs = (ms) => delta(Math.abs(ms)).slice(1) + (Math.abs(ms) < 60000 ? 's' : '')
  if (diff < 0) {
    const line = swing[bestStep] > 1000
      ? `Massive time save on ${steps[bestStep]}. That's where the run was won.`
      : 'Clean run, no wasted steps. PB never saw it coming.'
    return {
      result: 'win', mood: nGold >= 2 ? 'respect' : 'sulk',
      head: name === 'PB' ? `New PB by ${secs(diff)}.` : `You beat ${name} by ${secs(diff)}.`, line: `${line} PB is ${nGold >= 2 ? 'tipping its hat' : 'sulking'}.`,
    }
  }
  if (Math.abs(diff) < 50) return { result: 'tie', mood: 'shocked', head: 'Dead heat.', line: `Same time to the tenth. ${name} is checking the replay.` }
  const line = swing[worstStep] < -1000
    ? `${name} swears it didn't cheat on ${steps[worstStep]}. It definitely cheated on ${steps[worstStep]}.`
    : `Photo finish. ${name} is pretending that was easy.`
  return { result: 'pb-wins', mood: diff > 30000 ? 'giggle' : 'smug', head: `${name} takes it by ${secs(diff)}.`, line }
}
