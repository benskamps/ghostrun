import { test } from 'node:test'
import assert from 'node:assert/strict'
import { onTable, takenBack, dailyPick, greeting, pickLine, nextSlot, sameTime, hauntIcs, GREETING_COPY } from '../src/lib/habit.js'

const DAY = 864e5
const NOW = new Date(2026, 9, 8, 19, 7).getTime()
const steps = ['a', 'b', 'c']
const run = (routeId, splits, daysAgo = 3, extra = {}) => ({ routeId, steps, splits, endedAt: NOW - daysAgo * DAY, verified: true, ...extra })
const route = (id, order = 0) => ({ id, name: id, steps, order })

test('onTable: PB minus sum of best, pointing at the step that hides the most', () => {
  assert.equal(onTable([run('r', [10000, 20000, 30000])]), null)
  const t = onTable([run('r', [10000, 20000, 30000]), run('r', [12000, 19000, 31000])])
  // PB is run 1 (30s). Best segs: 10, 7, 10 = 27s. Step b saves 3s.
  assert.equal(t.ms, 3000)
  assert.equal(t.step, 'b')
  assert.equal(t.pb, 30000)
})

test('takenBack only counts time won back from your first run, never negative', () => {
  const rs = [run('r', [10000, 20000, 40000], 5), run('r', [10000, 20000, 30000], 1), run('s', [5000, 6000, 7000], 4), run('s', [5000, 6000, 9000], 2)]
  assert.equal(takenBack([route('r'), route('s')], rs), 10000)
  assert.equal(takenBack([route('r')], []), 0)
})

test('dailyPick: the closest call wins; raced-today sinks; fresh rooms when nothing recorded', () => {
  const routes = [route('loose'), route('tight'), route('new', 2)]
  const rs = [
    run('loose', [10000, 20000, 30000]), run('loose', [10000, 20000, 30500]),     // ~0 on table
    run('tight', [10000, 20000, 30000]), run('tight', [12000, 14000, 31000]),    // 8s on table
  ]
  const p = dailyPick(routes, rs, NOW, '2026-10-08')
  assert.equal(p.route.id, 'tight')
  assert.equal(p.kind, 'race')
  assert.match(pickLine(p), /8s is already on the table, most of it on b/)

  // Raced both today: PB opens a fresh room instead.
  const today = rs.map((r) => ({ ...r, endedAt: NOW - 1000 }))
  const q = dailyPick(routes, today, NOW, '2026-10-08')
  assert.equal(q.kind, 'record')
  assert.equal(q.route.id, 'new')

  // Brand new player: a room to record.
  assert.equal(dailyPick(routes, [], NOW, 'x').kind, 'record')
  assert.equal(dailyPick([], [], NOW), null)
})

test('greeting never mentions a gap: PB is just napping', () => {
  assert.equal(greeting([], NOW).key, 'new')
  assert.equal(greeting([run('r', [1], 0)], NOW).key, 'again')
  assert.equal(greeting([run('r', [1], 1)], NOW).key, 'back')
  const nap = greeting([run('r', [1], 4)], NOW)
  assert.equal(nap.key, 'napping')
  assert.equal(nap.mood, 'sleepy')
  for (const c of Object.values(GREETING_COPY)) assert.doesNotMatch(`${c.head} ${c.line}`, /miss|streak|days? (ago|since)|you (left|forgot)/i)
})

test('nextSlot lands tomorrow for "same time", today for later', () => {
  const now = new Date(2026, 9, 8, 19, 7)
  assert.equal(nextSlot(19, 0, now).getDate(), 9)
  assert.equal(nextSlot(21, 30, now).getDate(), 8)
  assert.deepEqual(sameTime(now), { hh: 19, mm: 0 })
  assert.deepEqual(sameTime(new Date(2026, 9, 8, 23, 55)), { hh: 0, mm: 0 })
})

test('hauntIcs is a valid, folded VEVENT with an alarm and a link back', () => {
  const at = new Date(2026, 9, 9, 19, 0)
  const ics = hauntIcs({ route: 'Dishes, again; really', url: 'https://ghostrun-ten.vercel.app/play?run=dishes', at, daily: true, line: 'x'.repeat(200), now: new Date(Date.UTC(2026, 9, 8)), id: 'd' })
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/)
  assert.match(ics, /DTSTART:20261009T190000\r\n/)
  assert.match(ics, /DTEND:20261009T191000\r\n/)
  assert.match(ics, /RRULE:FREQ=DAILY/)
  assert.ok(ics.includes('SUMMARY:👻 Race PB: Dishes\\, again\\; really\r\n'))
  assert.match(ics, /BEGIN:VALARM[\s\S]*TRIGGER:PT0M[\s\S]*END:VALARM/)
  const enc = new TextEncoder()
  for (const l of ics.split('\r\n')) assert.ok(enc.encode(l).length <= 75, `line too long: ${l}`)
  assert.doesNotMatch(hauntIcs({ route: 'r', url: 'u', at }), /RRULE/)
})

test('onTable ignores time-only runs once a verified PB exists', () => {
  const rs = [run('r', [10000, 20000, 30000]), run('r', [12000, 19000, 31000]), run('r', [100, 200, 300], 0, { verified: false })]
  assert.equal(onTable(rs).ms, 3000)
})
