// The habit loop: what brings you back to race PB tomorrow. Pure functions, no DOM, no storage.
// Trigger: one run waiting when you open the app (dailyPick), or a calendar invite PB sends (haunt.ics).
// Reward: the time already on the table (onTable), so the next run is always a few seconds from a PB.
// Investment: time taken back from PB, a number that only ever goes up. No streaks to break.
import { pickPB, bestSegments, segs } from './race.js'

const DAY = 24 * 3600 * 1000
const SHORT = 10 * 60 * 1000 // the Daily Run is ten minutes or less when we can find one

const same = (a, b) => a.length === b.length && a.every((s, i) => s === b[i])
const runsOf = (route, runs) => runs.filter((r) => r.routeId === route.id && same(r.steps, route.steps)).sort((a, b) => a.endedAt - b.endedAt)
const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }

/**
 * Time already in your hands on a route: your PB minus your sum of best, plus the step
 * where most of it hides. null until two runs make a sum of best worth talking about.
 */
export function onTable(runs) {
  // A time-only run (a shake on the couch) can't set the bar for a verified PB.
  if (runs.some((r) => r.verified)) runs = runs.filter((r) => r.verified)
  if (runs.length < 2) return null
  const pb = pickPB(runs)
  const best = bestSegments(runs)
  const mine = segs(pb.splits)
  const save = mine.map((d, i) => Math.max(0, d - best[i]))
  const total = save.reduce((a, b) => a + b, 0)
  if (total < 500) return { ms: 0, step: null, stepMs: 0, pb: pb.splits.at(-1) }
  const i = save.indexOf(Math.max(...save))
  return { ms: total, step: pb.steps[i], stepMs: save[i], pb: pb.splits.at(-1) }
}

/** Lifetime time taken back from PB: on every route, your first run minus your current PB. Never goes down. */
export function takenBack(routes, runs) {
  let ms = 0
  for (const route of routes) {
    const rs = runsOf(route, runs)
    if (rs.length < 2) continue
    ms += Math.max(0, rs[0].splits.at(-1) - pickPB(rs).splits.at(-1))
  }
  return ms
}

// Same pick all day, a different one tomorrow, for ties.
function seed(str) {
  let h = 2166136261
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0) / 4294967296
}

/**
 * The one run PB lays out for you today. Prefers the closest call: a short route where your
 * sum of best already beats your PB by the most, relative to its length. If you've raced
 * everything today, or have nothing recorded, PB claims a room with no ghost yet.
 * Returns { route, kind: 'race' | 'record', table, pb } or null.
 */
export function dailyPick(routes, runs, now = Date.now(), dateKey = '') {
  if (!routes.length) return null
  const today = dayStart(now)
  const scored = []
  const fresh = []
  for (const route of routes) {
    const rs = runsOf(route, runs)
    if (!rs.length) { fresh.push(route); continue }
    const pb = pickPB(rs)
    const ranToday = rs.at(-1).endedAt >= today
    const table = onTable(rs)
    const pbMs = pb.splits.at(-1)
    // Bigger share of the PB already on the table = juicier. Short runs get a boost; ran-today sinks.
    let score = table ? table.ms / pbMs : 0.02
    if (pbMs <= SHORT) score += 0.1
    if (ranToday) score -= 1
    score += seed(dateKey + route.id) * 0.05
    scored.push({ route, kind: 'race', table, pb: pbMs, ranToday, score })
  }
  scored.sort((a, b) => b.score - a.score)
  const top = scored[0]
  if (top && !top.ranToday) return top
  if (fresh.length) {
    const short = [...fresh].sort((a, b) => a.steps.length - b.steps.length || a.order - b.order)
    const pool = short.filter((r) => r.steps.length === short[0].steps.length)
    const route = pool[Math.floor(seed(dateKey) * pool.length)]
    return { route, kind: 'record', table: null, pb: null }
  }
  return top || null
}

/**
 * PB's mood and line when you open the app. Never mentions days without a run:
 * after a quiet stretch PB is simply caught napping, which is good news for you.
 */
export function greeting(runs, now = Date.now()) {
  if (!runs.length) return { mood: 'sneaky', key: 'new' }
  const last = Math.max(...runs.map((r) => r.endedAt))
  if (last >= dayStart(now)) return { mood: 'taunt', key: 'again' }
  if (now - last >= 2 * DAY) return { mood: 'sleepy', key: 'napping' }
  return { mood: 'smug', key: 'back' }
}

export const GREETING_COPY = {
  new: { head: 'Your house is haunted.', line: 'PB picked a first room. Nothing to beat, nothing to lose.' },
  again: { head: 'PB is plotting a rematch.', line: 'It already picked the next one.' },
  napping: { head: 'PB dozed off on the couch.', line: 'Ghosts get slow when it’s quiet. Catch it napping.' },
  back: { head: 'PB made a mess again.', line: 'It left you the closest call in the house.' },
}

/** One line for the Daily Run card. */
export function pickLine(pick) {
  if (!pick) return ''
  if (pick.kind === 'record') return 'No ghost lives here yet. First run records it.'
  if (pick.table?.ms >= 1000) return `${secs(pick.table.ms)} is already on the table, most of it on ${pick.table.step}.`
  if (pick.ranToday) return 'You already raced this today. PB says once more.'
  return 'PB is guarding this one. Every step counts.'
}

/** 41s / 1:05 for copy. */
export function secs(ms) {
  const t = Math.round(ms / 1000)
  return t < 60 ? `${t}s` : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

// --- Haunt me: a calendar invite instead of push notifications -------------------------------

const pad = (n) => String(n).padStart(2, '0')
const icsLocal = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
const icsUtc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
// RFC 5545: lines over 75 octets fold with CRLF + space, never inside a character.
const enc = new TextEncoder()
function fold(line) {
  const out = []
  let cur = '', bytes = 0
  for (const ch of line) {
    const b = enc.encode(ch).length
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0 }
    cur += ch; bytes += b
  }
  out.push(cur)
  return out.join('\r\n ')
}

/** Next occurrence of hh:mm after now, at least an hour away (so "same time" means tomorrow). */
export function nextSlot(hh, mm, now = new Date()) {
  const d = new Date(now)
  d.setHours(hh, mm, 0, 0)
  if (d.getTime() - now.getTime() < 3600 * 1000) d.setDate(d.getDate() + 1)
  return d
}

/** Round "now" to the nearest quarter hour: the same-time-tomorrow default. */
export function sameTime(now = new Date()) {
  const q = Math.round((now.getHours() * 60 + now.getMinutes()) / 15) * 15
  return { hh: Math.floor(q / 60) % 24, mm: q % 60 }
}

/**
 * A 10 minute calendar slot PB books for you, with an alert at the start.
 * Floating local time so it lands at the same wall-clock time wherever the phone is.
 */
export function hauntIcs({ route, url, at, daily = false, line = '', now = new Date(), id = 'x' }) {
  const end = new Date(at.getTime() + 10 * 60 * 1000)
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//brokenbranch//Ghostrun//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:ghostrun-${id}@ghostrun`,
    `DTSTAMP:${icsUtc(now)}`,
    `DTSTART:${icsLocal(at)}`,
    `DTEND:${icsLocal(end)}`,
    ...(daily ? ['RRULE:FREQ=DAILY'] : []),
    `SUMMARY:${esc(`👻 Race PB: ${route}`)}`,
    `DESCRIPTION:${esc(`${line ? line + '\n' : ''}One run. PB is waiting.\n${url}`)}`,
    `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`PB made a mess: ${route}`)}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

