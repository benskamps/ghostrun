// Replay tests: the sensor checks against simulated phones (test/sim). Real iPhone pocket data from
// MotionSense where it exists, physical models where it doesn't. Numbers and caveats: docs/TUNING.md.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { KnockDetector } from '../src/lib/knock-split.js'
import { FlipDetector } from '../src/lib/flip-split.js'
import { EffortMeter, verdict } from '../src/lib/proof.js'
import { geoVerdict } from '../src/lib/geo.js'
import { nameDate, shotVerdict } from '../src/lib/admin-proof.js'
import { rng, on, onCounter, kitchen, motionSense, replay } from './sim/signals.js'
import * as S from './sim/scenes.js'
import { errand, couchErrand } from './sim/gps.js'

const knocks = (samples) => {
  const hits = [], d = new KnockDetector({ onKnock: (t) => hits.push(t) })
  for (const [t, a] of samples) d.push(t, a)
  return hits
}

/** Set the phone down (a bump), pause, knock twice. Returns the share of tries that split exactly once, on time. */
function knockRate({ peaks = [2, 3, 6, 10], gaps = [130, 180, 250, 350, 450], fc = 20, hz = 60, tries = 4 } = {}) {
  let ok = 0, n = 0
  for (const peak of peaks) for (const gap of gaps) for (let k = 0; k < tries; k++) {
    const r = rng(k * 31 + gap + peak * 7)
    const hits = knocks(onCounter(2600, [
      on.plate(300, 2, fc),
      on.knock(1500, peak * r.range(0.85, 1.15), fc),
      on.knock(1500 + gap + r.range(-15, 15), peak * r.range(0.7, 1.1), fc),
    ], { fc, hz, seed: k }))
    n++
    if (hits.length === 1 && Math.abs(hits[0] - 1500 - gap) < 60) ok++
  }
  return ok / n
}

test('knock: a double knock right after setting the phone down splits (it used to be swallowed)', () => {
  // the old detector paired knock 1 with the set-down bump, failed, and threw knock 1 away
  const hits = knocks(onCounter(2600, [on.plate(300, 2), on.knock(1500, 3), on.knock(1800, 2.7)]))
  assert.equal(hits.length, 1)
})

test('knock: most double knocks split, soft to hard, quick to slow', () => {
  for (const fc of [20, 40]) assert.ok(knockRate({ fc }) >= 0.8, `fc ${fc}: ${knockRate({ fc })}`)
})

test('knock: 50 Hz and 100 Hz phones behave like 60 Hz ones', () => {
  assert.ok(knockRate({ hz: 50, fc: 20 }) >= 0.8, String(knockRate({ hz: 50, fc: 20 })))
  assert.ok(knockRate({ hz: 100, fc: 40 }) >= 0.85, String(knockRate({ hz: 100, fc: 40 })))
})

test('knock: one bang, a bounce, scrubbing, footsteps and a three-plate stack never split', () => {
  const r = rng(9)
  const quiet = [
    [on.plate(1000, 5)],
    [on.plate(1000, 4), on.plate(1120, 1.4)],
    [on.scrub(500, 4000, 0.8, r)],
    [on.steps(200, 4500, 0.25)],
    [on.plate(1000, 3), on.plate(1350, 2.8), on.plate(1700, 3.1)],
    [on.clatter(1000, 2, r)],
  ]
  for (const ev of quiet) assert.deepEqual(knocks(onCounter(5000, ev)), [])
})

test('knock: ten minutes of washing up beside the phone makes few false splits', () => {
  let fp = 0
  for (const seed of [1, 2]) fp += knocks(onCounter(600_000, kitchen(600_000, { seed }), { seed })).length
  assert.ok(fp / 2 <= 2.5, `${fp / 2} per 10 min`)
})

// ---------- effort proof ----------

function judge(sc) {
  const m = new EffortMeter()
  let k = 0
  for (const [t, a] of sc.samples) {
    while (k < sc.splits.length && t >= sc.splits[k]) { m.split(); k++ }
    m.push(a, t)
  }
  while (k < sc.splits.length) { m.split(); k++ }
  return verdict(m, sc.splits, sc.sources).reason
}
const dishes = [40e3, 240e3, 180e3, 60e3], fold = [60e3, 600e3, 300e3, 60e3], quick = [20e3, 30e3, 25e3, 15e3]
const people = [...Array(12).keys()]

test('effort: real pocket motion from 12 people verifies dishes and long folding steps', () => {
  for (const sub of people) {
    assert.equal(judge(S.pocketChore(dishes, { walkEveryMs: 180e3, sub, seed: sub + 1 })), 'motion', `dishes, person ${sub}`)
    assert.equal(judge(S.pocketChore(fold, { walkEveryMs: 240e3, sub, seed: sub + 1 })), 'motion', `fold, person ${sub}`)
  }
})

test('effort: knock and flip runs count even though the phone rests all step', () => {
  assert.equal(judge(S.counterKnocks(dishes)), 'motion')
  assert.equal(judge(S.faceDownFlips(dishes)), 'motion')
})

test('effort: jogging the bins out is not mistaken for a couch shake', () => {
  for (const sub of people) assert.equal(judge(S.jogging(quick, { sub })), 'motion', `person ${sub}`)
})

test('effort: couch fakes the sensor can catch still save as Any%', () => {
  assert.equal(judge(S.couchShake(quick)), 'shake')
  assert.equal(judge(S.flatTaps(dishes)), 'still')
  assert.equal(judge(S.couchHand(fold, { fidgetEveryMs: 180e3 })), 'still')
})

test('effort: the verdict is the same at 50, 60 and 100 Hz', () => {
  const wlk = motionSense().find((c) => c.kind === 'wlk'), std = motionSense().find((c) => c.kind === 'std')
  for (const hz of [50, 60, 100]) {
    for (const [clip, want] of [[wlk, 'motion'], [std, 'still']]) {
      const m = new EffortMeter()
      const s = replay(clip, 20_000, { hz })
      for (const [t, a] of s) m.push(a, t)
      m.split()
      assert.equal(verdict(m, [20_000]).reason, want, `${clip.kind} at ${hz} Hz`)
    }
  }
})

// ---------- Errand% ----------

const LEGS = { grocery: 5, post: 4, 'walk-shop': 4 }

test('errand: race runs at the same stops verify through GPS gaps, vague fixes and a new parking spot', () => {
  for (const id of Object.keys(LEGS)) {
    let ok = 0
    for (let s = 1; s <= 40; s++) {
      const first = errand(id, { seed: s })
      const places = geoVerdict(null, first.splits, first.fixes).places
      const race = errand(id, { seed: s + 1000 })
      if (geoVerdict(places, race.splits, race.fixes).verified) ok++
    }
    assert.ok(ok >= 37, `${id}: ${ok}/40`)
  }
})

test('errand: tapping through from the couch never verifies, even when the first and last stop are home', () => {
  for (const id of Object.keys(LEGS)) {
    for (let s = 1; s <= 40; s++) {
      const first = errand(id, { seed: s })
      const places = geoVerdict(null, first.splits, first.fixes).places
      const couch = couchErrand(LEGS[id], { seed: s })
      assert.equal(geoVerdict(places, couch.splits, couch.fixes).verified, false, `${id} seed ${s}`)
    }
  }
})

test('errand: stops saved before they carried accuracy still work', () => {
  const first = errand('post', { seed: 3 })
  const places = geoVerdict(null, first.splits, first.fixes).places.map((p) => p && { lat: p.lat, lon: p.lon })
  const race = errand('post', { seed: 1003, mapsShare: 0, lockedShare: 0 })
  assert.equal(geoVerdict(places, race.splits, race.fixes).verified, true)
})

// ---------- flip ----------

test('flip: works under both orientation conventions and across the ±180 wrap', () => {
  for (const [down, up] of [[[179, 2], [-178, -3]], [[3, 179], [-2, -177]]]) { // spec: beta ±180; older Android: gamma ±180
    const flips = []
    const f = new FlipDetector({ onFlip: (t) => flips.push(t) })
    f.push(0, 10, 0)
    for (let t = 100; t < 3000; t += 100) f.push(t, ...(t % 200 ? down : up)) // jitter either side of flat, face down
    f.push(3100, 35, 5)
    assert.deepEqual(flips, [3100])
  }
})

// ---------- Admin% screenshots ----------

test('screenshot: Android and Mac file names give the time it was taken; iPhone names give nothing', () => {
  const at = new Date(2026, 9, 8, 19, 55, 12).getTime()
  for (const n of [
    'Screenshot_20261008-195512.png', 'Screenshot_20261008-195512_Chrome.png', 'Screenshot_20261008_195512_Chrome.jpg',
    'Screenshot_2026-10-08-19-55-12-123_com.android.chrome.jpg', 'Screenshot_2026-10-08-19-55-12-75_3c4bd5f0d6.jpg',
    'Screenshot 2026-10-08 at 19.55.12.png',
  ]) assert.equal(nameDate(n), at, n)
  for (const n of ['IMG_0123.PNG', 'image.png', 'IMG_20261008_195512.jpg', 'Screenshot_20261399-995512.png', '']) assert.equal(nameDate(n), null, n)
})

test('screenshot: an old Android screenshot is stale even when the picker stamps it with the pick time', () => {
  const start = new Date(2026, 9, 8, 20, 0, 0).getTime()
  const img = { type: 'image/png', size: 90_000, lastModified: start + 90_000 }
  assert.equal(shotVerdict({ ...img, name: 'Screenshot_20261008-195512.png' }, start, true), 'stale') // 4m48s before the run
  assert.equal(shotVerdict({ ...img, name: 'Screenshot_20261008-195912.png' }, start, true), 'screenshot') // inside the 2 min slack
  assert.equal(shotVerdict({ ...img, name: 'Screenshot_20261008-200130.png' }, start, true), 'screenshot')
  assert.equal(shotVerdict({ ...img, name: 'IMG_0123.PNG' }, start, true), 'screenshot') // iPhone: can't tell, so it passes
})
