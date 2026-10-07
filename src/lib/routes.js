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

// Errand% routes. `drive` marks legs behind the wheel: the clock hides on those, eyes on the road.
// Each leg ends where you split; the first run records those spots as the route's stops.
export const ERRAND_TEMPLATES = [
  {
    id: 'grocery', kind: 'errand', name: 'Grocery dash', mood: 'giggle',
    mess: 'PB ate the last of everything and left the list on the fridge.',
    steps: ['Out the door', 'Drive to the store', 'Grab the list', 'Check out', 'Drive home'],
    drive: [false, true, false, false, true],
  },
  {
    id: 'post', kind: 'errand', name: 'Post office run', mood: 'sneaky',
    mess: 'PB sealed the return in a box. Three weeks ago.',
    steps: ['Out the door', 'Drive there', 'Drop it off', 'Drive home'],
    drive: [false, true, false, true],
  },
  {
    id: 'pharmacy', kind: 'errand', name: 'Pharmacy pickup', mood: 'smug',
    mess: 'PB let the refill sit at the counter all week.',
    steps: ['Out the door', 'Get there', 'Pick it up', 'Back home'],
    drive: [false, true, false, true],
  },
  {
    id: 'walk-shop', kind: 'errand', name: 'Corner shop walk', mood: 'taunt',
    mess: 'PB drank the last of the milk. Straight from the carton.',
    steps: ['Shoes on', 'Walk there', 'Grab it', 'Walk back'],
    drive: [false, false, false, false],
  },
]

export const CUSTOM_MESSES = [
  'PB has been in here. You can tell.',
  'PB moved everything two inches to the left.',
  'PB left a mess and a smug note.',
]

export const LIMITS = { name: 40, step: 40, minSteps: 1, maxSteps: 12 }

/** Trim and bound user text. Returns null when the route isn't usable. */
export function cleanRoute({ name, steps, kind, drive }) {
  const n = String(name || '').trim().slice(0, LIMITS.name)
  const kept = (steps || []).map((x, i) => [String(x || '').trim().slice(0, LIMITS.step), !!drive?.[i]]).filter(([x]) => x).slice(0, LIMITS.maxSteps)
  if (!n || kept.length < LIMITS.minSteps) return null
  const out = { name: n, steps: kept.map(([x]) => x) }
  if (kind === 'errand') { out.kind = 'errand'; out.drive = kept.map(([, d]) => d) }
  return out
}

export const isErrand = (route) => route?.kind === 'errand'

export const sameSteps = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])
