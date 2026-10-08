// Effort meter: motion-sensor proof that a run was a real chore, not a couch shake.
// Feed it devicemotion samples; call split() at each split. verdict() decides at the finish.
//
// Sensors can't see dishes, so this is about catching the obvious fakes the plan
// names: a phone shaken on the couch, splits faster than any chore, or a phone
// that never moved at all. Tuned in simulation against real iPhone pocket data
// (test/sim, docs/TUNING.md), not yet on a real phone.

export const PROOF = {
  activeAt: 0.6,       // m/s^2 of high-passed motion that counts as "something happened"
  violentAt: 14,       // m/s^2: shaking hard, not scrubbing
  shakeShare: 0.3,     // more than this share of samples violent = shaking
  minStepMs: 3000,     // a step faster than this is a blip
  blipShare: 0.5,      // more than half the steps blips = too fast to be a chore
  movedShare: 0.5,     // at least this share of steps need some motion
  minActive: 0.02,     // share of a step's samples that must be active to count as "moved"...
  minActiveMs: 2500,   // ...or this much active time, so a long step with one walk to the cupboard still counts
  minSamples: 20,      // fewer samples than this in the whole run = no working sensor
  rcMs: 67,            // high-pass time constant (about 2.4 Hz), the same on 50, 60 and 100 Hz phones
}

const newSeg = () => ({ n: 0, active: 0, violent: 0, activeMs: 0 })

export const TRACE_MS = 250 // one seismograph point per quarter second

export class EffortMeter {
  constructor() {
    this.lastT = null
    this.trace = []     // peak motion per TRACE_MS bucket, 0..255 (x10 m/s^2), for the seismograph
    this.prev = null
    this.hp = [0, 0, 0]
    this.cur = newSeg()
    this.segments = []
    this.samples = 0
    this.live = false // true once a sample with real numbers arrives
  }

  /** a = {x,y,z} accelerationIncludingGravity (or acceleration); t = ms since the run started */
  push(a, t = 0) {
    if (!a || a.x == null) return
    const v = [a.x || 0, a.y || 0, a.z || 0]
    if (v.some((n) => n !== 0)) this.live = true
    if (!this.prev) { this.prev = v; this.lastT = t; return }
    const dt = Math.min(100, Math.max(1, t - this.lastT))
    const alpha = PROOF.rcMs / (PROOF.rcMs + dt)
    this.hp = this.hp.map((h, i) => alpha * (h + v[i] - this.prev[i]))
    this.prev = v; this.lastT = t
    const m = Math.hypot(...this.hp)
    this.samples++
    this.cur.n++
    if (m > PROOF.activeAt) { this.cur.active++; this.cur.activeMs += dt }
    if (m > PROOF.violentAt) this.cur.violent++
    const b = Math.floor(Math.max(0, t) / TRACE_MS)
    if (b < 4 * 60 * 60 * 2) { // cap at two hours of trace
      while (this.trace.length <= b) this.trace.push(0)
      this.trace[b] = Math.max(this.trace[b], Math.min(255, Math.round(m * 10)))
    }
  }

  split() { this.segments.push(this.cur); this.cur = newSeg() }
  undo() {
    const last = this.segments.pop()
    if (last) this.cur = { n: last.n + this.cur.n, active: last.active + this.cur.active, violent: last.violent + this.cur.violent, activeMs: (last.activeMs || 0) + this.cur.activeMs }
  }

  /** Browser helper. now() gives ms since the run started. Returns an unsubscribe function. */
  listen(now = () => 0) {
    const h = (e) => this.push(e.accelerationIncludingGravity || e.acceleration, now())
    addEventListener('devicemotion', h)
    return () => removeEventListener('devicemotion', h)
  }
}

/**
 * Decide whether a run counts. Returns { verified, reason }. `sources` says how each split came in ('tap', 'knock', 'flip').
 * reason: 'motion' (verified), 'nosensor', 'shake', 'fast', 'still'.
 */
export function verdict({ segments, live, samples }, splits, sources = []) {
  if (!live || samples < PROOF.minSamples) return { verified: false, reason: 'nosensor' }
  const n = segments.reduce((a, s) => a + s.n, 0) || 1
  const violent = segments.reduce((a, s) => a + s.violent, 0)
  if (violent / n > PROOF.shakeShare) return { verified: false, reason: 'shake' }
  const lens = splits.map((c, i) => c - (i ? splits[i - 1] : 0))
  const blips = lens.filter((d) => d < PROOF.minStepMs).length
  if (blips / lens.length > PROOF.blipShare) return { verified: false, reason: 'fast' }
  // A knock on the counter or a pick-up from face down is a hand doing something, even if the phone sat still all step.
  const hands = (i) => sources[i] === 'knock' || sources[i] === 'flip'
  const moved = segments.filter((s, i) => hands(i) || (s.n && (s.active / s.n >= PROOF.minActive || (s.activeMs || 0) >= PROOF.minActiveMs))).length
  if (moved / segments.length < PROOF.movedShare) return { verified: false, reason: 'still' }
  return { verified: true, reason: 'motion' }
}

/** Copy for each verdict. PB takes the blame; nothing here scolds the player. */
export const PROOF_COPY = {
  motion: 'Verified by motion. This one counts.',
  nosensor: 'No motion sensor here, so this saves as Any% (time only). Run it on your phone to make it count.',
  shake: 'PB felt that shake. Shaking isn’t scrubbing, so this saves as Any% (time only).',
  fast: 'Those splits were quicker than any chore. Saved as Any% (time only); PB keeps the crown for now.',
  still: 'The phone barely moved this run, so it saves as Any% (time only). Keep it in a pocket or pick it up to split.',
}
