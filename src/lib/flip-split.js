// Flip-to-Split: lay the phone face down to work, pick it up to log the split.
// Uses deviceorientation beta (front-back tilt): about 0 face up, about ±180 face down.
// That angle is normalized across iOS and Android, unlike raw gravity signs.

export class FlipDetector {
  constructor({
    onFlip = () => {},
    onFace = () => {},     // called with 'down' | 'up' when the face changes
    downAt = 145,          // |beta| above this = face down
    upAt = 110,            // |beta| below this = picked up (gap avoids jitter at the edge)
    minDownMs = 1500,      // must rest face down this long before a pick-up counts
  } = {}) {
    Object.assign(this, { onFlip, onFace, downAt, upAt, minDownMs })
    this.downSince = null
    this.face = null
  }

  push(t, beta) {
    if (beta == null) return
    const b = Math.abs(beta)
    if (b > this.downAt) {
      if (this.downSince == null) this.downSince = t
      if (this.face !== 'down') { this.face = 'down'; this.onFace('down') }
    } else if (b < this.upAt) {
      const wasDown = this.downSince != null && t - this.downSince >= this.minDownMs
      this.downSince = null
      if (this.face !== 'up') { this.face = 'up'; this.onFace('up') }
      if (wasDown) this.onFlip(t)
    }
  }

  listen() {
    const h = (e) => this.push(e.timeStamp, e.beta)
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
