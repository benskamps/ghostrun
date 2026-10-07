import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeGhost, readGhost, ghostUrl } from '../src/lib/ghost-link.js'
import { dailyHex, dreadCheck, frankenghost, shareLine } from '../src/lib/run-extras.js'
import { cleanRoute } from '../src/lib/routes.js'

const ghost = { route: 'Kitchen reset', steps: ['Clear counters', 'Dishes', 'Wipe down', 'Floor'], splits: [62000, 303000, 351000, 446000], by: 'Ben' }

test('ghost link round-trips and stays short', () => {
  const code = encodeGhost(ghost)
  assert.ok(code.length < 120)
  assert.deepEqual(readGhost(code), ghost)
  assert.match(ghostUrl('https://x.app', ghost), /^https:\/\/x\.app\/play#g=1\./)
})

test('bad ghost links are rejected, not trusted', () => {
  assert.equal(readGhost('nope'), null)
  assert.equal(readGhost('1.!!!'), null)
  assert.equal(readGhost('1.' + 'A'.repeat(3000)), null)
  const long = encodeGhost({ ...ghost, steps: Array(20).fill('x'), splits: Array.from({ length: 20 }, (_, i) => (i + 1) * 1000) })
  assert.equal(readGhost(long), null)
})

test('daily haunt is the same for everyone on a date', () => {
  assert.equal(dailyHex('2026-10-09').id, dailyHex('2026-10-09').id)
})

test('dread check, frankenghost, share line', () => {
  const run = { route: 'Dishes', steps: ['a', 'b'], splits: [60000, 552000], guessMs: 1500000, date: '2026-10-07' }
  assert.equal(dreadCheck(run).line, 'You guessed 25:00. It took 9:12.')
  const f = frankenghost([run, { ...run, splits: [50000, 600000], date: '2026-10-08' }])
  assert.deepEqual(f.splits, [50000, 542000])
  assert.match(shareLine(run, { splits: [70000, 600000] }), /Ghostrun · Dishes 👻 9:12 🟩🟩 PB −0:48/)
})

test('route text is trimmed and bounded', () => {
  assert.equal(cleanRoute({ name: '  ', steps: ['a'] }), null)
  assert.equal(cleanRoute({ name: 'x', steps: ['', ' '] }), null)
  assert.equal(cleanRoute({ name: 'x'.repeat(99), steps: Array(30).fill('s') }).steps.length, 12)
})
