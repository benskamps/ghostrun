// Knock-to-Split: detect two sharp knocks on the surface the phone is lying on.
// Feed it devicemotion samples; it calls onKnock() on a double-knock.
//
// How: a high-pass filter strips gravity and slow motion. Anything above `murmurAt` is a bump;
// bumps closer than `mergeMs` are one event, because a counter rings for a few samples after a hit.
// A knock is a bump that peaks above `threshold` and stays loud no longer than `maxSpikeMs`.
// A double-knock is two knocks in a row, `gapMin`-`gapMax` ms apart and about as hard as each
// other, with no bump at all for `quietBeforeMs` before and `quietAfterMs` after. Scrubbing, a
// cutlery clatter and stacking plates make long, uneven or crowded bumps, so they don't count.
// Tuned in simulation (test/sim, docs/TUNING.md), not yet on a real phone.

export const KNOCK = {
  threshold: 1.2,     // m/s^2 of high-passed magnitude that counts as a knock
  murmurAt: 0.45,     // m/s^2: any bump above this breaks the quiet around a double-knock
  mergeMs: 60,        // bumps this close are one knock and its ring
  maxSpikeMs: 90,     // a knock is short; anything loud for longer is handling or scrubbing
  quietBeforeMs: 800, // calm needed before knock 1 (people pause before they knock; dishes come in runs)
  quietAfterMs: 500,  // calm needed after knock 2 before we commit (a third bang means stacking dishes)
  gapMin: 95,         // ms between knock starts
  gapMax: 550,
  maxRatio: 2,        // the same knuckle knocks about as hard twice; a cup then a pan usually doesn't
  refractoryMs: 900,  // ignore everything right after a split
  ringMs: 90,         // how fast a knock's ring (and the high-pass tail) fades
  rcMs: 67,           // high-pass time constant (about 2.4 Hz), so 50, 60 and 100 Hz phones agree
}

export class KnockDetector {
  constructor({ onKnock = () => {}, ...opts } = {}) {
    Object.assign(this, KNOCK, opts, { onKnock })
    this.prev = null; this.hp = [0, 0, 0]; this.lastT = null
    this.bumps = []; this.cur = null; this.lockedUntil = 0
  }

  /** t in ms, a = {x,y,z} accelerationIncludingGravity (or acceleration) */
  push(t, a) {
    const v = [a.x || 0, a.y || 0, a.z || 0]
    if (!this.prev) { this.prev = v; this.lastT = t; return }
    const dt = Math.min(100, Math.max(1, t - this.lastT))
    const alpha = this.rcMs / (this.rcMs + dt)
    this.hp = this.hp.map((h, i) => alpha * (h + v[i] - this.prev[i]))
    this.prev = v; this.lastT = t
    const m = Math.hypot(...this.hp)
    // A hard knock rings for a while; anything under a quarter of the recent peak is that ring, not a new bump.
    this.env = Math.max(m, (this.env || 0) * Math.exp(-dt / this.ringMs))

    if (m > Math.max(this.murmurAt, this.env * 0.25 * (m < this.env))) {
      if (!this.cur || t - this.cur.end > this.mergeMs) {
        if (this.cur) this.bumps.push(this.cur)
        this.cur = { start: t, end: t, peak: 0, loudStart: null, loudEnd: null }
      }
      const b = this.cur
      b.end = t; b.peak = Math.max(b.peak, m)
      if (m > this.threshold) { b.loudStart ??= t; b.loudEnd = t }
      return
    }
    if (this.cur && t - this.cur.end > this.mergeMs) { this.bumps.push(this.cur); this.cur = null }
    // forget bumps that can no longer be part of a pattern
    const horizon = t - (this.gapMax + this.quietBeforeMs + this.maxSpikeMs + this.quietAfterMs)
    while (this.bumps.length > 1 && this.bumps[1].end < horizon) this.bumps.shift()

    if (t < this.lockedUntil) { this.bumps = []; return } // knocks right after a split are leftovers, not a new split
    const n = this.bumps.length
    if (!n || this.cur) return
    const s2 = this.bumps[n - 1], s1 = this.bumps[n - 2], s0 = this.bumps[n - 3]
    if (s2.seen || t - s2.end < this.quietAfterMs) return // wait for calm after the last bump
    s2.seen = true // judge each bump once as a second knock; it can still be the first of the next pair
    const knock = (s) => s.loudStart != null && s.loudEnd - s.loudStart <= this.maxSpikeMs
    const ok = !!s1 && knock(s1) && knock(s2) &&
      s2.loudStart - s1.loudStart >= this.gapMin && s2.loudStart - s1.loudStart <= this.gapMax &&
      Math.max(s1.peak, s2.peak) <= this.maxRatio * Math.min(s1.peak, s2.peak) &&
      (!s0 || s1.start - s0.end >= this.quietBeforeMs)
    if (ok) { this.bumps = []; this.lockedUntil = t + this.refractoryMs; this.onKnock(s2.loudStart) }
  }

  /** Browser helper: start listening. Call from a tap (iOS needs requestPermission first). */
  listen() {
    const h = e => this.push(e.timeStamp, e.accelerationIncludingGravity || e.acceleration || {})
    addEventListener("devicemotion", h)
    return () => removeEventListener("devicemotion", h)
  }
}
