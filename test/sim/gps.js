// Simulated location fixes for Errand% replay tests. Nothing here ships to the app.
//
// What a phone web app actually gets, as best public sources describe it:
//  - Outdoors, open sky: fixes every second, reported accuracy 5-10 m, error wandering slowly (multipath).
//  - Parking lots and streets with buildings: accuracy 8-20 m.
//  - Inside a store: Wi-Fi positioning, accuracy 35-65 m, and now and then a cell-tower jump of
//    hundreds of metres reported at 165-1400 m.
//  - With the maps app in front, or the screen locked, a web app gets nothing. The first fix after it
//    comes back is often coarse (65-200 m) and tightens over 5-15 s.
// Error is a first-order Gauss-Markov walk per axis, so neighbouring fixes are wrong in the same direction.
import { rng } from './signals.js'

const ORIGIN = { lat: 47.6062, lon: -122.3321 }
const M_LAT = 111_320, M_LON = 111_320 * Math.cos((ORIGIN.lat * Math.PI) / 180)
export const toLatLon = ([x, y]) => ({ lat: ORIGIN.lat + y / M_LAT, lon: ORIGIN.lon + x / M_LON })

const ENV = {
  open: { acc: [4, 10], tau: 30_000 },
  street: { acc: [8, 20], tau: 20_000 },
  indoor: { acc: [35, 65], tau: 60_000, jump: 0.04 },
  home: { acc: [15, 65], tau: 60_000, jump: 0.02 },
}

/**
 * Turn a timeline into fixes. `path` is a list of legs { ms, from: [x,y], to: [x,y], env, seen }
 * where seen is 'live' (app in front, a fix a second), 'away' (maps app or locked screen: nothing)
 * or 'pocket' (screen locked in a pocket: nothing). Returns { fixes, splits }: a split at each leg's end,
 * with the fresh fix the app asks for when you tap it.
 */
export function trip(path, { seed = 1 } = {}) {
  const r = rng(seed), fixes = [], splits = []
  const e = [0, 0]
  let t = 0, lastSeen = 'live'
  const fix = (at, pos, env, coarse = 0) => {
    const E = ENV[env]
    let acc = r.range(...E.acc)
    const sig = acc / 1.5, rho = Math.exp(-1000 / E.tau)
    for (const k of [0, 1]) e[k] = rho * e[k] + Math.sqrt(1 - rho * rho) * sig * r.gauss()
    let off = [...e]
    if (coarse) { acc = Math.max(acc, coarse); off = off.map((v) => v + (acc / 1.5) * r.gauss()) }
    if (E.jump && r() < E.jump) { acc = r() < 0.5 ? 165 : 1414; const a = r() * 2 * Math.PI, d = r.range(150, 450); off = [d * Math.cos(a), d * Math.sin(a)] }
    fixes.push({ t: Math.round(at), ...toLatLon([pos[0] + off[0], pos[1] + off[1]]), acc: Math.round(acc) })
  }
  for (const leg of path) {
    const at = (k) => [leg.from[0] + (leg.to[0] - leg.from[0]) * k, leg.from[1] + (leg.to[1] - leg.from[1]) * k]
    if (leg.seen === 'live') {
      for (let s = 0; s < leg.ms; s += 1000) {
        const resumed = lastSeen !== 'live' && s < 12_000
        fix(t + s, at(s / leg.ms), leg.env, resumed ? r.range(65, 200) * (1 - s / 12_000) : 0)
      }
    }
    t += leg.ms
    if (leg.split !== false) {
      splits.push(t)
      // a tap brings the app to the front: one fresh fix, coarse if it had been away
      const away = leg.seen !== 'live'
      fix(t + r.range(800, 5000), leg.to, leg.env, away ? r.range(65, 200) : 0)
    }
    lastSeen = leg.seen
  }
  fixes.sort((a, b) => a.t - b.t)
  return { fixes, splits }
}

const jitter = (p, r, m) => [p[0] + r.range(-m, m), p[1] + r.range(-m, m)]

/**
 * The starter errands as real trips. `variant` changes where you park and how you hold the phone,
 * so a race run never repeats the first run. Distances: store 2.2 km, post office 1.5 km, corner shop 450 m.
 */
export function errand(id, { seed = 1, mapsShare = 0.7, lockedShare = 0.5 } = {}) {
  const r = rng(seed * 7 + 3)
  const HOME = [0, 0]
  const drive = () => (r() < mapsShare ? 'away' : 'live')
  const inside = () => (r() < lockedShare ? 'pocket' : 'live')
  if (id === 'grocery') {
    const lot = jitter([2000, 900], r, 90), door = [2000, 1000], aisle = jitter([2030, 1060], r, 40), till = jitter([1990, 1020], r, 20)
    return trip([
      { ms: r.range(40e3, 90e3), from: HOME, to: jitter(HOME, r, 15), env: 'home', seen: 'live' },
      { ms: r.range(420e3, 720e3), from: HOME, to: lot, env: 'street', seen: drive() },
      { ms: 60e3, from: lot, to: door, env: 'street', seen: 'live', split: false },
      { ms: r.range(600e3, 1200e3), from: door, to: aisle, env: 'indoor', seen: inside() },
      { ms: r.range(180e3, 420e3), from: aisle, to: till, env: 'indoor', seen: inside() },
      { ms: 60e3, from: door, to: lot, env: 'street', seen: 'live', split: false },
      { ms: r.range(420e3, 720e3), from: lot, to: jitter(HOME, r, 15), env: 'street', seen: drive() },
    ], { seed })
  }
  if (id === 'post') {
    const lot = jitter([1200, -900], r, 40), counter = [1220, -870]
    return trip([
      { ms: r.range(40e3, 90e3), from: HOME, to: jitter(HOME, r, 15), env: 'home', seen: 'live' },
      { ms: r.range(300e3, 540e3), from: HOME, to: lot, env: 'street', seen: drive() },
      { ms: r.range(120e3, 420e3), from: lot, to: counter, env: 'indoor', seen: inside() },
      { ms: r.range(300e3, 540e3), from: counter, to: jitter(HOME, r, 15), env: 'street', seen: drive() },
    ], { seed })
  }
  if (id === 'walk-shop') {
    const shop = [320, 310]
    return trip([
      { ms: r.range(30e3, 90e3), from: HOME, to: jitter(HOME, r, 10), env: 'home', seen: 'live' },
      { ms: r.range(300e3, 420e3), from: HOME, to: jitter(shop, r, 10), env: 'open', seen: r() < 0.5 ? 'live' : 'pocket' },
      { ms: r.range(90e3, 240e3), from: shop, to: shop, env: 'indoor', seen: inside() },
      { ms: r.range(300e3, 420e3), from: shop, to: jitter(HOME, r, 10), env: 'open', seen: r() < 0.5 ? 'live' : 'pocket' },
    ], { seed })
  }
  throw new Error(id)
}

/** Never left: tapping through an errand from the couch, with times that look like the real thing. */
export function couchErrand(legs, { seed = 1 } = {}) {
  const r = rng(seed)
  return trip(Array.from({ length: legs }, () => ({ ms: r.range(60e3, 600e3), from: [0, 0], to: [0, 0], env: 'home', seen: r() < 0.5 ? 'live' : 'away' })), { seed })
}
