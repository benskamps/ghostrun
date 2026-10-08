// One-off: cut a small replay fixture out of the MotionSense dataset (iPhone 6s in a front
// pocket, Core Motion at 50 Hz, 24 people; MIT, github.com/mmalekzadeh/motion-sense).
// Usage: node test/sim/build-motionsense.js <path to unzipped A_DeviceMotion_data>
import fs from 'node:fs'
import zlib from 'node:zlib'

const dir = process.argv[2]
const KINDS = { sit: 'sit_5', std: 'std_6', wlk: 'wlk_7', jog: 'jog_9' }
const SUBJECTS = 12, SECONDS = 15, HZ = 50
const clips = []
for (const [kind, folder] of Object.entries(KINDS)) {
  for (let sub = 1; sub <= SUBJECTS; sub++) {
    const rows = fs.readFileSync(`${dir}/${folder}/sub_${sub}.csv`, 'utf8').trim().split('\n').slice(1)
    const mid = Math.max(0, Math.floor(rows.length / 2 - (SECONDS * HZ) / 2))
    const xyz = []
    for (const line of rows.slice(mid, mid + SECONDS * HZ)) {
      const r = line.split(',').map(Number)
      // accelerationIncludingGravity in g = gravity + userAcceleration; stored as milli-g
      for (let k = 0; k < 3; k++) xyz.push(Math.round((r[4 + k] + r[10 + k]) * 1000))
    }
    clips.push({ kind, sub, xyz })
  }
}
const buf = Buffer.from(Int16Array.from(clips.flatMap((c) => c.xyz)).buffer)
fs.writeFileSync(new URL('./motionsense.bin.gz', import.meta.url), zlib.gzipSync(buf, { level: 9 }))
fs.writeFileSync(new URL('./motionsense.json', import.meta.url), JSON.stringify({
  source: 'MotionSense A_DeviceMotion_data (MIT, Malekzadeh et al. 2019), iPhone 6s front pocket',
  hz: HZ, unit: 'milli-g, accelerationIncludingGravity, xyz interleaved Int16 little-endian',
  clips: clips.map(({ kind, sub, xyz }) => ({ kind, sub, n: xyz.length / 3 })),
}, null, 1) + '\n')
console.log(clips.length, 'clips', buf.length, 'bytes raw')
