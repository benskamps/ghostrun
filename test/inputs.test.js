import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FlipDetector } from '../src/lib/flip-split.js'
import { KnockDetector } from '../src/lib/knock-split.js'

test('flip: face down long enough, then picked up, is one split', () => {
  const flips = [], faces = []
  const f = new FlipDetector({ onFlip: (t) => flips.push(t), onFace: (x) => faces.push(x) })
  f.push(0, 10); f.push(100, 178); f.push(2000, -179); f.push(2100, 30)
  assert.deepEqual(flips, [2100]); assert.deepEqual(faces, ['up', 'down', 'up'])
})

test('flip: a quick wobble face down does not split', () => {
  const flips = []
  const f = new FlipDetector({ onFlip: (t) => flips.push(t) })
  f.push(0, 170); f.push(500, 20)
  assert.equal(flips.length, 0)
})

test('flip: tilting in the middle zone does not count as picked up', () => {
  const flips = []
  const f = new FlipDetector({ onFlip: (t) => flips.push(t) })
  f.push(0, 170); f.push(3000, 125); f.push(3100, 170); f.push(6000, 40)
  assert.deepEqual(flips, [6000])
})

test('knock: a double knock on a quiet counter fires once', () => {
  const knocks = []
  const k = new KnockDetector({ onKnock: (t) => knocks.push(t) })
  const at = (t, x) => k.push(t, { x, y: 0, z: 9.81 })
  let t = 0
  for (; t < 600; t += 10) at(t, 0)
  at(t, 6); t += 10; at(t, 0)             // knock 1
  for (t += 10; t < 900; t += 10) at(t, 0)
  at(t, 6); t += 10; at(t, 0)             // knock 2
  for (t += 10; t < 1500; t += 10) at(t, 0)
  assert.equal(knocks.length, 1)
})
