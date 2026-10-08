# Sensor tuning (simulated, Oct 8 2026)

None of these checks had run on a real phone yet. This pass replays simulated phones through them
and tunes the thresholds to keep honest runs out of Any% while still catching the couch fakes the
plan names. The replay tests are `test/sim-replay.test.js`; the simulators are in `test/sim/`.

## What the simulation is made of

| Signal | Source | How real |
| --- | --- | --- |
| Phone in a pocket: standing, walking, sitting, jogging | **MotionSense** ([github.com/mmalekzadeh/motion-sense](https://github.com/mmalekzadeh/motion-sense), MIT): iPhone 6s, front pocket, Core Motion at 50 Hz, 24 people. A 48-clip cut (12 people) is in `test/sim/motionsense.bin.gz`. | Real recordings, resampled to 50/60/100 Hz |
| Knocks, plates, cutlery, scrubbing, footsteps on a counter | Physical model: damped vibration modes at 1 kHz, then a sensor front end (anti-alias low-pass at 20 or 40 Hz, 60 Hz sampling, ±2 ms timestamp jitter, 0.015 m/s² noise) | Modelled. The shape is physics; the strengths are guesses |
| Couch shaking, phone held in a hand | Model: 2.5-6 Hz shake at 0.5-3 g; hand tremor, wrist drift and grip shifts | Modelled |
| GPS | Model: Gauss-Markov error, outdoor 4-10 m, street 8-20 m, indoor Wi-Fi 35-65 m, 2-4% cell-tower jumps of 150-450 m, nothing while the maps app is in front or the screen is locked, a coarse 65-200 m fix on return | Modelled from published accuracy figures |
| Admin% screenshots | Real file-name formats from Pixel/AOSP, Samsung, Xiaomi, OnePlus/Oppo and macOS | Real formats |

## What changed and why

### Knock to split (`src/lib/knock-split.js`)

**Bug found:** the old detector kept a stray bump (setting the phone down, a plate) and paired the
first knock with it. The pair failed, and the first knock was thrown away with it. So the first double
knock after setting the phone down almost never worked at a normal knocking pace. Hard knocks failed too,
because their ring crossed the threshold twice.

Now: bumps closer than 60 ms merge (a knock and its ring), a decaying envelope ignores a hard knock's
tail, each bump is judged once as a second knock and can still start the next pair, the two knocks must
be within 2x of each other's strength, and there must be no bump at all 800 ms before and 500 ms after.
The high-pass filter is time-based, so 50 and 100 Hz phones behave like 60 Hz ones.

Double knock detected after setting the phone down, by knock strength (peak m/s² a 60 Hz phone would report):

| Phone | Detector | 1.0 | 1.4 | 2 | 3 | 6 | 10 | False splits per 10 min washing up (typical / worst) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 60 Hz, 20 Hz filter | before | 0% | 0% | 7% | 27% | 27% | 0% | 0.25 / 2.5 |
| 60 Hz, 20 Hz filter | after | 0% | 20% | 67% | 90% | 93% | 90% | 1.25 / 7.75 |
| 60 Hz, 40 Hz filter | before | 0% | 0% | 23% | 27% | 33% | 13% | 0.75 / 7.0 |
| 60 Hz, 40 Hz filter | after | 0% | 67% | 83% | 93% | 80% | 80% | 1.5 / 8.25 |
| 50 Hz | after | 0% | 0% | 67% | 90% | 97% | 90% | |
| 100 Hz | after | 93% | 97% | 97% | 100% | 100% | 90% | |

The trade-off is false splits. "Typical" is a dish into the rack every 3-10 s, sometimes two set down
at knocking pace, cutlery, scrubbing and footsteps. "Worst" is dishes stacked 2-3 at a time, 150-900 ms
apart. Two similar bangs half a second apart with quiet around them look exactly like a double knock to
a 60 Hz sensor; nothing in the signal tells them apart. The old detector's low false-split count came
from barely hearing anything.

### Effort proof (`src/lib/proof.js`)

**Bug found:** knock and flip splits are made for a phone resting on the counter, and a resting phone is
what the "still" check rejects. Every knock or flip run saved as Any%. A knock or a flip pick-up now
counts as movement for its step.

A step also counts as moved with 2.5 s of activity, not only 2% of its samples, so a 10-minute fold
with one walk to the drawer still counts. The high-pass filter is time-based here too.

Verdicts on simulated runs (MotionSense people where it says "pocket"):

| Run | Before | After |
| --- | --- | --- |
| Dishes, pocket, a few steps every minute | motion ×12 | motion ×12 |
| Dishes, pocket, a few steps every 3 min | motion ×11, still ×1 | motion ×12 |
| Laundry fold (10 and 5 min steps), pocket, a walk every 4 min | motion ×8, still ×4 | motion ×12 |
| Tidy, pocket, half walking | motion ×12 | motion ×12 |
| Flat on the counter, knock splits | **still ×3** | motion ×3 |
| Face down, flip splits | **still ×3** | motion ×3 |
| Jogging the bins out (shake check) | motion ×12 | motion ×12 |
| Couch, shaking at 3 g | shake | shake |
| Couch, phone flat, tapping | still | still |
| Couch, in hand, grip shift every 3 min | still | still |
| Couch, in hand, grip shift every 40 s | still on dishes, motion ×3 of 12 on folding | motion |
| Couch, shaking gently at 1.5 g | motion | motion |
| Couch, phone in pocket, pulled out to tap | motion ×9, still ×3 | motion ×10, still ×2 |

Shake thresholds stay as they were: jogging peaks at 32% violent samples against the 30% line, so
raising sensitivity would start calling joggers shakers.

### Errand% (`src/lib/geo.js`)

**Bug found:** the first and last stop of most errands is home, and a couch is always at home. Two of
four stops "arrived" plus 45 s of sitting still was a pass, so the Post office, Pharmacy and Corner shop
templates could be finished from the couch (47 and 54 of 60 couch runs verified). Now only stops at
least 150 m from home count, and a fix only shows you were out if its error circle stays clear of home
(vague fixes need three circles, which is where cell-tower jumps hide).

Also: a stop is saved from the sharpest fix near the split instead of the first one back from the maps
app, it keeps its accuracy, and arrival allows for both the fix's and the stop's fuzziness. "Out for 45 s"
can now be two out-of-house fixes 45 s apart, because the maps app and a locked screen leave gaps.

| Errand (60 runs each) | Race verified, before | after | Couch verified, before | after |
| --- | --- | --- | --- | --- |
| Grocery dash | 59 | 60 | 1 | 0 |
| Post office run | 57 | 58 | **47** | 0 |
| Corner shop walk | 59 | 59 | **54** | 0 |
| Post office, maps app always in front, phone locked inside (200 runs) | 167 | 187 | | |
| Corner shop, same (200 runs) | 194 | 179 | | |

The corner shop under the worst gaps is the one place this got stricter for honest runs: a lone coarse
fix 450 m from home isn't trusted anymore. A stop closer than 150 m to home can't be told apart from home.

### Admin% screenshots (`src/lib/admin-proof.js`)

Android names screenshots by the clock (`Screenshot_20261008-195512.png`, Samsung's `_195512_Chrome.jpg`,
Xiaomi and OnePlus dashed forms). The check now reads that time from the name, so an old screenshot is
caught even when the photo picker stamps the file with the time it was picked. The name is read once and
not kept.

**iPhone can't be checked this way.** Safari hands over `IMG_0123.PNG` or `image.png`, and its
`lastModified` is the moment you picked it, so an old iPhone screenshot passes. Reading a date from
inside the file might work, but whether one survives Safari's export can only be checked on a real
iPhone, so it isn't built. On iPhone, Admin% proof is effectively the honour system plus the reference number check.

### Flip (`src/lib/flip-split.js`)

Face down is now `cos(beta) x cos(gamma) < -0.82`, which reads the same under the spec (beta ±180) and
the older Android convention (gamma ±180), with no trouble at the ±180 wrap.

## What simulation can't prove

- **How hard a knock hits a real phone.** Everything above is in m/s² as a 60 Hz phone would report it.
  If real knocks on a stone counter come through under ~1.4 m/s², most will be missed. That's one
  number, and only a phone on a counter can give it.
- **What a real kitchen sounds like to the accelerometer.** The false-split rate rests on modelled plates
  and cutlery. It could be better or worse.
- **Chores with the phone in a pocket.** MotionSense has standing and walking, not washing up, so the
  pocket runs are stitched from those. Arms moving at a sink probably jostle a pocket more than standing still.
- **A patient couch faker.** Someone who holds the phone, fidgets, and taps at believable times passes the
  motion check, before and after this change. That's what 100% photo proof is for.
- **iOS and Android GPS in the field.** Error sizes come from published figures, not from a drive.
- **Audio.** PB's voice, the race beat and the hum weren't touched here; the music thread owns that mix.

## The 10-minute phone check that would settle it

1. Lay the phone on the counter, open `/play`, start Dishes with knock on, and knock twice at a normal pace
   five times. Count the splits.
2. Wash a few dishes beside it without knocking for two minutes. Count any splits you didn't ask for.
3. Finish with the phone face down and flip splits. The result should say "Verified by motion".
