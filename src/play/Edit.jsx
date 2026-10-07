import { useState } from 'react'
import { cleanRoute, LIMITS } from '../lib/routes.js'

// Build or tweak a route. Changing the steps starts a fresh ghost, so we say so.
export default function Edit({ route, onSave, onDelete, onBack }) {
  const [name, setName] = useState(route?.name || '')
  const [steps, setSteps] = useState(route?.steps?.length ? [...route.steps] : ['', '', ''])
  const [sure, setSure] = useState(false)
  const clean = cleanRoute({ name, steps })
  const changed = route && clean && (clean.steps.join('\u0000') !== route.steps.join('\u0000'))

  const setStep = (i, v) => setSteps(steps.map((s, j) => (j === i ? v : s)))
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= steps.length) return
    const next = [...steps]; [next[i], next[j]] = [next[j], next[i]]; setSteps(next)
  }

  return (
    <>
      <header className="bar">
        <button className="back" onClick={onBack} aria-label="Back">←</button>
        <span className="bar-title">{route ? 'Edit run' : 'New run'}</span>
        <span />
      </header>

      <form className="edit" onSubmit={(e) => { e.preventDefault(); if (clean) onSave({ ...(route ? { id: route.id } : {}), ...clean }) }}>
        <label className="field">
          <span className="mono eyebrow">Chore</span>
          <input value={name} maxLength={LIMITS.name} onChange={(e) => setName(e.target.value)} placeholder="Clean the car" required />
        </label>

        <fieldset className="field">
          <legend className="mono eyebrow">Steps · each one is a split</legend>
          <p className="faint small">Make the first step tiny (“grab the bucket”). Starting is the hard part.</p>
          <ol className="edit-steps">
            {steps.map((s, i) => (
              <li key={i}>
                <input value={s} maxLength={LIMITS.step} onChange={(e) => setStep(i, e.target.value)} placeholder={`Step ${i + 1}`} aria-label={`Step ${i + 1}`} />
                <button type="button" className="icon" onClick={() => move(i, -1)} disabled={!i} aria-label="Move up">↑</button>
                <button type="button" className="icon" onClick={() => setSteps(steps.filter((_, j) => j !== i))} disabled={steps.length <= 1} aria-label="Remove step">×</button>
              </li>
            ))}
          </ol>
          {steps.length < LIMITS.maxSteps && (
            <button type="button" className="chip-btn" onClick={() => setSteps([...steps, ''])}>+ Add a step</button>
          )}
        </fieldset>

        {changed && <p className="note">New steps mean a new ghost. Your old runs stay saved, but this route starts fresh.</p>}

        <button className="big-btn" type="submit" disabled={!clean}>Save</button>

        {route && !route.template && (
          sure
            ? <div className="row"><button type="button" className="chip-btn" onClick={() => setSure(false)}>Keep it</button>
                <button type="button" className="chip-btn warn" onClick={() => onDelete(route.id)}>Delete run and its ghosts</button></div>
            : <button type="button" className="textbtn" onClick={() => setSure(true)}>Delete this run</button>
        )}
      </form>
    </>
  )
}
