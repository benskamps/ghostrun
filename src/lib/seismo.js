// Seismograph: a run's motion trace drawn per split, your trace in ember over PB's in lilac.
// Every card is unique, and a couch-shake fake looks visibly wrong (a flat wall of spikes).
import { PBSprite } from './pb-sprite.js'
import { TRACE_MS } from './proof.js'
import { clock, delta } from './race.js'

const COL = { void: '#100D17', panel: '#18131f', line: '#2b2340', ghost: '#CFC4FF', ember: '#FFAE42', gold: '#FFD25E', text: '#EDE9FF', muted: '#B0A9C8', faint: '#7D7699' }

/** Slice a trace into one array per split, using cumulative split times. */
export function sliceTrace(trace = [], splits = []) {
  return splits.map((c, i) => {
    const a = Math.floor((i ? splits[i - 1] : 0) / TRACE_MS), b = Math.max(a + 1, Math.ceil(c / TRACE_MS))
    return trace.slice(a, b)
  })
}

/** Resample to n points by taking the peak in each bucket (peaks are what a seismograph shows). */
export function resample(arr, n) {
  if (n <= 0) return []
  if (!arr.length) return Array(n).fill(0)
  return Array.from({ length: n }, (_, i) => {
    const a = Math.floor((i * arr.length) / n), b = Math.max(a + 1, Math.floor(((i + 1) * arr.length) / n))
    let m = 0
    for (let j = a; j < b && j < arr.length; j++) m = Math.max(m, arr[j])
    return m
  })
}

// Peaks are x10 m/s^2. A soft log scale keeps scrubbing visible next to big knocks.
const amp = (v) => Math.min(1, Math.log1p(v / 10) / Math.log1p(20))

/**
 * Draw the band. Each split gets width in proportion to your time on it, and PB's trace for
 * the same step is stretched to fit, so the two line up step for step.
 */
export function drawBand(ctx, x, y, w, h, { trace, splits, golds = [], ghostTrace, ghostSplits, steps = [], labels = true, scale = 1 }) {
  const total = splits.at(-1) || 1
  const mine = sliceTrace(trace, splits)
  const theirs = ghostTrace && ghostSplits?.length === splits.length ? sliceTrace(ghostTrace, ghostSplits) : null
  const mid = y + h / 2
  let cx = x
  const gap = 4 * scale
  splits.forEach((c, i) => {
    const segW = Math.max(14 * scale, (w - gap * (splits.length - 1)) * ((c - (i ? splits[i - 1] : 0)) / total))
    const bars = Math.max(2, Math.floor(segW / (3 * scale)))
    const bw = segW / bars
    if (golds[i]) { ctx.fillStyle = 'rgba(255,210,94,.10)'; ctx.fillRect(cx, y, segW, h) }
    const draw = (vals, color, alpha) => {
      ctx.globalAlpha = alpha; ctx.fillStyle = color
      resample(vals, bars).forEach((v, j) => {
        const hh = Math.max(1.5 * scale, amp(v) * (h / 2 - 2 * scale))
        ctx.fillRect(Math.round(cx + j * bw), Math.round(mid - hh), Math.max(1, Math.floor(bw - scale)), Math.round(hh * 2))
      })
      ctx.globalAlpha = 1
    }
    if (theirs) draw(theirs[i], COL.ghost, 0.35)
    draw(mine[i], golds[i] ? COL.gold : COL.ember, 0.95)
    if (labels && steps[i]) {
      ctx.fillStyle = golds[i] ? COL.gold : COL.faint
      ctx.font = `${11 * scale}px "Martian Mono", ui-monospace, monospace`
      ctx.textBaseline = 'top'
      let label = steps[i]
      while (label.length > 1 && ctx.measureText(label).width > segW - 6 * scale) label = label.slice(0, -2) + '…'
      ctx.fillText(label, cx, y + h + 8 * scale)
    }
    cx += segW + gap
  })
  ctx.strokeStyle = COL.line; ctx.lineWidth = scale
  ctx.beginPath(); ctx.moveTo(x, mid); ctx.lineTo(x + w, mid); ctx.stroke()
}

/** The share card: 1080x1350, made on the phone, never uploaded anywhere. */
export async function drawCard(canvas, run) {
  const W = 1080, H = 1350, s = 2.4
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  try {
    await Promise.all(['700 64px "Pixelify Sans"', '400 40px "Martian Mono"', '600 40px "Geist"'].map((f) => document.fonts?.load(f)))
  } catch { /* system fonts are fine */ }

  ctx.fillStyle = COL.void; ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W * 0.75, 240, 10, W * 0.75, 240, 520)
  glow.addColorStop(0, 'rgba(207,196,255,.18)'); glow.addColorStop(1, 'rgba(207,196,255,0)')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = COL.ember; ctx.font = '400 26px "Martian Mono", monospace'
  ctx.fillText(`CHORE%${run.hex ? ' · ' + run.hex.toUpperCase() : ''}`, 72, 110)
  ctx.fillStyle = COL.text; ctx.font = '700 76px "Pixelify Sans", system-ui'
  wrap(ctx, run.route, 72, 196, 620, 80)

  // PB, at the opacity the race left it at
  const pbScale = 11
  PBSprite.drawFrame(ctx, run.mood || 'smug', 0, pbScale, W - 72 - 28 * pbScale, 40, run.alpha ?? 0.5)

  ctx.fillStyle = COL.ember; ctx.font = '400 128px "Martian Mono", monospace'
  ctx.fillText(clock(run.total), 72, 470)
  ctx.font = '600 40px "Geist", system-ui'
  ctx.fillStyle = run.gap == null ? COL.ghost : run.gap < 0 ? COL.gold : COL.ghost
  ctx.fillText(run.head, 72, 540)

  drawBand(ctx, 72, 640, W - 144, 360, { ...run, scale: s })

  if (run.dread) { ctx.fillStyle = COL.muted; ctx.font = '400 30px "Geist", system-ui'; ctx.fillText(run.dread, 72, 1110) }
  ctx.font = '400 40px system-ui'; ctx.fillStyle = COL.text
  ctx.fillText(run.squares || '', 72, 1180)
  ctx.fillStyle = COL.faint; ctx.font = '400 24px "Martian Mono", monospace'
  ctx.fillText(`${run.verified ? 'verified by motion' : 'any% · time only'}${run.gap != null ? ' · ' + delta(run.gap) : ''}`, 72, 1236)
  ctx.fillText('ghostrun-ten.vercel.app · a brokenbranch production', 72, 1284)
  return canvas
}

function wrap(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(' ')
  let line = '', lines = 0
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y + lines * lh); line = w; lines++ } else line = test
    if (lines >= 1 && ctx.measureText(line).width > maxW) break
  }
  ctx.fillText(line, x, y + lines * lh)
}
