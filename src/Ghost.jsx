import { useEffect, useRef, useState } from 'react'

// PB drawn from pixel maps. The body sits at 40–60% opacity (the opacity is the
// scoreboard); the face stays near-solid so PB always reads.
const BODY = [
  '.....######.....',
  '...##########...',
  '..############..',
  '.##############.',
  '.##############.',
  '.##############.',
  '.##############.',
  '.##############.',
  '.##############.',
  '.##############.',
  '.##############.',
]
const HEMS = [
  ['.##.###..###.##.', '.#...##..##...#.'],
  ['.###.##..##.###.', '..#..#....#..#..'],
]
// Face rows overlay the body. Rows 3-5 are eyes (they follow the pointer).
const FACES = {
  idle:    { 4: '....kk....kk....', 5: '....kk....kk....', 6: '..pp........pp..', 7: '.......kk.......' },
  smug:    { 4: '...kkk....kkk...', 5: '....kk....kk....', 6: '..pp........pp..', 7: '......kkkk......' },
  sneaky:  { 4: '....wk....wk....', 5: '....kk....kk....', 6: '..pp........pp..', 7: '........kkk.....' },
  sulk:    { 3: '...kk......kk...', 5: '....kk....kk....', 7: '......kkkk......', 8: '.....k....k.....' },
  shocked: { 3: '...kkk....kkk...', 4: '...kwk....kwk...', 5: '...kkk....kkk...', 7: '.......kk.......', 8: '......k..k......', 9: '.......kk.......' },
  rage:    { 3: '...k........k...', 4: '....kk....kk....', 5: '....kk....kk....', 7: '......kkkk......', 8: '......krrk......' },
  taunt:   { 4: '....wk...kkk....', 5: '....kk..........', 6: '..pp........pp..', 7: '......kkkk......', 8: '.......rr.......', 9: '.......rr.......' },
  respect: { 4: '....kk....kk....', 5: '...k..k..k..k...', 6: '..pp........pp..', 7: '......k..k......', 8: '.......kk.......' },
}
const BLINK = { 4: '................', 5: '....kk....kk....' }
const COLORS = { '#': '#CFC4FF', k: '#1a1430', w: '#ffffff', p: '#ff9ec4', r: '#ff5d7a' }
const EYE_ROWS = new Set([3, 4, 5])

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function Ghost({
  size = 160, opacity = 0.55, mood = 'idle', float = true, follow = true, className = '', label,
}) {
  const ref = useRef(null)
  const [hem, setHem] = useState(0)
  const [look, setLook] = useState([0, 0])
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    if (reduced()) return
    const t = setInterval(() => setHem((h) => 1 - h), 280)
    let bt
    const scheduleBlink = () => {
      bt = setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 130); scheduleBlink() }, 2600 + Math.random() * 3200)
    }
    scheduleBlink()
    return () => { clearInterval(t); clearTimeout(bt) }
  }, [])

  useEffect(() => {
    if (!follow || reduced()) return
    let raf = 0
    const onMove = (e) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height / 2)
        const near = Math.hypot(dx, dy) < r.width * 0.3
        setLook(near ? [0, 0] : [Math.abs(dx) > r.width * 0.4 ? Math.sign(dx) : 0, Math.abs(dy) > r.height * 0.6 ? Math.sign(dy) : 0])
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf) }
  }, [follow])

  const rows = [...BODY, ...HEMS[hem]]
  const face = blink && !['sulk', 'respect'].includes(mood) ? { ...FACES[mood], ...BLINK } : FACES[mood] || FACES.idle
  const body = []
  const glyphs = []
  rows.forEach((row, y) => {
    ;[...row].forEach((c, x) => {
      if (c !== '.') body.push(<rect key={`b${x}-${y}`} x={x} y={y} width="1" height="1" />)
    })
    const f = face[y]
    if (!f) return
    const [lx, ly] = EYE_ROWS.has(y) ? look : [0, 0]
    ;[...f].forEach((c, x) => {
      if (c === '.' || rows[y][x] === '.') return
      glyphs.push(<rect key={`f${x}-${y}`} x={x + lx} y={y + ly} width="1" height="1" fill={COLORS[c]} />)
    })
  })

  return (
    <svg ref={ref} className={`ghost ${float ? 'float' : ''} ${className}`} width={size} height={(size * 13) / 16}
      viewBox="-1 -1 18 15" shapeRendering="crispEdges" role="img" aria-label={label || `PB the ghost, looking ${mood}`}>
      <g className="ghost-glow" fill="#CFC4FF" opacity={opacity * 0.9}>{body}</g>
      <g className="ghost-body" fill="#CFC4FF" opacity={opacity}>{body}</g>
      <g className="ghost-face" opacity="0.92">{glyphs}</g>
    </svg>
  )
}
