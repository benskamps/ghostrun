import { test } from 'node:test'
import assert from 'node:assert/strict'
import { intensityFor } from '../src/lib/ghost-beat.js'
import { TRACKS, chord, tone, pickTrack, trackById, bpmFor, chordAt } from '../src/lib/ghost-tracks.js'

test('the beat heats up when PB is close or ahead, and cools when you pull away', () => {
  const farAhead = intensityFor(-20000), youLead = intensityFor(-8000), neck = intensityFor(0), pbLeads = intensityFor(15000)
  assert.ok(farAhead < youLead && youLead < neck, 'closing gap builds')
  assert.ok(pbLeads > 0.7 && neck > 0.7, 'a tight or losing race is hot')
  assert.ok(farAhead >= 0.2, 'a comfortable lead still keeps a kick going')
  assert.equal(intensityFor(null), 0.4, 'recording your ghost is steady')
  for (const g of [-1e9, -5000, 0, 5000, 1e9]) assert.ok(intensityFor(g) >= 0 && intensityFor(g) <= 1)
})

test('chords land in the right registers', () => {
  assert.deepEqual(chord('Em'), { name: 'Em', bass: 28, tones: [64, 67, 71] })
  assert.deepEqual(chord('B').tones, [59, 63, 66])
  assert.deepEqual(chord('C#').tones, [61, 65, 68])
  for (const t of TRACKS) for (const c of [...t.A, ...t.B]) {
    assert.ok(c.bass >= 28 && c.bass <= 39, `${t.id} ${c.name} bass`)
    assert.ok(c.tones[0] >= 57 && c.tones[0] <= 68, `${t.id} ${c.name} tones`)
  }
})

test('every track is a full song: A and B sections, a tempo range, all parts', () => {
  assert.ok(TRACKS.length >= 4)
  assert.equal(new Set(TRACKS.map((t) => t.id)).size, TRACKS.length)
  for (const t of TRACKS) {
    assert.equal(t.A.length, 4); assert.equal(t.B.length, 4)
    assert.ok(t.bpm[0] >= 96 && t.bpm[1] <= 170 && t.bpm[0] < t.bpm[1], t.id)
    assert.equal(bpmFor(t, 0), t.bpm[0]); assert.equal(bpmFor(t, 1), t.bpm[1])
    assert.equal(chordAt(t, 0), t.A[0]); assert.equal(chordAt(t, 9), t.B[1])
  }
})

test('more parts play as the race heats up, on every track', () => {
  for (const t of TRACKS) {
    const count = (i) => {
      let n = 0
      for (let s = 0; s < 16; s++) {
        n += Object.values(t.drums(s, i, 0)).filter(Boolean).length
        n += t.bass.hit(s, i) != null ? 1 : 0
        n += t.lead.note(chordAt(t, 0), s, i) != null ? 1 : 0
      }
      return n
    }
    assert.ok(count(0.25) < count(0.5) && count(0.5) < count(0.9), t.id)
  }
})

test('a drum fill runs into each new section', () => {
  for (const t of TRACKS) {
    const snares = (bar) => [12, 13, 14, 15].filter((s) => t.drums(s, 0.6, bar).snare).length
    assert.equal(snares(7), 4, t.id)
    assert.ok(snares(3) < 4, t.id)
  }
})

test('lead lines stay on the chord and in a sane range', () => {
  for (const t of TRACKS) for (const c of [...t.A, ...t.B]) for (const i of [0.4, 0.7, 1]) for (let s = 0; s < 16; s++) {
    const n = t.lead.note(c, s, i)
    if (n == null || t.lead.chord) continue
    assert.ok(c.tones.some((x) => x % 12 === n % 12), `${t.id} ${c.name} step ${s}`)
    assert.ok(n >= 57 && n <= 96, `${t.id} ${c.name} step ${s}: ${n}`)
  }
  assert.equal(tone(chord('Em'), 3), 76)
})

test('shuffle picks a real track; a named one sticks', () => {
  assert.equal(pickTrack('organ').id, 'organ')
  assert.equal(trackById('nope'), null)
  assert.ok(TRACKS.includes(pickTrack('shuffle', () => 0.99)))
  assert.equal(pickTrack('shuffle', () => 0).id, TRACKS[0].id)
})
