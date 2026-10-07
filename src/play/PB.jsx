import { useEffect, useRef } from 'react'
import { PBSprite } from '../lib/pb-sprite.js'

// Frankenghost: PB with a seam of ember stitches down the middle, built from your best steps.
function stitches(ctx, s, t) {
  const bob = PBSprite.reduce ? 0 : Math.round(Math.sin(t / 650) * 0.9 * s)
  ctx.globalAlpha = 0.85
  ctx.fillStyle = '#FFAE42'
  for (let y = 8; y <= 19; y += 2) {
    ctx.fillRect(13 * s, y * s + bob, 3 * s, Math.max(1, s / 2))
    ctx.fillRect(14 * s + s / 4, (y - 0.5) * s + bob, Math.max(1, s / 2), 2 * s)
  }
  ctx.globalAlpha = 1
}

// PB from the kit's sprite engine. alpha is the scoreboard (0.4 you lead .. 0.6 PB leads);
// it eases toward the target so the fade reads as PB losing heart, not flickering.
export default function PB({ mood = 'smug', alpha = 0.5, scale = 6, trail = false, stitched = false, className = '', label }) {
  const ref = useRef(null)
  const target = useRef(alpha)
  const props = useRef({ mood, trail, stitched })
  target.current = alpha
  props.current = { mood, trail, stitched }

  useEffect(() => {
    const cv = ref.current
    let raf = 0, a = target.current, last = performance.now()
    const tick = (t) => {
      const dt = Math.min(100, t - last); last = t
      a += (target.current - a) * Math.min(1, dt / 400)
      PBSprite.draw(cv, props.current.mood, t, { alpha: a, trail: props.current.trail, scale })
      if (props.current.stitched) stitches(cv.getContext('2d'), scale, t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick) } }
    document.addEventListener('visibilitychange', vis)
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', vis) }
  }, [scale])

  return (
    <canvas
      ref={ref}
      className={`pb-sprite ${stitched ? 'stitched' : ''} ${className}`}
      width={PBSprite.GW * scale}
      height={PBSprite.GH * scale}
      role="img"
      aria-label={label || `PB, looking ${mood}`}
    />
  )
}
