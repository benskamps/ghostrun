import { useEffect, useRef, useState } from 'react'
import { track } from '@vercel/analytics'
import PB from './PB.jsx'
import Replay from './Replay.jsx'
import { biggestTimesave } from '../lib/insights.js'
import { routeStats, todaysHex } from './model.js'
import { clock, delta, segs } from '../lib/race.js'
import { PROOF_COPY } from '../lib/proof.js'
import { shareLine, HEXES } from '../lib/run-extras.js'
import { ghostUrl } from '../lib/ghost-link.js'
import { drawBand, drawCard } from '../lib/seismo.js'
import { shrink, checkPhoto, checksLeft, proofReady, PHOTO_COPY, PHOTO_LIMITS } from '../lib/photo-proof.js'
import { getMeta, setMeta } from '../lib/store.js'
import { GEO_COPY } from '../lib/geo.js'
import { kindOf } from '../lib/routes.js'
import { ADMIN_COPY } from '../lib/admin-proof.js'
import { todayKey } from './model.js'
import HauntMe from './HauntMe.jsx'

const ALPHA = { win: 0.4, tie: 0.5, recorded: 0.5, 'pb-wins': 0.6 }

export default function Done({ route, runs, run, view, prefs, onPrefs, onRunUpdate, onAgain, onHome }) {
  const { result, golds, proof, opponent, gap, dread } = view
  const kind = kindOf(route)
  const errand = kind === 'errand', admin = kind === 'admin'
  const chore = kind === 'chore'
  const allLabel = errand ? 'errands' : admin ? 'quests' : 'chores'
  const stats = routeStats(route, runs)
  const ghost = opponent?.splits || null
  const hex = run.hex ? HEXES.find((h) => h.id === run.hex) : null
  const mine = segs(run.splits)
  const priorBest = view.priorBest
  const tip = stats.pb && stats.runs.length >= 2 ? biggestTimesave(route.steps, stats.pb.splits, stats.best) : null
  const [status, setStatus] = useState('')
  const [name, setName] = useState(prefs.name || '')
  const band = useRef(null)
  const [photo, setPhoto] = useState(run.hundred ? { verdict: 'done', seen: run.photoSeen || '' } : null)

  const squares = shareLine(run, ghost ? { splits: ghost, goldSegs: priorBest } : null, hex).split(' ').find((w) => /[🟨🟩⬛]/u.test(w)) || ''
  const send = opponent?.id === 'rival' ? run : stats.pb || run

  useEffect(() => {
    const cv = band.current
    if (!cv) return
    const draw = () => {
      const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = 120
      cv.width = w * dpr; cv.height = (h + 28) * dpr
      const ctx = cv.getContext('2d')
      ctx.scale(dpr, dpr)
      drawBand(ctx, 0, 0, w, h, { trace: run.trace, splits: run.splits, golds, ghostTrace: opponent?.trace, ghostSplits: ghost, steps: run.steps })
    }
    draw()
    addEventListener('resize', draw)
    return () => removeEventListener('resize', draw)
  }, [run, golds, opponent, ghost])

  const note = (msg) => { setStatus(msg); setTimeout(() => setStatus(''), 2600) }

  const share = async (text, url) => {
    try {
      if (navigator.share) { await navigator.share({ text, url }); return 'shared' }
      await navigator.clipboard.writeText(url ? `${text} ${url}` : text)
      note('Copied. Paste it anywhere.')
      return 'copied'
    } catch { return 'cancelled' }
  }

  const shareResult = async () => {
    const r = await share(shareLine(run, ghost ? { splits: ghost, goldSegs: priorBest } : null, hex))
    track('share', { what: 'line', how: r })
  }

  const sendGhost = async () => {
    if (name !== prefs.name) onPrefs({ name: name.trim().slice(0, 24) })
    const url = ghostUrl(location.origin, { route: route.name, steps: send.steps, splits: send.splits, by: name.trim().slice(0, 24) })
    const text = opponent?.id === 'rival' ? `Your ghost, raced: ${clock(run.splits.at(-1))}. Race mine back on Ghostrun:` : `Race my ghost on Ghostrun. ${route.name} in ${clock(send.splits.at(-1))}. Beat it:`
    const r = await share(text, url)
    track('share', { what: 'ghost', how: r })
  }

  const shareCard = async () => {
    const canvas = document.createElement('canvas')
    await drawCard(canvas, {
      route: route.name, hex: hex?.name, mood: result.mood, alpha: ALPHA[result.result],
      total: run.splits.at(-1), head: result.head, gap, verified: run.verified, kind, hundred: photo?.verdict === 'done',
      trace: run.trace, splits: run.splits, golds, ghostTrace: opponent?.trace, ghostSplits: ghost, steps: run.steps,
      dread: dread?.line, squares,
    })
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
    if (!blob) return note('Couldn’t draw the card on this browser.')
    const file = new File([blob], `ghostrun-${route.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`, { type: 'image/png' })
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); track('share', { what: 'card', how: 'shared' }); return }
    } catch { return }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = file.name
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    track('share', { what: 'card', how: 'download' })
  }

  const [tries, setTries] = useState(0)
  const [left, setLeft] = useState(PHOTO_LIMITS.perDay)
  const [ready, setReady] = useState(run.hundred ? true : null)
  useEffect(() => { getMeta('photoTally').then((t) => setLeft(checksLeft(t, todayKey()))) }, [])
  useEffect(() => { if (!run.hundred && chore) proofReady().then(setReady) }, [run.hundred, chore])

  const goHundred = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const day = todayKey()
    const tally = await getMeta('photoTally')
    if (!checksLeft(tally, day)) { setLeft(0); setPhoto({ verdict: 'spent', seen: '' }); return }
    const used = (tally?.day === day ? tally.used : 0) + 1
    await setMeta('photoTally', { day, used })
    setLeft(checksLeft({ day, used }, day))
    setTries((n) => n + 1)
    setPhoto({ verdict: 'checking' })
    let blob
    try { blob = await shrink(file) } catch { setPhoto({ verdict: 'unclear', seen: '' }); return }
    const v = await checkPhoto(blob, { route: route.name, steps: run.steps })
    blob = null // the photo goes nowhere else
    setPhoto(v)
    track('photo_proof', { verdict: v.verdict })
    if (v.verdict === 'done') onRunUpdate({ ...run, hundred: true, verified: true, photoSeen: v.seen })
  }

  const today = todaysHex()

  return (
    <>
      <header className="bar">
        <button className="back" onClick={onHome} aria-label={`Back to all ${allLabel}`}>←</button>
        <span className="bar-title">{route.name}</span>
        {hex && <span className="hex-badge mono">{hex.name}</span>}
      </header>

      <section className={`result result-${result.result}`}>
        <PB mood={result.mood} alpha={ALPHA[result.result]} scale={8} trail={result.result === 'win'} stitched={opponent?.stitched} />
        <p className="final mono">{clock(run.splits.at(-1))}</p>
        <h1 className="h-display">{result.head}</h1>
        <p className="caster">{result.line}</p>
        {photo?.verdict === 'done'
          ? <p className="proof ok">Photo checked. This one counts as a 100% run.</p>
          : <p className={`proof ${proof.verified ? 'ok' : 'any'}`}>{(errand ? GEO_COPY : admin ? ADMIN_COPY : PROOF_COPY)[proof.reason]}</p>}
        {admin && run.away > 5000 && <p className="faint small mono">{clock(run.away).replace(/\.\d$/, '')} of it on the official site</p>}
      </section>

      {chore && ready === false && (
        <section className="card hundred locked">
          <p className="mono eyebrow">100% run <span className="faint">coming soon</span></p>
          <p className="hundred-head">{PHOTO_COPY.soon.head}</p>
          <p className="muted small">{PHOTO_COPY.soon.line}</p>
        </section>
      )}
      {chore && ready && <section className={`card hundred ${photo?.verdict === 'done' ? 'won' : ''}`}>
        <p className="mono eyebrow">100% run <span className="faint">photo proof</span></p>
        {!photo && left > 0 && <p className="muted small">Snap the finished chore. PB checks it once and the photo isn’t kept anywhere. <span className="faint">{left} left today.</span></p>}
        {!photo && left === 0 && <p className="muted small">{PHOTO_COPY.spent.line}</p>}
        {photo?.verdict === 'checking' && <p className="mono checking">PB is inspecting<span className="dots" aria-hidden="true">…</span></p>}
        {photo && PHOTO_COPY[photo.verdict] && (
          <div role="status">
            <p className="hundred-head">{PHOTO_COPY[photo.verdict].head}</p>
            <p className="muted small">{PHOTO_COPY[photo.verdict].line}</p>
            {photo.seen && <p className="faint small mono">PB saw: {photo.seen}</p>}
          </div>
        )}
        {photo?.verdict !== 'done' && photo?.verdict !== 'checking' && left > 0 && tries < PHOTO_LIMITS.perRun && photo?.verdict !== 'spent' && (
          <label className="chip-btn snap">
            {photo ? 'Snap it again' : 'Go for 100%'}
            <input type="file" accept="image/*" capture="environment" onChange={goHundred} />
          </label>
        )}
      </section>}

      {ghost && <Replay splits={run.splits} ghost={ghost} steps={run.steps} name={opponent.name} />}

      {dread && (
        <section className="card dread">
          <p className="mono eyebrow">Dread check</p>
          <p className="dread-line">You guessed <s className="mono">{clock(run.guessMs).replace(/\.\d$/, '')}</s>. It took <strong className="mono">{clock(run.splits.at(-1)).replace(/\.\d$/, '')}</strong>.</p>
          {dread.dreadMs > 30000 && <p className="muted small">That’s {Math.round(dread.dreadMs / 60000) || '<1'} min of dread you don’t have to pay next time.</p>}
          {dread.overran && <p className="muted small">PB hid things along the way. Next guess will be sharper.</p>}
        </section>
      )}

      <section className="card">
        <p className="mono eyebrow">Splits</p>
        <ol className="result-splits">
          {run.steps.map((s, i) => (
            <li key={i} className={golds[i] ? 'gold' : ''}>
              <span>{s}</span>
              <span className="mono">{clock(mine[i])}</span>
              <span className={`mono ${ghost ? (run.splits[i] - ghost[i] > 0 ? 'behind' : 'ahead') : 'faint'}`}>
                {ghost ? delta(run.splits[i] - ghost[i]) : '—'}{golds[i] && ' ★'}
              </span>
            </li>
          ))}
        </ol>
        {stats.sumOfBest != null && stats.runs.length >= 2 && (
          <p className="sob mono">Sum of best <strong>{clock(stats.sumOfBest)}</strong>
            {stats.franken && <span className="faint"> · Frankenghost is awake</span>}</p>
        )}
        {tip && (
          <p className="timesave small">PB’s weak spot: <strong>{tip.step}</strong>. Your best {tip.step} beats your PB’s by <span className="mono ember">{clock(tip.ms)}</span>.
            {tip.total > tip.ms && <span className="faint"> Best possible run <span className="mono">{clock(tip.bestPossible)}</span>.</span>}</p>
        )}
      </section>

      {chore && <section className="card seismo">
        <p className="mono eyebrow">Seismograph <span className="faint">{opponent?.trace ? 'you in amber, PB in lilac' : 'your run’s motion'}</span></p>
        <canvas ref={band} className="band" aria-label="Motion trace of this run, one block per step" />
        {run.proof === 'shake' && <p className="muted small">See the wall of spikes? That’s a shake, not a chore.</p>}
      </section>}

      <HauntMe route={route} runs={stats.runs} />

      <section className="share">
        {chore && <>
        <button className="big-btn" onClick={sendGhost}>{opponent?.id === 'rival' ? 'Send your ghost back' : 'Send your ghost to a friend'}</button>
        <label className="sign small">
          <span className="muted">Sign it (optional)</span>
          <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="nickname" />
        </label>
        </>}
        <div className="row">
          <button className="chip-btn" onClick={shareCard}>{chore ? 'Seismograph card' : 'Share card'}</button>
          <button className="chip-btn" onClick={shareResult}>Copy result</button>
        </div>
        <p className="faint small" role="status">{status}</p>
      </section>

      <div className="row end-row">
        <button className="big-btn alt" onClick={onAgain}>{result.result === 'recorded' ? 'Race it now' : 'Race again'}</button>
        <button className="chip-btn" onClick={onHome}>{`All ${allLabel}`}</button>
      </div>
      {result.result === 'recorded' && <p className="faint small center">Or come back tomorrow. Today’s haunt is {today.name}.</p>}
    </>
  )
}
