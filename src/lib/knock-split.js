// Knock-to-Split: detect two sharp knocks on the surface the phone is lying on.
// Feed it devicemotion samples; it calls onKnock() on a double-knock.
//
// How: a high-pass filter strips gravity and slow motion. A "spike" is a run of
// samples whose filtered magnitude is above `threshold`. A double-knock is exactly
// two short spikes, 120-550 ms apart, with calm before the first and after the
// second. Scrubbing and wiping make long or repeated spikes, so they don't count.
// All numbers are starting guesses: tune them on real phones (day-one test 01).

export class KnockDetector {
  constructor({
    onKnock = () => {},
    threshold = 1.6,       // m/s^2 of high-passed magnitude that counts as loud
    maxSpikeMs = 50,       // a knock is short; anything longer is handling or scrubbing
    quietBeforeMs = 250,   // calm needed before knock 1
    quietAfterMs = 200,    // calm needed after knock 2 before we commit
    gapMin = 120, gapMax = 550, // ms between knock starts
    refractoryMs = 900,    // ignore everything right after a split
    alpha = 0.8,           // high-pass coefficient
  } = {}) {
    Object.assign(this, { onKnock, threshold, maxSpikeMs, quietBeforeMs, quietAfterMs, gapMin, gapMax, refractoryMs, alpha });
    this.prev = null; this.hp = [0, 0, 0];
    this.spikes = []; this.cur = null; this.lockedUntil = 0;
  }

  /** t in ms, a = {x,y,z} accelerationIncludingGravity (or acceleration) */
  push(t, a) {
    const v = [a.x || 0, a.y || 0, a.z || 0];
    if (!this.prev) { this.prev = v; return; }
    this.hp = this.hp.map((h, i) => this.alpha * (h + v[i] - this.prev[i]));
    this.prev = v;
    const loud = Math.hypot(...this.hp) > this.threshold;

    if (loud) {
      if (this.cur) this.cur.end = t; else this.cur = { start: t, end: t };
      return;
    }
    if (this.cur) { this.spikes.push(this.cur); this.cur = null; }
    // forget spikes that can no longer be part of a pattern
    const horizon = t - (this.gapMax + this.quietBeforeMs + this.maxSpikeMs + this.quietAfterMs);
    while (this.spikes.length > 3 && this.spikes[0].end < horizon) this.spikes.shift();

    const n = this.spikes.length;
    if (n < 2 || t < this.lockedUntil) return;
    const s2 = this.spikes[n - 1], s1 = this.spikes[n - 2], s0 = this.spikes[n - 3];
    if (t - s2.end < this.quietAfterMs) return;           // wait for calm after knock 2
    const ok =
      s1.end - s1.start <= this.maxSpikeMs && s2.end - s2.start <= this.maxSpikeMs &&
      s2.start - s1.start >= this.gapMin && s2.start - s1.start <= this.gapMax &&
      (!s0 || s1.start - s0.end >= this.quietBeforeMs);
    this.spikes = [];
    if (ok) { this.lockedUntil = t + this.refractoryMs; this.onKnock(s2.start); }
  }

  /** Browser helper: start listening. Call from a tap (iOS needs requestPermission first). */
  listen() {
    const h = e => this.push(e.timeStamp, e.accelerationIncludingGravity || e.acceleration || {});
    addEventListener("devicemotion", h);
    return () => removeEventListener("devicemotion", h);
  }
}
