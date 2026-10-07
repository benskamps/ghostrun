// Admin% proof: the confirmation the official site gave you, checked on the phone.
// Nothing here is uploaded or saved. A screenshot is only opened to check it's an image from this run,
// and a confirmation number is only read for shape. Neither is stored; the run keeps the verdict.

export const ADMIN = {
  slackMs: 2 * 60_000, // a screenshot may be a little older than the tap that started the run
  minCode: 4,
  maxCode: 40,
}

const SEQ = '0123456789abcdefghijklmnopqrstuvwxyz'

/** Does this look like a confirmation or reference number? Returns 'code' | 'weak'. */
export function codeVerdict(raw) {
  const s = String(raw || '').replace(/[\s-]/g, '').toLowerCase()
  if (s.length < ADMIN.minCode || s.length > ADMIN.maxCode) return 'weak'
  if (!/^[a-z0-9#./]+$/.test(s) || !/\d/.test(s)) return 'weak'
  const plain = s.replace(/[#./]/g, '')
  if (new Set(plain).size < 3) return 'weak' // 0000, 1212
  if (SEQ.includes(plain) || [...SEQ].reverse().join('').includes(plain)) return 'weak' // 12345, 54321
  return 'code'
}

/**
 * Is this file a screenshot taken during the run? `meta` is { type, size, lastModified }, `decoded` says it opened as an image.
 * Some phones stamp a picked photo with the time it was picked; that still passes, which is fine. An old screenshot doesn't.
 */
export function shotVerdict(meta, startedAt, decoded) {
  if (!decoded || !/^image\//.test(meta?.type || 'image/') || !meta?.size) return 'unreadable'
  if (meta.lastModified && meta.lastModified < startedAt - ADMIN.slackMs) return 'stale'
  return 'screenshot'
}

/** Open the picked file just enough to know it's an image, then let it go. */
export async function checkShot(file, startedAt) {
  let decoded = false
  try {
    const bmp = await createImageBitmap(file)
    decoded = bmp.width > 0 && bmp.height > 0
    bmp.close?.()
  } catch { decoded = false }
  return shotVerdict({ type: file.type, size: file.size, lastModified: file.lastModified }, startedAt, decoded)
}

export const isVerified = (reason) => reason === 'screenshot' || reason === 'code'

// PB takes the blame for every miss.
export const ADMIN_COPY = {
  screenshot: 'Verified by the confirmation screenshot. PB checked the date, and it never left your phone.',
  code: 'Verified by the confirmation number. PB read it once and forgot it.',
  stale: 'That screenshot is older than this run, so this saves as Any% (time only). PB tried that trick too.',
  unreadable: 'PB couldn’t open that picture, so this saves as Any% (time only).',
  weak: 'PB couldn’t read that as a confirmation number, so this saves as Any% (time only).',
  none: 'No confirmation, so this saves as Any% (time only). Some sites never send one; PB blames them.',
}

/** Time spent away from Ghostrun during a run (on the official site, in another app). */
export class AwayClock {
  constructor(now = () => performance.now()) { this.now = now; this.ms = 0; this.since = null }
  tick(hidden) {
    if (hidden && this.since == null) this.since = this.now()
    else if (!hidden && this.since != null) { this.ms += this.now() - this.since; this.since = null }
  }
  total() { return Math.round(this.ms + (this.since != null ? this.now() - this.since : 0)) }
  listen() {
    const on = () => this.tick(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }
}
