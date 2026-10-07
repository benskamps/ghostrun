import { BRAND } from '../Brand.jsx'
import PB from './PB.jsx'
import { routeStats, orderRoutes, runsThisWeek, dreadRefund, todaysHex } from './model.js'
import { clock } from '../lib/race.js'
import { isErrand } from '../lib/routes.js'

// The home screen is a set of races waiting to start, never a list of undone things.
export default function Home({ data, prefs, note, onPrefs, onPick, onNew }) {
  const errands = prefs.mode === 'errand'
  const routes = orderRoutes(data.routes.filter((r) => isErrand(r) === errands), data.runs)
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
          <p className="eyebrow mono">{errands ? 'Errand%' : 'Chore%'} · pick a run</p>
          <h1 className="h-display">{errands ? 'PB followed you out.' : data.runs.length ? 'PB made a mess again.' : 'Your house is haunted.'}</h1>
          <p className="muted">
            {errands
              ? 'Pick an errand. Split each leg as you finish it. Your first run records your ghost and where your stops are.'
              : data.runs.length
                ? 'Pick a chore and race your ghost through it.'
                : 'Pick a chore. Your first run records your ghost. Nothing to beat, nothing to lose.'}
          </p>
        </div>
      </section>

      <div className="seg-ctl mode-tabs" role="tablist" aria-label="What kind of run">
        <button role="tab" aria-selected={!errands} onClick={() => onPrefs({ mode: 'chore' })}>Chore% <span className="mono">in the house</span></button>
        <button role="tab" aria-selected={errands} onClick={() => onPrefs({ mode: 'errand' })}>Errand% <span className="mono">out the door</span></button>
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
            <span className="route-main"><span className="route-name">{errands ? '+ Your own errand' : '+ Your own chore'}</span>
              <span className="route-mess">{errands ? 'Name it, list the legs, race it.' : 'Name it, list the steps, race it.'}</span></span>
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
