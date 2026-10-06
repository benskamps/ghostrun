// PB, drawn from pixel maps. '#' body, 'k' eye/mouth, 'w' eye shine, 'p' blush, 'r' tongue/anger.
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
  '.##.###..###.##.',
  '.#...##..##...#.',
]
// Face rows overlay the body, keyed by row index; '.' leaves body showing.
const FACES = {
  idle:    { 4: '....kk....kk....', 5: '....kk....kk....', 6: '..pp........pp..', 7: '.......kk.......' },
  smug:    { 4: '...kkk....kkk...', 5: '....kk....kk....', 6: '..pp........pp..', 7: '......kkkk......' },
  sneaky:  { 4: '....wk....wk....', 5: '....kk....kk....', 7: '........kkk.....' },
  sulk:    { 3: '...kk......kk...', 5: '....kk....kk....', 7: '......kkkk......', 8: '.....k....k.....' },
  shocked: { 3: '...kkk....kkk...', 4: '...kwk....kwk...', 5: '...kkk....kkk...', 7: '.......kk.......', 8: '......k..k......', 9: '.......kk.......' },
  rage:    { 3: '...k........k...', 4: '....kk....kk....', 5: '....kk....kk....', 7: '......kkkk......', 8: '......krrk......' },
  taunt:   { 4: '....wk...kkk....', 5: '....kk..........', 7: '......kkkk......', 8: '.......rr.......', 9: '.......rr.......' },
  respect: { 4: '....kk....kk....', 5: '...k..k..k..k...', 6: '..pp........pp..', 7: '......k..k......', 8: '.......kk.......' },
}
const COLORS = { '#': '#CFC4FF', k: '#1a1430', w: '#ffffff', p: '#ff9ec4', r: '#ff5d7a' }
const FACE_ROW_OFFSET = 0

export default function Ghost({ size = 160, opacity = 0.6, mood = 'idle', float = true, className = '', label }) {
  const face = FACES[mood] || FACES.idle
  const cells = []
  BODY.forEach((row, y) => {
    const f = face[y - FACE_ROW_OFFSET]
    ;[...row].forEach((c, x) => {
      if (c === '.') return
      const fc = f && f[x] && f[x] !== '.' ? f[x] : '#'
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={COLORS[fc]} />)
    })
  })
  return (
    <svg className={`ghost ${float ? 'float' : ''} ${className}`} width={size} height={(size * 13) / 16}
      viewBox="0 0 16 13" shapeRendering="crispEdges" style={{ opacity }}
      role="img" aria-label={label || `PB the ghost, looking ${mood}`}>
      {cells}
    </svg>
  )
}
