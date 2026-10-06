// One place for the studio lockup, so the spelling changes in one line.
export const BRAND = 'broken branch'
export const BRAND_URL = 'https://brokenbranch.dev'

export default function Brand({ size = 16, className = '' }) {
  return (
    <span className={`brand-lockup ${className}`} style={{ fontSize: size }}>
      <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
        <path fill="#FFAE42" d="M1 7h1V5h1V4h1V3h1V2h1V1h1v1H6v1H5v1H4v1H3v1h3v1H1z" />
      </svg>
      {BRAND}
    </span>
  )
}
