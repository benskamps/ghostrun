// Errand% proof: did you actually go there? The phone checks where each leg ended, on the phone only.
// Locations never leave the device. Ghost links don't carry them.
//
// A PWA loses GPS while the maps app is in front, so nothing here depends on a steady stream:
// we take a fresh fix whenever the app comes back and at every split (a tap means you're looking).

export const GEO = {
  minRadius: 80,     // metres; a parking lot is big
  maxRadius: 250,    // past this the fix is too vague to judge
  dwellMs: 45_000,   // at least this long near one stop counts as being there, not driving past
  movedM: 150,       // a first run must leave the house to count
  sharpM: 65,        // Wi-Fi-grade or better; vaguer fixes must land three error circles from home to count as out
  awayM: 150,        // a stop this far from home is one a couch can't fake (closer ones can't be told apart from home)
  window: 90_000,    // a fix this close to a split belongs to it
  arrivedShare: 0.5, // GPS is flaky; half the stops confirmed is enough
}

const R = 6371e3
const rad = (d) => (d * Math.PI) / 180
export function metres(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Both the fix and the stored stop are fuzzy, so allow for both. Stops saved before they carried acc count as 50 m.
const radius = (fix, place) => Math.min(GEO.maxRadius, Math.max(GEO.minRadius, (fix.acc || 0) * 1.5 + (place.acc ?? 50)))
const near = (fix, place) => fix.acc <= GEO.maxRadius * 2 && metres(fix, place) <= radius(fix, place)

/** The sharpest fix within the window around t (closest in time breaks a tie). The first fix back from the maps app is often vague. */
export function fixNear(fixes, t) {
  let best = null
  const score = (f) => Math.max(f.acc, 20) * 1e6 + Math.abs(f.t - t)
  for (const f of fixes) if (Math.abs(f.t - t) <= GEO.window && (!best || score(f) < score(best))) best = f
  return best
}

/** First run: where each leg ended becomes that step's place. Rounded to ~10 m; this stays on the phone. */
export function placesFromRun(splits, fixes) {
  return splits.map((t) => {
    const f = fixNear(fixes, t)
    return f && f.acc <= GEO.maxRadius ? { lat: +f.lat.toFixed(4), lon: +f.lon.toFixed(4), acc: Math.max(10, Math.round(f.acc)) } : null
  })
}

/** Longest stretch of fixes that stayed near one place. */
export function longestDwell(fixes, places) {
  let best = 0
  for (const p of places.filter(Boolean)) {
    let start = null
    for (const f of fixes) {
      if (near(f, p)) { start ??= f.t; best = Math.max(best, f.t - start) } else start = null
    }
  }
  return best
}

/**
 * Verdict for an errand run. `places` are the route's stops (null before the first run).
 * Returns { verified, reason, places } where places is what this run would record.
 */
export function geoVerdict(places, splits, fixes) {
  const good = fixes.filter((f) => f.acc <= GEO.maxRadius * 2)
  const recorded = placesFromRun(splits, good)
  if (!good.length) return { verified: false, reason: 'nogeo', places: recorded }

  if (!places?.some(Boolean)) {
    const home = good[0]
    const far = good.some((f) => metres(home, f) >= GEO.movedM)
    return { verified: far, reason: far ? 'moved' : 'stayed', places: recorded }
  }

  // Only stops away from home prove anything: a couch is always "at" the first and last stop.
  const home = places[0] || good[0]
  const away = places.map((p, i) => ({ p, i })).filter((x) => x.p && metres(x.p, home) >= GEO.awayM)
  if (!away.length) {
    const far = good.some((f) => metres(home, f) >= GEO.movedM && metres(home, f) > 2 * f.acc)
    return { verified: far, reason: far ? 'arrived' : 'missed', places: recorded }
  }
  // A fix only shows you were out if its error circle stays well clear of home. Vague fixes need more room:
  // that's where a cell-tower jump hides.
  const out = good.filter((f) => { const d = metres(home, f); return d > 2 * f.acc && (f.acc <= GEO.sharpM || d > 3 * f.acc) })
  const arrived = away.filter(({ p, i }) => {
    const from = (i ? splits[i - 1] : 0) - 30_000, to = splits[i] + GEO.window
    return out.some((f) => f.t >= from && f.t <= to && near(f, p))
  }).length
  // Out of the house for a while: near one stop that long, or two out-of-house fixes that far apart
  // (the maps app and a locked screen leave gaps, so a steady stream can't be counted on).
  const dwell = longestDwell(out, away.map((x) => x.p)) >= GEO.dwellMs || (out.length > 1 && out.at(-1).t - out[0].t >= GEO.dwellMs)
  const ok = arrived / away.length >= GEO.arrivedShare && (dwell || arrived === away.length)
  return { verified: ok, reason: ok ? 'arrived' : 'missed', places: recorded }
}

export const GEO_COPY = {
  moved: 'Out the door and back. Next time PB checks you reach the same stops.',
  arrived: 'Verified by location. You actually went there.',
  missed: 'PB couldn’t place you at your stops, so this saves as Any% (time only). GPS gets shy indoors. Split when you’re parked.',
  stayed: 'PB never saw you leave, so this saves as Any% (time only). Errands start out the door.',
  nogeo: 'No location here, so this saves as Any% (time only). Allow location to make errands count.',
}

/** Ask for location from a tap (iOS only prompts from a user gesture). Resolves 'granted' | 'denied' | 'unsupported'. */
export function askGeo() {
  if (!('geolocation' in navigator)) return Promise.resolve('unsupported')
  return new Promise((res) => {
    navigator.geolocation.getCurrentPosition(() => res('granted'), (e) => res(e.code === 1 ? 'denied' : 'granted'), { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 })
  })
}

/** Collects fixes while a run is open. `since()` gives ms since the run started. */
export class GeoTracker {
  constructor(since, { onFix } = {}) { this.since = since; this.onFix = onFix; this.fixes = []; this.offs = [] }
  push(pos) {
    const c = pos.coords
    const f = { t: Math.round(this.since()), lat: c.latitude, lon: c.longitude, acc: Math.round(c.accuracy || 999) }
    if (this.fixes.length >= 2000) this.fixes.splice(0, 1000) // a long errand at one fix a second is still small
    this.fixes.push(f)
    this.onFix?.(f)
  }
  /** One fresh fix, e.g. at a split or when the app comes back from the maps app. */
  ping(timeout = 6000) {
    return new Promise((done) => {
      const t = setTimeout(done, timeout + 500)
      const fin = () => { clearTimeout(t); done() }
      try {
        if (!navigator.geolocation) return fin()
        navigator.geolocation.getCurrentPosition((p) => { this.push(p); fin() }, fin, { enableHighAccuracy: true, timeout, maximumAge: 5000 })
      } catch { fin() }
    })
  }
  listen() {
    if (!('geolocation' in navigator)) return () => {}
    const id = navigator.geolocation.watchPosition((p) => this.push(p), () => {}, { enableHighAccuracy: true, maximumAge: 5000 })
    const back = () => { if (document.visibilityState === 'visible') this.ping() }
    document.addEventListener('visibilitychange', back)
    return () => { navigator.geolocation.clearWatch(id); document.removeEventListener('visibilitychange', back) }
  }
}
