# FUL sound library

Every sound is a short synthesized sine/triangle chirp with a pitch glide, a
soft envelope and (sometimes) light vibrato — the R2D2 / Cozmo school of robot
voice. No licensed assets, no attribution needed.

The WAV files in this folder are played by `playSound(name)` in `renderer.js`
through a preloaded HTMLAudio bank. They respect the **Sound effects** toggle in
Settings (`cfg.sounds`). The asset name must match the key in `SOUND_FILES`.

## Catalog

| Sound | Feels like | Fires when |
|---|---|---|
| `poke` | quick happy blip | tapping the face |
| `correct` | "ding-ding!" | a command or task finishes successfully |
| `wrong` | soft double-boop | a task fails, or the write fallback appears |
| `win` | rising arpeggio | a celebration ("thank you FUL") |
| `proud` | satisfied "mm-HMM!" | copying or inserting a draft |
| `hello` | R2D2 warble | the "hey ful" wake phrase is heard |
| `sing` | little melody 🎵 | long-pressing the face (650 ms) |
| `laugh` | staccato giggle | a joke request gets its reply |
| `curious` | rising "hmm?" | starting "read my screen" |
| `sad` | falling whimper | a cloud/model error |
| `sleep` | descending purr | entering sleep after 45 s idle |
| `chime` | soft two-tone bell | timer/reminder toast, System Check |
| `startup` | power-on sweep | app launch, and waking from sleep |

## Sleep & wake

After 45 seconds without an explicit interaction FUL falls asleep (`sleepy`
mood, eyes closed, `sleep` chirp). Passive cursor movement over the desktop no
longer wakes it:

- **Hovering the pill** is the normal wake-up trigger (`startup` chirp).
- Clicking the face, pressing a hotkey, opening a panel or hearing the wake
  phrase are explicit interactions and also wake it.
- While asleep, only those triggers reset the idle timer.

## Guidelines

- **Sounds confirm, they don't announce.** Play them in response to something
  the user (or a timer) did — never on a loop or on passive state changes, or
  the robot becomes a noisy toy.
- **Failure sounds must be softer than success sounds.** `wrong` is quiet and
  round on purpose. `sad` is reserved for real errors.
- **One sound per event.** If speech (TTS) will say something, a chirp right
  before it is fine; two chirps back-to-back is mush.
- **Keep new sounds under ~1.5s** (only `sing` gets to be long — it's a
  performance, not feedback).
- **Adding one:** drop a `<name>.wav` in this folder, add it to `SOUND_FILES`
  and `SOUND_LEVELS` in `renderer.js`, then call `playSound('<name>')` at the
  event. Update this table.
