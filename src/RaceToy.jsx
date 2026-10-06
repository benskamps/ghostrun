import { useEffect, useRef, useState } from 'react'
import { track } from '@vercel/analytics'
import Ghost from './Ghost.jsx'

// A 10-second taste of the game: hold to scrub, PB scrubs at its personal-best pace.
const PB_TIME = 7.2 // seconds PB needs for the stack
const YOU_TIME = 6.0 // seconds you need if you never let go
const PLATES = 8

const fmt = (t) => t.toFixed(1).padStart(4, '0')

export default function RaceToy() {
  const [state, setState] = useState('ready') // ready | running | won | lost
  const [you, setYou] = useState(0)
  const [pb, setPb] = useState(0)
  const [time, setTime] = useState(0)
  const holding = useRef(false)
  const [down, setDown] = useState(false)
  const s = useRef({ you: 0, pb: 0, t: 0, last: 0, raf: 0 })

  const stop = () => cancelAnimationFrame(s.current.raf)
  useEffect(() => stop, [])

  const tick = (now) => {
    const st = s.current
    const dt = Math.min(0.05, (now - st.last) / 1000)
    st.last = now
    st.t += dt
    st.pb = Math.min(1, st.pb + dt / PB_TIME)
    if (holding.current) st.you = Math.min(1, st.you + dt / YOU_TIME)
    setYou(st.you); setPb(st.pb); setTime(st.t)
    if (st.you >= 1 || st.pb >= 1) {
      const won = st.you >= 1 && st.you >= st.pb
      setState(won ? 'won' : 'lost')
      st.endedAt = performance.now()
      track('race_toy', { result: won ? 'won' : 'lost' })
      return
    }
    st.raf = requestAnimationFrame(tick)
  }

  const press = () => {
    holding.current = true
    setDown(true)
    if (state === 'ready') {
      s.current = { you: 0, pb: 0, t: 0, last: performance.now(), raf: 0 }
      setState('running')
      s.current.raf = requestAnimationFrame(tick)
    }
  }
  const release = () => { holding.current = false; setDown(false) }
  const reset = () => {
    // Ignore the release of the finger that was still holding when the run ended.
    if (performance.now() - (s.current.endedAt || 0) < 700) return
    stop(); holding.current = false; setDown(false)
    setYou(0); setPb(0); setTime(0); setState('ready')
  }

  const lead = you - pb
  // The opacity is the scoreboard: 60% when PB leads, fading to 40% as you pull ahead.
  const pbOpacity = Math.max(0.4, Math.min(0.6, 0.5 - lead * 0.8))
  const mood = state === 'won' ? 'sulk' : state === 'lost' ? 'taunt' : state === 'ready' ? 'smug' : lead > 0.03 ? 'shocked' : 'smug'
  const clean = Math.floor(you * PLATES)
  const gap = Math.abs((pb - you) * PB_TIME).toFixed(1)

  const caption = {
    ready: 'PB scrubbed this stack in 7.2s. Hold the button to scrub. Let go and you stop.',
    running: lead > 0 ? 'You’re ahead. PB is fading.' : 'PB is ahead. Keep scrubbing.',
    won: `New PB by ${gap}s. PB is sulking. The dishes are done.`,
    lost: `PB wins by ${gap}s. PB is insufferable about it.`,
  }[state]

  return (
    <div className="toy" aria-label="Mini game: race PB to scrub a stack of plates">
      <div className="toy-top">
        <span className="mono toy-label">Dishes% · race PB</span>
        <span className="mono toy-time" aria-live="off">{fmt(time)}s</span>
      </div>

      <div className="toy-stage">
        <div className="sink">
          {Array.from({ length: PLATES }).map((_, i) => (
            <span key={i} className={`plate ${i < clean ? 'clean' : ''}`} />
          ))}
        </div>
        <Ghost size={112} mood={mood} opacity={pbOpacity} float={state !== 'running'} className="toy-ghost" />
      </div>

      <div className="lane" aria-hidden="true">
        <div className="lane-pb" style={{ left: `${pb * 100}%` }} />
        <div className="lane-you" style={{ left: `${you * 100}%` }} />
        <div className="lane-flag" />
      </div>
      <div className="lane-legend mono"><span className="lg-you">you</span><span className="lg-pb">PB</span></div>

      <p className="toy-caption" aria-live="polite">{caption}</p>

      {state === 'ready' || state === 'running' ? (
        <button
          className={`hold ${down ? 'down' : ''}`}
          onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); press() }}
          onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
          onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press() } }}
          onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') release() }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {state === 'ready' ? 'Hold to scrub' : down ? 'Scrubbing… keep holding' : 'Hold to keep scrubbing'}
        </button>
      ) : (
        <button className="hold again" onClick={reset}>Race PB again</button>
      )}
    </div>
  )
}
