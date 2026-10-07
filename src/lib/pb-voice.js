// PB calls your splits out loud, so a face-down phone still tells you how the race is going.
// Uses the browser's own speech (no files, no network). callout() and friends are pure; PBVoice speaks.
// Copy rule: PB brags or sulks, it never tells you that you failed.

/** "3.2 seconds" / "1 minute 4" for the ear: delta() without the sign or the tenths past a minute. */
export function spoken(ms) {
  const a = Math.abs(ms) / 1000
  if (a < 10) return a.toFixed(1) === '1.0' ? '1 second' : `${a.toFixed(1)} seconds`
  if (a < 60) return `${Math.round(a)} seconds`
  const m = Math.floor(a / 60), s = Math.round(a % 60)
  return s ? `${m} minute${m > 1 ? 's' : ''} ${s}` : `${m} minute${m > 1 ? 's' : ''}`
}

/**
 * What PB says at a split. i = step index just finished, splits = your cumulative splits so far,
 * ghost = opponent's cumulative splits (or null when recording), gold = beat your best on this step,
 * blind = Blind% (no times out loud either).
 */
export function callout({ step, i, splits, ghost, gold = false, blind = false, last = false }) {
  if (last) return null // the finish line gets its own call
  if (blind) return gold ? `${step}. PB felt that.` : `${step}.`
  if (!ghost) return `${step}. ${spoken(splits[i] - (i ? splits[i - 1] : 0))}.`
  const gap = splits[i] - ghost[i] // positive = PB ahead
  if (gold) return gap <= 0 ? `Gold on ${step}. Up ${spoken(gap)}.` : `Gold on ${step}. PB's lead is down to ${spoken(gap)}.`
  if (gap <= -1000) return `${step}. You're up ${spoken(gap)}.`
  if (gap < 1000) return `${step}. Neck and neck.`
  return `${step}. PB's ahead by ${spoken(gap)}. It's gloating.`
}

/** The last word, from finish()'s result. diff = your total minus the ghost's (negative = you won). */
export function finishCall(result, total, diff = 0, name = 'PB') {
  if (result.result === 'recorded') return `Ghost saved. ${spoken(total)}. PB will remember that.`
  if (result.result === 'tie' || Math.abs(diff) < 100) return `Dead heat. ${name} is checking the replay.`
  const by = spoken(diff)
  if (result.result === 'win') return name === 'PB'
    ? `New PB, by ${by}. PB is ${result.mood === 'respect' ? 'tipping its hat' : 'sulking'}.`
    : `You beat ${name} by ${by}.`
  return `${name} takes it by ${by}. It's very pleased with itself.`
}

/** PB slips past you mid-step: said once per step, never twice in a row. */
export const passCall = (name = 'PB') => (name === 'PB' ? 'PB just slipped past you. Rude.' : `${name} just slipped past you.`)

export class PBVoice {
  static get ok() { return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window }

  constructor() {
    this.synth = window.speechSynthesis
    this.voice = null
    const pick = () => {
      const vs = this.synth.getVoices().filter((v) => /^en/i.test(v.lang))
      // A lower, slightly theatrical voice suits a ghost; fall back to any English voice.
      this.voice = vs.find((v) => /daniel|fred|male|google uk english male/i.test(v.name)) || vs[0] || null
    }
    pick()
    this.synth.addEventListener?.('voiceschanged', pick)
    this.off = () => this.synth.removeEventListener?.('voiceschanged', pick)
  }

  /** Call from the start tap: iOS only lets speech start from a user gesture. */
  unlock() { this.say(' ', { volume: 0 }) }

  say(text, { volume = 1, interrupt = true } = {}) {
    if (!text) return
    try {
      if (interrupt) this.synth.cancel()
      const u = new SpeechSynthesisUtterance(text)
      if (this.voice) u.voice = this.voice
      u.pitch = 0.75; u.rate = 1.08; u.volume = volume
      this.synth.speak(u)
    } catch { /* speech is a bonus, never a blocker */ }
  }

  /** Run abandoned: hush now. */
  stop() { try { this.off(); this.synth.cancel() } catch { /* fine */ } }

  /** Run finished: let the last line play out, then let go. */
  last(text) { this.say(text); this.off() }
}
