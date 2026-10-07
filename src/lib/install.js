// Home screen install. Chrome hands us a prompt once; Safari needs the Share sheet.
// On iOS this matters most: Safari clears a website's storage after about a week away,
// and an installed web app keeps its ghosts.
let deferred = null
const subs = new Set()

export function catchInstall() {
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; subs.forEach((f) => f()) })
  addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()) })
}

export const onInstallChange = (f) => { subs.add(f); return () => subs.delete(f) }
export const canPrompt = () => !!deferred
export const isInstalled = () => matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
export const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Returns 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  if (!deferred) return 'unavailable'
  const e = deferred
  deferred = null
  try { await e.prompt(); return (await e.userChoice).outcome } catch { return 'unavailable' }
}

/** A laptop or desktop: a fine pointer and no touch. Motion splits need a phone. */
export const isDesktop = () => matchMedia?.('(pointer: fine)').matches && !(navigator.maxTouchPoints > 0)
