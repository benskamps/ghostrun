import test from 'node:test'
import assert from 'node:assert/strict'
import { codeVerdict, shotVerdict, isVerified, AwayClock, ADMIN, ADMIN_COPY } from '../src/lib/admin-proof.js'
import { cleanRoute, kindOf, ADMIN_TEMPLATES } from '../src/lib/routes.js'

test('confirmation numbers that look real count', () => {
  for (const c of ['A7K-29QX', 'conf 4481 2210', '#88213', 'Q2W9E', 'ref/2026/0912']) assert.equal(codeVerdict(c), 'code', c)
})

test('made-up or empty codes do not', () => {
  for (const c of ['', '   ', '123', '0000', '1212', '12345', '54321', 'abcdef', 'hello', 'x'.repeat(50), 'ab<script>1']) assert.equal(codeVerdict(c), 'weak', c)
})

test('a screenshot from this run counts, an old one does not', () => {
  const start = 1_000_000_000
  const img = { type: 'image/png', size: 9000 }
  assert.equal(shotVerdict({ ...img, lastModified: start + 60_000 }, start, true), 'screenshot')
  assert.equal(shotVerdict({ ...img, lastModified: start - 60_000 }, start, true), 'screenshot') // inside the slack
  assert.equal(shotVerdict({ ...img, lastModified: start - ADMIN.slackMs - 1 }, start, true), 'stale')
  assert.equal(shotVerdict({ ...img, lastModified: 0 }, start, true), 'screenshot') // no date: phone stamps at pick time
  assert.equal(shotVerdict({ ...img, lastModified: start }, start, false), 'unreadable')
  assert.equal(shotVerdict({ type: 'application/pdf', size: 10, lastModified: start }, start, true), 'unreadable')
})

test('only screenshots and codes verify, and every reason has copy', () => {
  assert.ok(isVerified('screenshot') && isVerified('code'))
  for (const r of ['stale', 'unreadable', 'weak', 'none']) assert.ok(!isVerified(r))
  for (const r of ['screenshot', 'code', 'stale', 'unreadable', 'weak', 'none']) assert.ok(ADMIN_COPY[r], r)
})

test('away clock adds up time spent on the other site', () => {
  let t = 0
  const a = new AwayClock(() => t)
  a.tick(true); t = 5000; a.tick(false)
  t = 8000; a.tick(true); t = 9000
  assert.equal(a.total(), 6000)
  a.tick(true); t = 10000; a.tick(false)
  assert.equal(a.total(), 7000)
})

test('admin routes keep their kind, old routes are chores', () => {
  assert.equal(cleanRoute({ name: 'Cancel gym', steps: ['Find it', 'Get the confirmation'], kind: 'admin' }).kind, 'admin')
  assert.equal(kindOf({ name: 'Dishes' }), 'chore')
  assert.equal(kindOf({ kind: 'errand' }), 'errand')
  for (const t of ADMIN_TEMPLATES) {
    assert.equal(kindOf(t), 'admin')
    assert.match(t.steps.at(-1), /confirmation/i)
    assert.ok(!/https?:|ssn|password/i.test(JSON.stringify(t)), t.id)
  }
})
