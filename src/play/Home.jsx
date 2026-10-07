import { BRAND } from '../Brand.jsx'
import PB from './PB.jsx'
import { routeStats, orderRoutes, runsThisWeek, dreadRefund, todaysHex } from './model.js'
import { clock } from '../lib/race.js'

// The home screen is a set of races waiting to start, never a list of undone things.
export default function Home({ data, prefs, note, onPrefs, onPick, onNew }) {
  const routes = orderRoutes(data.routes, data.runs)
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
          <p className="eyebrow mono">Chore% · pick a run</p>
          <h1 className="h-display">{data.runs.length ? 'PB made a mess again.' : 'Your house is haunted.'}</h1>
          <p className="muted">
            {data.runs.length
              ? 'Pick a chore and race your ghost through it.'
              : 'Pick a chore. Your first run records your ghost. Nothing to beat, nothing to lose.'}
          </p>
        </div>
      </section>

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
            <span className="route-main"><span className="route-name">+ Your own chore</span>
              <span className="route-mess">Name it, list the steps, race it.</span></span>
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
