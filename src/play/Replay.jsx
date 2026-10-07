import { useEffect, useRef, useState } from 'react'
import PB from './PB.jsx'
import { clock, delta, liveGap, pbAlpha, liveMood, progressAt } from '../lib/race.js'
import { leadChanges } from '../lib/insights.js'

// The race you just ran, replayed in a few seconds: PB in lilac, you in ember, same track as the HUD.
// Plays once when the Done screen opens (unless the phone asks for reduced motion), then on tap.

const reduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Replay({ splits, ghost, steps, name = 'PB' }) {
  const end = Math.max(splits.at(-1), ghost.at(-1))
  const dur = Math.min(8000, Math.max(4000, steps.length * 1200))
  const [t, setT] = useState(() => (reduce() ? end : 0))
  const [playing, setPlaying] = useState(false)
  const raf = useRef(0)

  const play = () => {
    cancelAnimationFrame(raf.current)
    const t0 = performance.now()
    setPlaying(true)
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur)
      // Ease out so the finish lands like a finish, not a stop.
      setT(end * (1 - (1 - k) ** 2))
      if (k < 1) raf.current = requestAnimationFrame(tick)
      else setPlaying(false)
    }
    raf.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    if (!reduce()) { const id = setTimeout(play, 700); return () => { clearTimeout(id); cancelAnimationFrame(raf.current) } }
    return () => cancelAnimationFrame(raf.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mineSoFar = splits.filter((s) => s <= t)
  const gap = liveGap(mineSoFar, Math.min(t, splits.at(-1)), ghost)
  const you = progressAt(splits, t), pb = progressAt(ghost, t)
  const swaps = leadChanges(splits, ghost)
  const pbWon = splits.at(-1) > ghost.at(-1)
  const k = Math.min(mineSoFar.length, steps.length - 1)

  return (
    <section className="card replay">
      <p className="mono eyebrow">Replay <span className="faint">{name} in lilac, you in ember</span></p>
      <div className="rp-head">
        <span className="mono rp-clock">{clock(t)}</span>
        {gap != null && <span className={`mono rp-gap ${gap > 0 ? 'behind' : 'ahead'}`}>{delta(gap)}</span>}
      </div>
      <div className="rp-track" aria-hidden="true">
        {steps.slice(0, -1).map((_, i) => <span key={i} className="rp-tick" style={{ left: `${((i + 1) / steps.length) * 100}%` }} />)}
        <div className="rp-pb" style={{ left: `${pb * 100}%` }}>
          <PB mood={t >= end ? (pbWon ? 'smug' : 'sulk') : liveMood(gap)} alpha={pbAlpha(gap)} scale={2} label={`${name}'s ghost`} />
        </div>
        <div className="rp-you" style={{ left: `${you * 100}%` }} />
      </div>
      <p className="muted small rp-step" aria-live="off">{t >= end ? 'Finish.' : steps[k]}</p>
      <div className="row rp-foot">
        <span className="faint small">{swaps ? `Lead changed hands ${swaps} time${swaps > 1 ? 's' : ''}.` : pbWon ? `${name} led wire to wire.` : 'You led wire to wire.'}</span>
        <button className="chip-btn" onClick={play} disabled={playing}>{playing ? 'Playing…' : 'Watch again'}</button>
      </div>
    </section>
  )
}
