import { useEffect, useRef, useState } from 'react'
import Ghost from './Ghost.jsx'

// A replay of a real-feeling Kitchen reset, played at 12x speed with a live timer.
const SPLITS = [
  { name: 'Clear counters', pb: 62, you: 55 },
  { name: 'Dishes', pb: 241, you: 200 },
  { name: 'Wipe down', pb: 48, you: 51 },
  { name: 'Floor', pb: 95, you: 81 },
]
const SPEED = 12
const HOLD = 3.5 // seconds to linger on the result
const PB_TOTAL = SPLITS.reduce((a, s) => a + s.pb, 0)
const YOU_TOTAL = SPLITS.reduce((a, s) => a + s.you, 0)
const clock = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`

export default function DemoRun() {
  const [t, setT] = useState(0) // run seconds
  const ref = useRef(null)
  const visible = useRef(false)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setT(YOU_TOTAL); return }
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting }, { threshold: 0.3 })
    if (ref.current) io.observe(ref.current)
    let wall = 0
    const id = setInterval(() => {
      if (!visible.current) return
      wall += 0.1
      const runT = wall * SPEED
      if (runT > YOU_TOTAL + HOLD * SPEED) wall = 0
      setT(Math.min(YOU_TOTAL, runT))
    }, 100)
    return () => { clearInterval(id); io.disconnect() }
  }, [])

  // Where are you and PB at time t?
  let acc = 0, accPb = 0, live = SPLITS.length, delta = 0
  const rows = SPLITS.map((s, i) => {
    const start = acc
    acc += s.you
    accPb += s.pb
    const done = t >= acc
    if (!done && live === SPLITS.length) live = i
    if (done) delta = acc - accPb
    return { ...s, done, start, d: s.you - s.pb }
  })
  const finished = t >= YOU_TOTAL
  // Fraction of the route complete for you vs PB at the same moment.
  const youFrac = (() => {
    let a = 0
    for (const s of SPLITS) { if (t < a + s.you) return (SPLITS.indexOf(s) + (t - a) / s.you) / SPLITS.length; a += s.you }
    return 1
  })()
  const pbFrac = (() => {
    let a = 0
    for (const s of SPLITS) { if (t < a + s.pb) return (SPLITS.indexOf(s) + (t - a) / s.pb) / SPLITS.length; a += s.pb }
    return 1
  })()
  const lead = youFrac - pbFrac
  const mood = finished ? 'sulk' : lead > 0.02 ? 'shocked' : 'smug'
  const op = finished ? 0.4 : Math.max(0.4, Math.min(0.6, 0.5 - lead * 2))

  return (
    <div className="run" ref={ref} aria-label="Replay: a kitchen reset run against PB">
      <div className="run-ghost"><Ghost size={64} mood={mood} opacity={op} float={false} follow={false} /></div>
      <div className="run-head">
        <span>Kitchen reset <span className="mono run-cat">Chore% · 100%</span></span>
        <span className={`mono run-clock ${lead > 0 ? 'ahead' : ''}`}>{clock(t)}</span>
      </div>
      <div className="track" aria-hidden="true">
        <div className="track-pb" style={{ left: `${pbFrac * 100}%` }} />
        <div className="track-you" style={{ left: `${youFrac * 100}%` }} />
      </div>
      {rows.map((s, i) => (
        <div key={s.name} className={`split ${s.done ? 'done' : ''} ${i === live ? 'live' : ''} ${s.done && s.d < 0 ? 'won' : ''}`}>
          <span>{s.name}</span>
          <span className={`mono ${s.done ? (s.d < 0 ? 'gold' : 'behind') : ''}`}>
            {s.done ? `${s.d > 0 ? '+' : '−'}${Math.abs(s.d)}s` : clock(s.pb)}
          </span>
        </div>
      ))}
      <div className="run-foot mono" aria-live="off">
        {finished ? `New PB by ${PB_TOTAL - YOU_TOTAL}s. PB is sulking.` : lead > 0 ? 'You’re ahead. PB is fading.' : 'PB is ahead. For now.'}
      </div>
    </div>
  )
}
