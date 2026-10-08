// Ghost Beat: a race soundtrack built live in the browser (Web Audio, no files, works offline).
// It plays one of the songs in ghost-tracks.js and follows the same gap as PB's hum.
// You far ahead -> a slow, sparse haunted groove. PB close or ahead -> faster, more drums,
// the lead line fills in, and PB's theremin wail rides on top.
// It ducks (with the hum, which PBWhisper routes through `duck`) while the browser is speaking,
// so PB's split calls always cut through. Share the AudioContext with PBWhisper: one tap unlocks both.

import { pickTrack, bpmFor, chordAt } from './ghost-tracks.js'

// --- Pure bits (tested) ----------------------------------------------------------
/** 0..1 drive from PB's lead in ms (negative = you lead). Neck and neck or PB ahead = hot. */
export function intensityFor(gapMs, rangeMs = 20000) {
  if (gapMs == null || !Number.isFinite(gapMs)) return 0.4 // recording your ghost: steady, nothing to lose
  const k = Math.max(-1, Math.min(1, gapMs / rangeMs))
  const near = (k + 1) / 2, close = 1 - Math.abs(k)
  return Math.max(0, Math.min(1, 0.25 + 0.6 * near + 0.3 * close))
}
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)
/** Fourier series for the custom voices: a drawbar organ and a 25% NES pulse. */
const ORGAN = [0, 1, 0.8, 0.5, 0.45, 0, 0.3, 0, 0.2]
const PULSE = Array.from({ length: 32 }, (_, n) => (n ? (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.25) : 0))

// --- Engine ------------------------------------------------------------------------
export class GhostBeat {
  constructor(ctx, trackId = 'shuffle') {
    this.ctx = ctx
    this.track = pickTrack(trackId)
    this.i = this.target = 0.4
    this.step = 0
    this.bar = 0

    this.duck = ctx.createGain(); this.duck.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2
    // A gentle top cut after the compressor keeps noise drums from fizzing on phone speakers.
    const air = ctx.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = 9500; air.Q.value = 0.5
    this.bus = ctx.createGain(); this.bus.gain.value = 0.5
    this.bus.connect(comp).connect(air).connect(this.duck).connect(ctx.destination)

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
    const wave = (h) => ctx.createPeriodicWave(new Float32Array(h), new Float32Array(h.length))
    this.waves = { organ: wave(ORGAN), pulse: wave(PULSE) }
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
    this.delay.delayTime.setTargetAtTime(0.75 * 60 / bpmFor(this.track, this.i), now, 0.5)
    this.bassF.frequency.setTargetAtTime(280 + 1300 * this.i, now, 0.3)
    this.arpF.frequency.setTargetAtTime(900 + 3500 * this.i, now, 0.3)
    // A face-down phone with the screen off gets ~1 timer tick a second, so schedule further ahead.
    const ahead = typeof document !== 'undefined' && document.hidden ? 1.6 : 0.15
    if (this.next < now) this.next = now + 0.02
    while (this.next < now + ahead) {
      this.play(this.step, this.next)
      this.next += 60 / bpmFor(this.track, this.i) / 4
      if (++this.step === 16) { this.step = 0; this.bar++ }
    }
  }

  play(step, t) {
    const i = this.i, tr = this.track, bar = this.bar, c = chordAt(tr, bar), s16 = 60 / bpmFor(tr, i) / 4
    const d = tr.drums(step, i, bar)
    if (step === 0) this.pad(c, t, s16 * 16)
    if (step === 0 && i > 0.6 && bar % 4 === 0) this.wail(t, s16 * 24, (bar >> 2) % 2)
    if (d.kick) this.kick(t)
    if (d.snare) this.snare(t, bar % 8 === 7 && step >= 12 ? 0.45 + (step - 12) * 0.15 : 1)
    if (d.hat) this.hiss(t, 9000, d.hat * (0.022 + 0.018 * i), 0.025)
    if (d.open) this.hiss(t, 8000, 0.018, 0.1)
    const b = tr.bass.hit(step, i)
    if (b != null) this.bass(c.bass + b, t, s16 * tr.bass.len)
    const n = tr.lead.note(c, step, i)
    if (n != null) {
      const notes = tr.lead.chord ? c.tones : [n]
      notes.forEach((m) => this.voice(this.arpF, tr.lead.wave, m, t, s16 * tr.lead.len, tr.lead.peak))
    }
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

  hiss(t, freq, peak, len) {
    // Hats: a narrow band of noise, short and quiet. Loud wide-band hats were the hiss.
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.env(t, peak, len, 0.001)
    src.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9
    src.connect(f).connect(g).connect(this.bus); src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02)
  }

  snare(t, vel) {
    // A tuned body under a short noise snap, so the backbeat thumps instead of hisses.
    const o = this.ctx.createOscillator(), og = this.env(t, 0.22 * vel, 0.09, 0.002)
    o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08)
    o.connect(og).connect(this.bus); o.start(t); o.stop(t + 0.12)
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.env(t, 0.12 * vel, 0.12, 0.001)
    src.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 1.4
    src.connect(f).connect(g).connect(this.bus); src.start(t, Math.random() * 0.5); src.stop(t + 0.14)
  }

  bass(m, t, len) {
    const { wave, peak } = this.track.bass
    // Saws come in a detuned pair: a growl under the floorboards. Organ and triangle play alone.
    if (wave === 'sawtooth') [-8, 8].forEach((det) => this.voice(this.bassF, wave, m, t, len, 0.09, det))
    else this.voice(this.bassF, wave, m, t, len, peak || 0.12)
  }

  voice(dest, type, m, t, len, peak, detune = 0) {
    const o = this.ctx.createOscillator(), g = this.env(t, peak, len)
    if (this.waves[type]) o.setPeriodicWave(this.waves[type]); else o.type = type === 'stab' ? 'sawtooth' : type
    o.frequency.value = mtof(m); o.detune.value = detune
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

  wail(t, len, down = 0) {
    // PB's theremin, on every track: a sine sliding a fifth with a wide, wobbly vibrato. Up, then down next time.
    const o = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), depth = this.ctx.createGain()
    const g = this.env(t, 0.05, len, len * 0.3)
    o.type = 'sine'; const [a, b, c] = down ? [83, 76, 79] : [76, 83, 79]
    o.frequency.setValueAtTime(mtof(a), t); o.frequency.exponentialRampToValueAtTime(mtof(b), t + len * 0.5)
    o.frequency.exponentialRampToValueAtTime(mtof(c), t + len)
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
