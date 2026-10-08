// Ghosts live on one phone. A backup file is how they move to a new one, or survive a cleared browser.
// Plain JSON, made and read on the device. Nothing is uploaded.
import { cleanRoute, LIMITS } from './routes.js'

export const BACKUP_LIMITS = { bytes: 5_000_000, routes: 200, runs: 5000, trace: 20000 }

const isMs = (n) => Number.isFinite(n) && n >= 0 && n < 36e6 // under 10 hours
const str = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '')

export function pack({ routes, runs, prefs }, now = Date.now()) {
  return { app: 'ghostrun', v: 1, at: now, routes, runs, prefs: { name: prefs?.name || '' } }
}

export const fileName = (now = new Date()) => `ghostrun-ghosts-${now.toISOString().slice(0, 10)}.json`

function route(r) {
  if (!r || typeof r.id !== 'string' || !r.id || r.id.length > 64) return null
  const clean = cleanRoute(r)
  if (!clean) return null
  const out = { ...clean, id: r.id, order: Number.isFinite(r.order) ? r.order : 0, createdAt: isFinite(r.createdAt) ? r.createdAt : 0 }
  if (typeof r.template === 'string') out.template = r.template.slice(0, 40)
  out.mess = str(r.mess, 120)
  out.mood = str(r.mood, 16) || 'sneaky'
  if (r.rival && Array.isArray(r.rival.splits)) {
    const rv = run({ id: 'x', routeId: r.id, steps: r.rival.steps, splits: r.rival.splits })
    if (rv) out.rival = { by: str(r.rival.by, 24), steps: rv.steps, splits: rv.splits, at: Number(r.rival.at) || 0 }
  }
  if (Array.isArray(r.places) && out.kind === 'errand') {
    out.places = r.places.slice(0, out.steps.length).map((p) => (p && isFinite(p.lat) && isFinite(p.lon)
      ? { lat: +p.lat, lon: +p.lon, ...(isFinite(p.acc) && p.acc > 0 ? { acc: Math.min(250, Math.max(10, Math.round(+p.acc))) } : {}) }
      : null))
  }
  return out
}

function run(r) {
  if (!r || typeof r.id !== 'string' || !r.id || typeof r.routeId !== 'string') return null
  const steps = Array.isArray(r.steps) ? r.steps.map((s) => str(s, LIMITS.step)).filter(Boolean) : []
  const splits = Array.isArray(r.splits) ? r.splits.map(Number) : []
  if (!steps.length || steps.length > LIMITS.maxSteps || splits.length !== steps.length) return null
  if (!splits.every((x, i) => isMs(x) && (i === 0 || x >= splits[i - 1]))) return null
  return { ...r, steps, splits, trace: Array.isArray(r.trace) ? r.trace.slice(0, BACKUP_LIMITS.trace).map(Number) : [] }
}

/**
 * Read a backup file. Returns { routes, runs, name } with only well-formed records,
 * or { error } in words a player can act on.
 */
export function unpack(text) {
  if (typeof text !== 'string' || text.length > BACKUP_LIMITS.bytes) return { error: 'That file is too big to be a Ghostrun backup.' }
  let data
  try { data = JSON.parse(text) } catch { return { error: 'That file isn’t a Ghostrun backup.' } }
  if (data?.app !== 'ghostrun' || data.v !== 1 || !Array.isArray(data.routes) || !Array.isArray(data.runs)) {
    return { error: 'That file isn’t a Ghostrun backup.' }
  }
  const routes = data.routes.slice(0, BACKUP_LIMITS.routes).map(route).filter(Boolean)
  const ids = new Set(routes.map((r) => r.id))
  const runs = data.runs.slice(0, BACKUP_LIMITS.runs).map(run).filter((r) => r && ids.has(r.routeId))
  if (!routes.length) return { error: 'PB found no ghosts in that file.' }
  return { routes, runs, name: str(data.prefs?.name, 24) }
}
