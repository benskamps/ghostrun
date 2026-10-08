// Ask PB to break a chore down. With the key set, the proof route asks Claude; without it, offline,
// or on any failure, PB's own notes answer instantly. Never throws, never shows an error.
import { fromLibrary, shapeBreakdown, plain, BD_LIMITS } from './breakdown.js'

const CACHE_MAX = 30
const cacheKey = (text, kind, size) => `${kind}|${size}|${plain(text, BD_LIMITS.text).toLowerCase()}`

/**
 * opts.fetcher: fetch stand-in for tests. opts.cache: { get(), set(map) } over the phone's own storage,
 * so asking twice for "clean the kitchen" costs nothing the second time.
 */
export async function askBreakdown({ text, kind = 'chore', size = 'full' }, { fetcher = fetch, cache = null, timeoutMs = 15_000 } = {}) {
  const clean = plain(text, BD_LIMITS.text)
  const notes = () => fromLibrary(clean, kind, size)
  if (clean.length < 2) return notes()
  const key = cacheKey(clean, kind, size)
  let saved = null
  try { saved = (await cache?.get()) || null } catch { saved = null }
  if (saved?.[key]) return saved[key]
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return notes()

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetcher('/api/proof?task=breakdown', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: clean, kind, size }), signal: ctrl.signal,
    })
    if (!r.ok) return notes()
    const body = await r.json().catch(() => null)
    // Belt and braces: the route already shaped it, the phone shapes it again.
    const got = body?.breakdown ? shapeBreakdown({ ...body.breakdown, steps: body.breakdown.steps?.map((step, i) => ({ step, par: body.breakdown.par?.[i], drive: body.breakdown.drive?.[i] })) }, kind, size, { source: 'pb' }) : null
    if (!got) return notes()
    if (cache) {
      try {
        const next = { ...(saved || {}), [key]: got }
        const keys = Object.keys(next)
        for (const k of keys.slice(0, Math.max(0, keys.length - CACHE_MAX))) delete next[k]
        await cache.set(next)
      } catch { /* the cache is a nicety */ }
    }
    return got
  } catch {
    return notes()
  } finally { clearTimeout(timer) }
}

// What PB says about where the breakdown came from.
export const SOURCE_COPY = {
  pb: 'PB cased the place and wrote this route. Tweak anything.',
  notes: 'From PB’s notebook. Tweak anything.',
  generic: 'PB hasn’t haunted this one before. Here’s a shape to start from; rename the steps.',
}
