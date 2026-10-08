import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchLibrary, fromLibrary, shapeBreakdown, parTotal, aboutTime, guessBeat, prepFor, SIZES } from '../src/lib/breakdown.js'
import { LIBRARY, GENERIC } from '../src/lib/breakdown-library.js'
import { askBreakdown } from '../src/lib/breakdown-client.js'
import { readBreakdown, breakdownUser } from '../api/_breakdown.js'
import { POST } from '../api/proof.js'

test('PB’s notes match everyday phrasing', () => {
  const cases = [
    ['clean the kitchen', 'chore', 'kitchen'], ['do the dishes', 'chore', 'dishes'], ['washing up', 'chore', 'dishes'],
    ['empty the dishwasher', 'chore', 'dishwasher'], ['Change the sheets', 'chore', 'sheets'], ['mow the lawn', 'chore', 'lawn'],
    ['scoop the litter box', 'chore', 'litter'], ['vacuum the car', 'chore', 'car-inside'], ['take out the bins', 'chore', 'trash'],
    ['fold laundry', 'chore', 'laundry-fold'], ['clean the toilet', 'chore', 'toilet'], ['rake leaves', 'chore', 'leaves'],
    ['grocery shopping', 'errand', 'grocery'], ['pick up my prescription', 'errand', 'pharmacy'], ['drop a parcel at UPS', 'errand', 'post'],
    ['cancel netflix subscription', 'admin', 'cancel'], ['renew my license', 'admin', 'renewal'], ['book a dentist appointment', 'admin', 'appointment'],
    ['dispute a double charged card', 'admin', 'dispute'], ['find unclaimed money', 'admin', 'unclaimed'],
  ]
  for (const [text, kind, id] of cases) assert.equal(matchLibrary(text, kind)?.id, id, text)
  // A broad phrase never beats the thing it's about.
  for (const [text, id] of [['deep clean the fridge', 'fridge'], ['spring clean the garage', 'garage'], ['clean up the garage', 'garage'], ['deep clean the oven', 'stove'], ['pick up the toys', 'kids'], ['deep clean the house', 'deep'], ['spring clean', 'deep'], ['tidy up', 'tidy'], ['clean up the living room', 'tidy'], ['clean my room', 'bedroom']]) assert.equal(matchLibrary(text, 'chore')?.id, id, text)
  assert.equal(matchLibrary('reticulate the splines', 'chore'), null)
  assert.equal(matchLibrary('clean the kitchen', 'admin'), null, 'kinds stay apart')
})

test('every library entry is a playable route', () => {
  const ids = new Set()
  for (const e of LIBRARY) {
    assert.ok(!ids.has(e.id), e.id); ids.add(e.id)
    assert.match(e.mess, /\bPB\b/, `${e.id} mess blames PB`)
    for (const size of ['quick', 'full']) {
      const b = fromLibrary(e.keys[0], e.kind, size)
      assert.equal(b.match, e.id, `${e.id} matches its own first key`)
      assert.ok(b.steps.length >= 2 && b.steps.length <= SIZES[size], `${e.id} ${size} length`)
      assert.ok(b.par[0] <= 90, `${e.id} starts tiny`)
      assert.equal(b.steps.length, b.par.length)
      if (e.kind === 'admin') assert.match(b.steps.at(-1), /confirmation/i, `${e.id} ends on the proof`)
      if (e.kind === 'errand') { assert.equal(b.drive.length, b.steps.length); assert.equal(b.drive[0], false) }
      for (const s of b.steps) assert.ok(s.length <= 40, s)
    }
    for (const i of e.quick) assert.ok(e.steps[i], `${e.id} quick index ${i}`)
  }
})

test('nothing matches: a generic shape named after the text', () => {
  const b = fromLibrary('reticulate the splines', 'chore')
  assert.equal(b.name, 'Reticulate the splines')
  assert.deepEqual(b.steps, GENERIC.chore.steps.map(([s]) => s))
  assert.equal(b.match, null)
  assert.match(fromLibrary('xyz', 'admin').steps.at(-1), /confirmation/)
})

test('shaping bounds AI output and keeps the rules', () => {
  const raw = {
    name: 'Kitchen <script>reset</script>', mood: 'rage', mess: 'You left the kitchen a mess again.',
    prep: ['Sponge', 'sponge', 'www.evil.com', 'Your SSN', 'a'.repeat(50)],
    steps: [{ step: 'Wipe everything down thoroughly', par: 900 }, { step: 'Visit https://x.y', par: 10 }, { step: 'Wipe everything down thoroughly', par: 5 },
      ...Array.from({ length: 20 }, (_, i) => ({ step: `Step ${i}`, par: 99999 }))],
  }
  const b = shapeBreakdown(raw, 'chore', 'full', { source: 'pb' })
  assert.equal(b.name, 'Kitchen script reset /script')
  assert.equal(b.mood, 'sneaky', 'rage is never chosen for you')
  assert.match(b.mess, /^PB/, 'shame copy swapped for PB blame')
  assert.deepEqual(b.prep, ['Sponge', 'a'.repeat(28)])
  assert.equal(b.steps.length, 10)
  assert.equal(b.par[0], 90, 'first step clamped tiny')
  assert.ok(b.par.every((p) => p >= 10 && p <= 3600))
  assert.ok(!b.steps.some((s) => /http/.test(s)))
  assert.equal(b.source, 'pb')
  assert.equal(shapeBreakdown({ steps: [{ step: 'Only one', par: 5 }] }), null)
  assert.equal(shapeBreakdown(null), null)
})

test('admin always ends on the confirmation, even when trimmed', () => {
  const steps = Array.from({ length: 9 }, (_, i) => ({ step: `Do part ${i}`, par: 60 }))
  const b = shapeBreakdown({ name: 'Taxes', mess: 'PB ate the forms.', prep: [], steps }, 'admin', 'quick')
  assert.equal(b.steps.length, 5)
  assert.equal(b.steps.at(-1), 'Get the confirmation')
  const c = shapeBreakdown({ steps: [{ step: 'Open site' }, { step: 'Get the confirmation email' }, { step: 'Celebrate' }] }, 'admin')
  assert.equal(c.steps.at(-1), 'Get the confirmation email')
  const d = shapeBreakdown({ steps: [{ step: 'Type your password here' }, { step: 'Open the site' }, { step: 'Submit' }] }, 'admin')
  assert.ok(!d.steps.some((s) => /password/i.test(s)))
})

test('par helpers: total, wording, and a first-run beat that never loses', () => {
  assert.equal(parTotal([60, 120], 2), 180000)
  assert.equal(parTotal([60, null], 2), null)
  assert.equal(parTotal([60], 2), null, 'steps changed since the guess')
  assert.equal(aboutTime(45000), 'about 45 s')
  assert.equal(aboutTime(12 * 60000), 'about 12 min')
  assert.equal(aboutTime(90 * 60000), 'about 1 h 30 min')
  assert.equal(guessBeat(600000, 400000).beat, true)
  assert.equal(guessBeat(600000, 605000).head, 'Right on PB’s guess.')
  const slow = guessBeat(600000, 1200000)
  assert.equal(slow.beat, false)
  assert.doesNotMatch(slow.line + slow.head, /\byou\b/i, 'slow is PB’s fault')
  assert.equal(guessBeat(null, 1000), null)
})

test('starter routes borrow a loadout; edited routes keep their own', () => {
  assert.deepEqual(prepFor({ template: 'dishes' }), ['Dish soap', 'Sponge', 'Towel'])
  assert.deepEqual(prepFor({ template: 'laundry' }), ['Hangers'])
  assert.deepEqual(prepFor({ template: 'dishes', prep: [] }), [])
  assert.deepEqual(prepFor({}), [])
})

test('model output is read as data and whitelisted', () => {
  const good = JSON.stringify({ usable: true, name: 'Car wash', mood: 'smug', mess: 'PB drew in the dust.', prep: ['Bucket'], steps: [{ step: 'Fill the bucket', par: 60, drive: false }, { step: 'Soap it', par: 300, drive: false }] })
  assert.equal(readBreakdown(good, 'chore', 'full').name, 'Car wash')
  assert.equal(readBreakdown(JSON.stringify({ usable: false, steps: [] }), 'chore', 'full'), null)
  assert.equal(readBreakdown('not json', 'chore', 'full'), null)
  assert.match(breakdownUser('Dishes', 'admin', 'quick'), /Get the confirmation/)
})

const bdReq = (body, headers = {}) => new Request('https://g.app/api/proof?task=breakdown', {
  method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body),
  headers: { origin: 'https://g.app', host: 'g.app', 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.' + Math.random(), ...headers },
})

test('breakdown route fails closed without leaking anything', async () => {
  delete process.env.ANTHROPIC_API_KEY
  const cases = [
    [bdReq({ text: 'dishes' }, { origin: 'https://evil.example' }), 403],
    [bdReq({ text: 'dishes' }, { 'content-type': 'text/plain' }), 415],
    [bdReq('x'.repeat(2000)), 413],
    [bdReq('{nope'), 400],
    [bdReq({ text: '' }), 400],
    [bdReq({ text: 'dishes', kind: 'chore' }), 503], // no key yet: the phone uses PB's notes
  ]
  for (const [r, status] of cases) {
    const res = await POST(r)
    assert.equal(res.status, status)
    assert.deepEqual(await res.json(), { breakdown: null })
  }
})

test('breakdown route rate-limits one phone', async () => {
  const headers = { 'x-forwarded-for': '7.7.7.7' }
  const statuses = []
  for (let i = 0; i < 8; i++) statuses.push((await POST(bdReq({ text: 'dishes' }, headers))).status)
  assert.ok(statuses.includes(429))
})

test('client: AI when it answers, PB’s notes on any failure, cached second time', async () => {
  const shaped = shapeBreakdown({ name: 'Car wash', mood: 'smug', mess: 'PB drew in the dust.', prep: ['Bucket'], steps: [{ step: 'Fill the bucket', par: 60 }, { step: 'Soap it', par: 300 }] }, 'chore', 'full', { source: 'pb' })
  let calls = 0
  const store = {}
  const cache = { get: async () => store.v, set: async (v) => { store.v = v } }
  const fetcher = async (url, init) => {
    calls++
    assert.equal(url, '/api/proof?task=breakdown')
    assert.deepEqual(JSON.parse(init.body), { text: 'wash the car', kind: 'chore', size: 'quick' })
    return new Response(JSON.stringify({ breakdown: shaped }))
  }
  const a = await askBreakdown({ text: 'wash the car', size: 'quick' }, { fetcher, cache })
  assert.equal(a.source, 'pb'); assert.deepEqual(a.par, [60, 300])
  const b = await askBreakdown({ text: 'Wash the car', size: 'quick' }, { fetcher, cache })
  assert.deepEqual(b, a); assert.equal(calls, 1)

  const down = await askBreakdown({ text: 'do the dishes' }, { fetcher: async () => new Response('{"breakdown":null}', { status: 503 }) })
  assert.equal(down.source, 'notes'); assert.equal(down.match, 'dishes')
  const boom = await askBreakdown({ text: 'do the dishes' }, { fetcher: async () => { throw new Error('net') } })
  assert.equal(boom.match, 'dishes')
  const junk = await askBreakdown({ text: 'do the dishes' }, { fetcher: async () => new Response('{"breakdown":{"steps":"lol"}}') })
  assert.equal(junk.source, 'notes')
})

test('chop: "and" splits carry the verb', async () => {
  const { splitAnd } = await import('../src/lib/breakdown.js')
  assert.deepEqual(splitAnd('Wipe counters and stove'), ['Wipe counters', 'Wipe stove'])
  assert.deepEqual(splitAnd('Rinse and rack'), ['Rinse', 'Rack'])
  assert.deepEqual(splitAnd('Clothes, shoes and bags'), ['Clothes', 'Shoes', 'Bags'])
  assert.equal(splitAnd('Fold'), null)
})

test('chop offline: notes, halves, and par shared out', async () => {
  const { chopOffline } = await import('../src/lib/breakdown.js')
  const a = chopOffline('Wash plates and bowls', 240)
  assert.deepEqual(a.steps, ['Wash plates', 'Wash bowls'])
  assert.deepEqual(a.par, [120, 120])
  assert.deepEqual(chopOffline('Fold', 300).steps, ['Shirts', 'Pants', 'Towels', 'Socks and small stuff'])
  assert.deepEqual(chopOffline('Vacuum', null).steps, ['Main room', 'Bedrooms', 'Hallway and corners'])
  assert.deepEqual(chopOffline('Reticulate', 100).steps, ['Reticulate (first half)', 'Reticulate (second half)'])
  const big = chopOffline('Get the confirmation and celebrate', 60)
  assert.ok(!big.steps.includes('Get the confirmation') || big.steps.length === 2, 'chop never appends a confirmation')
  assert.ok(chopOffline('Wash', 20).par.every((p) => p >= 10), 'first piece is not clamped tiny but stays above the floor')
})

test('chop via the route: AI pieces rescaled to the step’s par, any failure falls back', async () => {
  const { askChop } = await import('../src/lib/breakdown-client.js')
  const fetcher = async (url, init) => {
    const body = JSON.parse(init.body)
    assert.deepEqual(body, { text: 'Clean the oven', part: 'Kitchen reset', kind: 'chore' })
    return new Response(JSON.stringify({ breakdown: { steps: ['Racks out', 'Spray inside', 'Wipe it out', 'Racks back', 'Extra one'], par: [60, 60, 120, 60, 999] } }))
  }
  const a = await askChop({ part: 'Kitchen reset', step: 'Clean the oven', par: 600 }, { fetcher })
  assert.equal(a.steps.length, 4)
  assert.equal(a.par.reduce((x, y) => x + y, 0), 600)
  const down = await askChop({ part: 'Kitchen', step: 'Wipe counters and stove', par: 200 }, { fetcher: async () => new Response('{}', { status: 503 }) })
  assert.deepEqual(down.steps, ['Wipe counters', 'Wipe stove'])
})

test('chop route asks the model for one step, not a whole run', async () => {
  const { chopUser } = await import('../api/_breakdown.js')
  assert.match(chopUser('Kitchen reset', 'Clean the oven', 'chore'), /ONE step of the run "Kitchen reset"/)
  assert.doesNotMatch(chopUser('Taxes', 'Download the forms', 'admin'), /must be "Get the confirmation"/)
})
