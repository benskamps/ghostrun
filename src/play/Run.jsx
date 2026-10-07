import { useCallback, useEffect, useRef, useState } from 'react'
import { track } from '@vercel/analytics'
import PB from './PB.jsx'
import { clock, delta, segs, liveGap, progressAt, myProgress, pbAlpha, liveMood, goldFlags, finish } from '../lib/race.js'
import { EffortMeter, verdict } from '../lib/proof.js'
import { KnockDetector } from '../lib/knock-split.js'
import { FlipDetector } from '../lib/flip-split.js'
import { dreadCheck } from '../lib/run-extras.js'
import { uid } from '../lib/store.js'
import { GeoTracker, geoVerdict } from '../lib/geo.js'
import { isErrand, isAdmin } from '../lib/routes.js'
import { AwayClock, checkShot, codeVerdict, isVerified } from '../lib/admin-proof.js'
import { todayKey } from './model.js'

const DEBOUNCE_MS = 600 // a tap and a knock for the same split shouldn't count twice
const buzz = (p) => { try { navigator.vibrate?.(p) } catch { /* not on iOS */ } }

export default function Run({ route, setup, prefs, onFinish, onAbandon }) {
  const { opponent, guessMs, hex, whisper, motion, priorBest } = setup
  const steps = route.steps
  const n = steps.length
  const ghost = opponent?.splits || null
  const blind = hex?.id === 'blind'
  const errand = isErrand(route)
  const admin = isAdmin(route)

  const [splits, setSplits] = useState([])
  const [now, setNow] = useState(0)
  const [face, setFace] = useState(null)
  const [live, setLive] = useState({ motion: false, orient: false, geo: false })
  const [locating, setLocating] = useState(false)
  const [flash, setFlash] = useState(null)
  const [confirmStop, setConfirmStop] = useState(false)
  const [asking, setAsking] = useState(false) // Admin%: the clock has stopped, PB wants the confirmation
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const eng = useRef(null)

  const cleanup = useCallback(() => {
    const e = eng.current
    if (!e) return
    e.offs.forEach((f) => f())
    e.offs = []
    clearInterval(e.timer)
    e.lock?.release?.().catch(() => {})
    e.lock = null
    document.removeEventListener('visibilitychange', e.relock)
  }, [])

  const split = useCallback((source) => {
    const e = eng.current
    if (!e || e.done) return
    const t = performance.now() - e.t0
    const lastAt = e.splits.at(-1) ?? 0
    if (t - lastAt < DEBOUNCE_MS || t - e.lastInput < DEBOUNCE_MS) return
    e.lastInput = t
    e.splits.push(t)
    e.sources.push(source)
    e.meter.split()
    const i = e.splits.length - 1
    const seg = t - (i ? e.splits[i - 1] : 0)
    const gold = !!priorBest && seg < priorBest[i]
    buzz(gold ? [30, 60, 30, 60, 30] : 40)
    if (gold) whisper?.chime(); else whisper?.blip()
    setFlash({ i, gold, key: t })
    setSplits([...e.splits])
    if (e.geo) {
      // A tap means the app is in front: the best moment for a fresh fix. On the last leg, wait for it.
      const fix = e.geo.ping()
      if (e.splits.length === n) { e.done = true; setLocating(true); fix.then(() => end()); return }
    }
    if (e.splits.length === n && e.away) {
      // Admin%: the time is the tap. Proof comes after, off the clock.
      e.done = true; e.awayMs = e.away.total(); cleanup(); whisper?.stop(); setAsking(true); return
    }
    if (e.splits.length === n) end()
  }, [n, priorBest, whisper]) // eslint-disable-line react-hooks/exhaustive-deps

  const end = (adminReason) => {
    const e = eng.current
    e.done = true
    cleanup()
    whisper?.stop()
    const finalSplits = e.splits.map((x) => Math.round(x))
    const proof = e.away ? { verified: isVerified(adminReason), reason: adminReason }
      : e.geo ? geoVerdict(route.places, finalSplits, e.geo.fixes) : verdict(e.meter, finalSplits)
    const golds = goldFlags(finalSplits, priorBest)
    const name = opponent ? opponent.name : 'PB'
    const result = finish({ splits: finalSplits, steps, ghost, golds, firstRun: !opponent, name })
    const run = {
      id: uid(), routeId: route.id, route: route.name, steps: [...steps], splits: finalSplits,
      date: todayKey(), startedAt: e.wall, endedAt: Date.now(),
      guessMs: guessMs || null, hex: hex?.id || null, vs: opponent?.id || null,
      verified: proof.verified, proof: proof.reason, sources: e.sources,
      trace: e.geo || e.away ? [] : e.meter.trace.slice(0, Math.ceil((finalSplits.at(-1) + 500) / 250)),
      ...(e.geo ? { kind: 'errand' } : {}),
      ...(e.away ? { kind: 'admin', away: Math.min(e.awayMs, finalSplits.at(-1)) } : {}),
    }
    track('run_finish', { result: result.result, verified: proof.verified, vs: opponent?.id || 'none' })
    onFinish(run, {
      result, golds, proof, opponent, priorBest,
      gap: ghost ? finalSplits.at(-1) - ghost.at(-1) : null,
      dread: dreadCheck(run),
      places: e.geo ? proof.places : null,
    })
  }

  // Start the clock and every sensor once, on mount.
  useEffect(() => {
    const t0 = performance.now()
    const e = { t0, wall: Date.now(), splits: [], sources: [], lastInput: -Infinity, offs: [], done: false, meter: new EffortMeter() }
    eng.current = e
    const since = () => performance.now() - t0

    if (errand) {
      // Errands: location is the proof. Motion and knock/flip stay off (a car shakes plenty).
      e.geo = new GeoTracker(since, { onFix: () => setLive((l) => (l.geo ? l : { ...l, geo: true })) })
      e.offs.push(e.geo.listen())
      e.geo.ping()
    } else if (admin) {
      // Admin%: the work happens on another site, so there's nothing to sense. Just note the time spent over there.
      e.away = new AwayClock()
      e.offs.push(e.away.listen())
    } else {
    // Effort meter + live sensor badges
    e.offs.push(e.meter.listen(since))
    const seen = (ev) => { if (ev.accelerationIncludingGravity?.x != null || ev.acceleration?.x != null) { setLive((l) => (l.motion ? l : { ...l, motion: true })); removeEventListener('devicemotion', seen) } }
    addEventListener('devicemotion', seen)
    e.offs.push(() => removeEventListener('devicemotion', seen))
    const seenO = (ev) => { if (ev.beta != null) { setLive((l) => (l.orient ? l : { ...l, orient: true })); removeEventListener('deviceorientation', seenO) } }
    addEventListener('deviceorientation', seenO)
    e.offs.push(() => removeEventListener('deviceorientation', seenO))

    // Knock and flip feed the same split as the button
    // Knocks only count while the phone lies flat on a surface; in a hand or pocket, jostling looks like knocks.
    e.knockOn = false; e.flipOn = false; e.flat = false
    const tilt = (ev) => { if (ev.beta != null) { const b = Math.abs(ev.beta), g = Math.abs(ev.gamma || 0); e.flat = (b < 20 || b > 160) && (g < 20 || g > 160) } }
    addEventListener('deviceorientation', tilt)
    e.offs.push(() => removeEventListener('deviceorientation', tilt))
    e.offs.push(new KnockDetector({ onKnock: () => e.knockOn && e.flat && split('knock') }).listen())
    e.offs.push(new FlipDetector({ onFlip: () => e.flipOn && split('flip'), onFace: setFace }).listen())
    }

    // Keep the screen on; browsers drop the lock when the tab hides, so take it back.
    const lock = async () => { try { e.lock = await navigator.wakeLock?.request('screen') } catch { /* fine */ } }
    e.relock = () => { if (document.visibilityState === 'visible' && !e.done) lock() }
    document.addEventListener('visibilitychange', e.relock)
    lock()

    e.timer = setInterval(() => setNow(performance.now() - t0), 100)
    track('run_start', { vs: opponent?.id || 'record', hex: hex?.id || 'none' })
    return () => { e.done = true; cleanup() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Input prefs can change mid-run without restarting sensors
  useEffect(() => { if (eng.current) { eng.current.knockOn = prefs.knock; eng.current.flipOn = prefs.flip } }, [prefs.knock, prefs.flip])

  const undo = () => {
    const e = eng.current
    if (!e?.splits.length || e.done) return
    e.splits.pop(); e.sources.pop(); e.meter.undo()
    setSplits([...e.splits]); setFlash(null)
  }

  const proveShot = async (ev) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file || checking) return
    setChecking(true)
    const v = await checkShot(file, eng.current.wall)
    setChecking(false)
    end(v)
  }
  const proveCode = (ev) => {
    ev.preventDefault()
    const v = codeVerdict(code)
    setCode('') // read once, never kept
    end(v)
  }

  const k = splits.length
  const driving = errand && !!route.drive?.[Math.min(k, n - 1)] && k < n
  const gap = liveGap(splits, now, ghost)
  const alpha = pbAlpha(gap)
  const mood = ghost ? liveMood(gap) : face === 'down' ? 'sleepy' : 'sneaky'

  // PB's hum follows the gap, twice a second is plenty
  const lastHum = useRef(0)
  useEffect(() => {
    if (!whisper || now - lastHum.current < 500) return
    lastHum.current = now
    whisper.setGap(gap ?? -5000)
  }, [now, gap, whisper])

  const ghostSegs = ghost ? segs(ghost) : null
  const pbPos = ghost ? progressAt(ghost, now) : null
  const youPos = myProgress(splits, now, n, ghost)
  const segNow = now - (k ? splits[k - 1] : 0)
  const lastFlash = flash && flash.i === k - 1 ? flash : null

  return (
    <div className="race" data-face={face || 'up'}>
      <header className="bar bar-run">
        <span className="bar-title">{route.name}</span>
        {hex ? <span className="hex-badge mono">{hex.name}</span> : <span />}
        <button className="chip-btn" onClick={() => setConfirmStop(true)}>Stop</button>
      </header>

      {confirmStop && (
        <div className="stop-sheet" role="dialog" aria-label="Stop this run?">
          <p>PB will wait. Stop this run? It won’t be saved.</p>
          <div className="row">
            <button className="chip-btn" onClick={() => setConfirmStop(false)}>Keep going</button>
            <button className="chip-btn warn" onClick={() => { const e = eng.current; e.done = true; cleanup(); whisper?.stop(); onAbandon() }}>Stop run</button>
          </div>
        </div>
      )}

      <section className="hud">
        <PB mood={mood} alpha={alpha} scale={6} trail={!!ghost} stitched={opponent?.stitched} label={`PB, looking ${mood}, ${Math.round(alpha * 100)} percent visible`} />
        {driving ? (
          <div className="drive-veil" role="status">
            <strong>Eyes on the road.</strong>
            <span className="muted small">The clock’s hidden while you drive. PB is riding along. Split once you’re parked.</span>
          </div>
        ) : (
        <div className="hud-clock">
          <div className="clock mono" aria-live="off">{blind ? '?:??.?' : clock(now)}</div>
          {ghost && !blind && (
            <div className={`gap mono ${gap > 0 ? 'behind' : 'ahead'}`}>{delta(gap)} <small>{gap > 0 ? (opponent.id === 'pb' ? 'PB ahead' : 'ghost ahead') : 'you lead'}</small></div>
          )}
          {!ghost && <div className="gap mono rec">● recording your ghost</div>}
        </div>
        )}
      </section>

      {ghost && (
        <div className="ghost-bar" aria-hidden="true">
          <div className="gb-pb" style={{ left: `${pbPos * 100}%` }} />
          <div className="gb-you" style={{ left: `${youPos * 100}%` }} />
        </div>
      )}

      <ol className="live-splits" aria-live="polite">
        {steps.map((s, i) => {
          const done = i < k
          const seg = done ? splits[i] - (i ? splits[i - 1] : 0) : null
          const d = done && ghost ? splits[i] - ghost[i] : null
          const gold = done && priorBest && seg < priorBest[i]
          return (
            <li key={i} className={`${done ? 'done' : ''} ${i === k ? 'live' : ''} ${gold ? 'gold' : ''} ${flash?.i === i ? 'flash' : ''}`}>
              <span className="ls-name">{s}</span>
              <span className="ls-time mono">
                {done ? (blind ? '✓' : d != null ? delta(d) : clock(seg))
                  : i === k ? (blind || driving ? '…' : clock(segNow))
                  : ghostSegs ? <span className="faint">{clock(ghostSegs[i])}</span> : ''}
                {gold && <span className="star" aria-label="gold split">★</span>}
              </span>
            </li>
          )
        })}
      </ol>

      {admin ? (
      <div className="sensors mono" aria-live="polite">
        <span className="on">confirmation at the finish</span>
        {eng.current?.away && eng.current.away.total() > 1000 && <span>away {clock(eng.current.away.total()).replace(/\.\d$/, '')}</span>}
      </div>
      ) : errand ? (
      <div className="sensors mono" aria-live="polite">
        <span className={live.geo ? 'on' : ''}>location</span>
        {motion === 'denied' && <span className="warn">location off · time only</span>}
        {locating && <span className="on">PB is checking where you are…</span>}
      </div>
      ) : (
      <div className="sensors mono" aria-live="polite">
        <span className={prefs.knock && live.motion ? 'on' : ''}>knock</span>
        <span className={prefs.flip && live.orient ? 'on' : ''}>flip</span>
        <span className={live.motion ? 'on' : ''}>effort</span>
        {face === 'down' && <span className="on">face down · working</span>}
        {motion === 'denied' && <span className="warn">motion off · tap to split</span>}
      </div>
      )}

      {lastFlash?.gold && <p className="gold-toast mono" key={lastFlash.key}>★ Gold split. PB felt that.</p>}

      {asking ? (
        <section className="card hundred proof-ask" role="dialog" aria-label="Show PB the confirmation">
          <p className="mono eyebrow">Proof <span className="faint">clock stopped at {clock(splits.at(-1))}</span></p>
          <p className="hundred-head">Show PB the confirmation.</p>
          <p className="muted small">A screenshot of the confirmation page, or its reference number. PB checks it on this phone and never keeps it.</p>
          {checking ? <p className="mono checking">PB is squinting at it<span className="dots" aria-hidden="true">…</span></p> : (
            <>
              <label className="big-btn snap">Add the screenshot
                <input type="file" accept="image/*" onChange={proveShot} />
              </label>
              <form className="code-row" onSubmit={proveCode}>
                <input value={code} onChange={(ev) => setCode(ev.target.value)} maxLength={40} placeholder="Or the reference no." aria-label="Confirmation or reference number" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
                <button className="chip-btn" type="submit" disabled={!code.trim()}>Use it</button>
              </form>
              <button className="textbtn" onClick={() => end('none')}>No confirmation? Save it as Any%</button>
            </>
          )}
        </section>
      ) : (
      <div className="split-zone">
        <button className="split-btn" onClick={() => split('tap')} disabled={locating}>
          <span>{k === n - 1 ? 'Finish' : 'Split'}</span>
          <small>{steps[Math.min(k, n - 1)]} done</small>
        </button>
        <button className="undo" onClick={undo} disabled={!k}>Undo split</button>
      </div>
      )}
    </div>
  )
}
