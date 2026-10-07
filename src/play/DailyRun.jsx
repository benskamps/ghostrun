import { dailyPick, pickLine, takenBack, secs } from '../lib/habit.js'
import { clock } from '../lib/race.js'
import { todayKey } from './model.js'

// The trigger: one run already laid out when you open the app. One tap to the start line.
export default function DailyRun({ routes, runs, onPick }) {
  const pick = dailyPick(routes, runs, Date.now(), todayKey())
  if (!pick) return null
  const back = takenBack(routes, runs)
  return (
    <button className="card daily" onClick={() => onPick(pick.route.id)}>
      <span className="mono eyebrow">Today’s run <span className="faint">PB picked it</span></span>
      <span className="daily-row">
        <span className="daily-name">{pick.route.name}</span>
        <span className="mono daily-time">{pick.pb ? <><small>PB</small>{clock(pick.pb)}</> : <small className="record">record ghost</small>}</span>
      </span>
      <span className="muted small">{pickLine(pick)}</span>
      {back >= 1000 && <span className="mono faint small">Taken back from PB so far: <strong className="ember">{secs(back)}</strong></span>}
      <span className="daily-go mono">{pick.kind === 'record' ? 'Record it →' : 'Race it →'}</span>
    </button>
  )
}
