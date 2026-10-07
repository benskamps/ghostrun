// Effort meter: motion-sensor proof that a run was a real chore, not a couch shake.
// Feed it devicemotion samples; call split() at each split. verdict() decides at the finish.
//
// Sensors can't see dishes, so this is about catching the obvious fakes the plan
// names: a phone shaken on the couch, splits faster than any chore, or a phone
// that never moved at all. All thresholds are starting guesses to tune on real phones.

export const PROOF = {
  activeAt: 0.6,       // m/s^2 of high-passed motion that counts as "something happened"
  violentAt: 14,       // m/s^2: shaking hard, not scrubbing
  shakeShare: 0.3,     // more than this share of samples violent = shaking
  minStepMs: 3000,     // a step faster than this is a blip
  blipShare: 0.5,      // more than half the steps blips = too fast to be a chore
  movedShare: 0.5,     // at least this share of steps need some motion
  minActive: 0.02,     // share of a step's samples that must be active to count as "moved"
  minSamples: 20,      // fewer samples than this in the whole run = no working sensor
}

const newSeg = () => ({ n: 0, active: 0, violent: 0 })

export const TRACE_MS = 250 // one seismograph point per quarter second

export class EffortMeter {
  constructor(alpha = 0.8) {
    this.alpha = alpha
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
    if (!this.prev) { this.prev = v; return }
    this.hp = this.hp.map((h, i) => this.alpha * (h + v[i] - this.prev[i]))
    this.prev = v
    const m = Math.hypot(...this.hp)
    this.samples++
    this.cur.n++
    if (m > PROOF.activeAt) this.cur.active++
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
    if (last) this.cur = { n: last.n + this.cur.n, active: last.active + this.cur.active, violent: last.violent + this.cur.violent }
  }

  /** Browser helper. now() gives ms since the run started. Returns an unsubscribe function. */
  listen(now = () => 0) {
    const h = (e) => this.push(e.accelerationIncludingGravity || e.acceleration, now())
    addEventListener('devicemotion', h)
    return () => removeEventListener('devicemotion', h)
  }
}

/**
 * Decide whether a run counts. Returns { verified, reason }.
 * reason: 'motion' (verified), 'nosensor', 'shake', 'fast', 'still'.
 */
export function verdict({ segments, live, samples }, splits) {
  if (!live || samples < PROOF.minSamples) return { verified: false, reason: 'nosensor' }
  const n = segments.reduce((a, s) => a + s.n, 0) || 1
  const violent = segments.reduce((a, s) => a + s.violent, 0)
  if (violent / n > PROOF.shakeShare) return { verified: false, reason: 'shake' }
  const lens = splits.map((c, i) => c - (i ? splits[i - 1] : 0))
  const blips = lens.filter((d) => d < PROOF.minStepMs).length
  if (blips / lens.length > PROOF.blipShare) return { verified: false, reason: 'fast' }
  const moved = segments.filter((s) => s.n && s.active / s.n >= PROOF.minActive).length
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
