// Runs and routes live in IndexedDB on the device. No accounts, no server.
// Falls back to memory if IndexedDB is blocked (some private modes), so the game still plays.

const DB = 'ghostrun'
const VERSION = 1
const STORES = ['routes', 'runs', 'meta']

let dbp = null
const memory = { routes: new Map(), runs: new Map(), meta: new Map() }
const KEY = { routes: 'id', runs: 'id', meta: 'key' }

function open() {
  if (dbp) return dbp
  dbp = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    let req
    try { req = indexedDB.open(DB, VERSION) } catch { return resolve(null) }
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('routes')) db.createObjectStore('routes', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('runs')) db.createObjectStore('runs', { keyPath: 'id' }).createIndex('routeId', 'routeId')
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
  return dbp
}

const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error) })

async function tx(store, mode, fn) {
  if (!STORES.includes(store)) throw new Error(`unknown store ${store}`)
  const db = await open()
  if (!db) return fn(null)
  return fn(db.transaction(store, mode).objectStore(store))
}

export const getAll = (store) => tx(store, 'readonly', (os) => os ? wrap(os.getAll()) : [...memory[store].values()])
export const get = (store, id) => tx(store, 'readonly', (os) => os ? wrap(os.get(id)) : memory[store].get(id))
export const put = (store, obj) => tx(store, 'readwrite', (os) => os ? wrap(os.put(obj)) : memory[store].set(obj[KEY[store]], obj))
export const del = (store, id) => tx(store, 'readwrite', (os) => os ? wrap(os.delete(id)) : memory[store].delete(id))
export const runsFor = (routeId) => tx('runs', 'readonly', (os) =>
  os ? wrap(os.index('routeId').getAll(routeId)) : [...memory.runs.values()].filter((r) => r.routeId === routeId))

export const getMeta = async (key, fallback = null) => (await get('meta', key))?.value ?? fallback
export const setMeta = (key, value) => put('meta', { key, value })

export const uid = () => (crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`)

/** Ask the browser not to evict our runs under storage pressure. Best effort. */
export const persist = () => navigator.storage?.persist?.().catch(() => false)

/** Forget everything on this device: routes, runs, ghosts, prefs. The page reloads after. */
export async function wipe() {
  memory.routes.clear(); memory.runs.clear(); memory.meta.clear()
  const db = await open()
  db?.close()
  dbp = null
  if (typeof indexedDB === 'undefined') return
  await new Promise((res) => { const r = indexedDB.deleteDatabase(DB); r.onsuccess = r.onerror = r.onblocked = () => res() })
}
