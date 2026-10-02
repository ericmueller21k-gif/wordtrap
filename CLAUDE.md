# Word Trap

## Follow the spec

`spec.md` is the brief for this project. Read it before doing anything, and follow it.
If a request conflicts with the spec, or the spec is ambiguous, ask Eric rather than guessing.

## Work one milestone at a time

The spec's **Build order** lists five milestones. Build them in order, and only one per session or request:

1. Finish the current milestone, with tests passing.
2. Commit and push it.
3. **Stop.** Summarise what was built, what was decided, and any open questions for Eric, then wait for his review.

Never start the next milestone until Eric has reviewed the last one and asked for the next one.
Never provision anything that costs money without Eric's approval.

## Progress

- [x] 1. Rules engine (`packages/engine`)
- [ ] 2. Balance report
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
```

Commit the regenerated word lists along with whatever changed them.
