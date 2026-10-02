# Word Trap

## Follow the spec

`spec.md` is the brief for this project. Read it before doing anything, and follow it.
Where the spec is ambiguous, make the call and record it in `DECISIONS.md`.

## Work through the milestones

The spec's **Build order** lists five milestones. Build them in order. Eric has asked for as little involvement as possible
(Oct 2, 2026), so do **not** stop for a review after each milestone. Commit and push each one, then carry on.

Make the judgement calls yourself (open questions, tuning, design details) and record each decision and its reason in
`DECISIONS.md`. Stop and ask Eric only for things only Eric can do:

- anything that costs money, or needs an account in Eric's name (hosting sign-up)
- testing on Eric's real phones
- a decision that would reverse something Eric decided in the spec

## Progress

- [x] 1. Rules engine (`packages/engine`)
- [x] 2. Balance report (`npm run balance` → `reports/balance.md`)
- [ ] 3. Playable on one phone
- [ ] 4. Online play
- [ ] 5. Install polish

Tick a milestone off here when it is built.

## Project layout and commands

- npm workspaces. TypeScript throughout.
- `packages/engine`: the pure rules engine (scoring, validation, feedback, rack and board generation, word-list building). No UI, network or file I/O in `src/`, except `src/node.ts`, which loads the word lists from disk for Node callers.
- `packages/engine/src/settings.ts`: every tunable rule. Change numbers here, never in game code.
- `packages/engine/data/`: word-list sources, `allow.txt` and `deny.txt` overrides, and the generated `words/real.txt` and `words/common.txt`. Licences are in `data/SOURCES.md`.

```sh
npm install
npm test                  # vitest, all packages
npm run typecheck
npm run build:dictionary  # regenerate words/*.txt after editing allow.txt, deny.txt or the cutoff
npm run balance           # regenerate reports/balance.md after changing settings or word lists
```

Commit the regenerated word lists along with whatever changed them.
