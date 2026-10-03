# DROP DILEMMA

A browser DJ party game for 2–8 players. Includes editable secret choices, shared Crowd Energy, named simultaneous reveals, running scores, generated Tone.js music, a hidden 8–12-round ending, choice history, game theory explanations, and rematches.

## Current delivery status

Source implementation complete. TypeScript checks and game-engine tests pass. The D1 migration was generated and inspected using Drizzle's in-process API. Local framework build, browser verification, and public deployment remain unverified: the current Windows execution environment rejects Node child processes with `spawn EPERM`. The Sites publishing workflow's credential input was also rejected by automatic approval policy. No playable public deployment is available yet.

## Architecture

- React/Vinext client, with large mobile choice controls.
- Cloudflare Worker API and D1-backed room state; no login required.
- Server-owned 15-second choice phases and 5-second reveal phases. Deadlines continue independently of the host; requests advance elapsed phases.
- Clients poll every 500ms and reconcile against increasing room revisions. This is HTTP polling rather than WebSockets. Device clocks are corrected against server timestamps. Network delays can cause small differences in reveal arrival; audio timing is approximate, not sample-accurate across devices.
- Each room update uses a version-checked database write to prevent concurrent players overwriting one another. The API strips other players' secret selections, session tokens, and the secret round count.
- DJ credentials stay in sessionStorage for reload/reconnect in the same tab. Authoritative scores and game state live in D1.
- Audio is synthesized locally: kick, hi-hat, bass, chord synth, rising sweep, drop hit, and power-down. No recorded assets.

## Rules

Crowd Energy begins at 20 and is capped at 100. No choice defaults to BUILD. All builds add 10 each after successful drops. With zero drops, energy is not halved. With 1 to half the players dropping, droppers split starting energy as points, energy halves, then builds are added. With more than half dropping, nobody scores and energy becomes 0, wiping out builds too. Preserve fractional scores and energy; display up to one decimal. Exactly tied scores share victory.

Names and choices reveal together. An initial server-only random round count from 8–12 determines the ending. The final result is displayed for five seconds before the final screen.

## Finish verification and publish in a compatible environment

Use Node 22.13+ with npm and Git. Keep the existing Site identity in `.openai/hosting.json`.

1. `npm ci`
2. Inspect the included schema-only migration `drizzle/0000_drop_rooms.sql`. If changing the schema, use `npm run db:generate` to append migrations.
3. `node tests/game.test.mjs`
4. `npx tsc --noEmit`
5. `npm run build`
6. Apply generated migrations to the local D1 binding using the starter's local migration instructions, then `npm start` for full API and browser checks.
7. Verify two to eight independent sessions, concurrent editable choices, timed reveals, audio after a gesture, reload/reconnect, final history, and rematch at phone and laptop sizes.
8. Use the Sites hosting workflow to push source, package, save, and deploy this same Site. Set public access as requested by the user; default private access would require friends to sign in.

Room state expires after 24 hours without an update. Expired rows are ignored; a production housekeeping job or bounded cleanup should remove old rows if ongoing usage grows substantially.
