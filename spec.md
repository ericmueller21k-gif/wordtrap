# Word Trap: v1 build spec

Oct 1, 2026 · @eric james

## What this is

Word Trap is a two-player word game for phones, played at your own pace. Both players get the same seven letter tiles and secretly build a word. Each then sees only the length and score of the other's word and gets three guesses at it. You score when your word survives, and when you catch theirs.

This spec is the brief for the first playable version. Build it in the order given under Build order, and stop for Eric's review after each milestone. Every number in the rules is a starting value to be tuned by playtesting, so keep them all in one settings file.

## Rules

A match is 5 rounds between two players. The highest total wins, and a tie stands.

**The rack and the board.** Each round, both players get the same rack and the same board.

- The rack is 7 letter tiles with Scrabble letter values (table below).
- The board is one row of 7 slots. Words always start in slot 1 and run left to right.
- One slot is a letter square (double or triple letter). One other slot is a word square (double or triple word).

**Setting a word.** Each player secretly submits one word.

- It is 3 to 7 letters long and uses each rack tile at most once.
- It must be on the common-word list (see Dictionary).
- Once submitted, it is locked.

**The clue.** When both words are in, each player learns two facts about the other's word: its length and its tile score. Nothing else is shown.

**Guessing.** Each player gets 3 guesses at the other's word.

- A guess must be a common word of the clue's length that can be made from the rack.
- An invalid or repeated guess is rejected and does not use up a try.
- After each guess, the letters sitting in the correct slot are marked. There is no "right letter, wrong slot" feedback.
- A guess does not have to match the clue score. The app shows what a guess would score before it is submitted and whether that matches the clue.
- An exact match catches the word. After three misses, it survives.

**Letter values**

| Value | Letters |
| --- | --- |
| 1 | A E I L N O R S T U |
| 2 | D G |
| 3 | B C M P |
| 4 | F H V W Y |
| 5 | K |
| 8 | J X |
| 10 | Q Z |

## Scoring

A surviving word pays its owner in full. A caught word pays its owner nothing and pays the catcher half.

**Tile score.** This is the number shown as the clue.

1. Add up the letter values, counting the letter on the letter square double or triple.
2. If the word reaches the word square, multiply the whole sum by 2 or 3.
3. A square only counts if the word is long enough to cover its slot.

**Length bonus.** 5 letters earn +1, 6 letters +5, 7 letters +10. The bonus is added after the multipliers, is never part of the clue, and is paid only if the word survives.

**Result for each word**

| Outcome | Owner gets | Guesser gets |
| --- | --- | --- |
| Survives all 3 guesses | Tile score + length bonus | 0 |
| Caught on any guess | 0 | Half the tile score, rounded up |

A player's round score is what their own word earned plus what they earned by catching.

**Worked example (use these as unit tests).** Rack Q U I T H E S, triple-letter square on slot 2, double-word square on slot 5.

| Word | Working | Tile score (clue) | Owner gets if it survives | Guesser gets if caught |
| --- | --- | --- | --- | --- |
| HIT | 4 + (1 x 3) + 1 | 8 | 8 | 4 |
| THIS | 1 + (4 x 3) + 1 + 1 | 15 | 15 | 8 |
| QUIT | 10 + (1 x 3) + 1 + 1 | 15 | 15 | 8 |
| QUITE | (10 + 3 + 1 + 1 + 1) x 2 | 32 | 33 | 16 |
| QUIETS | (10 + 3 + 1 + 1 + 1 + 1) x 2 | 34 | 39 | 17 |

On this board, a 4-letter clue of 15 could be THIS, THUS, SHUT or QUIT. A 5-letter clue of 32 could be QUITE, QUIET, QUEST or QUITS. That ambiguity is the game.

**Feedback example.** The secret word is THIS. A guess of THUS marks slots 1, 2 and 4. A guess of SHUT marks slot 2 only.

## Match flow

Play has no timers. After round 1, each visit is "guess their word, then set your next one."

1. Creating a match generates all 5 racks and boards up front, on the server.
2. The creator enters a name and gets an invite link and a short join code to send to a friend.
3. The friend opens the link or types the code, enters a name, and takes the second seat. The match then locks to those two players.
4. In round 1, each player sets a word, in either order.
5. Once both words are in, each player can guess. All 3 guesses happen in one sitting, with instant feedback.
6. When a player finishes guessing, they see the other player's word and can set their word for the next round straight away. They do not wait for the other player to finish guessing.
7. The round summary (both words, all guesses, points) appears once both players have finished guessing.
8. After round 5, show the final score and a rematch button.

There are no accounts in v1. A seat is held by a secret token stored on the device. Each player also gets a personal rejoin code, so they can get back into the match from another device or from the installed home-screen app.

**What each player may see**

| Moment | The player sees |
| --- | --- |
| Before both words are in | Their own word, and whether the other player has submitted |
| While guessing | The other word's length and tile score, plus their own guesses and feedback |
| After their own guessing ends | The other player's word |
| After both finish guessing | Everything for that round |

If both players pick the same word, nothing special happens in v1.

## Dictionary

Only common words are playable, so the game rewards cunning over obscure vocabulary.

- Keep two lists: a large "real word" list, and a smaller "common" list that is a subset of it.
- Build the common list from a word-frequency list with a cutoff. Start at roughly the 10,000 most frequent words of 3 to 7 letters. That number is a guess to tune.
- A regular inflection of a common word (plural, -ed, -ing, -er, -est) counts as common if it is a real word.
- Exclude proper nouns, abbreviations and slurs.
- Keep a small hand-edited allow file and deny file that override the cutoff. Playtesting will produce disputes.
- The same list applies to set words and to guesses.

**Messages**

| Input | Message |
| --- | --- |
| A real word that is not common | "That's a real word, but it's too uncommon for Word Trap." |
| Not a word | "That's not a word we know." |
| Cannot be made from the rack | "You don't have the tiles for that." |

Use openly licensed word lists, and record each source and its licence in the repo. Check licensing before using any official tournament Scrabble list.

## Racks and boards

Racks are drawn Scrabble-style, then redrawn if they are too thin to play.

- Draw 7 tiles without replacement from a fresh 98-tile bag each round. The bag is the standard English Scrabble distribution with the two blanks removed.
- Duplicate letters are allowed. There are no blanks in v1.
- Redraw unless the rack makes at least 25 common words, including at least 3 words of 5 letters or more. Both thresholds are starting guesses.
- The letter square is double or triple (50/50), on any slot from 1 to 7.
- The word square is double or triple (50/50), on any slot from 4 to 7 other than the letter square's slot.

The word square stays on slots 4 to 7 so that reaching it is always a choice. On slots 1 to 3, every word would cover it.

Bag contents: A9 B2 C2 D4 E12 F2 G3 H2 I9 J1 K1 L4 M2 N6 O8 P2 Q1 R6 S4 T6 U4 V2 W2 X1 Y2 Z1.

## Platform and architecture

Version 1 is a phone-first web app that installs to the home screen, built so it can be wrapped as a store app later without a rewrite.

**Why not a native build first.** Distributing an iPhone app to a friend requires the Apple Developer Program, at 99 USD a year ([Apple: program enrollment](https://developer.apple.com/help/account/membership/program-enrollment)). Without it, installs go through Xcode to at most 3 registered devices and expire after 7 days ([Apple: developer account overview](https://developer.apple.com/help/account/basics/about-your-developer-account)). A web link also updates instantly for both players, which matters while the rules are still changing.

**Requirements**

- Use TypeScript throughout.
- Keep the rules engine as a pure module with no UI or network code. It covers scoring, validation, feedback, and rack and board generation. The server and the client both import it, and a native app would reuse it.
- The server is the authority. It stores racks, boards and secret words, validates every submission, and computes clues, feedback and points.
- A player's device never receives the other player's word before the reveal defined under Match flow.
- The client is a portrait mobile web app. It is installable: web app manifest, icons, and full-screen standalone display.
- The backend is one small API plus a hosted database. Propose the cheapest managed option and get Eric's approval before provisioning anything that costs money.
- There are no push notifications in v1. The home screen shows whose turn it is when the app is opened.
- On iPhone, the installed home-screen app may not share storage with the browser. Test this on a real iPhone, and make sure a player can enter a join or rejoin code inside the installed app.

**Later.** Wrap the same web app for the App Store and Google Play (for example with Capacitor), and add push notifications then.

## Screens and app feel

It has to feel like an app: one-handed, portrait and instant, with no browser behaviour showing.

**The bar.** Someone handed the phone should not be able to tell this is a web app. It is designed for a phone screen first and only, never a desktop page scaled down.

- The system keyboard never appears during play. Words and guesses are both built by tapping rack tiles. Only name and code entry use the keyboard.
- Layout fills the phone screen edge to edge and respects the notch and home-indicator safe areas.
- Taps respond immediately, and moving between game screens shows no page loads or spinners.
- On a computer, show the same phone-width layout centred. There is no separate desktop design.
- If a screen fails this bar on a real iPhone, it is not done.

| Screen | What it shows |
| --- | --- |
| Home | Your matches with a status ("Your turn", "Waiting for Sam"), New game, Join with code |
| Set your word | The 7-slot row with both squares marked, the rack below it, live tile score and length bonus, Shuffle, Clear, Lock in |
| Waiting | "Word locked in. Waiting for Sam." and a button to share the invite link |
| Guess | The clue (length and score), a row with that many slots, earlier guesses with correct letters marked, guesses left, and a live score check on the guess being built |
| Round summary | Both words, every guess, points for the round, and the running total |
| Final | The winner, a round-by-round table, and Rematch |

**Interaction**

- Tap a rack tile to place it in the next open slot. Tap a placed tile to send it back. Drag and drop is optional.
- Each tile shows its letter and point value.
- Squares are labelled 2L, 3L, 2W and 3W, and stay readable with a tile on them.
- Ask for confirmation before locking in a word, because it cannot be changed.
- Touch targets are at least 44 px.
- Game screens have no page scroll, pinch zoom, text selection or pull-to-refresh.
- Use short animations for placing tiles, revealing feedback and scoring.
- Support light and dark mode.

## Settings

Every tunable lives in one settings file, so playtesting changes never touch game code.

| Setting | Starting value |
| --- | --- |
| Rounds per match | 5 |
| Rack size and board slots | 7 |
| Minimum word length | 3 |
| Guesses per word | 3 |
| Length bonus | 5 letters +1, 6 letters +5, 7 letters +10 |
| Catch reward | 50% of the tile score, rounded up |
| Letter square | x2 or x3 at 50/50, slots 1 to 7 |
| Word square | x2 or x3 at 50/50, slots 4 to 7 |
| Rack filter | At least 25 common words, at least 3 of them 5 letters or longer |
| Common-word cutoff | About 10,000 words, plus the allow and deny files |

## Build order

Build in five milestones and stop for Eric's review after each one.

1. **Rules engine.** Scoring, validation, feedback, rack and board generation, and the dictionary build. Unit tests include the worked examples under Scoring. There is no UI yet.
2. **Balance report.** A script deals several thousand racks and boards and lists every playable word. It reports how many words share each clue (length plus tile score), by word length. It also reports how often a simple guesser catches a word in 3 tries, where the guesser picks at random among words that fit the clue and the feedback so far. The results may change the settings, so review them before any UI work.
3. **Playable on one phone.** All game screens, with a pass-the-phone mode and no server. This is for judging feel.
4. **Online play.** The server, invite link, join code, rejoin code, the turn flow and the visibility rules. This is the first real playtest with a friend.
5. **Install polish.** Manifest, icons, full-screen launch, an "Add to Home Screen" prompt, and testing on a real iPhone and a real Android phone.

## Parked for later

None of these are in v1. Do not build them, but do not design them out.

- **Glow tile.** One rack tile glows, the same one for both players. If you use it, your opponent sees it face up in its slot. Intended to appear from round 2 or 3.
- **Sliding placement.** The word can start on any slot, with its position either shown to the opponent or hidden.
- **Hot tile.** One rack letter is worth triple for the round.
- **Double or nothing.** Once per match, a player publicly doubles the stakes on their word.
- **Same-word rule.** Both players score zero if they pick the same word.
- **Practice bot.** A solo opponent built from the balance script's guesser.
- **Turn notifications, accounts, and App Store and Google Play builds.**
- **Before any public release.** Check that the name Word Trap is free to use, and get advice on reusing Scrabble's letter values and tile distribution.

## Open items for Eric

- [ ] Confirm web app first (installed to the home screen) over a native build first. This is the one decision in this spec that Eric did not make himself.
- [ ] Confirm the glow tile is described correctly under Parked for later.
- [ ] After the balance report, decide whether 3 guesses, the 50% catch reward and the +1 / +5 / +10 length bonus hold.
- [ ] Approve a hosting option when one is proposed at milestone 4.
