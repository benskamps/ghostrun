// Ghost Tracks: the songs the Race beat can play. Pure data and pattern functions, no audio here,
// so they're testable in node. GhostBeat (ghost-beat.js) turns them into sound.
// Every track reads one number, intensity 0..1 (PB close or ahead = hot), and a 16th-note step.
// Each has an A and a B section (8 bars each) and a drum fill into every section change.

const TRIADS = { min: [0, 3, 7], maj: [0, 4, 7], dim: [0, 3, 6] }
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
/** A chord as the engine wants it: a bass note around E1–Eb2 and three tones around A3–A4. */
export function chord(name) {
  const m = /^([A-G][#b]?)(m|dim)?$/.exec(name)
  const pc = NAMES.indexOf(m[1].replace('Db', 'C#').replace('Gb', 'F#').replace('G#', 'Ab').replace('D#', 'Eb').replace('A#', 'Bb'))
  const q = m[2] === 'm' ? 'min' : m[2] === 'dim' ? 'dim' : 'maj'
  const root = 57 + ((pc - 9 + 12) % 12) // A3..G#4
  return { name, bass: 28 + ((pc - 4 + 12) % 12), tones: TRIADS[q].map((s) => root + s) }
}
const prog = (s) => s.split(' ').map(chord)

/** Chord tones stacked upward: 0,1,2 = the triad, 3 = root an octave up, and so on. */
export const tone = (c, idx) => c.tones[((idx % 3) + 3) % 3] + 12 * Math.floor(idx / 3)

const q = (s) => s % 4 === 0
const fill = (bar, s, i) => i > 0.4 && bar % 8 === 7 && s >= 12 // snare run into the next section

export const TRACKS = [
  {
    id: 'chase',
    name: 'Haunted Chase',
    vibe: 'Synthwave chase, E minor',
    bpm: [100, 144],
    A: prog('Em C Am B'),
    B: prog('C D Em Em'),
    drums: (s, i, bar) => ({
      kick: i > 0.2 && (q(s) || (i > 0.75 && s === 14)) && !(fill(bar, s, i) && s > 12),
      snare: (i > 0.45 && (s === 4 || s === 12)) || fill(bar, s, i),
      hat: i > 0.3 && (i > 0.65 || s % 2 === 0) ? (s % 2 ? 0.5 : 1) : 0,
      open: i > 0.5 && s % 4 === 2,
    }),
    bass: { wave: 'sawtooth', hit: (s, i) => (s % 2 === 0 || (i > 0.7 && s % 4 === 3)) ? (s % 8 === 6 ? 12 : 0) : null, len: 1.6 },
    lead: {
      wave: 'square', peak: 0.032, len: 0.9,
      note: (c, s, i) => (i > 0.35 && (i > 0.6 || s % 2 === 0)) ? tone(c, [0, 1, 2, 3, 2, 1, 0, 2][s % 8]) + (i > 0.8 && s >= 8 ? 12 : 0) : null,
    },
  },
  {
    id: 'graveyard',
    name: 'Graveyard Shift',
    vibe: 'Dark techno, A phrygian, rolling bass',
    bpm: [118, 140],
    A: prog('Am Am Bb Am'),
    B: prog('F G Am Bb'),
    drums: (s, i, bar) => ({
      kick: i > 0.15 && q(s) && !(fill(bar, s, i) && s > 12),
      snare: (i > 0.5 && (s === 4 || s === 12)) || fill(bar, s, i),
      hat: i > 0.25 && s % 4 === 2 ? 1 : i > 0.7 && s % 2 ? 0.35 : 0,
      open: i > 0.6 && s === 14,
    }),
    // The rolling bass sits in the three 16ths after each kick.
    bass: { wave: 'sawtooth', hit: (s, i) => (s % 4 !== 0) ? (i > 0.6 && s % 4 === 3 ? 12 : 0) : null, len: 0.8 },
    lead: {
      wave: 'stab', peak: 0.03, len: 1.4, chord: true,
      note: (c, s, i) => (i > 0.4 && (s === 3 || s === 6 || s === 10)) || (i > 0.75 && (s === 13 || s === 14)) ? 0 : null,
    },
  },
  {
    id: 'organ',
    name: 'Organ Grinder',
    vibe: 'Haunted-house organ toccata, D minor',
    bpm: [104, 144],
    A: prog('Dm A Dm A'),
    B: prog('Bb Gm A Dm'),
    drums: (s, i, bar) => ({
      kick: i > 0.2 && (s === 0 || s === 8 || (i > 0.5 && q(s))) && !(fill(bar, s, i) && s > 12),
      snare: (i > 0.4 && (s === 4 || s === 12)) || fill(bar, s, i),
      hat: i > 0.55 && s % 2 === 0 ? 0.8 : 0,
      open: false,
    }),
    // Pedal note on the beat, octave bounce once it heats up.
    bass: { wave: 'organ', hit: (s, i) => s === 0 || s === 8 || (i > 0.7 && s % 2 === 0) ? (i > 0.7 && s % 4 === 2 ? 12 : 0) : null, len: 2.2 },
    // Bach-style pedal point: the top line walks down while the low note keeps coming back.
    lead: {
      wave: 'organ', peak: 0.03, len: 0.95,
      note: (c, s, i) => (i > 0.3 && (i > 0.55 || s % 2 === 0)) ? (s % 2 ? tone(c, 0) : tone(c, [5, 4, 3, 2, 4, 3, 2, 1][(s >> 1) % 8])) : null,
    },
  },
  {
    id: 'lap',
    name: 'Ghost Lap',
    vibe: 'Chiptune racer, F# minor',
    bpm: [124, 164],
    A: prog('F#m E D E'),
    B: prog('D E C# C#'),
    drums: (s, i, bar) => ({
      kick: i > 0.15 && (s === 0 || s === 8 || (i > 0.5 && s === 10)) && !(fill(bar, s, i) && s > 12),
      snare: (i > 0.3 && (s === 4 || s === 12)) || fill(bar, s, i),
      hat: i > 0.45 && (i > 0.75 || s % 2 === 0) ? (s % 2 ? 0.4 : 0.8) : 0,
      open: false,
    }),
    // NES bass: root and octave bouncing on 8ths.
    bass: { wave: 'triangle', hit: (s) => s % 2 === 0 ? (s % 4 === 2 ? 12 : 0) : null, len: 1.7, peak: 0.16 },
    lead: {
      wave: 'pulse', peak: 0.03, len: 1.6,
      note: (c, s, i) => {
        const motif = [0, null, 1, null, 2, null, 1, 2, 3, null, 2, null, 1, null, 0, null][s]
        if (motif == null || i < 0.3 || (i < 0.55 && s % 4)) return null
        return tone(c, motif) + (i > 0.8 && s >= 8 ? 12 : 0)
      },
    },
  },
]

export const trackById = (id) => TRACKS.find((t) => t.id === id) || null
/** 'shuffle' (or anything unknown) picks a track at random so every run can sound different. */
export const pickTrack = (id, rand = Math.random) => trackById(id) || TRACKS[Math.floor(rand() * TRACKS.length) % TRACKS.length]
export const bpmFor = (track, i) => Math.round(track.bpm[0] + (track.bpm[1] - track.bpm[0]) * i)
/** Which chord plays in a bar: 8 bars of A, then 8 of B. */
export const chordAt = (track, bar) => (bar % 16 < 8 ? track.A : track.B)[bar % 4]
