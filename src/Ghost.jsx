import { useEffect, useRef, useState } from 'react'
import { PBSprite } from './lib/pb-sprite.js'

// The kit's PB, drawn with the shared sprite engine on a crisp canvas.
// opacity is the body (40–60%, the scoreboard); the engine keeps the face readable.
// The site's older mood names map onto the kit's 11 moods.
const MOOD = { idle: 'sleepy' }
const { GW, GH } = PBSprite

export default function Ghost({
  size = 160, opacity = 0.55, mood = 'idle', float = true, follow = true, trail = false, className = '', label,
}) {
  const ref = useRef(null)
  const target = useRef(opacity)
  const kitMood = useRef(MOOD[mood] || mood)
  const opts = useRef({ trail })
  target.current = opacity
  kitMood.current = MOOD[mood] || mood
  opts.current = { trail }
  const [lean, setLean] = useState([0, 0])

  // Integer pixel scale so PB never blurs; size is roughly the old body width.
  const s = Math.max(2, Math.round((size * 0.9) / 20))

  useEffect(() => {
    const cv = ref.current
    const dpr = Math.min(3, Math.round(window.devicePixelRatio || 1))
    let raf = 0, a = target.current, last = performance.now(), visible = false
    const frame = (t) => {
      const dt = Math.min(100, t - last); last = t
      a += (target.current - a) * Math.min(1, dt / 400) // ease, so a fade reads as PB losing heart
      PBSprite.draw(cv, kitMood.current, t, { alpha: a, trail: opts.current.trail, scale: s * dpr })
    }
    const tick = (t) => { frame(t); raf = requestAnimationFrame(tick) }
    const run = () => {
      cancelAnimationFrame(raf)
      if (visible && !document.hidden && !PBSprite.reduce) { last = performance.now(); raf = requestAnimationFrame(tick) }
      else frame(performance.now())
    }
    // Only animate on screen: the page has a dozen PBs.
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; run() }, { rootMargin: '80px' })
    io.observe(cv)
    document.addEventListener('visibilitychange', run)
    frame(performance.now())
    return () => { cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', run) }
  }, [s])

  // Reduced motion draws one still frame, so redraw when the mood or score changes.
  useEffect(() => {
    if (PBSprite.reduce && ref.current) PBSprite.draw(ref.current, kitMood.current, 0, { alpha: opacity, scale: s * Math.min(3, Math.round(window.devicePixelRatio || 1)) })
  }, [mood, opacity, s])

  // PB leans toward the pointer.
  useEffect(() => {
    if (!follow || PBSprite.reduce) return
    let raf = 0
    const onMove = (e) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
        if (Math.hypot(dx, dy) > 900) return setLean([0, 0])
        setLean([Math.max(-1, Math.min(1, dx / 300)), Math.max(-1, Math.min(1, dy / 300))])
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf) }
  }, [follow])

  return (
    <canvas
      ref={ref}
      className={`ghost ${float ? 'float' : ''} ${className}`}
      style={{ width: GW * s, height: GH * s, '--lx': lean[0], '--ly': lean[1] }}
      role="img"
      aria-label={label || `PB the ghost, looking ${mood}`}
    />
  )
}
