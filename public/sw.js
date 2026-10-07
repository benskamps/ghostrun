// Ghostrun offline: a race shouldn't stop because the laundry room has no signal.
// Pages are network first (fresh deploys win), everything with a hash in its name is cache first.
// The proof route, analytics and video (range requests) are never cached.
const CACHE = 'ghostrun-v1'
const SHELL = ['/', '/site.webmanifest', '/favicon.svg', '/icon-192.png', '/pb/pb-atlas.png', '/pb/pb-atlas.json', '/fonts/PixelifySans-700.woff2', '/fonts/Geist-400.woff2', '/fonts/Geist-600.woff2', '/fonts/MartianMono-400.woff2']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k)
    await self.clients.claim()
  })())
})

const skip = (url) => url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/_vercel/') || url.pathname.startsWith('/media/') || url.pathname === '/sw.js'

// The page tells us what it already loaded before this worker was in charge, so the first visit works offline too.
self.addEventListener('message', (e) => {
  if (e.data?.type !== 'warm' || !Array.isArray(e.data.urls)) return
  const urls = e.data.urls.slice(0, 80).filter((u) => { try { return !skip(new URL(u, location.origin)) } catch { return false } })
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(urls.map((u) => c.match(u).then((hit) => hit || c.add(u)).catch(() => {})))))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (skip(url)) return

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE)
      try {
        const res = await fetch(req)
        if (res.ok) c.put('/', res.clone())
        return res
      } catch {
        // /play and / are the same index.html; the app routes itself.
        return (await c.match('/')) || Response.error()
      }
    })())
    return
  }

  e.respondWith((async () => {
    const c = await caches.open(CACHE)
    const hit = await c.match(req)
    if (hit) return hit
    const res = await fetch(req)
    if (res.ok && res.type === 'basic') c.put(req, res.clone())
    return res
  })())
})
