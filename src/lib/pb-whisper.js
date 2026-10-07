// PB Whisper: make the race audible while the phone is face down.
// setGap(ms): positive = PB ahead of you, negative = you ahead.
// PB ahead -> his hum gets louder, brighter and wobblier. You ahead -> it fades to a faint airy hiss.
// Create from a user tap (autoplay rules). iOS: test with the silent switch both ways (day-one test 02).

export class PBWhisper {
  constructor() {
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);

    // Body: two detuned low triangles through a lowpass = ghostly hum.
    this.filter = ctx.createBiquadFilter(); this.filter.type = "lowpass"; this.filter.frequency.value = 400; this.filter.Q.value = 6;
    this.filter.connect(this.master);
    this.oscs = [110, 110 * 1.5].map((f, i) => {
      const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = f; o.detune.value = i ? 7 : -7;
      o.connect(this.filter); o.start(); return o;
    });

    // Wobble: an LFO on pitch, faster when PB is close.
    this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 0.6;
    this.lfoGain = ctx.createGain(); this.lfoGain.gain.value = 12;
    this.lfo.connect(this.lfoGain); this.oscs.forEach(o => this.lfoGain.connect(o.detune)); this.lfo.start();

    // Breath: filtered noise that stays faint underneath.
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 1800; nf.Q.value = 0.8;
    this.breath = ctx.createGain(); this.breath.gain.value = 0.02;
    noise.connect(nf).connect(this.breath).connect(ctx.destination); noise.start();
  }

  async start() { await this.ctx.resume(); this.setGap(0); }

  /** gapMs: PB's lead in ms (negative when you lead). rangeMs: lead at which PB is at full volume. */
  setGap(gapMs, rangeMs = 20000) {
    const t = this.ctx.currentTime, k = Math.max(-1, Math.min(1, gapMs / rangeMs)); // -1 you far ahead .. 1 PB far ahead
    const near = (k + 1) / 2;                                    // 0..1
    this.master.gain.setTargetAtTime(0.02 + 0.28 * near ** 2, t, 0.4);
    this.filter.frequency.setTargetAtTime(250 + 1400 * near, t, 0.4);
    this.lfo.frequency.setTargetAtTime(0.4 + 5 * near, t, 0.4);
    this.lfoGain.gain.setTargetAtTime(6 + 30 * near, t, 0.4);
    this.breath.gain.setTargetAtTime(0.01 + 0.05 * (1 - near), t, 0.4);
  }

  /** Golden split: a bright two-note chime over the hum. */
  chime() {
    const t = this.ctx.currentTime;
    [988, 1319].forEach((f, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.09); g.gain.linearRampToValueAtTime(0.25, t + i * 0.09 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.6);
      o.connect(g).connect(this.ctx.destination); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.7);
    });
  }

  /** Plain split: one short soft tick so a face-down split is audible. */
  blip() {
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sine"; o.frequency.value = 660;
    g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + 0.2);
  }

  stop() { if (this.ctx.state !== 'closed') this.ctx.close().catch(() => {}); }
}
