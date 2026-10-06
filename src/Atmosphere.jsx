import { useEffect, useRef } from 'react'

// One small canvas of drifting dust motes. Pauses when the tab is hidden; off under reduced motion.
export default function Atmosphere() {
  const ref = useRef(null)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const c = ref.current
    const ctx = c.getContext('2d')
    let w, h, raf
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => { w = c.width = innerWidth * dpr; h = c.height = innerHeight * dpr }
    resize()
    addEventListener('resize', resize)
    const motes = Array.from({ length: 36 }, () => ({
      x: Math.random(), y: Math.random(), s: 1 + Math.random() * 2, v: 0.00004 + Math.random() * 0.00012, p: Math.random() * 6.28,
    }))
    const draw = (now) => {
      ctx.clearRect(0, 0, w, h)
      for (const m of motes) {
        m.y -= m.v * 16; if (m.y < -0.02) { m.y = 1.02; m.x = Math.random() }
        const x = (m.x + Math.sin(now / 3000 + m.p) * 0.01) * w
        const a = 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(now / 1400 + m.p))
        ctx.fillStyle = `rgba(207,196,255,${a})`
        const s = Math.round(m.s * dpr)
        ctx.fillRect(Math.round(x), Math.round(m.y * h), s, s)
      }
      raf = requestAnimationFrame(draw)
    }
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(draw) }
    document.addEventListener('visibilitychange', vis)
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', vis) }
  }, [])
  return (
    <div className="atmo" aria-hidden="true">
      <div className="fog" />
      <canvas ref={ref} className="motes" />
      <div className="grain" />
    </div>
  )
}
