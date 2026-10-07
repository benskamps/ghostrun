import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clock, delta, liveGap, progressAt, myProgress, pbAlpha, liveMood, bestSegments, goldFlags, pickPB, finish } from '../src/lib/race.js'

test('clock and delta format', () => {
  assert.equal(clock(0), '0:00.0')
  assert.equal(clock(65400), '1:05.4')
  assert.equal(clock(3723000), '1:02:03')
  assert.equal(delta(4200), '+4.2')
  assert.equal(delta(-63000), '−1:03')
  assert.equal(delta(0), '±0.0')
})

test('live gap holds at your last split, then grows once the ghost is through the step', () => {
  const ghost = [10000, 20000, 30000]
  assert.equal(liveGap([], 5000, ghost), 0)            // nobody has split yet
  assert.equal(liveGap([], 12000, ghost), 2000)        // ghost finished step 1, you haven't
  assert.equal(liveGap([8000], 12000, ghost), -2000)   // you split 2s early, held
  assert.equal(liveGap([8000], 23000, ghost), 3000)    // ghost through step 2, you're not
  assert.equal(liveGap([8000, 18000, 29000], 29000, ghost), -1000) // finished
  assert.equal(liveGap([], 1000, null), null)
})

test('progress along the route', () => {
  assert.equal(progressAt([10000, 20000], 5000), 0.25)
  assert.equal(progressAt([10000, 20000], 25000), 1)
  assert.equal(myProgress([10000], 15000, 2, [10000, 20000]), 0.75)
  assert.equal(myProgress([], 1000, 4, null), 0.125)
})

test('opacity is the scoreboard: 40% to 60%, never outside', () => {
  assert.equal(pbAlpha(null), 0.5)
  assert.equal(pbAlpha(1e9), 0.6)
  assert.equal(pbAlpha(-1e9), 0.4)
  assert.ok(pbAlpha(5000) > 0.5 && pbAlpha(-5000) < 0.5)
})

test('PB moods mid-run', () => {
  assert.equal(liveMood(null), 'sneaky')
  assert.equal(liveMood(20000), 'taunt')
  assert.equal(liveMood(0), 'giggle')
  assert.equal(liveMood(-5000), 'shocked')
  assert.equal(liveMood(-60000), 'dizzy')
})

test('gold splits beat every earlier attempt at that step', () => {
  const runs = [{ splits: [10, 30, 60] }, { splits: [12, 25, 70] }]
  assert.deepEqual(bestSegments(runs), [10, 13, 30])
  assert.deepEqual(goldFlags([9, 25, 50], [10, 13, 30]), [true, false, true])
  assert.deepEqual(goldFlags([9, 25], null), [false, false])
})

test('PB prefers verified runs over faster time-only runs', () => {
  const fast = { splits: [5], verified: false }, real = { splits: [9], verified: true }
  assert.equal(pickPB([fast, real]), real)
  assert.equal(pickPB([fast]), fast)
  assert.equal(pickPB([]), null)
})

test('finish lines: no shame, PB takes the blame', () => {
  const steps = ['Clear', 'Wash']
  assert.equal(finish({ splits: [1000, 2000], steps, ghost: null }).result, 'recorded')
  const win = finish({ splits: [5000, 50000], steps, ghost: [10000, 91000], golds: [true, true] })
  assert.equal(win.result, 'win'); assert.equal(win.mood, 'respect'); assert.match(win.head, /New PB by 41\.0s/)
  assert.match(win.line, /Wash/)
  const lose = finish({ splits: [10000, 100000], steps, ghost: [10000, 90000], name: 'Ali’s ghost' })
  assert.equal(lose.result, 'pb-wins'); assert.match(lose.head, /Ali’s ghost takes it/)
  for (const r of [win, lose]) assert.doesNotMatch(r.head + r.line, /fail|missed|lazy|you left/i)
})
