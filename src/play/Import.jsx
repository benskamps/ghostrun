import PB from './PB.jsx'
import { clock } from '../lib/race.js'

// Someone texted a ghost link. Everything came from the URL hash, nothing touched a server.
export default function Import({ ghost, onAccept, onSkip }) {
  const who = ghost.by || 'Someone'
  return (
    <>
      <header className="bar">
        <a className="bar-brand" href="/">Ghostrun</a>
        <span />
      </header>
      <section className="ready-hero">
        <PB mood="taunt" scale={8} trail alpha={0.6} />
      </section>
      <div className="ready-head center">
        <p className="eyebrow mono">A ghost found you</p>
        <h1 className="h-display">{who} challenges you to <span className="ember">{ghost.route}</span>.</h1>
        <p className="final mono">{clock(ghost.splits.at(-1))}</p>
        <p className="muted">Do the same chore in your place and race their ghost step by step. Their time lives in the link; nothing is uploaded.</p>
      </div>
      <ol className="steps-preview">
        {ghost.steps.map((s, i) => (
          <li key={i}><span>{s}</span><span className="mono faint">{clock(ghost.splits[i] - (i ? ghost.splits[i - 1] : 0))}</span></li>
        ))}
      </ol>
      <div className="start-wrap">
        <button className="big-btn" onClick={onAccept}>Accept the haunting</button>
        <button className="textbtn" onClick={onSkip}>Not now</button>
      </div>
    </>
  )
}
