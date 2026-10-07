// Post-run insights, LiveSplit style. Pure, no DOM. Splits are cumulative ms; best = best segment per step (bestSegments()).
import { segs } from './race.js'

/**
 * The single step with the most time left on the table, comparing a run (usually your PB)
 * to the best you've ever done on each step. null until there's something real to win back.
 */
export function biggestTimesave(steps, splits, best, minMs = 2000) {
  if (!best || !splits?.length || best.length !== splits.length) return null
  const mine = segs(splits)
  let i = -1, save = 0
  mine.forEach((d, k) => { const s = d - best[k]; if (s > save) { save = s; i = k } })
  if (i < 0 || save < minMs) return null
  const total = mine.reduce((a, d, k) => a + Math.max(0, d - best[k]), 0)
  return { i, step: steps[i], ms: save, total, bestPossible: splits.at(-1) - total }
}

/** How many times the lead changed hands at the split lines (ties don't count as a change). */
export function leadChanges(mine, ghost) {
  let last = 0, n = 0
  mine.forEach((t, i) => {
    const s = Math.sign(ghost[i] - t) // 1 = you ahead
    if (s && last && s !== last) n++
    if (s) last = s
  })
  return n
}
