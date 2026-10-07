import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pack, unpack, fileName, BACKUP_LIMITS } from '../src/lib/backup.js'

const routes = [
  { id: 'kitchen', template: 'kitchen', name: 'Kitchen reset', steps: ['Counters', 'Dishes'], order: 0, createdAt: 1, mess: 'PB did it.', mood: 'smug' },
  { id: 'cancel', kind: 'admin', name: 'Cancel a subscription', steps: ['Find it', 'Get the confirmation'], order: 2, createdAt: 3 },
  { id: 'r2', kind: 'errand', name: 'Pharmacy', steps: ['Out', 'Drive', 'Back'], drive: [false, true, true], order: 1, createdAt: 2, mess: '', mood: 'sneaky',
    places: [null, { lat: 47.6, lon: -122.3, evil: 1 }, null], rival: { by: 'Ali', steps: ['Out', 'Drive', 'Back'], splits: [1000, 2000, 3000], at: 5 } },
]
const runs = [
  { id: 'a', routeId: 'kitchen', steps: ['Counters', 'Dishes'], splits: [60000, 300000], endedAt: 10, verified: true, trace: [1, 2, 3] },
  { id: 'b', routeId: 'r2', steps: ['Out', 'Drive', 'Back'], splits: [1000, 900000, 1200000], endedAt: 11, verified: false },
]

test('a backup round-trips routes, runs and the signed name', () => {
  const got = unpack(JSON.stringify(pack({ routes, runs, prefs: { name: 'Ben', sound: true } })))
  assert.equal(got.error, undefined)
  assert.equal(got.routes.length, 3)
  assert.equal(got.runs.length, 2)
  assert.equal(got.routes.find((r) => r.id === 'cancel').kind, 'admin')
  assert.equal(got.name, 'Ben')
  assert.deepEqual(got.routes[0].steps, routes[0].steps)
  assert.deepEqual(got.routes[2].drive, [false, true, true])
  assert.deepEqual(got.routes[2].places, [null, { lat: 47.6, lon: -122.3 }, null])
  assert.deepEqual(got.routes[2].rival.splits, [1000, 2000, 3000])
  assert.deepEqual(got.runs[0].splits, [60000, 300000])
})

test('anything that is not a Ghostrun backup is refused in plain words', () => {
  assert.match(unpack('nope').error, /isn’t a Ghostrun backup/)
  assert.match(unpack('{"app":"other","v":1,"routes":[],"runs":[]}').error, /isn’t/)
  assert.match(unpack(JSON.stringify(pack({ routes: [], runs: [] }))).error, /no ghosts/)
  assert.match(unpack('x'.repeat(BACKUP_LIMITS.bytes + 1)).error, /too big/)
})

test('broken records are dropped, good ones kept', () => {
  const bad = [
    { id: 'c', routeId: 'kitchen', steps: ['Counters', 'Dishes'], splits: [300000, 60000] }, // time going backwards
    { id: 'd', routeId: 'kitchen', steps: ['Counters'], splits: [1, 2] }, // mismatched
    { id: 'e', routeId: 'ghost-route', steps: ['x'], splits: [1] }, // no such route
    { id: 'f', routeId: 'kitchen', steps: ['Counters', 'Dishes'], splits: [1, 'Infinity'] },
  ]
  const got = unpack(JSON.stringify(pack({ routes: [...routes, { id: '', name: 'x', steps: ['a'] }, { id: 'z', name: '', steps: [] }], runs: [...runs, ...bad] })))
  assert.equal(got.routes.length, 3)
  assert.deepEqual(got.runs.map((r) => r.id), ['a', 'b'])
})

test('backup file names carry the date', () => {
  assert.equal(fileName(new Date('2026-10-09T12:00:00Z')), 'ghostrun-ghosts-2026-10-09.json')
})
