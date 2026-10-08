// Chore breakdown: "clean the kitchen" becomes a route. Prep to grab first, then steps, each a split
// with PB's guess at a par time. After your first run, your ghost replaces the guess.
// Pure and shared: the phone uses it for PB's own notes (no key, no signal), and the proof route
// runs every AI answer through shapeBreakdown before it reaches a phone.
import { LIBRARY, GENERIC } from './breakdown-library.js'

export const KINDS = ['chore', 'errand', 'admin']
export const SIZES = { quick: 5, full: 10 }
export const MOODS = ['smug', 'taunt', 'giggle', 'sneaky', 'shocked', 'dizzy', 'sleepy']
export const BD_LIMITS = { text: 80, name: 40, step: 40, prep: 6, prepItem: 28, mess: 90, minSteps: 2, minPar: 10, maxPar: 3600, firstPar: 90 }

/** Plain short text: letters, numbers and everyday punctuation. Anything else becomes a space. */
export function plain(s, max) {
  return String(s || '').replace(/[^\p{L}\p{N} '’&,.!?()/+-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim()
}

const stem = (w) => {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 4 && /(sh|ch|x|ss)es$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}
const words = (s) => String(s || '').toLowerCase().replace(/[’']/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(stem)

const INDEX = LIBRARY.map((e) => ({ e, keys: e.keys.map((k) => words(k)) }))

/** The best entry in PB's notes for this text and kind, or null. Longer phrase matches win. */
export function matchLibrary(text, kind = 'chore') {
  const t = ` ${words(text).join(' ')} `
  let best = null, top = 0
  for (const { e, keys } of INDEX) {
    if (e.kind !== kind) continue
    let score = 0
    for (const k of keys) if (k.length && t.includes(` ${k.join(' ')} `)) score += k.length * 2 + (k.join(' ').length > 6 ? 1 : 0)
    if (score > top) { top = score; best = e }
  }
  return best
}

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/** PB's own notes, sized. Always returns a breakdown: a match, or a generic shape named after the text. */
export function fromLibrary(text, kind = 'chore', size = 'full') {
  const k = KINDS.includes(kind) ? kind : 'chore'
  const hit = matchLibrary(text, k)
  const e = hit || GENERIC[k]
  const pick = size === 'quick' && e.quick ? e.quick.map((i) => e.steps[i]).filter(Boolean) : e.steps
  const name = hit ? e.name : titleCase(plain(text, BD_LIMITS.name)) || 'New run'
  return shapeBreakdown({
    name, mood: e.mood, mess: e.mess, prep: e.prep,
    steps: pick.map(([step, par, drive]) => ({ step, par, drive: !!drive })),
  }, k, size, { source: 'notes', match: hit?.id || null })
}

// PB takes the blame and nobody gets guilted. A mess line that points at the player is swapped out.
const SHAME = /\b(you|you’ve|you've|your)\s+(missed|forgot|forgotten|left|never|didn|failed|neglect|lazy|always)/i
const LINKISH = /(https?|www\.|\.com|\.org|\.gov|\.net|@)/i
// Admin% never asks for numbers that unlock someone's life.
const SECRETS = /\b(ssn|social security|password|passcode|pin|login details|card number|cvv|routing number|account number)\b/i

/**
 * Bound and clean any breakdown, from the AI or from PB's notes. Returns null when it isn't a usable run.
 * raw: { name, mood, mess, prep: [string], steps: [{ step, par, drive }] }
 */
export function shapeBreakdown(raw, kind = 'chore', size = 'full', meta = {}) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.steps)) return null
  const k = KINDS.includes(kind) ? kind : 'chore'
  const cap = SIZES[size] || SIZES.full
  const seen = new Set()
  let steps = []
  for (const s of raw.steps) {
    const label = plain(typeof s === 'string' ? s : s?.step, BD_LIMITS.step)
    if (!label || LINKISH.test(label) || SECRETS.test(label)) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const p = Number(s?.par)
    steps.push({ step: label, par: Number.isFinite(p) ? Math.round(Math.min(BD_LIMITS.maxPar, Math.max(BD_LIMITS.minPar, p))) : 120, drive: k === 'errand' && !!s?.drive })
  }
  if (k === 'admin') {
    const confirm = steps.findIndex((s) => /confirm/i.test(s.step))
    if (confirm >= 0) steps = steps.slice(0, confirm + 1)
    else steps.push({ step: 'Get the confirmation', par: 30, drive: false })
    // The confirmation is the proof, so it stays last even when the run is trimmed.
    if (steps.length > cap) steps = [...steps.slice(0, cap - 1), steps.at(-1)]
  } else steps = steps.slice(0, cap)
  if (steps.length < BD_LIMITS.minSteps) return null
  // Starting is the hard part: the first split is always small. Leaving the house is never a drive.
  steps[0].par = Math.min(steps[0].par, BD_LIMITS.firstPar)
  steps[0].drive = false

  const name = plain(raw.name, BD_LIMITS.name) || 'New run'
  let mess = plain(raw.mess, BD_LIMITS.mess)
  if (!/\bPB\b/.test(mess) || SHAME.test(mess) || LINKISH.test(mess)) mess = GENERIC[k].mess
  const prep = (Array.isArray(raw.prep) ? raw.prep : [])
    .map((p) => plain(p, BD_LIMITS.prepItem)).filter((p) => p && !LINKISH.test(p) && !SECRETS.test(p))
    .filter((p, i, a) => a.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i).slice(0, BD_LIMITS.prep)

  const out = {
    name, mess, prep,
    mood: MOODS.includes(raw.mood) ? raw.mood : GENERIC[k].mood,
    steps: steps.map((s) => s.step),
    par: steps.map((s) => s.par),
    source: meta.source === 'pb' ? 'pb' : 'notes',
    match: meta.match || null,
  }
  if (k === 'errand') out.drive = steps.map((s) => s.drive)
  return out
}

// Starter routes predate breakdowns; they borrow the loadout from PB's notes.
const TEMPLATE_ALIAS = { laundry: 'laundry-fold', 'walk-shop': 'walk' }
/** What to grab before the run: the route's own prep, or the starter's from PB's notes. */
export function prepFor(route) {
  if (Array.isArray(route?.prep)) return route.prep
  const id = route?.template && (TEMPLATE_ALIAS[route.template] || route.template)
  return (id && LIBRARY.find((e) => e.id === id)?.prep) || []
}

/** Total of PB's par guesses in ms, or null if any step has no guess (the steps were edited). */
export function parTotal(par, n) {
  if (!Array.isArray(par) || !par.length || (n != null && par.length !== n) || !par.every((p) => Number.isFinite(p) && p > 0)) return null
  return par.reduce((a, b) => a + b, 0) * 1000
}

/** "about 12 min" / "about 45 s". PB guesses, it doesn't promise. */
export function aboutTime(ms) {
  if (ms == null) return ''
  const s = Math.round(ms / 1000)
  if (s < 60) return `about ${s} s`
  const m = Math.round(s / 60)
  return m < 60 ? `about ${m} min` : `about ${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim()
}

/**
 * The first-run beat on the Done screen: PB's guess against your recorded ghost. Never a loss.
 * Faster: you beat PB's guess. Slower: PB is bad at guessing, and your ghost is the real number now.
 */
export function guessBeat(parMs, totalMs) {
  if (!parMs || !totalMs) return null
  const gap = parMs - totalMs
  if (gap > 15000) return { beat: true, gapMs: gap, head: 'Faster than PB guessed.', line: 'PB has been told. PB is sulking about it.' }
  if (gap > -15000) return { beat: false, gapMs: 0, head: 'Right on PB’s guess.', line: 'PB is insufferable about this. Your ghost is the number to beat now.' }
  return { beat: false, gapMs: gap, head: 'PB’s guess was way off.', line: 'PB forgot about everything it hid along the way. Your ghost is the real number now.' }
}
