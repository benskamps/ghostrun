import { useState } from 'react'
import { cleanRoute, kindOf, LIMITS } from '../lib/routes.js'

// Build or tweak a route. Changing the steps starts a fresh ghost, so we say so.
export default function Edit({ route, kind, onSave, onDelete, onBack }) {
  const k = route ? kindOf(route) : kind || 'chore'
  const errand = k === 'errand', admin = k === 'admin'
  const [name, setName] = useState(route?.name || '')
  const [steps, setSteps] = useState(route?.steps?.length ? [...route.steps] : errand ? ['Out the door', '', '', ''] : admin ? ['Find the official page', '', 'Get the confirmation'] : ['', '', ''])
  const [drive, setDrive] = useState(route?.drive ? [...route.drive] : steps.map(() => false))
  const [sure, setSure] = useState(false)
  const clean = cleanRoute({ name, steps, kind: k === 'chore' ? undefined : k, drive })
  const changed = route && clean && (clean.steps.join('\u0000') !== route.steps.join('\u0000'))

  const setStep = (i, v) => setSteps(steps.map((s, j) => (j === i ? v : s)))
  const swap = (arr, i, j) => { const next = [...arr]; [next[i], next[j]] = [next[j], next[i]]; return next }
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= steps.length) return
    setSteps(swap(steps, i, j)); setDrive(swap(drive, i, j))
  }
  const remove = (i) => { setSteps(steps.filter((_, j) => j !== i)); setDrive(drive.filter((_, j) => j !== i)) }
  const add = () => { setSteps([...steps, '']); setDrive([...drive, false]) }

  return (
    <>
      <header className="bar">
        <button className="back" onClick={onBack} aria-label="Back">←</button>
        <span className="bar-title">{route ? 'Edit run' : errand ? 'New errand' : admin ? 'New quest' : 'New run'}</span>
        <span />
      </header>

      <form className="edit" onSubmit={(e) => { e.preventDefault(); if (clean) onSave({ ...(route ? { id: route.id } : {}), ...clean }) }}>
        <label className="field">
          <span className="mono eyebrow">{errand ? 'Errand' : admin ? 'Quest' : 'Chore'}</span>
          <input value={name} maxLength={LIMITS.name} onChange={(e) => setName(e.target.value)} placeholder={errand ? 'Library returns' : admin ? 'Update my address' : 'Clean the car'} required />
        </label>

        <fieldset className="field">
          <legend className="mono eyebrow">{errand ? 'Legs · each one is a split' : 'Steps · each one is a split'}</legend>
          <p className="faint small">{errand
            ? 'Split where each leg ends: parked, at the counter, back home. Mark the driving legs and the clock hides while you drive.'
            : admin
              ? 'End on the confirmation: that’s the proof. Use the official site, and never type ID numbers or passwords into anything but it.'
              : 'Make the first step tiny (“grab the bucket”). Starting is the hard part.'}</p>
          <ol className="edit-steps">
            {steps.map((s, i) => (
              <li key={i}>
                <input value={s} maxLength={LIMITS.step} onChange={(e) => setStep(i, e.target.value)} placeholder={`Step ${i + 1}`} aria-label={`Step ${i + 1}`} />
                {errand && <button type="button" className={`icon drive ${drive[i] ? 'on' : ''}`} aria-pressed={!!drive[i]} onClick={() => setDrive(drive.map((d, j) => (j === i ? !d : d)))} aria-label={`Leg ${i + 1} is a drive`}>🚗</button>}
                <button type="button" className="icon" onClick={() => move(i, -1)} disabled={!i} aria-label="Move up">↑</button>
                <button type="button" className="icon" onClick={() => remove(i)} disabled={steps.length <= 1} aria-label="Remove step">×</button>
              </li>
            ))}
          </ol>
          {steps.length < LIMITS.maxSteps && (
            <button type="button" className="chip-btn" onClick={add}>{errand ? '+ Add a leg' : '+ Add a step'}</button>
          )}
        </fieldset>

        {changed && <p className="note">New {errand ? 'legs' : 'steps'} mean a new ghost. Your old runs stay saved, but this route starts fresh.</p>}

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
