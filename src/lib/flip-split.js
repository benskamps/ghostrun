// Flip-to-Split: lay the phone face down to work, pick it up to log the split.
// Uses deviceorientation: zUp = cos(beta) * cos(gamma) is how much the screen faces up, 1 face up, -1 face down.
// That reads the same under the spec (face down = beta ±180) and under the older convention some Android
// browsers still use (face down = gamma ±180), and it doesn't care about the ±180 wrap.

const rad = (d) => (d * Math.PI) / 180
export const faceUp = (beta, gamma = 0) => Math.cos(rad(beta)) * Math.cos(rad(gamma || 0))

export class FlipDetector {
  constructor({
    onFlip = () => {},
    onFace = () => {},     // called with 'down' | 'up' when the face changes
    downAt = -0.82,        // zUp below this = face down (within ~35 degrees of flat)
    upAt = -0.34,          // zUp above this = picked up (the gap avoids jitter at the edge)
    minDownMs = 1500,      // must rest face down this long before a pick-up counts
  } = {}) {
    Object.assign(this, { onFlip, onFace, downAt, upAt, minDownMs })
    this.downSince = null
    this.face = null
  }

  push(t, beta, gamma) {
    if (beta == null) return
    const z = faceUp(beta, gamma)
    if (z < this.downAt) {
      if (this.downSince == null) this.downSince = t
      if (this.face !== 'down') { this.face = 'down'; this.onFace('down') }
    } else if (z > this.upAt) {
      const wasDown = this.downSince != null && t - this.downSince >= this.minDownMs
      this.downSince = null
      if (this.face !== 'up') { this.face = 'up'; this.onFace('up') }
      if (wasDown) this.onFlip(t)
    }
  }

  listen() {
    const h = (e) => this.push(e.timeStamp, e.beta, e.gamma)
    addEventListener('deviceorientation', h)
    return () => removeEventListener('deviceorientation', h)
  }
}

/** iOS asks for motion permission, and only from a tap. Call this inside the click handler. */
export async function askMotion() {
  const asks = [globalThis.DeviceMotionEvent, globalThis.DeviceOrientationEvent]
    .filter((E) => typeof E?.requestPermission === 'function')
    .map((E) => E.requestPermission().catch(() => 'denied'))
  if (!asks.length) return typeof globalThis.DeviceMotionEvent === 'function' ? 'granted' : 'none'
  const res = await Promise.all(asks)
  return res.every((r) => r === 'granted') ? 'granted' : 'denied'
}
