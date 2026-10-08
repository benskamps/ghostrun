// Whole Chore% runs as a phone would feel them, for the effort-proof replay tests.
// Each scene returns { samples: [[t, {x,y,z}], ...], splits: [ms], sources: ['tap'|'knock'|'flip'] }.
import { rng, motionSense, replay, onCounter, on, shake, inHand, tap } from './signals.js'

const clips = (kind) => motionSense().filter((c) => c.kind === kind)

/** Stitch per-step sample makers into one run. make(i, ms, t0, r) returns samples for step i. */
function run(steps, make, source = 'tap', seed = 1) {
  const r = rng(seed), samples = [], splits = [], sources = []
  let t0 = 0
  steps.forEach((ms, i) => {
    samples.push(...make(i, ms, t0, r))
    t0 += ms
    splits.push(t0); sources.push(typeof source === 'function' ? source(i) : source)
  })
  return { samples, splits, sources }
}

/** Pocket, standing at the sink, with a few steps to the rack or cupboard (`walkEveryMs`). Take the phone out to tap. */
export function pocketChore(steps, { seed = 1, sub = 0, walkEveryMs = 60_000, walkShare = 0 } = {}) {
  const std = clips('std')[sub % 12], wlk = clips('wlk')[sub % 12]
  return run(steps, (i, ms, t0, r) => {
    const out = []
    let t = 0
    while (t < ms) {
      const walking = walkShare ? r() < walkShare : false
      const len = Math.min(ms - t, walking ? r.range(4000, 15000) : walkShare ? r.range(3000, 10000) : r.range(walkEveryMs * 0.5, walkEveryMs * 1.5))
      out.push(...replay(walking ? wlk : std, len, { t0: t0 + t }))
      t += len
      if (!walkShare && t < ms) { const w = Math.min(ms - t, r.range(2000, 4000)); out.push(...replay(wlk, w, { t0: t0 + t })); t += w }
    }
    // pull the phone out and tap: a second of handling before the split
    const h = inHand(1200, { seed: seed + i, t0: t0 + ms - 1200, fidgetEveryMs: 400 })
    return [...out.filter(([t]) => t < t0 + ms - 1200), ...h]
  }, 'tap', seed)
}

/** Flat on the counter while washing up, split by knocking. */
export function counterKnocks(steps, { seed = 1 } = {}) {
  return run(steps, (i, ms, t0, r) => onCounter(ms, [on.plate(ms * 0.3, 2), on.knock(ms - 800, 3), on.knock(ms - 550, 2.6), on.steps(500, ms - 1000, 0.25)], { t0, seed: seed + i }), 'knock', seed)
}

/** Face down on the counter, picked up at each split (flip). */
export function faceDownFlips(steps, { seed = 1 } = {}) {
  return run(steps, (i, ms, t0) => {
    const still = onCounter(ms - 1000, [], { t0, seed: seed + i, gravity: [0, 0, -9.81] })
    return [...still, ...inHand(1000, { seed: seed + i, t0: t0 + ms - 1000, fidgetEveryMs: 300 })]
  }, 'flip', seed)
}

/** Flat on the counter or a couch cushion, split by tapping the screen. The sensor sees the same thing either way. */
export function flatTaps(steps, { seed = 1 } = {}) {
  return run(steps, (i, ms, t0) => tap(onCounter(ms, [], { t0, seed: seed + i }), t0 + ms - 50), 'tap', seed)
}

/** On the couch, phone in a front pocket, pulled out to tap each split. */
export function couchPocket(steps, { seed = 1, sub = 0 } = {}) {
  const sit = clips('sit')[sub % 12]
  return run(steps, (i, ms, t0) => [...replay(sit, ms - 1200, { t0 }), ...inHand(1200, { seed: seed + i, t0: t0 + ms - 1200, fidgetEveryMs: 400 })], 'tap', seed)
}

/** On the couch, phone in hand the whole time, shifting grip now and then. */
export function couchHand(steps, { seed = 1, fidgetEveryMs = 40_000 } = {}) {
  return run(steps, (i, ms, t0) => tap(inHand(ms, { seed: seed + i, t0, fidgetEveryMs }), t0 + ms - 50), 'tap', seed)
}

/** On the couch, shaking the phone through every step. */
export function couchShake(steps, { seed = 1, g = 3, hz = 4 } = {}) {
  return run(steps, (i, ms, t0) => shake(ms, { g, hz, seed: seed + i, t0 }), 'tap', seed)
}

/** Jogging the bins out, phone in a pocket the whole way. */
export function jogging(steps, { sub = 0 } = {}) {
  const jog = clips('jog')[sub % 12]
  return run(steps, (i, ms, t0) => replay(jog, ms, { t0 }))
}
