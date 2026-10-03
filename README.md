@'
# Drop Dilemma

**Status: archived prototype.** Functional, but not finished. Shared so someone with more time and patience can take it further.

A real-time multiplayer browser game for 2–8 players that turns a classic game-theory problem into a DJ battle. Every player is a DJ sharing one crowd. Each round you secretly choose to **BUILD** the crowd's energy (cooperate) or **DROP** to cash that energy in for points (defect). Too many drops at once and the crowd crashes for everyone.

Built with ChatGPT (Work / Codex) for the Handshake AI Skills Studio x OpenAI Multiplayer Game Challenge, October 2026.

---

## The game theory

- **Social dilemma.** Within a single round, DROP is weakly dominant: building earns 0 points that round; dropping earns a share of the energy, or 0 if it causes a crash. If everyone reasons only about the current round, everyone drops and the crowd crashes — a Nash equilibrium that is not Pareto-optimal.
- **Repeated game.** Energy carries between rounds, so building is an investment in future payoffs, as in the iterated prisoner's dilemma.
- **No backward induction.** Rounds 1–5 always happen. After each round from round 5 on, the server privately has a 25% chance of ending the set (hidden safety cap of 20). Players never know when the last round is, so there is no known final round to defect on.
- **Reputation.** Choices are secret during a round and revealed by name afterward, so trust, retaliation, and forgiveness emerge across rounds.

## Rules

- Crowd Energy starts at 20, capped at 100. Rounds last 15 seconds; players can change their choice until the timer ends. No choice = BUILD.
- **Nobody drops:** no one scores; energy = start energy + 10 per builder.
- **1 up to exactly half the players drop:** droppers split the start-of-round energy as points; builders score 0; energy is halved, then +10 per builder.
- **More than half drop (CROWD CRASH):** nobody scores; energy goes to 0, including that round's builds.
- After the timer: a 1-second "choices locked" pause, then a 5-second reveal of every player's name and choice.
- Highest total score wins; exact ties share the win.

## What works

- Room creation and joining by 5-character code or invite link; no login.
- Server-authoritative game state with secret choices (other players' picks, session tokens, and the round count are never sent to clients).
- Correct scoring, verified by 2,000+ automated scoring cases and a manual 12-round play-through.
- Named simultaneous reveals, running scoreboard, full-screen CROWD CRASH and DROP banners, end-screen choice history, game-theory explanation, and rematch.
- Each DJ is assigned a musical layer (Drums, Bass, Melody, Texture, plus extras for larger groups). BUILD keeps your layer in the mix; DROP cuts it out next round, so betrayal is audible.
- Energy-driven music with on-screen milestones (20 Kick · 40 Hi-hats · 60 Bass · 80 Synths · 100 Full drop), a randomly chosen style per set, and a shared timeline so the drop lands at the same moment on every device.
- An animated crowd that grows and reacts to energy, drops, and crashes.
- 47 public-domain (CC0) samples from Sonic Pi's library, loaded on entry (`Drop Dilemma: loaded 47/47 samples` in the console).

## Known problems (why it was shelved)

1. **It isn't fun yet.** Players click one button and wait. The planned fix was to make every round a skill test (see *Next steps*).
2. **The music still sounds basic.** The samples load, but in play-testing the mix sounded no different from the earlier synth-only version. Either the arrangement barely uses the samples or they're mixed too low. Unresolved.
3. **The crowd looks rough.** Simple CSS/SVG stick figures that read as placeholders.
4. **Not deployed.** Runs locally only; never published to a public URL.
5. **Not play-tested with real people.** All testing was one person playing two browser windows, which can't show whether the betrayal dynamic is fun.

## Next steps (planned, not built)

- **Sound check screen:** play each layer and sample on its own, so whoever fixes the mix can hear what's actually playing.
- **Phase 2 — Beatmatching:** while building, a player taps in time to lock their off-tempo layer to the master beat. Tight lock = +10 energy, sloppy = +5, off = +0. Includes a tap-latency calibration screen.
- **Phase 3 — Phrasing:** a DROP only pays fully if it's hit on "the one," the first beat of the next phrase. Early or late = reduced share.
- **Possibly harmonic mixing** (choose a compatible key from a Camelot-style wheel) if the game still needs depth.
- **Game theory report** on the end screen: cooperation rate, how often the group hit the all-drop equilibrium, most trusted DJ, biggest betrayal.
- Better crowd art, then deploy and test with 3–6 real players on their own phones.

## Tech stack

- Vinext (Vite-based, Next.js-style app router) on Cloudflare Workers, from OpenAI's Sites starter template
- Cloudflare D1 (SQLite) for room state, via Drizzle ORM
- React 19, TypeScript, Tailwind CSS
- Tone.js for synthesis, sample playback, scheduling, and mastering
- HTTP polling (500 ms) with server-time correction, not WebSockets

Key files:

| File | Purpose |
|---|---|
| `lib/game.ts` | Rules, scoring, phase timing, random ending, public view |
| `app/api/game/route.ts` | Game API (create, join, start, choose, rematch) |
| `app/page.tsx` | All screens |
| `lib/layers.ts` | Layer assignment and mix |
| `lib/scheduled-club-audio.ts`, `lib/music-styles.ts`, `lib/music-timeline.ts` | Music engine |
| `lib/sample-bank.ts`, `lib/sample-catalog.ts` | Sample loading |
| `lib/crowd.ts`, `app/components/club-stage.tsx` | Animated crowd |
| `drizzle/0000_drop_rooms.sql` | Database table |
| `tests/*.test.mjs` | Automated tests |

## Run it locally (Windows)

Requires Node.js 22.13 or newer. On Windows PowerShell, use `npm.cmd` instead of `npm` to avoid script-policy errors.

npm.cmd ci
npm.cmd run build
node ./node_modules/wrangler/bin/wrangler.js d1 execute site-creator-d1 --local --file drizzle/0000_drop_rooms.sql --config dist/server/wrangler.json --persist-to .wrangler/state
npm.cmd start

The `d1 execute` line creates the local database table and is only needed the first time.

Open `http://localhost:8787`. To test multiplayer on one computer, use a normal window and a private (InPrivate/Incognito) window: create a room in one, join with the code in the other.

After any code change, stop the server (Ctrl + C), run `npm.cmd run build` again, then `npm.cmd start`. On macOS/Linux, use `npm` in place of `npm.cmd`.

## Run the tests

Get-ChildItem tests*.test.mjs | ForEach-Object { node $_.FullName }


## Credits

- Audio samples: Sonic Pi sample library, public domain under Creative Commons 0. Full list and source links in `public/samples/CREDITS.md`; license statement in Sonic Pi's samples README: https://github.com/sonic-pi-net/sonic-pi/blob/dev/etc/samples/README.md
- Design and direction: Iain Melchizedek. Code generated with ChatGPT as per the Terms and Conditions of the Actual Challenge. 

## License

No license has been chosen yet, so default copyright applies. If you'd like to build on this, open an issue to ask.
'@ | Set-Content -Path .\README.md -Encoding UTF8
