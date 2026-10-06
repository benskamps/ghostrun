// PB, drawn from a pixel map. '#' body, 'k' eye, 'p' blush.
const MAP = [
  '.....######.....',
  '...##########...',
  '..############..',
  '.##############.',
  '.###kk####kk###.',
  '.###kk####kk###.',
  '.#pp########pp#.',
  '.######kk######.',
  '.##############.',
  '.##############.',
  '.##############.',
  '.##.###..###.##.',
  '.#...##..##...#.',
]
const COLORS = { '#': '#CFC4FF', k: '#1a1430', p: '#ff9ec4' }

export default function Ghost({ size = 160, opacity = 0.55 }) {
  const cells = []
  MAP.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== '.') cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={COLORS[c]} />)
    })
  )
  return (
    <svg className="ghost" width={size} height={(size * 13) / 16} viewBox="0 0 16 13"
      shapeRendering="crispEdges" style={{ opacity }} role="img" aria-label="PB, the ghost">
      {cells}
    </svg>
  )
}
