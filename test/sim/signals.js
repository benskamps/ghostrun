// Simulated phone sensors for replay tests. Nothing here ships to the app.
//
// Motion comes from two places:
//  - Real iPhone data: MotionSense (iPhone 6s in a front pocket, Core Motion at 50 Hz, 24 people,
//    MIT licence). A 48-clip cut lives next to this file; see build-motionsense.js.
//  - Physical models for what no public dataset has: knocks and kitchen bangs travelling through a
//    counter, a phone shaken on the couch, a phone held in a hand. Impacts are damped modes at 1 kHz,
//    then a sensor front end (anti-alias low-pass, 60 Hz sampling, timestamp jitter, noise) like the
//    one between a real accelerometer and a devicemotion event.
import fs from 'node:fs'
import zlib from 'node:zlib'

export const G = 9.81

/** Seeded random numbers so every replay is the same run. */
export function rng(seed = 1) {
  let s = seed >>> 0
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
  r.gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r())
  r.range = (a, b) => a + (b - a) * r()
  return r
}

// ---------- real data: MotionSense ----------

let cache
/** Clips of { kind: 'sit'|'std'|'wlk'|'jog', sub, hz, xyz: [[x,y,z] m/s^2 ...] } */
export function motionSense() {
  if (cache) return cache
  const meta = JSON.parse(fs.readFileSync(new URL('./motionsense.json', import.meta.url), 'utf8'))
  const raw = zlib.gunzipSync(fs.readFileSync(new URL('./motionsense.bin.gz', import.meta.url)))
  const all = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2)
  let o = 0
  cache = meta.clips.map(({ kind, sub, n }) => {
    const xyz = []
    for (let i = 0; i < n; i++, o += 3) xyz.push([all[o] * G / 1000, all[o + 1] * G / 1000, all[o + 2] * G / 1000])
    return { kind, sub, hz: meta.hz, xyz }
  })
  return cache
}

/** Resample a clip to `hz` (linear), looping it to fill `ms`. Returns [[t, {x,y,z}], ...] from t0. */
export function replay(clip, ms, { hz = 60, t0 = 0 } = {}) {
  const out = [], n = clip.xyz.length, dur = n / clip.hz
  for (let t = 0; t < ms; t += 1000 / hz) {
    let x = ((t / 1000) % dur) * clip.hz
    const i = Math.min(n - 2, Math.floor(x)), f = Math.min(1, x - i)
    const a = clip.xyz[i], b = clip.xyz[i + 1]
    out.push([t0 + t, { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, z: a[2] + (b[2] - a[2]) * f }])
  }
  return out
}

// ---------- physical models ----------

const FS = 1000 // physics runs at 1 kHz
const KNOCK_MODES = [[45, 6, 1], [120, 4, 0.6], [22, 10, 0.4]] // knuckle on a wood or laminate counter
const PLATE_MODES = [[18, 30, 1], [60, 12, 0.5], [140, 5, 0.3]] // a plate or pan set down: heavier, rings longer

/** A blank stretch of counter: a phone lying flat, face up (gravity on z). */
export const counter = (ms) => Array.from({ length: Math.ceil(ms) }, () => [0, 0, 0])

function addImpact(sig, t0, amp, modes, dir = [0.2, 0.15, 1]) {
  for (const [f, tau, w] of modes) {
    for (let k = 0; k < tau * 6; k++) {
      const i = Math.round(t0) + k
      if (i < 0 || i >= sig.length) continue
      const v = amp * w * Math.exp(-k / tau) * Math.sin((2 * Math.PI * f * k) / FS)
      for (let a = 0; a < 3; a++) sig[i][a] += v * dir[a]
    }
  }
}

/** Sensor front end: 2nd-order low-pass at fc Hz, sample at hz with timestamp jitter and noise. */
export function sense(sig, { fc = 20, hz = 60, jitterMs = 2, noise = 0.015, seed = 7, t0 = 0, gravity = [0, 0, G] } = {}) {
  const r = rng(seed)
  const K = Math.tan((Math.PI * fc) / FS), q = Math.SQRT1_2, n = 1 / (1 + K / q + K * K)
  const b0 = K * K * n, b1 = 2 * b0, a1 = 2 * (K * K - 1) * n, a2 = (1 - K / q + K * K) * n
  const st = [0, 1, 2].map(() => [0, 0, 0, 0])
  const f = sig.map((v) => v.map((x, a) => {
    const s = st[a], y = b0 * x + b1 * s[0] + b0 * s[1] - a1 * s[2] - a2 * s[3]
    s[1] = s[0]; s[0] = x; s[3] = s[2]; s[2] = y
    return y
  }))
  const out = []
  for (let t = 0; t < sig.length; t += 1000 / hz) {
    const i = Math.min(sig.length - 1, Math.round(t))
    out.push([t0 + t + r.range(-jitterMs, jitterMs), {
      x: gravity[0] + f[i][0] + noise * r.gauss(), y: gravity[1] + f[i][1] + noise * r.gauss(), z: gravity[2] + f[i][2] + noise * r.gauss(),
    }])
  }
  return out
}

// Knock strength is given as the peak a 60 Hz devicemotion stream shows after the high-pass,
// in m/s^2, because that's the number a real phone would report. unitPeak maps it to the model.
const peakCache = new Map()
function unitPeak(modes, fc) {
  const key = modes + fc
  if (!peakCache.has(key)) {
    const s = counter(400); addImpact(s, 100, 1, modes)
    let prev = null, hp = [0, 0, 0], peak = 0
    for (const [, a] of sense(s, { fc, jitterMs: 0, noise: 0 })) {
      const v = [a.x, a.y, a.z]
      if (prev) { hp = hp.map((h, i) => 0.8 * (h + v[i] - prev[i])); peak = Math.max(peak, Math.hypot(...hp)) }
      prev = v
    }
    peakCache.set(key, peak)
  }
  return peakCache.get(key)
}

/** Events on the counter. Each takes the 1 kHz signal and writes into it. */
export const on = {
  knock: (t, peak, fc = 20) => (s) => addImpact(s, t, peak / unitPeak(KNOCK_MODES, fc), KNOCK_MODES),
  plate: (t, peak, fc = 20) => (s) => addImpact(s, t, peak / unitPeak(PLATE_MODES, fc), PLATE_MODES, [0.3, 0.3, 1]),
  /** Cutlery dropped in the rack: a burst of small hits. */
  clatter: (t, peak, r, fc = 20) => (s) => { const n = 4 + Math.floor(r() * 8); for (let k = 0; k < n; k++) addImpact(s, t + r() * 400, (peak * r.range(0.4, 1)) / unitPeak(KNOCK_MODES, fc), KNOCK_MODES) },
  /** Scrubbing a pan on the same counter: a slow rocking that comes through the worktop. */
  scrub: (t, ms, amp, r) => (s) => { const f = r.range(3, 5); for (let k = 0; k < ms && t + k < s.length; k++) { const v = amp * Math.sin((2 * Math.PI * f * k) / FS) * (0.7 + 0.3 * Math.sin(k / 300)); s[t + k][0] += v * 0.5; s[t + k][2] += v } },
  /** Footsteps on a suspended floor: about 2 a second. */
  steps: (t, ms, amp) => (s) => { for (let k = 0; k < ms; k += 550) addImpact(s, t + k, amp / unitPeak(PLATE_MODES, 20), PLATE_MODES) },
}

/** A phone flat on the counter for `ms`, with these events. Returns devicemotion samples. */
export function onCounter(ms, events, opts = {}) {
  const s = counter(ms + 200)
  for (const e of events) e(s)
  return sense(s, opts)
}

/**
 * A phone shaken in a hand on the couch: mostly along one axis at 2.5-6 Hz, peak `g` in g's,
 * wobbling so gravity swings across the axes. Generated at 60 Hz.
 */
export function shake(ms, { g = 1.5, hz = 4, seed = 3, t0 = 0, rate = 60 } = {}) {
  const r = rng(seed), out = []
  const axis = [r.range(0.6, 1), r.range(0.2, 0.6), r.range(0, 0.3)], norm = Math.hypot(...axis)
  for (let t = 0; t < ms; t += 1000 / rate) {
    const w = 2 * Math.PI * hz * (1 + 0.08 * Math.sin(t / 700)) * (t / 1000)
    const amp = g * G * (0.75 + 0.25 * Math.sin(t / 900)) * Math.sin(w)
    const tilt = 0.6 * Math.sin(w + 0.4)
    out.push([t0 + t, {
      x: (amp * axis[0]) / norm + G * Math.sin(tilt) * 0.3 + 0.2 * r.gauss(),
      y: (amp * axis[1]) / norm + G * 0.7 + 0.2 * r.gauss(),
      z: (amp * axis[2]) / norm + G * Math.cos(tilt) * 0.7 + 0.2 * r.gauss(),
    }])
  }
  return out
}

/**
 * A phone held in a hand while sitting: physiological tremor (8-12 Hz, ~0.05 m/s^2), slow wrist drift,
 * and a shift of grip every so often (`fidgetEveryMs`). Generated at 60 Hz.
 */
export function inHand(ms, { seed = 5, t0 = 0, fidgetEveryMs = 40_000, rate = 60 } = {}) {
  const r = rng(seed), out = []
  const fidgets = []
  for (let t = r() * fidgetEveryMs; t < ms; t += fidgetEveryMs * r.range(0.5, 1.5)) fidgets.push([t, r.range(500, 1500), r.range(1, 3)])
  for (let t = 0; t < ms; t += 1000 / rate) {
    let x = 0.05 * Math.sin(2 * Math.PI * 10 * (t / 1000)) + 0.3 * Math.sin(t / 2500)
    let y = G * 0.75 + 0.3 * Math.sin(t / 3100), z = G * 0.65
    for (const [ft, dur, a] of fidgets) if (t >= ft && t < ft + dur) { const p = (t - ft) / dur; x += a * Math.sin(Math.PI * 4 * p); z += a * 0.6 * Math.sin(Math.PI * 3 * p) }
    out.push([t0 + t, { x: x + 0.03 * r.gauss(), y: y + 0.03 * r.gauss(), z: z + 0.03 * r.gauss() }])
  }
  return out
}

/** A thumb tap on a phone: one sharp sample (what a button split looks like to the sensor). */
export function tap(samples, t, peak = 1.2) {
  const i = samples.findIndex(([ts]) => ts >= t)
  if (i >= 0) samples[i] = [samples[i][0], { ...samples[i][1], z: samples[i][1].z + peak }]
  return samples
}

/**
 * Ten minutes of washing up with the phone flat on the counter, as events. Best guess at a real sink:
 * a dish into the rack every 3-10 s (some bounce once), now and then two set down at knocking pace,
 * a cutlery clatter every 30-90 s, scrubbing a pan, footsteps. `worst` crams dishes down in quick
 * stacks of 2-3, which is the one thing a 60 Hz phone can't tell from a double knock.
 */
export function kitchen(ms, { seed = 1, fc = 20, worst = false } = {}) {
  const r = rng(seed), ev = []
  for (let t = 2000; t < ms - 3000; t += worst ? r.range(6000, 24000) : r.range(3000, 10000)) {
    const a = r.range(0.8, 5)
    ev.push(on.plate(t, a, fc))
    if (worst) { let u = t; for (let k = 1 + Math.floor(r() * 2); k > 0; k--) { u += r.range(150, 900); ev.push(on.plate(u, r.range(0.8, 6), fc)) } }
    else if (r() < 0.15) ev.push(on.plate(t + r.range(60, 200), a * r.range(0.2, 0.5), fc)) // bounce
    else if (r() < 0.1) ev.push(on.plate(t + r.range(300, 1200), r.range(0.8, 5), fc)) // two cups, one after the other
  }
  for (let t = 5000; t < ms - 3000; t += r.range(30000, 90000)) ev.push(on.clatter(t, r.range(0.6, 2.5), r, fc))
  for (let t = 8000; t < ms - 12000; t += r.range(20000, 60000)) ev.push(on.scrub(Math.round(t), Math.round(r.range(2000, 10000)), r.range(0.1, 0.8), r))
  ev.push(on.steps(1000, ms - 2000, 0.25))
  return ev
}
