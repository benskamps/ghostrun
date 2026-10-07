// 100% runs: one photo of the finished chore, shrunk on the phone, checked once by the proof route.
// The photo is never saved, here or there. Only the verdict and a short "what PB saw" line stay.

const MAX_SIDE = 1024
const MAX_BYTES = 1.4 * 1024 * 1024

/** Downscale to a JPEG under the route's size limit. EXIF orientation is applied, other metadata dropped. */
export async function shrink(file) {
  let src
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { src = await loadImg(file) }
  const w0 = src.width, h0 = src.height
  const k = Math.min(1, MAX_SIDE / Math.max(w0, h0))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w0 * k); canvas.height = Math.round(h0 * k)
  canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height)
  src.close?.()
  for (const q of [0.82, 0.7, 0.55, 0.4]) {
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', q))
    if (blob && blob.size <= MAX_BYTES) return blob
  }
  throw new Error('too big')
}

function loadImg(file) {
  return new Promise((res, rej) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(url); res(img) }
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('unreadable')) }
    img.src = url
  })
}

/**
 * Send the photo. Resolves to { verdict: done | not_done | unclear | unavailable | offline, seen }.
 * Never throws: every failure is a verdict the Done screen knows how to say kindly.
 */
export async function checkPhoto(blob, { route, steps = [] }, fetcher = fetch) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { verdict: 'offline', seen: '' }
  const q = new URLSearchParams({ chore: route.slice(0, 60), steps: steps.map((s) => s.slice(0, 40)).join('|') })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 40_000)
  try {
    const r = await fetcher(`/api/proof?${q}`, { method: 'POST', headers: { 'content-type': blob.type || 'image/jpeg' }, body: blob, signal: ctrl.signal })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) return { verdict: 'unavailable', seen: '' }
    const verdict = ['done', 'not_done', 'unclear'].includes(body.verdict) ? body.verdict : 'unclear'
    return { verdict, seen: typeof body.seen === 'string' ? body.seen.slice(0, 90) : '' }
  } catch {
    return { verdict: 'unavailable', seen: '' }
  } finally { clearTimeout(timer) }
}

// PB's lines for each verdict. PB takes the blame, never the player.
export const PHOTO_COPY = {
  done: { head: '100% run.', line: 'PB checked every corner. Nothing left to haunt.' },
  not_done: { head: 'PB isn’t convinced.', line: 'PB swears it still sees a mess in there. Snap it again when it’s clear, or keep the run as is.' },
  unclear: { head: 'PB squinted.', line: 'Too dark or too close for a ghost to judge. Try a wider shot in better light.' },
  unavailable: { head: 'PB’s camera eye is napping.', line: 'The photo check isn’t reachable right now. Your run is saved just the same.' },
  offline: { head: 'No signal in the haunted house.', line: 'Photo checks need the internet. Your run is saved just the same.' },
}
