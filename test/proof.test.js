import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EffortMeter, verdict, PROOF_COPY } from '../src/lib/proof.js'

// Synthetic devicemotion at 60 Hz. kind: 'work' (moderate jostling), 'shake' (violent), 'still'.
function simulate(steps, kind) {
  const m = new EffortMeter()
  let t = 0
  const splits = []
  for (const ms of steps) {
    for (let k = 0; k < ms / 16; k++, t += 16) {
      const g = { x: 0, y: 0, z: 9.81 }
      if (kind === 'work') { g.x += Math.sin(t / 90) * 1.8 + (Math.random() - 0.5); g.y += Math.cos(t / 130) * 1.2 }
      if (kind === 'shake') { g.x += Math.sin(t / 20) * 30; g.y += Math.cos(t / 25) * 25 }
      if (kind === 'still') g.x += (Math.random() - 0.5) * 0.02
      m.push(g, t)
    }
    splits.push(t)
    m.split()
  }
  return { m, splits }
}

test('real work verifies', () => {
  const { m, splits } = simulate([8000, 12000, 6000], 'work')
  assert.deepEqual(verdict(m, splits), { verified: true, reason: 'motion' })
  assert.ok(m.trace.length > 100 && m.trace.some((v) => v > 0))
})

test('couch shake is refused', () => {
  const { m, splits } = simulate([8000, 8000, 8000], 'shake')
  assert.equal(verdict(m, splits).reason, 'shake')
})

test('a phone that never moved is refused', () => {
  const { m, splits } = simulate([8000, 8000, 8000], 'still')
  assert.equal(verdict(m, splits).reason, 'still')
})

test('splits faster than any chore are refused', () => {
  const { m, splits } = simulate([800, 900, 700, 6000], 'work')
  assert.equal(verdict(m, splits).reason, 'fast')
})

test('no sensor means time only', () => {
  const m = new EffortMeter()
  assert.equal(verdict(m, [5000]).reason, 'nosensor')
  m.push({ x: null, y: null, z: null }, 0) // desktop Chrome sends nulls
  assert.equal(verdict(m, [5000]).reason, 'nosensor')
})

test('undo merges the step back', () => {
  const m = new EffortMeter()
  m.cur.n = 5; m.split(); m.cur.n = 3; m.undo()
  assert.equal(m.segments.length, 0); assert.equal(m.cur.n, 8)
})

test('proof copy never scolds', () => {
  for (const line of Object.values(PROOF_COPY)) assert.doesNotMatch(line, /cheat|liar|fail|lazy/i)
})
