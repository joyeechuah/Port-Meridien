# Mobile lag and broken sound: investigation

**Status: investigating. No fix is approved.** This answers Codex's investigation request of 16 Nov 2026 (priority P1). Device measurements are still to come: section 5 says how to take them.

## 1. Reproduction

| | |
| --- | --- |
| Device | Jo Yee's Android phone (model and Chrome version to be read from the panel, section 4) |
| Browser | Chrome, opened in a Custom Tab from raw.githack.com, portrait |
| Screen | 1080 × 2392 (first recording), 1080 × 2154 (second); the game caps its render scale at 2 |
| Builds | First recording: #37 (`87ae85e`, traffic fix). Second: #38 (`a58b919`, larger sound buffer and earlier AUTO drop in sharpness) |
| Route | Garage, highway and country roads up to about 230 km/h, at dusk and night, into Old Quay, then on foot |
| Settings | Sound on, music on (MUSIC: ON in the garage), GRAPHICS: AUTO |

Jo Yee hears the sound break while playing, and on the recordings. So it isn't a screen-recorder artefact.

## 2. Evidence so far

### Sound

Measured from the recordings' audio, in 10 ms windows:

| | 1st recording (97 s, main's sound buffer) | 2nd recording (262 s, #38's larger buffer) |
| --- | --- | --- |
| Peak level | 0.29 of full scale, no clipping | no clipping |
| Sudden drops of 25 dB or more within 10 ms | 339 (3.5 a second) | 664 (2.5 a second) |
| Short complete silences of 10 to 300 ms | Many; most 20 to 60 ms | 518; most 10 to 60 ms |
| What goes silent | Everything at once: engine, tyres and music | The same |
| Lined up with slow frames | | No: 60 of 507 silences fall within 0.15 s of a slow frame; chance would give 15% |

Codex's check found no *prolonged* silence, and that's right: the silences are short. They're still complete (below −60 dB, the whole spectrum black), and frequent enough to hear as breaking up.

### Frames

A screen recording can't give the game's frame rate (Codex is right about this too): the recorder samples the screen at its own rate. As a rough guide only:

- **1st recording:** 30 to 45 new frames a second while driving, dipping to 15 to 25 at times.
- **2nd recording:** capped at 30 by the recorder, so it says nothing above 30.
- **The 5-second "freeze" at 2:18 in the 2nd recording:** the repair screen, which doesn't move. It wasn't a stall.

## 3. Suspected causes: evidence for and against

| # | Suspected cause | For | Against | State |
| --- | --- | --- | --- | --- |
| A1 | The browser's audio thread runs dry (underruns), because the phone is loaded | Complete silences of everything at once; fewer with a larger buffer (3.5 → 2.5 a second) | Not settled from recordings alone; the larger buffer helped only a little | **Most likely.** The panel's "audio behind" and "underruns" settle it |
| A2 | The game silences its own output | | Only `audioOn(false)` (pause, map, garage, dealer, race screens), `tabStop()` and hiding the page do, and none runs while driving or walking. Music bypasses the master gain, yet it goes silent too | **Unlikely** |
| A3 | Audio updates late during heavy frames | | Silences don't line up with slow frames. The engine is continuous oscillators: late updates change pitch late, they don't silence it | **Unlikely** |
| A4 | Too many sound sources at once (the composed backup music schedules many short notes, with a 2.1 s reverb) | Would load the audio thread | Recorded songs normally play instead; not measured | **Open.** Panel's "sources playing", and MUSIC OFF |
| A5 | The screen recorder drops audio | | Jo Yee hears it live | **Rejected** |
| F1 | Graphics chip limit (pixels, shadows, antialiasing at up to 2× on a 1080-wide screen) | Large screen, soft shadows, antialiasing on | Not measured | **Open.** Panel's "render" time and fps, by GRAPHICS mode |
| F2 | Game code (traffic, pedestrians, police) | | Not measured | **Open.** Panel's "sim" time |
| F3 | AUTO keeps sharpness too long (it only drops below 36 frames a second) | Choppy at 30 to 45 | Lowering it sooner (#38) made the picture visibly blurry | **Open**, a trade-off; see fix proposal 3 |
| F4 | Memory growth, heat or battery saving over time | | Not measured | **Open.** Panel's heap, and a 10-minute run |

## 4. The measurement panel

Add `?perf` to the game's address. Nothing else changes. Each second it shows:

| Line | Reading |
| --- | --- |
| 1 | System and browser version, screen size and pixel density, game commit, minutes since opening |
| 2 | Frames a second; frame time p50, p95 and p99 over the last 10 s |
| 3 | Slowest frame, and frames over 33, 50 and 100 ms, since opening |
| 4 | Game code per frame: simulation, and the render call, average and maximum |
| 5 | Browser long tasks (over 50 ms), JS heap |
| 6 | Draw calls, triangles, textures, geometries |
| 7 | Render scale against the screen's, canvas size, GRAPHICS setting |
| 8 | Recent render-scale changes |
| 9 | Sound state, sample rate, buffer (base + output latency), "(safe)" if the larger buffer was asked for |
| 10 | How far the audio clock has fallen behind real time since the sound started; Chrome's underrun count where Chrome has one |
| 11 | Sound sources playing now, the most at once, and how many were made; effects and music state |

How to read it:

- **"audio behind" or "underruns" climbing while the sound breaks:** the audio thread is running dry (A1).
- **Neither moving while it still breaks:** the cause is elsewhere: the phone's own audio, or another app.
- **"render" time small while the frame rate is low:** the graphics chip is the limit (F1). Large "sim" time points at game code (F2).
- **"sources playing" or "made" growing without end:** a leak (A4).

`?audio=safe` asks for the larger sound buffer (#38's change), and `?audio=fast` for the default. They can be combined with `?perf`, as `?perf&audio=safe`.

## 5. Test protocol (the same phone and route for every run)

Route: from the garage, drive the highway into Old Quay (about 2 minutes), then walk for 30 s. Don't screen-record: recording adds load. At the end of each run, screenshot the panel and note whether the sound broke and whether it felt laggy.

| Run | Address | In the pause menu | Tells |
| --- | --- | --- | --- |
| 1 | `?perf` | SOUND FX on, MUSIC on, GRAPHICS AUTO | Baseline: main's behaviour |
| 2 | `?perf` | MUSIC off | Whether music contributes |
| 3 | `?perf` | SOUND FX off, MUSIC on | Whether effects contribute |
| 4 | `?perf` | Both off | Whether lag persists without game audio |
| 5 | `?perf&audio=safe` | As run 1 | Whether a larger buffer stops the breaks |
| 6 | `?perf` | GRAPHICS SHARP | Full sharpness cost |
| 7 | `?perf` | GRAPHICS SMOOTH | Lightest setting |
| 8 | `?perf` | As run 1, 10 minutes | Heat, memory and node growth over time |

## 6. Fix proposals, ranked (none to build until section 5's results are in)

| # | Proposal | When the data supports it | Expected benefit | Risk | Regression plan |
| --- | --- | --- | --- | --- | --- |
| 1 | Larger sound buffer on phones (#38's first change) | Run 5 breaks clearly less than run 1 | Fewer or no dropouts | Sound a few hundredths of a second later | Test that phones get the larger buffer and computers don't (in #38); listening check on the phone |
| 2 | Lighten the audio thread: skip the composed music's reverb on phones, or don't build the composed backup while a recorded song plays | Run 2 clearly better than run 1, or many sources playing | Fewer dropouts | Backup music sounds drier | Count of sources and nodes after 10 minutes stays flat; music tests pass |
| 3 | Lighten the picture without blurring it: smaller shadow map or harder shadows, or antialiasing off on phones, before lowering the render scale | High "render" time, and SMOOTH much smoother than AUTO | Smoother at the same sharpness | Rougher shadow and edge quality | Graphics tests; drawn screenshot comparison; phone check |
| 4 | Retune AUTO's thresholds (#38's second change) | Only if 3 isn't enough | Smoother | Blurrier (Jo Yee saw this with #38) | Graphics tests (in #38) |
| 5 | Reduce game-code cost (traffic, pedestrians, police) | High "sim" time | Smoother | Gameplay changes | The full gameplay suite must pass unchanged |

#38 is held until then: it bundles proposals 1 and 4 without data.
