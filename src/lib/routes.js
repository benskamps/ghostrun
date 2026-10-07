// Starter Chore% routes. Each step is a split; the first step is tiny on purpose
// so starting costs nothing. PB's mess line says who made the mess (PB did).

export const TEMPLATES = [
  {
    id: 'dishes', name: 'Dishes', mood: 'smug',
    mess: 'PB stacked every pan in the sink. Again.',
    steps: ['Clear the sink', 'Wash', 'Rinse and rack', 'Wipe the sink'],
  },
  {
    id: 'kitchen', name: 'Kitchen reset', mood: 'giggle',
    mess: 'PB had a midnight snack. All of it.',
    steps: ['Clear counters', 'Dishes', 'Wipe down', 'Floor'],
  },
  {
    id: 'laundry', name: 'Laundry fold', mood: 'sneaky',
    mess: 'PB ate one sock from every pair.',
    steps: ['Empty the dryer', 'Fold', 'Pair the socks', 'Put it away'],
  },
  {
    id: 'trash', name: 'Trash run', mood: 'taunt',
    mess: 'PB knocked over the trash can.',
    steps: ['Grab the bag', 'Tie it off', 'Take it out', 'New bag in'],
  },
  {
    id: 'bathroom', name: 'Bathroom quick clean', mood: 'giggle',
    mess: 'PB wrote “boo” on the mirror.',
    steps: ['Mirror', 'Sink', 'Toilet', 'Floor'],
  },
  {
    id: 'tidy', name: 'Ten-minute tidy', mood: 'dizzy',
    mess: 'PB redecorated the floor.',
    steps: ['Grab a basket', 'Living room', 'Bedroom', 'Put it all back'],
  },
]

export const CUSTOM_MESSES = [
  'PB has been in here. You can tell.',
  'PB moved everything two inches to the left.',
  'PB left a mess and a smug note.',
]

export const LIMITS = { name: 40, step: 40, minSteps: 1, maxSteps: 12 }

/** Trim and bound user text. Returns null when the route isn't usable. */
export function cleanRoute({ name, steps }) {
  const n = String(name || '').trim().slice(0, LIMITS.name)
  const s = (steps || []).map((x) => String(x || '').trim().slice(0, LIMITS.step)).filter(Boolean).slice(0, LIMITS.maxSteps)
  if (!n || s.length < LIMITS.minSteps) return null
  return { name: n, steps: s }
}

export const sameSteps = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])
