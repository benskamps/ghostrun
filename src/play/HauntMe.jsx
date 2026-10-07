import { useState } from 'react'
import { track } from '@vercel/analytics'
import { hauntIcs, nextSlot, sameTime, onTable, secs } from '../lib/habit.js'
import { clock, pickPB } from '../lib/race.js'

// The return: tomorrow's target, and a calendar invite from PB in place of push notifications.
// The invite is built on the phone and handed to the calendar app. Nothing is sent anywhere.
export default function HauntMe({ route, runs }) {
  const t = sameTime()
  const [time, setTime] = useState(`${String(t.hh).padStart(2, '0')}:${String(t.mm).padStart(2, '0')}`)
  const [daily, setDaily] = useState(false)
  const [added, setAdded] = useState(false)
  const table = onTable(runs)
  const pb = pickPB(runs)?.splits.at(-1) ?? null

  const target = table?.ms >= 1000
    ? `Your best steps already beat your PB by ${secs(table.ms)}. Most of it is on ${table.step}.`
    : pb != null ? `PB to beat: ${clock(pb)}. Shave one step and it’s yours.` : 'Your ghost is saved. Next time it races you.'

  const add = () => {
    const [hh, mm] = time.split(':').map(Number)
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return
    const at = nextSlot(hh, mm)
    const url = `${location.origin}/play?run=${encodeURIComponent(route.id)}`
    const ics = hauntIcs({ route: route.name, url, at, daily, line: target, id: `${route.id}-${at.getTime()}` })
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ghostrun-${route.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    setAdded(true)
    track('haunt_me', { daily })
  }

  return (
    <section className="card haunt-me">
      <p className="mono eyebrow">Next run</p>
      <p className="haunt-target">{target}</p>
      <div className="haunt-row">
        <label className="small muted haunt-at">PB haunts you at
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mono" />
        </label>
      </div>
      <div className="haunt-row">
        <button className="chip-btn" aria-pressed={daily} onClick={() => setDaily(!daily)}>Every day</button>
        <button className="chip-btn haunt-add" onClick={add}>{added ? 'In your calendar ✓' : 'Add to calendar'}</button>
      </div>
      <p className="faint small">A 10 minute slot with a link straight back to this run. Delete it any time; PB won’t mind.</p>
    </section>
  )
}
