// Ghost Beat: a race soundtrack built live in the browser (Web Audio, no files, works offline).
// It follows the same gap as PB's hum. You far ahead -> a slow, sparse haunted groove.
// PB close or ahead -> faster, more drums, a 16th-note arp, and PB's theremin wail on top.
// It ducks while the browser is speaking, so PB's split calls always cut through.
// Share the AudioContext with PBWhisper: one tap unlocks both.

// --- Pure bits (tested) ----------------------------------------------------------
/** 0..1 drive from PB's lead in ms (negative = you lead). Neck and neck or PB ahead = hot. */
export function intensityFor(gapMs, rangeMs = 20000) {
  if (gapMs == null || !Number.isFinite(gapMs)) return 0.4 // recording your ghost: steady, nothing to lose
  const k = Math.max(-1, Math.min(1, gapMs / rangeMs))
  const near = (k + 1) / 2, close = 1 - Math.abs(k)
  return Math.max(0, Math.min(1, 0.25 + 0.6 * near + 0.3 * close))
}
export const bpmFor = (i) => Math.round(100 + 44 * i)

// i - VI - iv - V in E minor: the classic chase loop, one chord per bar.
export const CHORDS = [
  { bass: 40, tones: [64, 67, 71] }, // Em
  { bass: 36, tones: [60, 64, 67] }, // C
  { bass: 33, tones: [57, 60, 64] }, // Am
  { bass: 35, tones: [59, 63, 66] }, // B (major V, the leading tone pulls you back round)
]
const ARP = [0, 1, 2, 3, 2, 1, 0, 2] // index into tones + octave
/** Which parts play on a 16th step (0..15) at intensity i. */
export function hits(step, i) {
  const q = step % 4 === 0
  return {
    kick: i > 0.2 && (q || (i > 0.75 && step === 14)),
    clap: i > 0.45 && (step === 4 || step === 12),
    hat: i > 0.3 && (i > 0.65 ? true : step % 2 === 0),
    open: i > 0.5 && step % 4 === 2,
    bass: step % 2 === 0 || (i > 0.7 && step % 4 === 3),
    arp: i > 0.35 && (i > 0.6 || step % 2 === 0),
  }
}
export const arpNote = (chord, step) => {
  const a = ARP[step % ARP.length], t = chord.tones
  return a < 3 ? t[a] : t[0] + 12
}
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)

// --- Engine ------------------------------------------------------------------------
export class GhostBeat {
  constructor(ctx) {
    this.ctx = ctx
    this.i = this.target = 0.4
    this.step = 0
    this.bar = 0

    this.duck = ctx.createGain(); this.duck.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2
    this.bus = ctx.createGain(); this.bus.gain.value = 0.5
    this.bus.connect(comp).connect(this.duck).connect(ctx.destination)

    // Haunted echo for the arp and the wail: dotted-8th delay, darkened on each repeat.
    this.send = ctx.createGain(); this.send.gain.value = 0.35
    const dl = this.delay = ctx.createDelay(1.5), fb = ctx.createGain(), dark = ctx.createBiquadFilter()
    fb.gain.value = 0.38; dark.type = 'lowpass'; dark.frequency.value = 2200
    this.send.connect(dl).connect(dark).connect(fb).connect(dl); dark.connect(this.bus)

    // Bass and arp each run through one filter that opens as the race heats up.
    this.bassF = ctx.createBiquadFilter(); this.bassF.type = 'lowpass'; this.bassF.Q.value = 8; this.bassF.connect(this.bus)
    this.arpF = ctx.createBiquadFilter(); this.arpF.type = 'lowpass'; this.arpF.Q.value = 3
    this.arpF.connect(this.bus); this.arpF.connect(this.send)

    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = buf.getChannelData(0)
    for (let n = 0; n < d.length; n++) d[n] = Math.random() * 2 - 1
    this.noise = buf
  }

  start() {
    if (this.timer) return
    const t = this.ctx.currentTime
    this.duck.gain.setTargetAtTime(1, t, 0.8) // fade in, no jump scare
    this.next = t + 0.1
    this.timer = setInterval(() => this.tick(), 25)
  }

  /** Same signal as the hum: PB's lead in ms. */
  setGap(gapMs) { this.target = intensityFor(gapMs) }

  tick() {
    const ctx = this.ctx, now = ctx.currentTime
    if (ctx.state === 'closed') return this.stop()
    // Ease toward the target (about 2.5 s) so a lead change is a build, not a cut.
    this.i += (this.target - this.i) * (1 - Math.exp(-(now - (this.last ?? now)) / 2.5))
    this.last = now
    const speaking = typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking
    this.duck.gain.setTargetAtTime(speaking ? 0.3 : 1, now, speaking ? 0.05 : 0.4)
    this.delay.delayTime.setTargetAtTime(0.75 * 60 / bpmFor(this.i), now, 0.5)
    this.bassF.frequency.setTargetAtTime(280 + 1300 * this.i, now, 0.3)
    this.arpF.frequency.setTargetAtTime(900 + 3500 * this.i, now, 0.3)
    // A face-down phone with the screen off gets ~1 timer tick a second, so schedule further ahead.
    const ahead = typeof document !== 'undefined' && document.hidden ? 1.6 : 0.15
    if (this.next < now) this.next = now + 0.02
    while (this.next < now + ahead) {
      this.play(this.step, this.next)
      this.next += 60 / bpmFor(this.i) / 4
      if (++this.step === 16) { this.step = 0; this.bar++ }
    }
  }

  play(step, t) {
    const i = this.i, chord = CHORDS[this.bar % 4], h = hits(step, i), s16 = 60 / bpmFor(i) / 4
    if (step === 0) this.pad(chord, t, s16 * 16)
    if (step === 0 && i > 0.6 && this.bar % 4 === 0) this.wail(t, s16 * 24)
    if (h.kick) this.kick(t)
    if (h.clap) this.hiss(t, 'bandpass', 1500, 0.28, 0.16)
    if (h.hat) this.hiss(t, 'highpass', 7500, 0.07 + 0.05 * i, 0.035)
    if (h.open) this.hiss(t, 'highpass', 6500, 0.05, 0.18)
    if (h.bass) this.bass(chord.bass + (step % 8 === 6 ? 12 : 0), t, s16 * 1.6)
    if (h.arp) this.voice(this.arpF, 'square', arpNote(chord, step) + (i > 0.8 && step >= 8 ? 12 : 0), t, s16 * 0.9, 0.035)
  }

  env(t, peak, len, attack = 0.005) {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    return g
  }

  kick(t) {
    const o = this.ctx.createOscillator(), g = this.env(t, 0.9, 0.32, 0.002)
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.35)
  }

  hiss(t, type, freq, peak, len) {
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.env(t, peak, len, 0.001)
    src.buffer = this.noise; f.type = type; f.frequency.value = freq
    src.connect(f).connect(g).connect(this.bus); src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02)
  }

  bass(m, t, len) {
    // Two detuned saws: a growl under the floorboards.
    ;[-8, 8].forEach((det) => this.voice(this.bassF, 'sawtooth', m, t, len, 0.09, det))
  }

  voice(dest, type, m, t, len, peak, detune = 0) {
    const o = this.ctx.createOscillator(), g = this.env(t, peak, len)
    o.type = type; o.frequency.value = mtof(m); o.detune.value = detune
    o.connect(g).connect(dest); o.start(t); o.stop(t + len + 0.02)
  }

  pad(chord, t, len) {
    // Cold lilac air: soft detuned sines, slow swell, PB breathing on the chord.
    const peak = 0.025 + 0.02 * (1 - this.i)
    chord.tones.forEach((m) => [-6, 6].forEach((det) => {
      const o = this.ctx.createOscillator(), g = this.env(t, peak, len, len * 0.4)
      o.type = 'sine'; o.frequency.value = mtof(m - 12); o.detune.value = det
      o.connect(g).connect(this.bus); o.start(t); o.stop(t + len + 0.05)
    }))
  }

  wail(t, len) {
    // PB's theremin: a sine that slides up a fifth with a wide, wobbly vibrato.
    const o = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), depth = this.ctx.createGain()
    const g = this.env(t, 0.05, len, len * 0.3)
    o.type = 'sine'; o.frequency.setValueAtTime(mtof(76), t); o.frequency.exponentialRampToValueAtTime(mtof(83), t + len * 0.5)
    o.frequency.exponentialRampToValueAtTime(mtof(79), t + len)
    lfo.frequency.value = 5.5; depth.gain.value = 9
    lfo.connect(depth).connect(o.frequency)
    o.connect(g); g.connect(this.bus); g.connect(this.send)
    o.start(t); lfo.start(t); o.stop(t + len + 0.05); lfo.stop(t + len + 0.05)
  }

  stop() {
    clearInterval(this.timer); this.timer = null
    if (this.ctx.state !== 'closed') this.duck.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1)
  }
}
