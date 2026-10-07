// Derived game state for a route: its runs, your PB, sum of best, and who you can race.
import { pickPB, bestSegments } from '../lib/race.js'
import { frankenghost, dreadTax, dailyHex } from '../lib/run-extras.js'
import { sameSteps } from '../lib/routes.js'

export function routeStats(route, allRuns) {
  const runs = allRuns
    .filter((r) => r.routeId === route.id && sameSteps(r.steps, route.steps))
    .sort((a, b) => a.endedAt - b.endedAt)
  const pb = pickPB(runs)
  const best = bestSegments(runs)
  const fr = runs.length >= 2 ? frankenghost(runs) : null
  // Only worth racing when it's actually faster than your PB.
  const franken = fr && pb && fr.splits.at(-1) < pb.splits.at(-1) - 500 ? fr : null
  return { runs, pb, best, franken, sumOfBest: fr?.splits.at(-1) ?? null, last: runs.at(-1) || null }
}

/** Ghosts you can race on this route, best first. */
export function opponents(route, stats) {
  const list = []
  if (stats.pb) list.push({ id: 'pb', name: 'PB', label: stats.pb.verified ? 'Your PB' : 'Your PB (time only)', splits: stats.pb.splits, trace: stats.pb.trace })
  if (stats.franken) list.push({ id: 'franken', name: 'Frankenghost', label: 'Frankenghost: your best steps, stitched', splits: stats.franken.splits, stitched: true })
  if (route.rival && sameSteps(route.rival.steps, route.steps)) {
    const who = route.rival.by ? `${route.rival.by}’s ghost` : 'Their ghost'
    list.push({ id: 'rival', name: who, label: `${who} (sent to you)`, splits: route.rival.splits })
  }
  return list
}

const WEEK = 7 * 24 * 3600 * 1000
export const runsThisWeek = (runs, now = Date.now()) => runs.filter((r) => now - r.endedAt < WEEK).length
export const dreadRefund = (runs) => dreadTax(runs)
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const todaysHex = () => dailyHex(todayKey())

export function orderRoutes(routes, runs) {
  const last = new Map()
  for (const r of runs) last.set(r.routeId, Math.max(last.get(r.routeId) || 0, r.endedAt))
  return [...routes].sort((a, b) => (last.get(b.id) || 0) - (last.get(a.id) || 0) || a.order - b.order)
}
