# Nixi - desktop companion (Windows)

The little pill that lives at the top of your screen, hears you, and does things
on your PC. Offline speech, an offline command parser, and Gemini for the fuzzy
stuff.

```bash
npm install
npm start
```

First launch asks for a free Gemini key (aistudio.google.com/apikey). Everything
except the cloud answers works without one.

## Hotkeys

| Key | What it does |
| --- | --- |
| Hold **Right Ctrl** | talk a command |
| Hold **Right Alt** | dictate straight into whatever app has focus |
| **Ctrl+Alt+Space** | talk a command |
| **Ctrl+Alt+D** | dictate |
| **Ctrl+Alt+W** | write |
| **Ctrl+Alt+M** | mute / unmute |
| **Ctrl+Shift+Space** / **Ctrl+Shift+D** | alternates when the key watcher is unavailable |

Right-click the pill for Settings. Left-click it to wake it up.

## What it can do

- **Command** - wake phrase ("hey nixi"), a hotkey, or the mic button.
- **Dictate** - hold Right Alt anywhere and talk; Nixi cleans up fillers and
  self-corrections and types the result into the focused window.
- **Write** - ask for a draft (email, reply, note, post) and insert it.
- **Read my screen** - Nixi screenshots the display and explains what is on it.
- **Teleprompter** - a scrolling script that speeds up while you speak.
- **Timers, reminders, to-dos and notes** - spoken, listed in the panel, and
  fired with a toast.
- **Find files** - "find my resume" searches the usual places and opens Explorer.
- **Little things** - time and date, volume, dark mode, new/close tab, zoom,
  scroll, refresh, screenshot, clipboard, lock the PC.
- **Now playing** - what is on Spotify/YouTube/anything else right now.
- **Feels alive** - it blinks, looks at your cursor, reacts to what you say, and
  wears headphones, shades, glasses or a bow.
- **Offline** - Windows speech recognition and the command parser run with the
  network unplugged. Only the cloud answers need the internet.

Say things like "open Chrome and Spotify", "timer for 10 minutes",
"remind me at 6 to call Mom", "add milk to my list", "what time is it",
"a little louder", "turn on dark mode", "find my resume", "next song",
"start teleprompter", "what's on my screen", "write a reply to Sam",
"thank you Nixi".

## How it is put together

| File | Job |
| --- | --- |
| `main.js` | window, tray, speech/hotkey workers, every action Nixi can take |
| `renderer.js` | the pill UI, face loop, mic meter, Gemini calls |
| `face.js` | spring-driven character renderer (eyes, moods, outfits) |
| `intents.js` | offline spoken-command parser |
| `apps.js` | friendly name -> website / protocol / executable, Start Menu lookup |
| `speech.ps1` | Windows SAPI recogniser (wake, dictate, one-shot) |
| `hotkey.ps1` | raw key watcher, so Right Ctrl and Right Alt can be told apart |
| `media.ps1` | SMTC now-playing reader |
| `volume.ps1` | Core Audio volume and mute |

State lives in `%APPDATA%/nixi-companion/`: `nixi.json` (settings),
`nixi-data.json` (lists, notes, timers) and `speech-state.json`.
