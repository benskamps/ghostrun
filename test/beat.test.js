import { test } from 'node:test'
import assert from 'node:assert/strict'
import { intensityFor, bpmFor, hits, arpNote, CHORDS } from '../src/lib/ghost-beat.js'

test('the beat heats up when PB is close or ahead, and cools when you pull away', () => {
  const farAhead = intensityFor(-20000), youLead = intensityFor(-8000), neck = intensityFor(0), pbLeads = intensityFor(15000)
  assert.ok(farAhead < youLead && youLead < neck, 'closing gap builds')
  assert.ok(pbLeads > 0.7 && neck > 0.7, 'a tight or losing race is hot')
  assert.ok(farAhead >= 0.2, 'a comfortable lead still keeps a kick going')
  assert.equal(intensityFor(null), 0.4, 'recording your ghost is steady')
  for (const g of [-1e9, -5000, 0, 5000, 1e9]) assert.ok(intensityFor(g) >= 0 && intensityFor(g) <= 1)
})

test('tempo stays in a run-able range', () => {
  assert.equal(bpmFor(0), 100)
  assert.equal(bpmFor(1), 144)
})

test('more parts play as intensity rises', () => {
  const count = (i) => Array.from({ length: 16 }, (_, s) => Object.values(hits(s, i)).filter(Boolean).length).reduce((a, b) => a + b)
  assert.ok(count(0.25) < count(0.5) && count(0.5) < count(0.9))
  assert.equal(hits(4, 0.9).clap, true)
  assert.equal(hits(4, 0.3).clap, false)
})

test('the arp stays on the chord', () => {
  for (const c of CHORDS) for (let s = 0; s < 16; s++) {
    const pc = arpNote(c, s) % 12
    assert.ok(c.tones.some((t) => t % 12 === pc))
  }
})
