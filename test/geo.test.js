import { test } from 'node:test'
import assert from 'node:assert/strict'
import { metres, placesFromRun, geoVerdict, longestDwell, GEO } from '../src/lib/geo.js'
import { cleanRoute, ERRAND_TEMPLATES } from '../src/lib/routes.js'

const HOME = { lat: 47.6062, lon: -122.3321 }
const STORE = { lat: 47.6162, lon: -122.3321 } // ~1.1 km north
const at = (p, t, acc = 15) => ({ t, lat: p.lat, lon: p.lon, acc })

test('distance is about right', () => {
  const d = metres(HOME, STORE)
  assert.ok(d > 1050 && d < 1150, String(d))
})

// Grocery dash: out the door, drive, shop, check out, drive home
const splits = [60e3, 600e3, 1500e3, 1700e3, 2300e3]
const trip = [at(HOME, 0), at(HOME, 55e3), at(STORE, 598e3), at(STORE, 900e3), at(STORE, 1490e3), at(STORE, 1702e3), at(HOME, 2301e3)]

test('first run: leaving the house verifies and records the stops', () => {
  const v = geoVerdict(null, splits, trip)
  assert.equal(v.verified, true); assert.equal(v.reason, 'moved')
  assert.equal(v.places.length, 5)
  assert.ok(metres(v.places[1], STORE) < 20)
  assert.ok(metres(v.places[4], HOME) < 20)
})

test('first run that never left saves as time only', () => {
  const v = geoVerdict(null, splits, [at(HOME, 0), at(HOME, 1000e3), at(HOME, 2300e3)])
  assert.equal(v.verified, false); assert.equal(v.reason, 'stayed')
})

test('race run at the same stops verifies, with a dwell at the store', () => {
  const places = geoVerdict(null, splits, trip).places
  assert.ok(longestDwell(trip, places) >= GEO.dwellMs)
  const v = geoVerdict(places, splits, trip)
  assert.equal(v.reason, 'arrived'); assert.equal(v.verified, true)
})

test('maps app in front: only the fixes taken at splits survive, still verifies', () => {
  const places = geoVerdict(null, splits, trip).places
  const sparse = splits.map((t, i) => at([HOME, STORE, STORE, STORE, HOME][i], t + 2000, 30))
  assert.equal(geoVerdict(places, splits, sparse).verified, true)
})

test('splitting from the couch does not verify', () => {
  const places = geoVerdict(null, splits, trip).places
  const couch = splits.map((t) => at(HOME, t + 1000))
  const v = geoVerdict(places, splits, couch)
  assert.equal(v.verified, false); assert.equal(v.reason, 'missed')
})

test('no location at all saves as time only', () => {
  assert.equal(geoVerdict(null, splits, []).reason, 'nogeo')
  assert.equal(geoVerdict(null, splits, [{ t: 0, lat: 0, lon: 0, acc: 5000 }]).reason, 'nogeo')
})

test('places only come from fixes near a split', () => {
  assert.deepEqual(placesFromRun([10e3, 500e3], [at(HOME, 9e3)]).map(Boolean), [true, false])
})

test('errand routes keep their drive legs through cleaning', () => {
  const r = cleanRoute({ name: ' Library ', steps: ['Out', '', 'Drive', 'Return'], kind: 'errand', drive: [false, true, true, false] })
  assert.deepEqual(r, { name: 'Library', steps: ['Out', 'Drive', 'Return'], kind: 'errand', drive: [false, true, false] })
  assert.equal(cleanRoute({ name: 'Dishes', steps: ['Wash'] }).kind, undefined)
  for (const t of ERRAND_TEMPLATES) assert.equal(t.drive.length, t.steps.length)
})
