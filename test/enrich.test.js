import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spoken, callout, finishCall, passCall } from '../src/lib/pb-voice.js'
import { biggestTimesave, leadChanges } from '../src/lib/insights.js'

test('spoken times read naturally', () => {
  assert.equal(spoken(3200), '3.2 seconds')
  assert.equal(spoken(-42400), '42 seconds')
  assert.equal(spoken(64000), '1 minute 4')
  assert.equal(spoken(120000), '2 minutes')
})

test('callouts: recording, ahead, behind, gold, blind, last', () => {
  const ghost = [10000, 20000, 30000]
  assert.equal(callout({ step: 'Wash', i: 0, splits: [12000], ghost: null }), 'Wash. 12 seconds.')
  assert.equal(callout({ step: 'Wash', i: 0, splits: [7000], ghost }), 'Wash. You\'re up 3.0 seconds.')
  assert.equal(callout({ step: 'Wash', i: 0, splits: [10400], ghost }), 'Wash. Neck and neck.')
  assert.match(callout({ step: 'Wash', i: 0, splits: [14000], ghost }), /PB's ahead by 4.0 seconds/)
  assert.equal(callout({ step: 'Wash', i: 0, splits: [9000], ghost, gold: true }), 'Gold on Wash. Up 1 second.')
  assert.equal(callout({ step: 'Wash', i: 0, splits: [9000], ghost, blind: true }), 'Wash.')
  assert.equal(callout({ step: 'Wash', i: 2, splits: [9000, 19000, 29000], ghost, last: true }), null)
})

test('no shame in anything PB says', () => {
  const lines = [
    finishCall({ result: 'pb-wins', mood: 'smug' }, 60000, 4000),
    finishCall({ result: 'win', mood: 'sulk' }, 60000, -2000),
    finishCall({ result: 'win', mood: 'sulk' }, 60000, -2000, 'Sam’s ghost'),
    finishCall({ result: 'recorded', head: 'Ghost saved.' }, 60000),
    finishCall({ result: 'tie', head: 'Dead heat.' }, 60000),
    passCall(), passCall('Sam’s ghost'),
    callout({ step: 'Fold', i: 0, splits: [90000], ghost: [10000] }),
  ]
  for (const l of lines) assert.doesNotMatch(l, /fail|lost|lose|missed|too slow|you left/i, l)
})

test('biggest timesave points at the step with the most left on the table', () => {
  const best = [5000, 8000, 4000]
  const pb = [6000, 20000, 25000] // segs 6, 14, 5 -> saves 1, 6, 1
  const tip = biggestTimesave(['A', 'B', 'C'], pb, best)
  assert.equal(tip.step, 'B')
  assert.equal(tip.ms, 6000)
  assert.equal(tip.total, 8000)
  assert.equal(tip.bestPossible, 17000)
  assert.equal(biggestTimesave(['A', 'B', 'C'], [5000, 13000, 17000], best), null) // PB is already sum of best
  assert.equal(biggestTimesave(['A'], [5000], null), null)
})

test('finish call: a hair is a dead heat, not "by 0.0"', () => {
  assert.equal(finishCall({ result: 'pb-wins' }, 60000, 40), 'Dead heat. PB is checking the replay.')
  assert.equal(finishCall({ result: 'win', mood: 'respect' }, 60000, -2500), 'New PB, by 2.5 seconds. PB is tipping its hat.')
})

test('lead changes count swaps at split lines', () => {
  assert.equal(leadChanges([9, 21, 29], [10, 20, 30]), 2)
  assert.equal(leadChanges([9, 19, 29], [10, 20, 30]), 0)
  assert.equal(leadChanges([10, 21, 29], [10, 20, 30]), 1) // tie at the first line isn't a lead
})

test('a finish inside a twentieth of a second is a dead heat, never "by 0.0s"', async () => {
  const { finish } = await import('../src/lib/race.js')
  const r = finish({ splits: [10000, 20030], steps: ['a', 'b'], ghost: [10000, 20000] })
  assert.equal(r.result, 'tie')
})
