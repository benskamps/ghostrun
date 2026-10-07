import { BRAND } from '../Brand.jsx'
import PB from './PB.jsx'
import { routeStats, orderRoutes, runsThisWeek, dreadRefund, todaysHex } from './model.js'
import { clock } from '../lib/race.js'
import { kindOf } from '../lib/routes.js'

const COPY = {
  chore: { tab: 'Chore%', where: 'the house', head: 'PB made a mess again.', line: 'Pick a chore. Your first run records your ghost. Nothing to beat, nothing to lose.', own: '+ Your own chore', ownLine: 'Name it, list the steps, race it.' },
  errand: { tab: 'Errand%', where: 'out the door', head: 'PB followed you out.', line: 'Pick an errand. Split each leg as you finish it. Your first run records your ghost and where your stops are.', own: '+ Your own errand', ownLine: 'Name it, list the legs, race it.' },
  admin: { tab: 'Admin%', where: 'paperwork', head: 'PB hid the envelope.', line: 'Pick the life admin you keep not opening. Split each step, and the confirmation at the end is the proof.', own: '+ Your own quest', ownLine: 'Name it, list the steps, end on the confirmation.' },
}

// The home screen is a set of races waiting to start, never a list of undone things.
export default function Home({ data, prefs, note, onPrefs, onPick, onNew }) {
  const mode = prefs.mode || 'chore'
  const routes = orderRoutes(data.routes.filter((r) => kindOf(r) === mode), data.runs)
  const copy = COPY[mode]
  const week = runsThisWeek(data.runs)
  const refund = dreadRefund(data.runs)
  const hex = todaysHex()

  return (
    <>
      <header className="bar">
        <a className="bar-brand" href="/" aria-label="Ghostrun home page">Ghostrun</a>
        <button className="chip-btn" aria-pressed={prefs.sound} onClick={() => onPrefs({ sound: !prefs.sound })}>
          {prefs.sound ? 'Sound on' : 'Sound off'}
        </button>
      </header>

      <section className="home-hero">
        <PB mood={data.runs.length ? 'taunt' : 'sneaky'} scale={5} trail />
        <div>
          <p className="eyebrow mono">{copy.tab} · pick a run</p>
          <h1 className="h-display">{mode === 'chore' && !data.runs.length ? 'Your house is haunted.' : copy.head}</h1>
          <p className="muted">{mode === 'chore' && data.runs.length ? 'Pick a chore and race your ghost through it.' : copy.line}</p>
        </div>
      </section>

      <div className="seg-ctl mode-tabs" role="tablist" aria-label="What kind of run">
        {Object.entries(COPY).map(([m, c]) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => onPrefs({ mode: m })}>{c.tab} <span className="mono">{c.where}</span></button>
        ))}
      </div>

      {note && <p className="note" role="status">{note}</p>}

      <div className="haunt mono">
        <span className="haunt-tag">Today’s haunt</span>
        <strong>{hex.name}</strong> <span className="muted">{hex.rule}</span>
      </div>

      <ul className="routes" role="list">
        {routes.map((r) => {
          const s = routeStats(r, data.runs)
          const rival = r.rival && !s.pb
          return (
            <li key={r.id}>
              <button className="route" onClick={() => onPick(r.id)}>
                <span className="route-main">
                  <span className="route-name">{r.name}</span>
                  <span className="route-mess">{r.mess}</span>
                </span>
                <span className="route-time mono">
                  {s.pb ? <><small>PB</small>{clock(s.pb.splits.at(-1))}</>
                    : rival ? <><small>ghost waiting</small>{clock(r.rival.splits.at(-1))}</>
                    : <small className="record">record ghost</small>}
                </span>
              </button>
            </li>
          )
        })}
        <li>
          <button className="route route-new" onClick={onNew}>
            <span className="route-main"><span className="route-name">{copy.own}</span>
              <span className="route-mess">{copy.ownLine}</span></span>
          </button>
        </li>
      </ul>

      <footer className="home-foot mono">
        <span>{week} {week === 1 ? 'run' : 'runs'} this week</span>
        {refund > 60000 && <span>Dread refunded: {Math.round(refund / 60000)} min</span>}
        <span className="faint">Runs stay on this phone. No account.</span>
        <a className="faint" href="/">a {BRAND} production</a>
      </footer>
    </>
  )
}
